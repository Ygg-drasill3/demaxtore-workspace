import { Prisma } from "@prisma/client";
import { CommodityBidService } from "./commoditybid.service.js";
import { AppError } from "../../utils/httpErrors.js";
import { canViewAnonymousComparison } from "./commoditybid.policy.js";
import { withRlsUser } from "../../db/rls.js";
function dtoFromWorkspace(ws) {
    const d = ws.commodityBidDetails;
    return {
        id: ws.id,
        externalRef: ws.externalRef,
        state: ws.state,
        currency: ws.currency,
        title: d?.title ?? "",
        description: d?.description ?? "",
        targetMarket: d?.targetMarket ?? null,
        deadlineAt: ws.deadlineAt?.toISOString() ?? null,
        auctionStartsAt: d?.auctionStartsAt?.toISOString() ?? null,
        auctionEndsAt: d?.auctionEndsAt?.toISOString() ?? null,
        auctionDurationMinutes: d?.auctionDurationMinutes ?? null,
        lowestBidAmount: d?.lowestBidAmount != null ? Number(d.lowestBidAmount) : null,
        ownerUserId: ws.createdById,
        ownerName: ws.createdBy?.displayName ?? "",
        lots: (ws.commodityBidLots ?? []).map((l) => ({
            id: l.id,
            lotNumber: l.lotNumber,
            commodity: l.commodity,
            quantity: Number(l.quantity),
            uom: l.uom,
            incoterms: l.incoterms ?? null,
            deliveryWindow: l.deliveryWindow ?? null,
            noAwardReason: l.noAwardReason,
        })),
        invitationCount: (ws.commodityBidInvitations ?? []).filter((i) => !i.removedAt).length,
        participants: (ws.participants ?? []).map((p) => ({
            userId: p.userId,
            participantRole: p.participantRole,
        })),
        createdAt: ws.createdAt.toISOString(),
        updatedAt: ws.updatedAt.toISOString(),
    };
}
async function nextExternalRef(prisma) {
    const year = new Date().getUTCFullYear();
    const prefix = `CB-${year}-`;
    const last = await prisma.workspace.findFirst({
        where: { externalRef: { startsWith: prefix } },
        orderBy: { externalRef: "desc" },
        select: { externalRef: true },
    });
    const lastNum = last ? Number(last.externalRef.slice(prefix.length)) : 0;
    return `${prefix}${String(lastNum + 1).padStart(4, "0")}`;
}
CommodityBidService.prototype.createDraft = async function (input, actor) {
    if (actor.role !== "BUYER")
        throw new AppError(403, "FORBIDDEN_ROLE");
    const id = await this.prisma.$transaction(async (tx) => {
        const externalRef = await nextExternalRef(tx);
        const ws = await tx.workspace.create({
            data: {
                externalRef,
                type: "COMMODITYBID",
                state: "BID_DRAFT",
                currency: input.currency,
                deadlineAt: new Date(new Date(input.auctionStartsAt).getTime() + input.auctionDurationMinutes * 60_000),
                createdById: actor.id,
                commodityBidDetails: {
                    create: {
                        title: input.title,
                        description: input.description,
                        productCategory: input.productCategory ?? null,
                        targetMarket: input.targetMarket ?? null,
                        auctionStartsAt: new Date(input.auctionStartsAt),
                        auctionEndsAt: new Date(new Date(input.auctionStartsAt).getTime() + input.auctionDurationMinutes * 60_000),
                        auctionDurationMinutes: input.auctionDurationMinutes,
                        invitationDeadlineAt: new Date(new Date(input.auctionStartsAt).getTime() - input.invitationDeadlineMinutes * 60_000),
                        auctionRules: { supplierUserIds: input.supplierUserIds },
                    },
                },
                commodityBidLots: {
                    create: input.lots.map((lot, i) => ({
                        lotNumber: i + 1,
                        commodity: lot.commodity,
                        quantity: new Prisma.Decimal(lot.quantity),
                        uom: lot.uom,
                        specs: (lot.specs ?? {}),
                        incoterms: lot.incoterms ?? null,
                        deliveryWindow: lot.deliveryWindow ?? null,
                        notes: lot.notes ?? null,
                    })),
                },
                participants: { create: [{ userId: actor.id, participantRole: "OWNER" }] },
            },
        });
        await tx.timelineEvent.create({
            data: { workspaceId: ws.id, eventType: "bid.created", actorUserId: actor.id, payload: {} },
        });
        return ws.id;
    });
    void (async () => {
        const { bootstrapWorkspaceConversationAsync, emitConversationSystemEvent } = await import("../conversation-hub/conversation-hub.hooks.js");
        bootstrapWorkspaceConversationAsync(this.prisma, "COMMODITYBID", id);
        emitConversationSystemEvent(this.prisma, "COMMODITYBID", id, "WORKSPACE_CREATED", actor.id, input.title);
    })();
    return this.fetchDTO(id, actor);
};
CommodityBidService.prototype.list = async function (query, actor) {
    const where = { type: "COMMODITYBID" };
    if (query.state)
        where.state = query.state;
    if (actor.role === "BUYER")
        where.createdById = actor.id;
    if (actor.role === "SUPPLIER") {
        where.participants = { some: { userId: actor.id } };
    }
    const rows = await this.prisma.workspace.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: query.limit,
        skip: query.offset,
        include: {
            commodityBidDetails: true,
            commodityBidLots: true,
            commodityBidInvitations: { where: { removedAt: null } },
            participants: true,
            createdBy: { select: { displayName: true } },
        },
    });
    return { items: rows.map((r) => dtoFromWorkspace(r)), total: rows.length };
};
CommodityBidService.prototype.toDTO = async function (ws, viewer) {
    return dtoFromWorkspace(ws);
};
CommodityBidService.prototype.fetchDTO = async function (wsId, viewer) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
        where: { id: wsId },
        include: {
            commodityBidDetails: true,
            commodityBidLots: true,
            commodityBidInvitations: { where: { removedAt: null } },
            participants: true,
            createdBy: { select: { displayName: true } },
        },
    });
    return dtoFromWorkspace(ws);
};
CommodityBidService.prototype.timeline = async function (wsId) {
    const events = await this.prisma.timelineEvent.findMany({
        where: { workspaceId: wsId },
        orderBy: { createdAt: "asc" },
    });
    return events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        actorUserId: e.actorUserId,
        createdAt: e.createdAt.toISOString(),
        payload: e.payload,
    }));
};
CommodityBidService.prototype.buildNextActionContext = async function (ws, actor) {
    const activeBids = await this.prisma.commodityBidSubmission.findMany({
        where: { workspaceId: ws.id, supplierUserId: actor.id, withdrawnAt: null },
    });
    const lots = ws.commodityBidLots ?? [];
    const awardRows = await this.prisma.commodityBidAward.findMany({ where: { workspaceId: ws.id } });
    const hasWinnerAward = awardRows.some((a) => a.status === "WINNER" || a.status === "ACCEPTED");
    return {
        state: ws.state,
        actorRole: actor.role,
        isOwner: ws.createdById === actor.id,
        isCounterparty: (ws.participants ?? []).some((p) => p.userId === actor.id && p.participantRole === "COUNTERPARTY"),
        hasActiveBidOnAnyLot: activeBids.length > 0,
        hasWinnerAward,
    };
};
CommodityBidService.prototype.getComparison = async function (wsId, actor) {
    if (!canViewAnonymousComparison(actor))
        throw new AppError(403, "FORBIDDEN");
    const ws = await withRlsUser(actor.id, (tx) => tx.workspace.findUniqueOrThrow({
        where: { id: wsId },
        include: {
            commodityBidLots: true,
            commodityBidSubmissions: { where: { withdrawnAt: null } },
            commodityBidInvitations: { where: { removedAt: null } },
        },
    }));
    if (!["BID_CLOSED", "UNDER_EVALUATION", "AWARDS_PUBLISHED", "ACCEPTANCE_COMPLETE", "CONTRACTS_ISSUED"].includes(ws.state)) {
        throw new AppError(409, "COMPARISON_NOT_AVAILABLE");
    }
    const codeBySupplier = new Map(ws.commodityBidInvitations.map((i) => [i.supplierUserId, i.bidderCode]));
    return {
        lots: ws.commodityBidLots.map((lot) => ({
            lotId: lot.id,
            lotNumber: lot.lotNumber,
            commodity: lot.commodity,
            bids: ws.commodityBidSubmissions
                .filter((b) => b.lotId === lot.id)
                .map((b) => ({
                submissionId: b.id,
                bidderCode: codeBySupplier.get(b.supplierUserId) ?? "BIDDER-???",
                unitPrice: Number(b.unitPrice),
                currency: b.currency,
                leadTimeDays: b.leadTimeDays,
                moq: b.moq,
                paymentTerms: b.paymentTerms,
                deliveryTerms: b.deliveryTerms,
                validUntil: b.validUntil.toISOString(),
            })),
        })),
    };
};
CommodityBidService.prototype.getAdminIdentityMap = async function (wsId) {
    const inv = await this.prisma.commodityBidInvitation.findMany({
        where: { workspaceId: wsId, removedAt: null },
        include: { workspace: false },
    });
    const users = await this.prisma.user.findMany({
        where: { id: { in: inv.map((i) => i.supplierUserId) } },
        select: { id: true, email: true, displayName: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return inv.map((i) => ({
        bidderCode: i.bidderCode,
        supplierUserId: i.supplierUserId,
        email: byId.get(i.supplierUserId)?.email,
        displayName: byId.get(i.supplierUserId)?.displayName,
    }));
};
CommodityBidService.prototype.getMyAwards = async function (wsId, actor) {
    if (actor.role !== "SUPPLIER")
        throw new AppError(403, "FORBIDDEN");
    const rows = await this.prisma.commodityBidAward.findMany({
        where: { workspaceId: wsId, supplierUserId: actor.id, status: { in: ["PUBLISHED", "ACCEPTED", "DECLINED", "EXPIRED"] } },
        include: { lot: { select: { lotNumber: true, commodity: true } } },
    });
    return rows.map((a) => ({
        id: a.id,
        lotId: a.lotId,
        lotNumber: a.lot.lotNumber,
        commodity: a.lot.commodity,
        status: a.status,
        awardedAt: a.awardedAt?.toISOString() ?? null,
        slaDeadlineAt: a.slaDeadlineAt?.toISOString() ?? null,
        canAccept: a.status === "PUBLISHED",
    }));
};
CommodityBidService.prototype.getSpawnedOrders = async function (wsId) {
    const children = await this.prisma.workspace.findMany({
        where: { spawnedFromId: wsId, type: "ORDER" },
        select: { id: true, externalRef: true, state: true, createdAt: true },
        orderBy: { createdAt: "asc" },
    });
    return children.map((o) => ({
        id: o.id,
        externalRef: o.externalRef,
        state: o.state,
        createdAt: o.createdAt.toISOString(),
    }));
};
CommodityBidService.prototype.getOwnBids = async function (wsId, actor) {
    if (actor.role !== "SUPPLIER")
        throw new AppError(403, "FORBIDDEN");
    const bids = await withRlsUser(actor.id, (tx) => tx.commodityBidSubmission.findMany({
        where: { workspaceId: wsId, supplierUserId: actor.id },
        include: { lot: true },
    }));
    return bids.map((b) => ({
        id: b.id,
        lotId: b.lotId,
        lotNumber: b.lot.lotNumber,
        unitPrice: Number(b.unitPrice),
        currency: b.currency,
        leadTimeDays: b.leadTimeDays,
        moq: b.moq,
        paymentTerms: b.paymentTerms,
        deliveryTerms: b.deliveryTerms,
        withdrawnAt: b.withdrawnAt?.toISOString() ?? null,
    }));
};
CommodityBidService.prototype.adminQueue = async function () {
    const rows = await this.prisma.workspace.findMany({
        where: { type: "COMMODITYBID", state: { in: ["SCHEDULED", "INVITING_SUPPLIERS", "READY_TO_START"] } },
        orderBy: { createdAt: "asc" },
        include: { commodityBidDetails: true, createdBy: { select: { displayName: true } } },
    });
    return rows.map((w) => ({
        id: w.id,
        externalRef: w.externalRef,
        title: w.commodityBidDetails?.title,
        buyerName: w.createdBy.displayName,
        createdAt: w.createdAt.toISOString(),
    }));
};
//# sourceMappingURL=commoditybid.service.read.js.map