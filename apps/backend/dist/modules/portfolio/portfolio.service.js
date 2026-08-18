import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
import { TradeDocumentsService } from "../trade-documents/documents.service.js";
function workspaceAccessFilter(actor) {
    if (hasPortfolioVisibility(actor.role))
        return {};
    return {
        participants: {
            some: { userId: actor.id, leftAt: null },
        },
    };
}
function workspaceUrl(type, id) {
    if (type === "RFQ")
        return `/workspace/rfq/${id}`;
    if (type === "ORDER")
        return `/workspace/order/${id}`;
    if (type === "COMMODITYBID")
        return `/workspace/commoditybid/${id}`;
    if (type === "SHIPMENT")
        return `/workspace/shipment/${id}`;
    return `/workspace/${id}`;
}
export class PortfolioService {
    db;
    constructor(db) {
        this.db = db;
    }
    async listPurchaseOrders(actor, query) {
        const access = workspaceAccessFilter(actor);
        const orderWhere = {
            type: "ORDER",
            ...access,
        };
        const accessibleOrderIds = await this.db.workspace.findMany({
            where: orderWhere,
            select: { id: true },
        });
        const ids = accessibleOrderIds.map((o) => o.id);
        if (ids.length === 0)
            return { items: [], total: 0 };
        const poWhere = { orderId: { in: ids } };
        const [total, rows] = await Promise.all([
            this.db.purchaseOrder.count({ where: poWhere }),
            this.db.purchaseOrder.findMany({
                where: poWhere,
                orderBy: { updatedAt: "desc" },
                skip: query.offset,
                take: query.limit,
                include: {
                    acknowledgements: { orderBy: { createdAt: "desc" }, take: 1 },
                    amendments: { where: { status: "OPEN" } },
                },
            }),
        ]);
        const orderIds = rows.map((r) => r.orderId);
        const [orders, buyers, suppliers] = await Promise.all([
            this.db.workspace.findMany({
                where: { id: { in: orderIds } },
                select: { id: true, externalRef: true },
            }),
            this.db.user.findMany({
                where: { id: { in: rows.map((r) => r.buyerId) } },
                select: { id: true, displayName: true },
            }),
            this.db.user.findMany({
                where: { id: { in: rows.map((r) => r.supplierId) } },
                select: { id: true, displayName: true },
            }),
        ]);
        const orderRef = new Map(orders.map((o) => [o.id, o.externalRef]));
        const buyerName = new Map(buyers.map((u) => [u.id, u.displayName]));
        const supplierName = new Map(suppliers.map((u) => [u.id, u.displayName]));
        const items = rows.map((po) => {
            const latestAck = po.acknowledgements[0];
            const pendingAck = ["ISSUED", "AMENDMENT_REQUESTED"].includes(po.status)
                && (!latestAck || latestAck.status !== "ACKNOWLEDGED");
            return {
                poId: po.id,
                poNumber: po.poNumber,
                status: po.status,
                orderId: po.orderId,
                orderRef: orderRef.get(po.orderId) ?? "",
                buyerName: buyerName.get(po.buyerId) ?? "",
                supplierName: supplierName.get(po.supplierId) ?? "",
                pendingAck,
                openAmendments: po.amendments.length,
                updatedAt: po.updatedAt.toISOString(),
            };
        });
        return { items, total };
    }
    async listShipments(actor, query) {
        const where = {
            type: "SHIPMENT",
            ...workspaceAccessFilter(actor),
        };
        const [total, rows] = await Promise.all([
            this.db.workspace.count({ where }),
            this.db.workspace.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: query.offset,
                take: query.limit,
                select: {
                    id: true,
                    externalRef: true,
                    state: true,
                    createdAt: true,
                    spawnedFromId: true,
                },
            }),
        ]);
        const parentIds = rows.map((r) => r.spawnedFromId).filter((id) => !!id);
        const parents = parentIds.length
            ? await this.db.workspace.findMany({
                where: { id: { in: parentIds } },
                select: { id: true, externalRef: true },
            })
            : [];
        const parentRef = new Map(parents.map((p) => [p.id, p.externalRef]));
        const items = rows.map((s) => ({
            id: s.id,
            externalRef: s.externalRef,
            state: s.state,
            orderId: s.spawnedFromId ?? "",
            orderRef: s.spawnedFromId ? parentRef.get(s.spawnedFromId) ?? "" : "",
            createdAt: s.createdAt.toISOString(),
        }));
        return { items, total };
    }
    async listTradeDocuments(actor, query) {
        const orderWhere = {
            type: "ORDER",
            state: { notIn: ["CLOSED", "CANCELLED"] },
            ...workspaceAccessFilter(actor),
        };
        const [total, orders] = await Promise.all([
            this.db.workspace.count({ where: orderWhere }),
            this.db.workspace.findMany({
                where: orderWhere,
                orderBy: { updatedAt: "desc" },
                skip: query.offset,
                take: query.limit,
                select: { id: true, externalRef: true },
            }),
        ]);
        const items = [];
        const tradeDocs = new TradeDocumentsService(this.db);
        for (const o of orders) {
            const summary = await tradeDocs.getSummary("ORDER", o.id);
            const docs = summary.documents;
            items.push({
                workspaceType: "ORDER",
                workspaceId: o.id,
                workspaceRef: o.externalRef,
                complianceStatus: summary.compliance.status,
                requiredCount: summary.compliance.requiredCount,
                approvedCount: summary.compliance.approvedCount,
                pendingReview: docs.filter((d) => ["UPLOADED", "UNDER_REVIEW"].includes(d.status)).length,
                missingCount: summary.compliance.missingTypes.length,
                rejectedCount: docs.filter((d) => d.status === "REJECTED").length,
            });
            const shipments = await this.db.workspace.findMany({
                where: { spawnedFromId: o.id, type: "SHIPMENT" },
                select: { id: true, externalRef: true },
                take: 3,
                orderBy: { updatedAt: "desc" },
            });
            for (const s of shipments) {
                const sSummary = await tradeDocs.getSummary("SHIPMENT", s.id);
                const sDocs = sSummary.documents;
                if (sSummary.compliance.requiredCount > 0 || sDocs.some((d) => d.status !== "MISSING")) {
                    items.push({
                        workspaceType: "SHIPMENT",
                        workspaceId: s.id,
                        workspaceRef: s.externalRef,
                        complianceStatus: sSummary.compliance.status,
                        requiredCount: sSummary.compliance.requiredCount,
                        approvedCount: sSummary.compliance.approvedCount,
                        pendingReview: sDocs.filter((d) => ["UPLOADED", "UNDER_REVIEW"].includes(d.status)).length,
                        missingCount: sSummary.compliance.missingTypes.length,
                        rejectedCount: sDocs.filter((d) => d.status === "REJECTED").length,
                    });
                }
            }
        }
        return { items, total };
    }
    async listMessages(actor, query) {
        const types = actor.role === "SUPPLIER"
            ? ["RFQ", "ORDER", "COMMODITYBID"]
            : ["RFQ", "ORDER", "COMMODITYBID"];
        const where = {
            type: { in: [...types] },
            state: { notIn: ["CANCELLED", "EXPIRED"] },
            ...workspaceAccessFilter(actor),
        };
        const [total, workspaces] = await Promise.all([
            this.db.workspace.count({ where }),
            this.db.workspace.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                skip: query.offset,
                take: query.limit,
                select: { id: true, externalRef: true, type: true },
            }),
        ]);
        const convs = await this.db.workspaceConversation.findMany({
            where: {
                OR: workspaces.map((w) => ({
                    workspaceType: w.type,
                    workspaceId: w.id,
                })),
            },
            include: {
                messages: {
                    where: { status: { not: "DELETED" } },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: {
                        readReceipts: { where: { userId: actor.id }, select: { id: true } },
                    },
                },
            },
        });
        const convByKey = new Map(convs.map((c) => [`${c.workspaceType}:${c.workspaceId}`, c]));
        const items = workspaces.map((w) => {
            const conv = convByKey.get(`${w.type}:${w.id}`);
            const last = conv?.messages[0];
            const unreadCount = last && last.authorUserId !== actor.id && last.readReceipts.length === 0 ? 1 : 0;
            return {
                workspaceType: w.type,
                workspaceId: w.id,
                workspaceRef: w.externalRef,
                unreadCount,
                lastMessage: last?.body?.slice(0, 120) ?? "No messages yet",
                lastAt: last?.createdAt.toISOString() ?? "",
                workspaceUrl: workspaceUrl(w.type, w.id),
            };
        });
        items.sort((a, b) => b.unreadCount - a.unreadCount || b.lastAt.localeCompare(a.lastAt));
        return { items, total };
    }
}
//# sourceMappingURL=portfolio.service.js.map