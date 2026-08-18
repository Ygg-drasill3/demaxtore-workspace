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
import type { McInternalNoteInput, McProcurementInboxFilters } from "@dmx/contracts/mixed-container-procurement";
import {
  mcStateToProcurementStatus,
  TIMELINE_EVENT_LABELS,
} from "@dmx/contracts/mixed-container-procurement";
import { AppError } from "../../utils/httpErrors.js";
import { logger } from "../../config/logger.js";
import type { AuthUser } from "./mixed-container.policy.js";
import { assertCanAccessMixedContainer, assertCanManageProcurement } from "./mixed-container.policy.js";
import { toMixedContainerDTO } from "./mixed-container.service.js";
import { assertLinesHavePackingType } from "../packing-type/packing-type.helpers.js";
import {
  notifyBuyerManagerAssigned,
  notifyBuyerProcurementStatus,
  notifyBuyerProposalRevised,
  notifyAdminsRevisionRequested,
  nextCpRef,
  recordProcurementStatusHistory,
} from "./mc-procurement.helpers.js";
import { MixedContainerOrganizationService } from "./mixed-container-organization.service.js";

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

async function handleProcurementSideEffects(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    fromState: string;
    toState: string;
    actorUserId: string;
    buyerUserId: string;
    procurementRequestRef: string | null;
    note?: string;
    notifyStatus?: ReturnType<typeof mcStateToProcurementStatus>;
  },
) {
  await recordProcurementStatusHistory(tx, {
    workspaceId: input.workspaceId,
    fromState: input.fromState,
    toState: input.toState,
    actorUserId: input.actorUserId,
    note: input.note,
  });
  if (input.procurementRequestRef && input.notifyStatus) {
    await notifyBuyerProcurementStatus(tx, {
      workspaceId: input.workspaceId,
      buyerUserId: input.buyerUserId,
      procurementRequestRef: input.procurementRequestRef,
      status: input.notifyStatus,
    });
  }
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
  ws: {
    id: string;
    externalRef: string;
    state: string;
    mixedContainerDetails?: { procurementRequestRef: string | null; commercialProposalRef: string | null; activeOfferId?: string | null } | null;
  },
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
    createdAt: Date;
    lines: Array<{
      id: string;
      containerLineId: string;
      productRef: string;
      productName: string;
      brand: string | null;
      packaging: string;
      palletCount: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>;
  },
  extras?: {
    versions?: Array<{
      id: string;
      version: number;
      status: string;
      sentAt: Date | null;
      approvedAt: Date | null;
      createdAt: Date;
    }>;
    buyerRevisionNotes?: Array<{
      id: string;
      offerId: string;
      revisionType: string;
      comment: string | null;
      createdAt: Date;
      offer: { version: number };
    }>;
  },
) {
  const now = Date.now();
  const expiresInSeconds =
    offer.validityDate && offer.status === "SENT"
      ? Math.max(0, Math.floor((offer.validityDate.getTime() - now) / 1000))
      : null;

  const exportFee = num(offer.exportExecutionFee) ?? 0;
  const freight = num(offer.estimatedFreight) ?? 0;
  const logisticsCost = exportFee + freight;
  const productSubtotal = num(offer.productSubtotal) ?? 0;
  const estimatedTotalCost = num(offer.offerTotal) ?? productSubtotal + logisticsCost;
  const proposalRef = ws.mixedContainerDetails?.commercialProposalRef ?? null;
  const activeOfferId = ws.mixedContainerDetails?.activeOfferId ?? null;

  return {
    id: offer.id,
    workspaceId: ws.id,
    procurementRequestRef: ws.mixedContainerDetails?.procurementRequestRef ?? null,
    proposalRef,
    externalRef: ws.externalRef,
    state: ws.state,
    procurementStatus: mcStateToProcurementStatus(ws.state),
    version: offer.version,
    status: offer.status,
    currency: offer.currency,
    lines: offer.lines.map((l) => ({
      id: l.id,
      containerLineId: l.containerLineId,
      productRef: l.productRef,
      productName: l.productName,
      brand: l.brand,
      packaging: l.packaging,
      quantity: l.palletCount,
      unitPrice: num(l.unitPrice)!,
      lineTotal: num(l.lineTotal)!,
    })),
    productSubtotal,
    logisticsCost,
    estimatedTotalCost,
    validityDate: offer.validityDate?.toISOString() ?? null,
    expiresInSeconds,
    offerNotes: offer.offerNotes,
    proposalDate: (offer.sentAt ?? offer.createdAt).toISOString(),
    sentAt: offer.sentAt?.toISOString() ?? null,
    viewedAt: offer.viewedAt?.toISOString() ?? null,
    approvedAt: offer.approvedAt?.toISOString() ?? null,
    ...(extras?.versions
      ? {
          versions: extras.versions.map((v) => ({
            id: v.id,
            version: v.version,
            status: v.status,
            proposalDate: (v.sentAt ?? v.createdAt).toISOString(),
            sentAt: v.sentAt?.toISOString() ?? null,
            approvedAt: v.approvedAt?.toISOString() ?? null,
            isActive: v.id === activeOfferId,
          })),
        }
      : {}),
    ...(extras?.buyerRevisionNotes
      ? {
          buyerRevisionNotes: extras.buyerRevisionNotes.map((r) => ({
            id: r.id,
            offerId: r.offerId,
            offerVersion: r.offer.version,
            revisionType: r.revisionType,
            comment: r.comment,
            createdAt: r.createdAt.toISOString(),
          })),
        }
      : {}),
  };
}

export class MixedContainerProcurementService {
  constructor(
    public readonly prisma: PrismaClient,
    private readonly organizationService = new MixedContainerOrganizationService(prisma),
  ) {}

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

  async inbox(filters: McProcurementInboxFilters = {}) {
    const stateFilter = filters.status?.startsWith("MC_")
      ? [filters.status]
      : filters.status
        ? this.statesForProcurementStatus(filters.status as ReturnType<typeof mcStateToProcurementStatus>)
        : [
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
          ];

    const detailsWhere: Prisma.MixedContainerDetailsWhereInput = {};
    if (filters.managerId) detailsWhere.assignedManagerId = filters.managerId;
    if (filters.submittedFrom || filters.submittedTo) {
      detailsWhere.pricingRequestedAt = {
        ...(filters.submittedFrom ? { gte: new Date(filters.submittedFrom) } : {}),
        ...(filters.submittedTo ? { lte: new Date(filters.submittedTo) } : {}),
      };
    }

    const rows = await this.prisma.workspace.findMany({
      where: {
        type: "MIXED_CONTAINER",
        state: { in: stateFilter },
        ...(Object.keys(detailsWhere).length > 0 ? { mixedContainerDetails: detailsWhere } : {}),
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
      procurementRequestRef: ws.mixedContainerDetails?.procurementRequestRef ?? null,
      state: ws.state,
      procurementStatus: mcStateToProcurementStatus(ws.state),
      buyerName: ws.createdBy.displayName,
      buyerOrgName: ws.createdBy.organisation?.name ?? null,
      destinationPort: ws.mixedContainerDetails?.destinationMarket ?? null,
      productCount: ws.containerLines.length,
      currentPalletCount: ws.mixedContainerDetails?.currentPalletCount ?? 0,
      estValueMin: num(ws.mixedContainerDetails?.estValueMin),
      estValueMax: num(ws.mixedContainerDetails?.estValueMax),
      priority: ws.mixedContainerDetails?.priority ?? "NORMAL",
      assignedManagerId: ws.mixedContainerDetails?.assignedManagerId ?? null,
      assignedManagerName: ws.mixedContainerDetails?.assignedManagerId
        ? managerMap.get(ws.mixedContainerDetails.assignedManagerId) ?? null
        : null,
      submissionDate: ws.mixedContainerDetails?.pricingRequestedAt?.toISOString() ?? null,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    }));
  }

  private statesForProcurementStatus(status: ReturnType<typeof mcStateToProcurementStatus>): string[] {
    switch (status) {
      case "SUBMITTED":
        return ["MC_PRICING_REQUESTED"];
      case "UNDER_PROCUREMENT":
        return ["MC_PROCUREMENT_IN_PROGRESS"];
      case "COMMERCIAL_PROPOSAL_READY":
        return ["MC_OFFER_READY"];
      case "BUYER_REVIEW":
        return ["MC_BUYER_REVIEW"];
      case "REVISION_REQUESTED":
        return ["MC_REVISION_REQUESTED"];
      case "APPROVED":
        return ["MC_APPROVED"];
      case "PAYMENTS_PENDING":
        return ["MC_ALLOCATION_IN_PROGRESS", "MC_PROFORMA_PENDING"];
      case "PAYMENTS_VERIFIED":
        return ["MC_PAYMENT_TRACKING"];
      case "ORGANIZATION_STARTED":
        return ["MC_EXECUTION_READY", "MC_EXECUTION_ACTIVE"];
      case "COMPLETED":
        return ["MC_EXECUTION_COMPLETE"];
      default:
        return ["MC_PRICING_REQUESTED"];
    }
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
      dashboard: {
        newRequests: map.get("MC_PRICING_REQUESTED") ?? 0,
        assignedRequests: await this.prisma.workspace.count({
          where: {
            type: "MIXED_CONTAINER",
            state: {
              in: [
                "MC_PRICING_REQUESTED",
                "MC_PROCUREMENT_IN_PROGRESS",
                "MC_OFFER_READY",
                "MC_BUYER_REVIEW",
                "MC_REVISION_REQUESTED",
              ],
            },
            mixedContainerDetails: { assignedManagerId: { not: null } },
          },
        }),
        waitingForReview: map.get("MC_BUYER_REVIEW") ?? 0,
        proposalPreparationQueue:
          (map.get("MC_PROCUREMENT_IN_PROGRESS") ?? 0) + (map.get("MC_OFFER_READY") ?? 0),
      },
    };
  }

  async listProcurementManagers() {
    const admins = await this.prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, displayName: true, email: true },
      orderBy: { displayName: "asc" },
    });
    return admins;
  }

  async getProcurementRequest(id: string, actor: AuthUser, includeInternalNotes = false) {
    await assertCanAccessMixedContainer(this.prisma, actor, id);
    const isAdmin = actor.role === "ADMIN";

    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        ...WS_INCLUDE,
        createdBy: {
          select: {
            displayName: true,
            organisation: { select: { name: true } },
          },
        },
        timelineEvents: { orderBy: { createdAt: "desc" }, take: 100 },
        mcProcurementStatusHistory: { orderBy: { createdAt: "desc" }, take: 100 },
        ...(isAdmin && includeInternalNotes
          ? { mcInternalNotes: { orderBy: { createdAt: "desc" }, take: 50 } }
          : {}),
      },
    });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

    const d = ws.mixedContainerDetails!;
    let assignedManagerName: string | null = null;
    if (d.assignedManagerId) {
      const mgr = await this.prisma.user.findUnique({
        where: { id: d.assignedManagerId },
        select: { displayName: true },
      });
      assignedManagerName = mgr?.displayName ?? null;
    }

    const actorIds = [
      ...ws.mcProcurementStatusHistory.map((h) => h.actorUserId),
      ...ws.timelineEvents.map((e) => e.actorUserId),
    ].filter(Boolean) as string[];
    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: [...new Set(actorIds)] } },
            select: { id: true, displayName: true },
          })
        : [];
    const actorMap = new Map(actors.map((a) => [a.id, a.displayName]));

    const container = toMixedContainerDTO(ws as Parameters<typeof toMixedContainerDTO>[0]);
    const fillPercent = d.maxPalletCapacity > 0
      ? Math.round((container.currentPalletCount / d.maxPalletCapacity) * 100)
      : 0;

    let internalNotes: Array<{ id: string; authorId: string; authorName: string; body: string; createdAt: string }> | undefined;
    if (isAdmin && includeInternalNotes && "mcInternalNotes" in ws) {
      const noteAuthorIds = (ws.mcInternalNotes as Array<{ authorId: string }>).map((n) => n.authorId);
      const noteAuthors =
        noteAuthorIds.length > 0
          ? await this.prisma.user.findMany({
              where: { id: { in: noteAuthorIds } },
              select: { id: true, displayName: true },
            })
          : [];
      const noteAuthorMap = new Map(noteAuthors.map((a) => [a.id, a.displayName]));
      internalNotes = (ws.mcInternalNotes as Array<{ id: string; authorId: string; body: string; createdAt: Date }>).map((n) => ({
        id: n.id,
        authorId: n.authorId,
        authorName: noteAuthorMap.get(n.authorId) ?? "Staff",
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      }));
    }

    return {
      id: ws.id,
      procurementRequestRef: d.procurementRequestRef,
      externalRef: ws.externalRef,
      state: ws.state,
      procurementStatus: mcStateToProcurementStatus(ws.state),
      buyerName: ws.createdBy.displayName,
      buyerOrgName: ws.createdBy.organisation?.name ?? null,
      destinationPort: d.destinationMarket,
      containerType: d.containerType,
      productCount: container.productCount,
      totalPallets: container.currentPalletCount,
      maxPalletCapacity: d.maxPalletCapacity,
      fillPercent,
      submissionDate: d.pricingRequestedAt?.toISOString() ?? null,
      assignedManagerId: d.assignedManagerId,
      assignedManagerName,
      buyerNotes: d.buyerNotes,
      lines: container.lines.map((l) => ({
        id: l.id,
        productRef: l.productRef,
        name: l.name,
        category: l.category,
        packaging: l.packingTypeName,
        palletCount: l.palletCount,
      })),
      statusHistory: ws.mcProcurementStatusHistory.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        workspaceState: h.workspaceState,
        actorUserId: h.actorUserId,
        actorName: h.actorUserId ? actorMap.get(h.actorUserId) ?? null : null,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
      })),
      activityTimeline: ws.timelineEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        label: TIMELINE_EVENT_LABELS[e.eventType] ?? e.eventType.replace(/^mixed_container\./, "").replace(/_/g, " "),
        actorUserId: e.actorUserId,
        payload: (e.payload ?? {}) as Record<string, unknown>,
        createdAt: e.createdAt.toISOString(),
      })),
      ...(internalNotes ? { internalNotes } : {}),
    };
  }

  async addInternalNote(id: string, input: McInternalNoteInput, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    await this.prisma.$transaction(async (tx) => {
      await tx.mcInternalNote.create({
        data: { workspaceId: id, authorId: actor.id, body: input.body },
      });
      await appendTimeline(tx, id, "mixed_container.internal_note_added", actor.id, {});
    });
    return this.getProcurementRequest(id, actor, true);
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
        brand: q.brand,
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
    await assertCanManageProcurement(this.prisma, actor, id);
    await this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.findUniqueOrThrow({
        where: { id },
        include: { mixedContainerDetails: true },
      });
      const fromState = ws.state;
      await tx.mixedContainerDetails.update({
        where: { workspaceId: id },
        data: { procurementStartedAt: new Date() },
      });
      const toState = await applyMcTransition(tx, id, "start_procurement", actor, "mixed_container.procurement_started");
      await handleProcurementSideEffects(tx, {
        workspaceId: id,
        fromState,
        toState,
        actorUserId: actor.id,
        buyerUserId: ws.createdById,
        procurementRequestRef: ws.mixedContainerDetails?.procurementRequestRef ?? null,
        note: "Procurement started",
        notifyStatus: "UNDER_PROCUREMENT",
      });
    });
    return this.getProcurement(id);
  }

  async assignManager(id: string, managerId: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
    const manager = await this.prisma.user.findUniqueOrThrow({
      where: { id: managerId },
      select: { displayName: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.mixedContainerDetails.update({
        where: { workspaceId: id },
        data: { assignedManagerId: managerId },
      });
      const ws = await tx.workspace.findUniqueOrThrow({
        where: { id },
        include: { mixedContainerDetails: true },
      });
      if (findMcTransition(ws.state as MixedContainerState, "assign_buyer_manager")) {
        await applyMcTransition(tx, id, "assign_buyer_manager", actor, "mixed_container.manager_assigned", {
          managerId,
        });
      } else {
        await appendTimeline(tx, id, "mixed_container.manager_assigned", actor.id, { managerId });
      }
      if (ws.mixedContainerDetails?.procurementRequestRef) {
        await notifyBuyerManagerAssigned(tx, {
          workspaceId: id,
          buyerUserId: ws.createdById,
          procurementRequestRef: ws.mixedContainerDetails.procurementRequestRef,
          managerName: manager.displayName,
        });
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
      brand: input.brand,
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
      const txWs = await tx.workspace.findUniqueOrThrow({
        where: { id },
        include: { mixedContainerDetails: true },
      });
      const fromState = txWs.state;
      const from = txWs.state as MixedContainerState;
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
        brand: string | null;
        packaging: string;
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
          brand: quote.brand,
          packaging: line.catalogProduct.packagingDescription,
          palletCount: line.palletCount,
          unitPrice,
          lineTotal,
        });
      }

      const logisticsCost =
        input.logisticsCost ?? (input.exportExecutionFee ?? 0) + (input.estimatedFreight ?? 0);
      const exportExecutionFee = input.logisticsCost != null ? input.logisticsCost : (input.exportExecutionFee ?? 0);
      const estimatedFreight = input.logisticsCost != null ? 0 : (input.estimatedFreight ?? 0);
      const offerTotal = productSubtotal + logisticsCost;
      const validityDate = new Date(Date.now() + (input.validityHours ?? MC_OFFER_VALIDITY_HOURS) * 3_600_000);

      let commercialProposalRef = txWs.mixedContainerDetails?.commercialProposalRef ?? null;
      if (!commercialProposalRef) {
        commercialProposalRef = await nextCpRef(tx);
        await tx.mixedContainerDetails.update({
          where: { workspaceId: id },
          data: { commercialProposalRef },
        });
      }

      const offer = await tx.mcContainerOffer.create({
        data: {
          workspaceId: id,
          version,
          status: "DRAFT",
          exportExecutionFee,
          estimatedFreight,
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
              brand: l.brand,
              packaging: l.packaging,
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

      const toState = await applyMcTransition(tx, id, "create_offer", actor, "mixed_container.offer_created", {
        offerId: offer.id,
      });
      await handleProcurementSideEffects(tx, {
        workspaceId: id,
        fromState,
        toState,
        actorUserId: actor.id,
        buyerUserId: txWs.createdById,
        procurementRequestRef: txWs.mixedContainerDetails?.procurementRequestRef ?? null,
        note: "Commercial proposal draft prepared",
      });
    });

    return this.getProcurement(id);
  }

  async sendOffer(id: string, offerId: string, actor: AuthUser) {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");

    await this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.findUniqueOrThrow({
        where: { id },
        include: { mixedContainerDetails: true },
      });
      const fromState = ws.state;
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
      const toState = await applyMcTransition(tx, id, "send_offer", actor, "mixed_container.offer_sent", { offerId });
      const prRef = ws.mixedContainerDetails?.procurementRequestRef ?? null;
      await handleProcurementSideEffects(tx, {
        workspaceId: id,
        fromState,
        toState,
        actorUserId: actor.id,
        buyerUserId: ws.createdById,
        procurementRequestRef: prRef,
        note: "Commercial proposal published",
      });
      if (prRef) {
        if (offer.version > 1) {
          await notifyBuyerProposalRevised(tx, {
            workspaceId: id,
            buyerUserId: ws.createdById,
            procurementRequestRef: prRef,
          });
        } else {
          await notifyBuyerProcurementStatus(tx, {
            workspaceId: id,
            buyerUserId: ws.createdById,
            procurementRequestRef: prRef,
            status: "BUYER_REVIEW",
          });
        }
      }
    });
    return this.getProcurement(id);
  }

  async getBuyerOffer(offerId: string, actor: AuthUser) {
    const offer = await this.prisma.mcContainerOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: {
        lines: true,
        workspace: { include: { mixedContainerDetails: true } },
      },
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

    const [versions, buyerRevisionNotes] = await Promise.all([
      this.prisma.mcContainerOffer.findMany({
        where: { workspaceId: ws.id },
        orderBy: { version: "asc" },
        select: { id: true, version: true, status: true, sentAt: true, approvedAt: true, createdAt: true },
      }),
      this.prisma.mcRevisionRequest.findMany({
        where: { workspaceId: ws.id },
        orderBy: { createdAt: "desc" },
        include: { offer: { select: { version: true } } },
      }),
    ]);

    return toOfferDTO(ws, offer, { versions, buyerRevisionNotes });
  }

  async getCommercialProposal(workspaceId: string, actor: AuthUser, offerId?: string) {
    await assertCanAccessMixedContainer(this.prisma, actor, workspaceId);
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: { mixedContainerDetails: true },
    });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

    let targetOfferId = offerId;
    if (!targetOfferId) {
      if (actor.role === "BUYER") {
        const visible = await this.prisma.mcContainerOffer.findFirst({
          where: { workspaceId, status: { in: ["SENT", "APPROVED", "EXPIRED"] } },
          orderBy: { version: "desc" },
          select: { id: true },
        });
        if (!visible) throw new AppError(404, "NO_COMMERCIAL_PROPOSAL");
        targetOfferId = visible.id;
      } else {
        targetOfferId = ws.mixedContainerDetails?.activeOfferId ?? undefined;
        if (!targetOfferId) throw new AppError(404, "NO_COMMERCIAL_PROPOSAL");
      }
    }

    return this.getBuyerOffer(targetOfferId, actor);
  }

  async approveOffer(offerId: string, actor: AuthUser) {
    if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN");

    const offer = await this.prisma.mcContainerOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: { workspace: { include: { mixedContainerDetails: true } } },
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
      const fromState = offer.workspace.state;
      await tx.mcContainerOffer.update({
        where: { id: offerId },
        data: { status: "APPROVED", approvedAt: new Date() },
      });
      const approvedState = await applyMcTransition(tx, offer.workspaceId, "approve_offer", actor, "mixed_container.offer_approved", {
        offerId,
      });
      await handleProcurementSideEffects(tx, {
        workspaceId: offer.workspaceId,
        fromState,
        toState: approvedState,
        actorUserId: actor.id,
        buyerUserId: offer.workspace.createdById,
        procurementRequestRef: offer.workspace.mixedContainerDetails?.procurementRequestRef ?? null,
        note: "Proposal approved",
        notifyStatus: "APPROVED",
      });

      const orgState = await applyMcTransition(
        tx,
        offer.workspaceId,
        "begin_organization",
        { id: actor.id, role: "SYSTEM", email: actor.email },
        "mixed_container.organization_started",
        { offerId },
      );
      await handleProcurementSideEffects(tx, {
        workspaceId: offer.workspaceId,
        fromState: approvedState,
        toState: orgState,
        actorUserId: actor.id,
        buyerUserId: offer.workspace.createdById,
        procurementRequestRef: offer.workspace.mixedContainerDetails?.procurementRequestRef ?? null,
        note: "Organization started",
        notifyStatus: "ORGANIZATION_STARTED",
      });

      await this.organizationService.createOrganization(
        tx,
        offer.workspaceId,
        actor.id,
        offer.workspace.createdById,
      );

      const { bridgeModuleEventToOrganization } = await import("./mc-organization-sync.service.js");
      await bridgeModuleEventToOrganization(tx, {
        organizationWorkspaceId: offer.workspaceId,
        sourceModule: "DOCUMENTS_HUB",
        sourceEventType: "mixed_container.offer_approved",
        sourceEntityId: offerId,
        actorUserId: actor.id,
        payload: { offerId },
      });
    });
    logger.info({ workspaceId: offer.workspaceId, offerId, actorId: actor.id }, "[MC] Commercial proposal approved");
    return this.getBuyerOffer(offerId, actor);
  }

  async requestRevision(offerId: string, input: BuyerRevisionInput, actor: AuthUser) {
    if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN");

    const offer = await this.prisma.mcContainerOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: { workspace: { include: { mixedContainerDetails: true } } },
    });
    if (offer.status !== "SENT") throw new AppError(409, "OFFER_NOT_ACTIVE");

    const part = await this.prisma.workspaceParticipant.findFirst({
      where: { workspaceId: offer.workspaceId, userId: actor.id, participantRole: "OWNER" },
    });
    if (!part) throw new AppError(403, "FORBIDDEN");

    await this.prisma.$transaction(async (tx) => {
      const fromState = offer.workspace.state;
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
      const toState = await applyMcTransition(tx, offer.workspaceId, "request_revision", actor, "mixed_container.revision_requested", {
        offerId,
        revisionType: input.revisionType,
      });
      const prRef = offer.workspace.mixedContainerDetails?.procurementRequestRef ?? null;
      await handleProcurementSideEffects(tx, {
        workspaceId: offer.workspaceId,
        fromState,
        toState,
        actorUserId: actor.id,
        buyerUserId: offer.workspace.createdById,
        procurementRequestRef: prRef,
        note: input.comment,
        notifyStatus: "REVISION_REQUESTED",
      });
      if (prRef) {
        await notifyAdminsRevisionRequested(tx, {
          workspaceId: offer.workspaceId,
          procurementRequestRef: prRef,
          comment: input.comment,
        });
      }
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
