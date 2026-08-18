import { InboxFilter } from "@dmx/contracts/workspace-inbox";
import { buildPendingActions, buildDecisionLog, } from "../conversation-hub/conversation-hub.operational.js";
import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
import { isRfqTerminal, } from "@dmx/contracts/rfq.fsm";
import { isCommodityBidTerminal } from "@dmx/contracts/commoditybid.fsm";
import { isShipmentTerminal } from "@dmx/contracts/shipment.fsm";
import { isOrderTerminal } from "@dmx/contracts/order.fsm";
const INBOX_TYPES = ["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT"];
const MAX_WORKSPACES = 80;
const MESSAGES_PER_CONV = 25;
function workspaceAccessFilter(actor) {
    if (hasPortfolioVisibility(actor.role))
        return {};
    return { participants: { some: { userId: actor.id, leftAt: null } } };
}
function isInboxFilter(value) {
    return InboxFilter.some((candidate) => candidate === value);
}
function humanize(state) {
    return state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function commType(type) {
    if (type === "RFQ")
        return "RFQ";
    if (type === "COMMODITYBID")
        return "COMMODITYBID";
    if (type === "ORDER")
        return "ORDER";
    if (type === "SHIPMENT")
        return "SHIPMENT";
    return "RFQ";
}
function workspaceUrl(type, id) {
    const t = type.toLowerCase();
    if (t === "rfq")
        return `/workspace/rfq/${id}`;
    if (t === "commoditybid")
        return `/workspace/commoditybid/${id}`;
    if (t === "order")
        return `/workspace/order/${id}`;
    if (t === "shipment")
        return `/workspace/shipment/${id}`;
    return `/workspace/${id}`;
}
function conversationUrl(type, id) {
    return `${workspaceUrl(type, id)}?focus=messages`;
}
function isCompleted(type, state) {
    if (type === "RFQ")
        return isRfqTerminal(state);
    if (type === "COMMODITYBID")
        return isCommodityBidTerminal(state);
    if (type === "ORDER")
        return isOrderTerminal(state);
    if (type === "SHIPMENT")
        return isShipmentTerminal(state);
    return false;
}
function mapMessageToTimelineItem(row, actorId) {
    const meta = row.metadata ?? {};
    const isSystemEvent = row.messageType === "SYSTEM_EVENT";
    return {
        id: row.id,
        conversationId: row.conversationId,
        itemType: row.messageType,
        body: row.body,
        authorUserId: row.authorUserId,
        authorName: null,
        authorRole: null,
        visibility: row.visibility,
        channelSource: row.channelSource,
        isSystemEvent,
        systemEventType: meta.systemEventType ?? null,
        metadata: meta,
        parentMessageId: row.parentMessageId,
        attachments: row.attachments.map((a) => ({
            id: a.id,
            fileName: a.fileName,
            mimeType: a.mimeType,
            fileSizeBytes: a.fileSizeBytes,
            uploadedAt: a.createdAt.toISOString(),
        })),
        deliveryStatuses: row.deliveries.map((d) => ({
            userId: d.userId,
            state: d.readAt ? "READ" : d.deliveredAt ? "DELIVERED" : "SENT",
            sentAt: d.sentAt.toISOString(),
            deliveredAt: d.deliveredAt?.toISOString() ?? null,
            readAt: d.readAt?.toISOString() ?? null,
        })),
        mentions: [],
        pinned: Boolean(meta.pinned),
        pinnedAt: typeof meta.pinnedAt === "string" ? meta.pinnedAt : null,
        editedAt: row.editedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        readByMe: row.readReceipts.some((r) => r.userId === actorId) ||
            row.deliveries.some((d) => d.userId === actorId && d.readAt),
    };
}
function urgencyFromPriority(p) {
    if (p === "high")
        return "high";
    if (p === "medium")
        return "medium";
    return "low";
}
function deriveBadges(ws, unread, pending, isDelayed) {
    const badges = [];
    if (unread > 0)
        badges.push("NEW_MESSAGE");
    if (pending.some((p) => p.kind === "BUYER_APPROVAL_REQUIRED" || p.kind === "ACTION_REQUIRED")) {
        badges.push("APPROVAL_REQUIRED");
    }
    if (pending.some((p) => p.kind === "UNANSWERED_QUESTION" || p.kind === "WAITING_SUPPLIER_REPLY")) {
        badges.push("WAITING_REPLY");
    }
    if (pending.some((p) => p.kind === "INSPECTION_REPORT_WAITING") || ws.orderWorkspace?.inspectionRequestedAt) {
        badges.push("INSPECTION");
    }
    if (pending.some((p) => p.kind === "ETA_UPDATED"))
        badges.push("ETA_UPDATED");
    if (isDelayed)
        badges.push("DELAYED");
    if (isCompleted(ws.type, ws.state))
        badges.push("COMPLETED");
    return [...new Set(badges)];
}
export class WorkspaceInboxService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getInbox(actor, query) {
        const where = {
            type: { in: [...INBOX_TYPES] },
            ...workspaceAccessFilter(actor),
        };
        const rows = await this.db.workspace.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            take: MAX_WORKSPACES,
            select: {
                id: true,
                externalRef: true,
                type: true,
                state: true,
                updatedAt: true,
                trashedAt: true,
                createdById: true,
                rfqDetails: { select: { title: true, targetMarket: true, selectedSupplierUserId: true } },
                commodityBidDetails: { select: { title: true, targetMarket: true } },
                orderWorkspace: {
                    select: {
                        supplierUserId: true,
                        buyerUserId: true,
                        inspectionRequestedAt: true,
                        currentEta: true,
                    },
                },
                participants: {
                    where: { leftAt: null },
                    select: {
                        userId: true,
                        participantRole: true,
                        user: { select: { id: true, displayName: true, email: true, role: true } },
                    },
                },
            },
        });
        const convs = await this.db.workspaceConversation.findMany({
            where: {
                OR: rows.map((w) => ({ workspaceType: w.type, workspaceId: w.id })),
            },
            include: {
                messages: {
                    where: { status: { not: "DELETED" } },
                    orderBy: { createdAt: "desc" },
                    take: MESSAGES_PER_CONV,
                    include: {
                        attachments: true,
                        deliveries: { where: { userId: actor.id } },
                        readReceipts: { where: { userId: actor.id } },
                    },
                },
            },
        });
        const convMap = new Map(convs.map((c) => [`${c.workspaceType}:${c.workspaceId}`, c]));
        const supplierIds = new Set();
        for (const w of rows) {
            if (w.rfqDetails?.selectedSupplierUserId)
                supplierIds.add(w.rfqDetails.selectedSupplierUserId);
            if (w.orderWorkspace?.supplierUserId)
                supplierIds.add(w.orderWorkspace.supplierUserId);
        }
        const suppliers = supplierIds.size
            ? await this.db.user.findMany({
                where: { id: { in: [...supplierIds] } },
                select: { id: true, displayName: true, email: true, organisation: { select: { name: true } } },
            })
            : [];
        const supplierMap = new Map(suppliers.map((s) => [s.id, s.organisation?.name ?? s.displayName ?? s.email.split("@")[0]]));
        const cards = [];
        const allPriorities = [];
        const allActivity = [];
        for (const ws of rows) {
            const conv = convMap.get(`${ws.type}:${ws.id}`);
            const messages = (conv?.messages ?? []).slice().reverse();
            const timeline = messages.map((m) => mapMessageToTimelineItem(m, actor.id));
            const pending = buildPendingActions(timeline);
            const unread = timeline.filter((t) => !t.readByMe && t.authorUserId !== actor.id && !t.isSystemEvent).length;
            const buyer = ws.participants.find((p) => p.user.role === "BUYER" || p.participantRole === "OWNER");
            const supplierId = ws.rfqDetails?.selectedSupplierUserId ?? ws.orderWorkspace?.supplierUserId;
            const supplierName = supplierId ? supplierMap.get(supplierId) ?? null : null;
            const buyerName = buyer?.user.displayName ?? buyer?.user.email.split("@")[0] ?? null;
            const productSummary = ws.rfqDetails?.title ?? ws.commodityBidDetails?.title ?? null;
            const country = ws.rfqDetails?.targetMarket ?? ws.commodityBidDetails?.targetMarket ?? null;
            const isDelayed = (ws.type === "SHIPMENT" &&
                !isShipmentTerminal(ws.state) &&
                ["EXCEPTION", "DELAY"].some((k) => ws.state.includes(k))) ||
                Boolean(ws.orderWorkspace?.currentEta &&
                    new Date(ws.orderWorkspace.currentEta) < new Date() &&
                    !isOrderTerminal(ws.state));
            const last = timeline.at(-1);
            const completed = isCompleted(ws.type, ws.state);
            const archived = Boolean(ws.trashedAt);
            const card = {
                workspaceId: ws.id,
                workspaceRef: ws.externalRef,
                workspaceType: commType(ws.type),
                buyerName,
                supplierName,
                productSummary,
                country,
                currentStage: humanize(ws.state),
                currentStatus: humanize(ws.state),
                unreadCount: unread,
                pendingActionsCount: pending.length,
                lastActivityAt: last?.createdAt ?? ws.updatedAt.toISOString(),
                lastActivityPreview: last?.body.slice(0, 120) ?? null,
                badges: deriveBadges(ws, unread, pending, isDelayed),
                isArchived: archived,
                isCompleted: completed,
                isDelayed,
                conversationUrl: conversationUrl(ws.type, ws.id),
                workspaceUrl: workspaceUrl(ws.type, ws.id),
                documentsUrl: ["ORDER", "SHIPMENT"].includes(ws.type) ? `${workspaceUrl(ws.type, ws.id)}?focus=documents` : null,
                shipmentUrl: ws.type === "ORDER" ? `/buyer/shipments` : ws.type === "SHIPMENT" ? workspaceUrl(ws.type, ws.id) : null,
            };
            cards.push(card);
            for (const p of pending) {
                allPriorities.push({
                    id: `${ws.id}-${p.id}`,
                    title: p.title,
                    description: p.description,
                    kind: p.kind,
                    urgency: p.priority === "high" ? "high" : urgencyFromPriority(p.priority),
                    workspaceType: commType(ws.type),
                    workspaceId: ws.id,
                    workspaceRef: ws.externalRef,
                    createdAt: p.createdAt,
                    conversationUrl: conversationUrl(ws.type, ws.id),
                    workspaceUrl: workspaceUrl(ws.type, ws.id),
                });
            }
            for (const d of buildDecisionLog(timeline).slice(0, 3)) {
                allActivity.push({
                    id: `${ws.id}-act-${d.id}`,
                    title: d.title,
                    body: d.body,
                    workspaceType: commType(ws.type),
                    workspaceId: ws.id,
                    workspaceRef: ws.externalRef,
                    occurredAt: d.decidedAt,
                    conversationUrl: conversationUrl(ws.type, ws.id),
                    workspaceUrl: workspaceUrl(ws.type, ws.id),
                });
            }
            if (last && !last.isSystemEvent) {
                allActivity.push({
                    id: `${ws.id}-msg-${last.id}`,
                    title: `${humanize(last.itemType)} · ${ws.externalRef}`,
                    body: last.body.slice(0, 160),
                    workspaceType: commType(ws.type),
                    workspaceId: ws.id,
                    workspaceRef: ws.externalRef,
                    occurredAt: last.createdAt,
                    conversationUrl: conversationUrl(ws.type, ws.id),
                    workspaceUrl: workspaceUrl(ws.type, ws.id),
                });
            }
        }
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        allPriorities.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        allActivity.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
        let filtered = cards;
        const q = query.q?.toLowerCase().trim();
        if (q) {
            filtered = filtered.filter((c) => [c.workspaceRef, c.buyerName, c.supplierName, c.productSummary, c.country, c.lastActivityPreview]
                .filter(Boolean)
                .some((v) => v.toLowerCase().includes(q)));
        }
        const filter = isInboxFilter(query.filter) ? query.filter : "all";
        filtered = this.applyFilter(filtered, filter, actor.role);
        const summary = this.buildSummary(cards);
        const offset = query.offset ?? 0;
        const limit = query.limit ?? 50;
        const paged = filtered.slice(offset, offset + limit);
        return {
            summary,
            priorities: allPriorities.slice(0, 30),
            recentActivity: allActivity.slice(0, 25),
            workspaces: paged,
            totalWorkspaces: filtered.length,
        };
    }
    applyFilter(cards, filter, role) {
        switch (filter) {
            case "rfq":
                return cards.filter((c) => c.workspaceType === "RFQ");
            case "commoditybid":
                return cards.filter((c) => c.workspaceType === "COMMODITYBID");
            case "purchase_orders":
                return cards.filter((c) => c.workspaceType === "ORDER");
            case "shipments":
                return cards.filter((c) => c.workspaceType === "SHIPMENT");
            case "completed":
                return cards.filter((c) => c.isCompleted);
            case "archived":
                return cards.filter((c) => c.isArchived);
            case "unread":
                return cards.filter((c) => c.unreadCount > 0);
            case "delayed":
                return cards.filter((c) => c.isDelayed);
            case "waiting_for_me":
                return cards.filter((c) => c.badges.includes("APPROVAL_REQUIRED") ||
                    (role === "BUYER" && c.badges.includes("WAITING_REPLY")) ||
                    c.pendingActionsCount > 0);
            default:
                return cards.filter((c) => !c.isArchived);
        }
    }
    buildSummary(cards) {
        const active = cards.filter((c) => !c.isArchived && !c.isCompleted);
        return {
            activeWorkspaces: active.length,
            pendingActions: cards.reduce((n, c) => n + c.pendingActionsCount, 0),
            unreadConversations: cards.filter((c) => c.unreadCount > 0).length,
            waitingSupplierResponses: cards.filter((c) => c.badges.includes("WAITING_REPLY")).length,
            waitingBuyerApprovals: cards.filter((c) => c.badges.includes("APPROVAL_REQUIRED")).length,
            activeShipments: cards.filter((c) => c.workspaceType === "SHIPMENT" && !c.isCompleted).length,
            delayedShipments: cards.filter((c) => c.isDelayed).length,
            openInspections: cards.filter((c) => c.badges.includes("INSPECTION")).length,
        };
    }
}
//# sourceMappingURL=workspace-inbox.service.js.map