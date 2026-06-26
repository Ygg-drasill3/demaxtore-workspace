import { Prisma, PrismaClient } from "@prisma/client";
import {
  findMcTransition,
  MC_OFFER_VALIDITY_HOURS,
  type MixedContainerAction,
  type MixedContainerState,
} from "@dmx/contracts/mixed-container.fsm";
import type {
  AdminProcurementQuoteInput,
  CreateContainerOfferInput,
  BuyerRevisionInput,
} from "@dmx/contracts/mixed-container.zod";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "./mixed-container.policy.js";
import { toMixedContainerDTO } from "./mixed-container.service.js";
import { assertLinesHavePackingType } from "../packing-type/packing-type.helpers.js";

const WS_INCLUDE = {
  mixedContainerDetails: true,
  containerLines: {
    where: { removedAt: null },
    orderBy: { sortOrder: "asc" as const },
    include: { catalogProduct: { include: { category: true } }, packingType: true },
  },
  createdBy: { select: { displayName: true, organisation: { select: { name: true } } } },
};

function num(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
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

async function applyMcTransition(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  action: MixedContainerAction,
  actor: AuthUser,
  auditEvent: string,
  payload: Record<string, unknown> = {},
) {
  await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
  const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const from = ws.state as MixedContainerState;
  const t = findMcTransition(from, action);
  if (!t) throw new AppError(400, "INVALID_TRANSITION", { from, action });
  if (!t.allowedRoles.includes(actor.role as "BUYER" | "ADMIN" | "SYSTEM")) {
    throw new AppError(403, "FORBIDDEN_ROLE");
  }
  await tx.workspace.update({ where: { id: workspaceId }, data: { state: t.to } });
  await appendTimeline(tx, workspaceId, auditEvent, actor.id, payload);
  return t.to;
}

function toOfferDTO(
  ws: { id: string; externalRef: string; state: string },
  offer: {
    id: string;
    version: number;
    status: string;
    currency: string;
    productSubtotal: Prisma.Decimal | null;
    exportExecutionFee: Prisma.Decimal | null;
    estimatedFreight: Prisma.Decimal | null;
    offerTotal: Prisma.Decimal | null;
    validityDate: Date | null;
    offerNotes: string | null;
    sentAt: Date | null;
    viewedAt: Date | null;
    approvedAt: Date | null;
    lines: Array<{
      id: string;
      containerLineId: string;
      productRef: string;
      productName: string;
      packaging: string;
      originCountry: string | null;
      palletCount: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>;
  },
) {
  const now = Date.now();
  const expiresInSeconds =
    offer.validityDate && offer.status === "SENT"
      ? Math.max(0, Math.floor((offer.validityDate.getTime() - now) / 1000))
      : null;

  return {
    id: offer.id,
    workspaceId: ws.id,
    externalRef: ws.externalRef,
    state: ws.state,
    version: offer.version,
    status: offer.status,
    currency: offer.currency,
    lines: offer.lines.map((l) => ({
      id: l.id,
      containerLineId: l.containerLineId,
      productRef: l.productRef,
      productName: l.productName,
      packaging: l.packaging,
      originCountry: l.originCountry,
      palletCount: l.palletCount,
      unitPrice: num(l.unitPrice)!,
      lineTotal: num(l.lineTotal)!,
    })),
    productSubtotal: num(offer.productSubtotal) ?? 0,
    exportExecutionFee: num(offer.exportExecutionFee) ?? 0,
    estimatedFreight: num(offer.estimatedFreight) ?? 0,
    offerTotal: num(offer.offerTotal) ?? 0,
    validityDate: offer.validityDate?.toISOString() ?? null,
    expiresInSeconds,
    offerNotes: offer.offerNotes,
    sentAt: offer.sentAt?.toISOString() ?? null,
    viewedAt: offer.viewedAt?.toISOString() ?? null,
    approvedAt: offer.approvedAt?.toISOString() ?? null,
  };
}

export class MixedContainerProcurementService {
  constructor(public readonly prisma: PrismaClient) {}

  private async countFreightActive() {
    const links = await this.prisma.mcOrderLink.findMany({
      where: { smartContainer: { type: "MIXED_CONTAINER", state: "MC_EXECUTION_ACTIVE" } },
      select: { supplierOrderId: true },
    });
    if (links.length === 0) return 0;
    return this.prisma.freightRequest.count({
      where: {
        orderId: { in: links.map((l) => l.supplierOrderId) },
        status: { notIn: ["CANCELLED", "EXPIRED", "CONVERTED_TO_SHIPMENT"] },
      },
    });
  }

  private async countShipmentActive() {
    const links = await this.prisma.mcOrderLink.findMany({
      where: { smartContainer: { type: "MIXED_CONTAINER", state: { in: ["MC_EXECUTION_ACTIVE", "MC_EXECUTION_COMPLETE"] } } },
      select: { supplierOrderId: true },
    });
    if (links.length === 0) return 0;
    return this.prisma.workspace.count({
      where: {
        spawnedFromId: { in: links.map((l) => l.supplierOrderId) },
        type: "SHIPMENT",
        state: { notIn: ["DELIVERED", "COMPLETED", "CLOSED", "CANCELLED"] },
      },
    });
  }

  async inbox() {
    const rows = await this.prisma.workspace.findMany({
      where: {
        type: "MIXED_CONTAINER",
        state: {
          in: [
            "MC_PRICING_REQUESTED",
            "MC_PROCUREMENT_IN_PROGRESS",
            "MC_OFFER_READY",
            "MC_BUYER_REVIEW",
            "MC_REVISION_REQUESTED",
            "MC_APPROVED",
            "MC_ALLOCATION_IN_PROGRESS",
            "MC_PROFORMA_PENDING",
            "MC_PAYMENT_TRACKING",
            "MC_EXECUTION_READY",
            "MC_EXECUTION_ACTIVE",
            "MC_EXECUTION_COMPLETE",
            "MC_EXPIRED",
          ],
        },
      },
      include: {
        mixedContainerDetails: true,
        containerLines: { where: { removedAt: null } },
        createdBy: {
          select: {
            displayName: true,
            organisation: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const managerIds = rows
      .map((r) => r.mixedContainerDetails?.assignedManagerId)
      .filter(Boolean) as string[];
    const managers =
      managerIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: managerIds } },
            select: { id: true, displayName: true },
          })
        : [];
    const managerMap = new Map(managers.map((m) => [m.id, m.displayName]));

    return rows.map((ws) => ({
      id: ws.id,
      externalRef: ws.externalRef,
      state: ws.state,
      buyerName: ws.createdBy.displayName,
      buyerOrgName: ws.createdBy.organisation?.name ?? null,
      productCount: ws.containerLines.length,
      currentPalletCount: ws.mixedContainerDetails?.currentPalletCount ?? 0,
      estValueMin: num(ws.mixedContainerDetails?.estValueMin),
      estValueMax: num(ws.mixedContainerDetails?.estValueMax),
      priority: ws.mixedContainerDetails?.priority ?? "NORMAL",
      assignedManagerName: ws.mixedContainerDetails?.assignedManagerId
        ? managerMap.get(ws.mixedContainerDetails.assignedManagerId) ?? null
        : null,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    }));
  }

  async kpis() {
    const counts = await this.prisma.workspace.groupBy({
      by: ["state"],
      where: { type: "MIXED_CONTAINER" },
      _count: true,
    });
    const map = new Map(counts.map((c) => [c.state, c._count]));
    const paymentsPending = await this.prisma.mcPaymentRecord.count({
      where: {
        paymentStatus: { in: ["PENDING", "PAYMENT_SENT"] },
        containerRequest: { type: "MIXED_CONTAINER", state: "MC_PAYMENT_TRACKING" },
      },
    });
    const paymentsConfirmed = await this.prisma.mcPaymentRecord.count({
      where: {
        paymentStatus: "PAYMENT_CONFIRMED",
        containerRequest: { type: "MIXED_CONTAINER" },
      },
    });

    return {
      pricingRequested: map.get("MC_PRICING_REQUESTED") ?? 0,
      procurementInProgress: map.get("MC_PROCUREMENT_IN_PROGRESS") ?? 0,
      offerReady: map.get("MC_OFFER_READY") ?? 0,
      awaitingBuyerReview: map.get("MC_BUYER_REVIEW") ?? 0,
      approved: map.get("MC_APPROVED") ?? 0,
      expired: map.get("MC_EXPIRED") ?? 0,
      allocationsPending:
        (map.get("MC_APPROVED") ?? 0) + (map.get("MC_ALLOCATION_IN_PROGRESS") ?? 0),
      proformasPending: map.get("MC_PROFORMA_PENDING") ?? 0,
      paymentsPending,
      paymentsConfirmed,
      executionReady: map.get("MC_EXECUTION_READY") ?? 0,
      ordersSpawned: map.get("MC_EXECUTION_ACTIVE") ?? 0,
      freightActive: await this.countFreightActive(),
      shipmentActive: await this.countShipmentActive(),
      executionComplete: map.get("MC_EXECUTION_COMPLETE") ?? 0,
    };
  }

  async getProcurement(id: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        ...WS_INCLUDE,
        mcProcurementQuotes: {
          include: {
            containerLine: { include: { catalogProduct: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
        mcContainerOffers: {
          include: { lines: true },
          orderBy: { version: "desc" },
          take: 5,
        },
        mcRevisionRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

    const categories = [...new Set(ws.containerLines.map((l) => l.catalogProduct.category.name))];

    return {
      container: toMixedContainerDTO(ws as Parameters<typeof toMixedContainerDTO>[0]),
      buyerNotes: ws.mixedContainerDetails?.buyerNotes ?? null,
      priority: ws.mixedContainerDetails?.priority ?? "NORMAL",
      assignedManagerId: ws.mixedContainerDetails?.assignedManagerId ?? null,
      categories,
      quotes: ws.mcProcurementQuotes.map((q) => ({
        id: q.id,
        containerLineId: q.containerLineId,
        productRef: q.containerLine.catalogProduct.productRef,
        productName: q.containerLine.catalogProduct.name,
        supplierCode: q.supplierCode,
        exwPrice: num(q.exwPrice)!,
        currency: q.currency,
        priceUnit: q.priceUnit,
        notes: q.notes,
        validityDate: q.validityDate?.toISOString() ?? null,
      })),
      offers: ws.mcContainerOffers.map((o) => toOfferDTO(ws, o)),
      revisions: ws.mcRevisionRequests,
    };
  }

  async startProcurement(id: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    await this.prisma.$transaction(async (tx) => {
      await tx.mixedContainerDetails.update({
        where: { workspaceId: id },
        data: { procurementStartedAt: new Date() },
      });
      await applyMcTransition(tx, id, "start_procurement", actor, "mixed_container.procurement_started");
    });
    return this.getProcurement(id);
  }

  async assignManager(id: string, managerId: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    await this.prisma.$transaction(async (tx) => {
      await tx.mixedContainerDetails.update({
        where: { workspaceId: id },
        data: { assignedManagerId: managerId },
      });
      const ws = await tx.workspace.findUniqueOrThrow({ where: { id } });
      if (findMcTransition(ws.state as MixedContainerState, "assign_buyer_manager")) {
        await applyMcTransition(tx, id, "assign_buyer_manager", actor, "mixed_container.manager_assigned", {
          managerId,
        });
      } else {
        await appendTimeline(tx, id, "mixed_container.manager_assigned", actor.id, { managerId });
      }
    });
    return this.getProcurement(id);
  }

  async upsertQuote(id: string, input: AdminProcurementQuoteInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    const line = await this.prisma.containerLine.findFirst({
      where: { id: input.containerLineId, workspaceId: id, removedAt: null },
    });
    if (!line) throw new AppError(404, "LINE_NOT_FOUND");

    const existing = await this.prisma.mcProcurementQuote.findFirst({
      where: { workspaceId: id, containerLineId: input.containerLineId },
    });

    const data = {
      supplierCode: input.supplierCode,
      exwPrice: input.exwPrice,
      currency: input.currency,
      priceUnit: input.priceUnit,
      notes: input.notes,
      validityDate: input.validityDate ? new Date(input.validityDate) : null,
    };

    if (existing) {
      await this.prisma.mcProcurementQuote.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.mcProcurementQuote.create({
        data: {
          workspaceId: id,
          containerLineId: input.containerLineId,
          ...data,
          createdById: actor.id,
        },
      });
    }

    return this.getProcurement(id);
  }

  async createOffer(id: string, input: CreateContainerOfferInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");

    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        containerLines: {
          where: { removedAt: null },
          include: { catalogProduct: true, packingType: true },
        },
        mcProcurementQuotes: true,
        mixedContainerDetails: true,
      },
    });
    if (!["MC_PROCUREMENT_IN_PROGRESS", "MC_REVISION_REQUESTED", "MC_EXPIRED"].includes(ws.state)) {
      throw new AppError(409, "INVALID_STATE_FOR_OFFER");
    }
    await assertLinesHavePackingType(ws.containerLines);

    const quoteByLine = new Map(ws.mcProcurementQuotes.map((q) => [q.containerLineId, q]));
    for (const line of ws.containerLines) {
      if (!quoteByLine.has(line.id)) {
        throw new AppError(400, "MISSING_PROCUREMENT_QUOTE", { lineId: line.id });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const from = ws.state as MixedContainerState;
      if (from === "MC_EXPIRED" && findMcTransition(from, "regenerate_offer")) {
        await applyMcTransition(tx, id, "regenerate_offer", actor, "mixed_container.procurement_started");
      } else if (from === "MC_REVISION_REQUESTED" && findMcTransition(from, "resume_procurement")) {
        await applyMcTransition(tx, id, "resume_procurement", actor, "mixed_container.procurement_started");
      }

      const lastVersion = await tx.mcContainerOffer.findFirst({
        where: { workspaceId: id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = (lastVersion?.version ?? 0) + 1;

      let productSubtotal = 0;
      const lineRows: Array<{
        containerLineId: string;
        productRef: string;
        productName: string;
        packaging: string;
        originCountry: string | null;
        palletCount: number;
        unitPrice: number;
        lineTotal: number;
      }> = [];

      for (const line of ws.containerLines) {
        const quote = quoteByLine.get(line.id)!;
        const unitPrice = num(quote.exwPrice)!;
        const lineTotal = unitPrice * line.palletCount;
        productSubtotal += lineTotal;
        lineRows.push({
          containerLineId: line.id,
          productRef: line.catalogProduct.productRef,
          productName: line.catalogProduct.name,
          packaging: line.catalogProduct.packagingDescription,
          originCountry: line.catalogProduct.originCountry,
          palletCount: line.palletCount,
          unitPrice,
          lineTotal,
        });
      }

      const offerTotal =
        productSubtotal + (input.exportExecutionFee ?? 0) + (input.estimatedFreight ?? 0);
      const validityDate = new Date(Date.now() + (input.validityHours ?? MC_OFFER_VALIDITY_HOURS) * 3_600_000);

      const offer = await tx.mcContainerOffer.create({
        data: {
          workspaceId: id,
          version,
          status: "DRAFT",
          exportExecutionFee: input.exportExecutionFee ?? 0,
          estimatedFreight: input.estimatedFreight ?? 0,
          productSubtotal,
          offerTotal,
          currency: ws.mixedContainerDetails?.currency ?? "USD",
          validityDate,
          offerNotes: input.offerNotes,
          createdById: actor.id,
          lines: {
            create: lineRows.map((l) => ({
              containerLineId: l.containerLineId,
              productRef: l.productRef,
              productName: l.productName,
              packaging: l.packaging,
              originCountry: l.originCountry,
              palletCount: l.palletCount,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      await tx.mixedContainerDetails.update({
        where: { workspaceId: id },
        data: { activeOfferId: offer.id },
      });

      await applyMcTransition(tx, id, "create_offer", actor, "mixed_container.offer_created", {
        offerId: offer.id,
      });
    });

    return this.getProcurement(id);
  }

  async sendOffer(id: string, offerId: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");

    await this.prisma.$transaction(async (tx) => {
      const offer = await tx.mcContainerOffer.findFirstOrThrow({
        where: { id: offerId, workspaceId: id },
      });
      if (offer.status !== "DRAFT") throw new AppError(409, "OFFER_NOT_DRAFT");

      await tx.mcContainerOffer.update({
        where: { id: offerId },
        data: { status: "SENT", sentAt: new Date() },
      });
      await tx.mixedContainerDetails.update({
        where: { workspaceId: id },
        data: { activeOfferId: offerId },
      });
      await applyMcTransition(tx, id, "send_offer", actor, "mixed_container.offer_sent", { offerId });
    });
    return this.getProcurement(id);
  }

  async getBuyerOffer(offerId: string, actor: AuthUser) {
    const offer = await this.prisma.mcContainerOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: { lines: true, workspace: { include: { mixedContainerDetails: true } } },
    });
    const ws = offer.workspace;
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

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
        await tx.mcContainerOffer.update({ where: { id: offerId }, data: { viewedAt: new Date() } });
        await appendTimeline(tx, ws.id, "mixed_container.offer_viewed", actor.id, { offerId });
      });
      offer.viewedAt = new Date();
    }

    return toOfferDTO(ws, offer);
  }

  async approveOffer(offerId: string, actor: AuthUser) {
    if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN");

    const offer = await this.prisma.mcContainerOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: { workspace: true },
    });
    if (offer.status !== "SENT") throw new AppError(409, "OFFER_NOT_ACTIVE");
    if (offer.validityDate && offer.validityDate.getTime() < Date.now()) {
      throw new AppError(409, "OFFER_EXPIRED");
    }

    const part = await this.prisma.workspaceParticipant.findFirst({
      where: { workspaceId: offer.workspaceId, userId: actor.id, participantRole: "OWNER" },
    });
    if (!part) throw new AppError(403, "FORBIDDEN");

    await this.prisma.$transaction(async (tx) => {
      await tx.mcContainerOffer.update({
        where: { id: offerId },
        data: { status: "APPROVED", approvedAt: new Date() },
      });
      await applyMcTransition(tx, offer.workspaceId, "approve_offer", actor, "mixed_container.offer_approved", {
        offerId,
      });
      const { autoGenerateFreightEstimateInTx } = await import("../freight-estimate/freight-estimate.service.js");
      await autoGenerateFreightEstimateInTx(tx, offer.workspaceId, actor.id);
    });
    return this.getBuyerOffer(offerId, actor);
  }

  async requestRevision(offerId: string, input: BuyerRevisionInput, actor: AuthUser) {
    if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN");

    const offer = await this.prisma.mcContainerOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: { workspace: true },
    });
    if (offer.status !== "SENT") throw new AppError(409, "OFFER_NOT_ACTIVE");

    const part = await this.prisma.workspaceParticipant.findFirst({
      where: { workspaceId: offer.workspaceId, userId: actor.id, participantRole: "OWNER" },
    });
    if (!part) throw new AppError(403, "FORBIDDEN");

    await this.prisma.$transaction(async (tx) => {
      await tx.mcRevisionRequest.create({
        data: {
          workspaceId: offer.workspaceId,
          offerId,
          revisionType: input.revisionType,
          comment: input.comment,
          containerLineId: input.containerLineId,
          createdById: actor.id,
        },
      });
      await applyMcTransition(tx, offer.workspaceId, "request_revision", actor, "mixed_container.revision_requested", {
        offerId,
        revisionType: input.revisionType,
      });
    });
    return this.getBuyerOffer(offerId, actor);
  }

  async expireOffers(actor: AuthUser) {
    const systemActor: AuthUser = actor.role === "ADMIN" ? actor : { ...actor, role: "ADMIN", id: actor.id };
    const now = new Date();
    const expired = await this.prisma.mcContainerOffer.findMany({
      where: { status: "SENT", validityDate: { lt: now } },
      include: { workspace: true },
      take: 50,
    });

    let count = 0;
    for (const offer of expired) {
      if (offer.workspace.state !== "MC_BUYER_REVIEW") continue;
      await this.prisma.$transaction(async (tx) => {
        await tx.mcContainerOffer.update({ where: { id: offer.id }, data: { status: "EXPIRED" } });
        await applyMcTransition(
          tx,
          offer.workspaceId,
          "expire_offer",
          { id: "00000000-0000-0000-0000-000000000001", role: "SYSTEM", email: "system@demaxtore.local" },
          "mixed_container.offer_expired",
          { offerId: offer.id },
        );
      });
      count++;
    }
    return count;
  }

  async resumeProcurement(id: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    await this.prisma.$transaction(async (tx) => {
      await applyMcTransition(tx, id, "resume_procurement", actor, "mixed_container.procurement_started");
    });
    return this.getProcurement(id);
  }
}
