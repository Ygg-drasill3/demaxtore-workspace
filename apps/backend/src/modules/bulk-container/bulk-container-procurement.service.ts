import { Prisma, PrismaClient } from "@prisma/client";
import {
  BC_OFFER_VALIDITY_HOURS,
  findBcTransition,
  type BulkContainerAction,
  type BulkContainerState,
} from "@dmx/contracts/bulk-container.fsm";
import type { BulkSpecTemplate } from "@dmx/contracts/bulk-container-catalog";
import type {
  AdminBcProcurementQuoteInput,
  BuyerBcRevisionInput,
  CreateBcContainerOfferInput,
} from "@dmx/contracts/bulk-container.zod";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "./bulk-container.policy.js";
import { toBulkContainerDTO } from "./bulk-container.service.js";
import { assertLinesHavePackingType } from "../packing-type/packing-type.helpers.js";

const WS_INCLUDE = {
  bulkContainerDetails: true,
  bulkContainerLines: {
    where: { removedAt: null },
    orderBy: { sortOrder: "asc" as const },
    include: {
      catalogProduct: { include: { category: true, specTemplate: true } },
      packingType: true,
    },
  },
  createdBy: { select: { displayName: true, organisation: { select: { name: true } } } },
};

function num(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function summarizeSpec(
  specValues: Record<string, string | number>,
  template?: BulkSpecTemplate,
): string {
  if (!template) {
    return Object.entries(specValues).map(([k, v]) => `${k}: ${v}`).join(" · ");
  }
  return template.parameters
    .filter((p) => specValues[p.key] !== undefined && specValues[p.key] !== "")
    .map((p) => {
      const v = specValues[p.key];
      const unit = p.unit ? ` ${p.unit}` : "";
      return `${p.label}: ${v}${unit}`;
    })
    .join(" · ");
}

async function appendTimeline(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  eventType: string,
  actorUserId: string | null,
  payload: Record<string, unknown> = {},
) {
  await tx.timelineEvent.create({
    data: { workspaceId, eventType, actorUserId, payload: payload as Prisma.InputJsonValue },
  });
}

async function applyBcTransition(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  action: BulkContainerAction,
  actor: AuthUser,
  auditEvent: string,
  payload: Record<string, unknown> = {},
) {
  await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
  const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const from = ws.state as BulkContainerState;
  const t = findBcTransition(from, action);
  if (!t) throw new AppError(400, "INVALID_TRANSITION", { from, action });
  if (!t.allowedRoles.includes(actor.role as "BUYER" | "ADMIN" | "SYSTEM")) {
    throw new AppError(403, "FORBIDDEN_ROLE");
  }
  await tx.workspace.update({ where: { id: workspaceId }, data: { state: t.to } });
  await appendTimeline(
    tx,
    workspaceId,
    auditEvent,
    actor.role === "SYSTEM" ? null : actor.id,
    payload,
  );
  return t.to;
}

async function nextBcOfferRef(tx: Prisma.TransactionClient | PrismaClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `BC-OFR-${year}-`;
  const last = await tx.bcContainerOffer.findFirst({
    where: { offerReference: { startsWith: prefix } },
    orderBy: { offerReference: "desc" },
    select: { offerReference: true },
  });
  const n = last ? Number(last.offerReference.slice(prefix.length)) : 0;
  return `${prefix}${String(n + 1).padStart(5, "0")}`;
}

function toOfferDTO(
  ws: { id: string; externalRef: string; state: string },
  offer: {
    id: string;
    offerReference: string;
    version: number;
    status: string;
    currency: string;
    offerTotal: Prisma.Decimal;
    validUntil: Date;
    offerNotes: string | null;
    sentAt: Date | null;
    viewedAt: Date | null;
    approvedAt: Date | null;
    lines: Array<{
      id: string;
      lineId: string;
      productName: string;
      packingType: string;
      specificationSummary: string;
      quantityMt: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>;
  },
) {
  const now = Date.now();
  const expiresInSeconds =
    offer.status === "SENT"
      ? Math.max(0, Math.floor((offer.validUntil.getTime() - now) / 1000))
      : null;

  return {
    id: offer.id,
    workspaceId: ws.id,
    externalRef: ws.externalRef,
    offerReference: offer.offerReference,
    state: ws.state,
    version: offer.version,
    status: offer.status,
    currency: offer.currency,
    lines: offer.lines.map((l) => ({
      id: l.id,
      lineId: l.lineId,
      productName: l.productName,
      packingType: l.packingType,
      specificationSummary: l.specificationSummary,
      quantityMt: Number(l.quantityMt),
      unitPrice: num(l.unitPrice)!,
      lineTotal: num(l.lineTotal)!,
    })),
    offerTotal: num(offer.offerTotal)!,
    validUntil: offer.validUntil.toISOString(),
    expiresInSeconds,
    offerNotes: offer.offerNotes,
    sentAt: offer.sentAt?.toISOString() ?? null,
    viewedAt: offer.viewedAt?.toISOString() ?? null,
    approvedAt: offer.approvedAt?.toISOString() ?? null,
  };
}

export class BulkContainerProcurementService {
  constructor(public readonly prisma: PrismaClient) {}

  async inbox() {
    const rows = await this.prisma.workspace.findMany({
      where: {
        type: "BULK_CONTAINER",
        state: {
          in: [
            "BC_SUBMITTED",
            "BC_PROCUREMENT_IN_PROGRESS",
            "BC_OFFER_READY",
            "BC_BUYER_REVIEW",
            "BC_REVISION_REQUESTED",
            "BC_APPROVED",
            "BC_EXPIRED",
          ],
        },
      },
      include: {
        bulkContainerDetails: true,
        bulkContainerLines: { where: { removedAt: null } },
        createdBy: { select: { displayName: true, organisation: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return rows.map((ws) => ({
      id: ws.id,
      externalRef: ws.externalRef,
      state: ws.state,
      buyerName: ws.createdBy.displayName,
      buyerOrgName: ws.createdBy.organisation?.name ?? null,
      productCount: ws.bulkContainerLines.length,
      currentWeightMt: num(ws.bulkContainerDetails?.currentWeightMt) ?? 0,
      estValueMin: num(ws.bulkContainerDetails?.estValueMin),
      estValueMax: num(ws.bulkContainerDetails?.estValueMax),
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    }));
  }

  async kpis() {
    const counts = await this.prisma.workspace.groupBy({
      by: ["state"],
      where: { type: "BULK_CONTAINER" },
      _count: true,
    });
    const map = new Map(counts.map((c) => [c.state, c._count]));
    return {
      pricingRequested: map.get("BC_SUBMITTED") ?? 0,
      procurementInProgress: map.get("BC_PROCUREMENT_IN_PROGRESS") ?? 0,
      offerReady: map.get("BC_OFFER_READY") ?? 0,
      awaitingBuyerReview: map.get("BC_BUYER_REVIEW") ?? 0,
      approved: map.get("BC_APPROVED") ?? 0,
      expired: map.get("BC_EXPIRED") ?? 0,
    };
  }

  async getProcurement(id: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        ...WS_INCLUDE,
        bcProcurementQuotes: {
          include: {
            line: { include: { catalogProduct: true, packingType: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
        bcContainerOffers: {
          include: { lines: true },
          orderBy: { version: "desc" },
          take: 5,
        },
        bcRevisionRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (ws.type !== "BULK_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

    return {
      container: toBulkContainerDTO(ws as Parameters<typeof toBulkContainerDTO>[0]),
      quotes: ws.bcProcurementQuotes.map((q) => ({
        id: q.id,
        lineId: q.lineId,
        productRef: q.line.catalogProduct.productRef,
        productName: q.line.catalogProduct.name,
        packingType: q.line.packingType.name,
        supplierCode: q.supplierCode,
        unitPrice: num(q.unitPrice)!,
        currency: q.currency,
        quantityMt: Number(q.quantityMt),
        notes: q.notes,
        specificationSnapshot: q.specificationSnapshot as Record<string, string | number>,
      })),
      offers: ws.bcContainerOffers.map((o) => toOfferDTO(ws, o)),
      revisions: ws.bcRevisionRequests.map((r) => ({
        id: r.id,
        offerId: r.offerId,
        message: r.message,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async startProcurement(id: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    await this.prisma.$transaction(async (tx) => {
      await tx.bulkContainerDetails.update({
        where: { workspaceId: id },
        data: { procurementStartedAt: new Date() },
      });
      await applyBcTransition(tx, id, "start_procurement", actor, "bulk_container.procurement_started");
    });
    return this.getProcurement(id);
  }

  async resumeProcurement(id: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    await this.prisma.$transaction(async (tx) => {
      await applyBcTransition(tx, id, "resume_procurement", actor, "bulk_container.procurement_started");
    });
    return this.getProcurement(id);
  }

  async upsertQuote(id: string, input: AdminBcProcurementQuoteInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    const line = await this.prisma.bulkContainerLine.findFirst({
      where: { id: input.lineId, workspaceId: id, removedAt: null },
      include: { catalogProduct: { include: { specTemplate: true } }, packingType: true },
    });
    if (!line) throw new AppError(404, "LINE_NOT_FOUND");

    const specValues = line.specValues as Record<string, string | number>;
    const template = line.catalogProduct.specTemplate.schema as BulkSpecTemplate;

    const existing = await this.prisma.bcProcurementQuote.findFirst({
      where: { workspaceId: id, lineId: input.lineId },
    });

    const data = {
      supplierCode: input.supplierCode,
      productId: line.catalogProductId,
      packingTypeId: line.packingTypeId,
      specificationSnapshot: specValues as Prisma.InputJsonValue,
      quantityMt: line.quantityMt,
      unitPrice: input.unitPrice,
      currency: input.currency,
      notes: input.notes,
    };

    if (existing) {
      await this.prisma.bcProcurementQuote.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.bcProcurementQuote.create({
        data: { workspaceId: id, lineId: input.lineId, ...data, createdById: actor.id },
      });
    }

    return this.getProcurement(id);
  }

  async createOffer(id: string, input: CreateBcContainerOfferInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");

    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        bulkContainerLines: {
          where: { removedAt: null },
          include: { catalogProduct: { include: { specTemplate: true } }, packingType: true },
        },
        bcProcurementQuotes: true,
        bulkContainerDetails: true,
      },
    });
    if (!["BC_PROCUREMENT_IN_PROGRESS", "BC_REVISION_REQUESTED", "BC_EXPIRED"].includes(ws.state)) {
      throw new AppError(409, "INVALID_STATE_FOR_OFFER");
    }
    await assertLinesHavePackingType(ws.bulkContainerLines);

    const quoteByLine = new Map(ws.bcProcurementQuotes.map((q) => [q.lineId, q]));
    for (const line of ws.bulkContainerLines) {
      if (!quoteByLine.has(line.id)) {
        throw new AppError(400, "MISSING_PROCUREMENT_QUOTE", { lineId: line.id });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const from = ws.state as BulkContainerState;
      if (from === "BC_EXPIRED") {
        await applyBcTransition(tx, id, "regenerate_offer", actor, "bulk_container.procurement_started");
      } else if (from === "BC_REVISION_REQUESTED") {
        await applyBcTransition(tx, id, "resume_procurement", actor, "bulk_container.procurement_started");
      }

      const lastVersion = await tx.bcContainerOffer.findFirst({
        where: { workspaceId: id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = (lastVersion?.version ?? 0) + 1;
      const offerReference = await nextBcOfferRef(tx);
      const validUntil = new Date(Date.now() + (input.validityHours ?? BC_OFFER_VALIDITY_HOURS) * 3_600_000);

      let offerTotal = 0;
      const lineRows: Array<{
        lineId: string;
        productName: string;
        packingType: string;
        specificationSummary: string;
        quantityMt: number;
        unitPrice: number;
        lineTotal: number;
      }> = [];

      for (const line of ws.bulkContainerLines) {
        const quote = quoteByLine.get(line.id)!;
        const qty = Number(line.quantityMt);
        const unitPrice = num(quote.unitPrice)!;
        const lineTotal = unitPrice * qty;
        offerTotal += lineTotal;
        const template = line.catalogProduct.specTemplate.schema as BulkSpecTemplate;
        const specValues = line.specValues as Record<string, string | number>;
        lineRows.push({
          lineId: line.id,
          productName: line.catalogProduct.name,
          packingType: line.packingType.name,
          specificationSummary: summarizeSpec(specValues, template),
          quantityMt: qty,
          unitPrice,
          lineTotal,
        });
      }

      const offer = await tx.bcContainerOffer.create({
        data: {
          workspaceId: id,
          offerReference,
          version,
          status: "DRAFT",
          offerTotal,
          currency: ws.bulkContainerDetails?.currency ?? "USD",
          validUntil,
          offerNotes: input.offerNotes,
          createdById: actor.id,
          lines: {
            create: lineRows.map((l) => ({
              lineId: l.lineId,
              productName: l.productName,
              packingType: l.packingType,
              specificationSummary: l.specificationSummary,
              quantityMt: l.quantityMt,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      await tx.bulkContainerDetails.update({
        where: { workspaceId: id },
        data: { activeOfferId: offer.id },
      });

      await applyBcTransition(tx, id, "create_offer", actor, "bulk_offer_created", { offerId: offer.id });
    });

    return this.getProcurement(id);
  }

  async sendOffer(id: string, offerId: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");

    await this.prisma.$transaction(async (tx) => {
      const offer = await tx.bcContainerOffer.findFirstOrThrow({
        where: { id: offerId, workspaceId: id },
      });
      if (offer.status !== "DRAFT") throw new AppError(409, "OFFER_NOT_DRAFT");

      await tx.bcContainerOffer.update({
        where: { id: offerId },
        data: { status: "SENT", sentAt: new Date() },
      });
      await tx.bulkContainerDetails.update({
        where: { workspaceId: id },
        data: { activeOfferId: offerId },
      });
      await applyBcTransition(tx, id, "send_offer", actor, "bulk_offer_sent", { offerId });
    });
    return this.getProcurement(id);
  }

  async getBuyerOffer(offerId: string, actor: AuthUser) {
    const offer = await this.prisma.bcContainerOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: { lines: true, workspace: { include: { bulkContainerDetails: true } } },
    });
    const ws = offer.workspace;
    if (ws.type !== "BULK_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

    if (actor.role === "BUYER") {
      const part = await this.prisma.workspaceParticipant.findFirst({
        where: { workspaceId: ws.id, userId: actor.id, participantRole: "OWNER" },
      });
      if (!part) throw new AppError(403, "FORBIDDEN");
    } else if (actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN");
    }

    if (!offer.viewedAt && actor.role === "BUYER") {
      await this.prisma.$transaction(async (tx) => {
        await tx.bcContainerOffer.update({ where: { id: offerId }, data: { viewedAt: new Date() } });
        await appendTimeline(tx, ws.id, "bulk_offer_viewed", actor.id, { offerId });
      });
      offer.viewedAt = new Date();
    }

    return toOfferDTO(ws, offer);
  }

  async approveOffer(offerId: string, actor: AuthUser) {
    if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN");

    const offer = await this.prisma.bcContainerOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: { workspace: true },
    });
    if (offer.status !== "SENT") throw new AppError(409, "OFFER_NOT_ACTIVE");
    if (offer.validUntil.getTime() < Date.now()) {
      throw new AppError(409, "OFFER_EXPIRED");
    }

    const part = await this.prisma.workspaceParticipant.findFirst({
      where: { workspaceId: offer.workspaceId, userId: actor.id, participantRole: "OWNER" },
    });
    if (!part) throw new AppError(403, "FORBIDDEN");

    await this.prisma.$transaction(async (tx) => {
      await tx.bcContainerOffer.update({
        where: { id: offerId },
        data: { status: "APPROVED", approvedAt: new Date() },
      });
      await applyBcTransition(tx, offer.workspaceId, "approve_offer", actor, "bulk_offer_approved", { offerId });
      const { autoGenerateFreightEstimateInTx } = await import("../freight-estimate/freight-estimate.service.js");
      await autoGenerateFreightEstimateInTx(tx, offer.workspaceId, actor.id);
    });
    return this.getBuyerOffer(offerId, actor);
  }

  async requestRevision(offerId: string, input: BuyerBcRevisionInput, actor: AuthUser) {
    if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN");

    const offer = await this.prisma.bcContainerOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: { workspace: true },
    });
    if (offer.status !== "SENT") throw new AppError(409, "OFFER_NOT_ACTIVE");

    const part = await this.prisma.workspaceParticipant.findFirst({
      where: { workspaceId: offer.workspaceId, userId: actor.id, participantRole: "OWNER" },
    });
    if (!part) throw new AppError(403, "FORBIDDEN");

    await this.prisma.$transaction(async (tx) => {
      await tx.bcRevisionRequest.create({
        data: {
          workspaceId: offer.workspaceId,
          offerId,
          message: input.message,
          createdById: actor.id,
        },
      });
      await applyBcTransition(tx, offer.workspaceId, "request_revision", actor, "bulk_offer_revision_requested", {
        offerId,
      });
    });
    return this.getBuyerOffer(offerId, actor);
  }

  async expireOffers(actor: AuthUser) {
    const now = new Date();
    const expired = await this.prisma.bcContainerOffer.findMany({
      where: { status: "SENT", validUntil: { lt: now } },
      include: { workspace: true },
      take: 50,
    });

    let count = 0;
    const transitionActor: AuthUser =
      actor.role === "ADMIN"
        ? actor
        : {
            id: "00000000-0000-0000-0000-000000000001",
            role: "SYSTEM",
            email: "system@demaxtore.local",
          };

    for (const offer of expired) {
      if (offer.workspace.state !== "BC_BUYER_REVIEW") continue;
      await this.prisma.$transaction(async (tx) => {
        await tx.bcContainerOffer.update({ where: { id: offer.id }, data: { status: "EXPIRED" } });
        await applyBcTransition(tx, offer.workspaceId, "expire_offer", transitionActor, "bulk_offer_expired", {
          offerId: offer.id,
        });
      });
      count++;
    }
    return count;
  }
}
