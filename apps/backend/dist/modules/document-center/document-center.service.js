import fs from "node:fs";
import { AlertKey } from "@dmx/contracts/control-tower";
import { canAccessShipment } from "../shipment/shipment.policy.js";
import { canAccessTrade } from "../trade/trade.policy.js";
import { canAccessTradeWorkspace, assertDocumentActionRole } from "../trade-documents/documents.policy.js";
import { collectTradeGraph, resolveTradeRoot, tradeRefFromRoot } from "../trade/trade.resolver.js";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
import { storagePathFor } from "../../lib/file-storage.js";
import { AppError } from "../../utils/httpErrors.js";
import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
import { TradeDocumentsService } from "../trade-documents/documents.service.js";
const CATEGORY_MAP = {
    PROFORMA: "Proforma Invoice",
    PROFORMA_INVOICE: "Proforma Invoice",
    COMMERCIAL_INVOICE: "Commercial Invoice",
    PACKING_LIST: "Packing List",
    CERTIFICATE_OF_ORIGIN: "Certificate of Origin",
    HEALTH_CERTIFICATE: "Health Certificate",
    BILL_OF_LADING: "Bill of Lading",
    INSURANCE_CERTIFICATE: "Insurance Certificate",
    INSPECTION_REPORT: "Inspection Report",
    INSPECTION: "Inspection Report",
    LOADING_REPORT: "Loading Report",
    EXPORT_DECLARATION: "Customs Document",
    CUSTOMS: "Customs Document",
    FREIGHT: "Freight Document",
    CONTRACT: "Contract",
    PURCHASE_ORDER: "Purchase Order",
    PO: "Purchase Order",
    ATTACHMENT: "Other",
    OTHER: "Other",
};
const STATUS_MAP = {
    MISSING: "Missing",
    REQUESTED: "Revision Requested",
    UPLOADED: "Uploaded",
    UNDER_REVIEW: "Under Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    EXPIRED: "Expired",
    DRAFT: "Draft",
};
export class DocumentCenterService {
    db;
    tradeDocs;
    constructor(db) {
        this.db = db;
        this.tradeDocs = new TradeDocumentsService(db);
    }
    async list(actor, query) {
        const all = await this.collectAccessible(actor);
        const filtered = applyFilters(all, query);
        const kpis = computeKpis(filtered);
        const total = filtered.length;
        const items = filtered.slice(query.offset, query.offset + query.limit);
        return { kpis, items, total };
    }
    async getDetail(actor, compositeId) {
        const { source, id } = parseCompositeId(compositeId);
        const row = (await this.collectAccessible(actor)).find((d) => d.source === source && d.sourceDocumentId === id);
        if (!row)
            throw new AppError(404, "DOCUMENT_NOT_FOUND");
        if (source === "TRADE") {
            const doc = await this.db.tradeDocument.findUnique({
                where: { id },
                include: {
                    reviews: { orderBy: { createdAt: "desc" }, take: 20 },
                    versions: { orderBy: { version: "desc" } },
                },
            });
            if (!doc)
                throw new AppError(404, "DOCUMENT_NOT_FOUND");
            const [uploadedBy, reviewedBy, timeline, users] = await Promise.all([
                doc.uploadedById ? this.db.user.findUnique({ where: { id: doc.uploadedById }, select: { displayName: true } }) : null,
                doc.reviewedById ? this.db.user.findUnique({ where: { id: doc.reviewedById }, select: { displayName: true } }) : null,
                this.db.timelineEvent.findMany({
                    where: { workspaceId: doc.workspaceId },
                    orderBy: { createdAt: "desc" },
                    take: 30,
                    include: { actor: { select: { displayName: true } } },
                }),
                this.db.user.findMany({
                    where: { id: { in: [...doc.reviews.map((r) => r.reviewedById), ...doc.versions.map((v) => v.uploadedById)] } },
                    select: { id: true, displayName: true },
                }),
            ]);
            const userMap = new Map(users.map((u) => [u.id, u.displayName]));
            const checklist = row.tradeRootId
                ? (await this.getTradeDocuments(actor, row.tradeRootId)).checklist
                : [];
            return {
                ...row,
                workspaceType: doc.workspaceType,
                workspaceId: doc.workspaceId,
                fileId: doc.fileId,
                expiresAt: doc.expiresAt?.toISOString() ?? null,
                reviewComment: doc.reviewComment,
                reviewedAt: doc.reviewedAt?.toISOString() ?? null,
                versions: doc.versions.map((v) => ({
                    id: v.id,
                    version: v.version,
                    fileName: v.fileName,
                    uploadedByName: userMap.get(v.uploadedById) ?? null,
                    uploadedAt: v.uploadedAt.toISOString(),
                    isLatest: v.isLatest,
                })),
                reviews: doc.reviews.map((r) => ({
                    id: r.id,
                    decision: r.decision,
                    reason: r.reason,
                    reviewedByName: userMap.get(r.reviewedById) ?? null,
                    createdAt: r.createdAt.toISOString(),
                })),
                timeline: timeline
                    .filter((e) => e.eventType.startsWith("document."))
                    .map((e) => ({
                    id: e.id,
                    eventType: e.eventType,
                    label: formatEventLabel(e.eventType),
                    createdAt: e.createdAt.toISOString(),
                    actorName: e.actor?.displayName ?? null,
                })),
                checklist,
                uploadedByName: uploadedBy?.displayName ?? row.uploadedByName,
                reviewOwnerName: reviewedBy?.displayName ?? row.reviewOwnerName,
            };
        }
        return {
            ...row,
            workspaceType: row.relatedEntityType,
            workspaceId: row.relatedEntityId,
            fileId: null,
            expiresAt: null,
            reviewComment: null,
            reviewedAt: null,
            versions: [],
            reviews: [],
            timeline: [],
            checklist: row.tradeRootId ? (await this.getTradeDocuments(actor, row.tradeRootId)).checklist : [],
        };
    }
    async getTradeDocuments(actor, tradeRootId) {
        if (!(await canAccessTrade(this.db, actor, tradeRootId))) {
            throw new AppError(403, "FORBIDDEN");
        }
        const root = await resolveTradeRoot(this.db, tradeRootId);
        if (!root)
            throw new AppError(404, "TRADE_NOT_FOUND");
        const graph = await collectTradeGraph(this.db, root);
        const tradeId = tradeRefFromRoot(root);
        const all = await this.collectAccessible(actor);
        const tradeDocs = all.filter((d) => d.tradeRootId === root.id || graph.allWorkspaceIds.includes(d.relatedEntityId));
        const requirements = await this.db.documentRequirement.findMany({
            where: {
                OR: [
                    { workspaceId: { in: graph.orderIds }, workspaceType: "ORDER" },
                    { workspaceId: { in: graph.shipmentIds }, workspaceType: "SHIPMENT" },
                ],
            },
        });
        const tradeDocRows = await this.db.tradeDocument.findMany({
            where: {
                OR: [
                    { workspaceId: { in: graph.orderIds }, workspaceType: "ORDER" },
                    { workspaceId: { in: graph.shipmentIds }, workspaceType: "SHIPMENT" },
                ],
            },
        });
        const docByType = new Map(tradeDocRows.map((d) => [`${d.workspaceType}:${d.documentType}`, d]));
        const checklist = requirements.map((r) => {
            const doc = docByType.get(`${r.workspaceType}:${r.documentType}`);
            return {
                documentType: r.documentType,
                category: mapCategory(r.documentType),
                required: r.required,
                status: doc ? mapStatus(doc.status) : "Missing",
                documentId: doc ? `TRADE:${doc.id}` : null,
            };
        });
        return {
            tradeId,
            tradeRootId: root.id,
            checklist,
            documents: tradeDocs,
            missing: tradeDocs.filter((d) => d.status === "Missing"),
            pendingReview: tradeDocs.filter((d) => ["Uploaded", "Under Review"].includes(d.status)),
            rejected: tradeDocs.filter((d) => ["Rejected", "Revision Requested"].includes(d.status)),
            approved: tradeDocs.filter((d) => d.status === "Approved"),
        };
    }
    async getShipmentDocuments(actor, shipmentId) {
        // canAccessShipment short-circuits to true for ADMIN, so without this an unknown
        // id answered 200 with an empty list instead of 404.
        const shipment = await this.db.workspace.findFirst({
            where: { id: shipmentId, type: "SHIPMENT" },
            select: { id: true },
        });
        if (!shipment)
            throw new AppError(404, "SHIPMENT_NOT_FOUND");
        if (!(await canAccessShipment(this.db, actor, shipmentId))) {
            throw new AppError(403, "FORBIDDEN");
        }
        const all = await this.collectAccessible(actor);
        // `shipmentRef` is only set when the document's own workspace is the shipment, in
        // which case relatedEntityId already is that shipment. Or-ing it in matched every
        // shipment-attached document instead of this one's.
        return all.filter((d) => d.relatedEntityId === shipmentId);
    }
    async streamDownload(actor, compositeId, res) {
        const detail = await this.getDetail(actor, compositeId);
        if (!detail.fileId)
            throw new AppError(404, "FILE_NOT_AVAILABLE");
        const absPath = await storagePathFor(detail.fileId);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(detail.documentName)}"`);
        fs.createReadStream(absPath).pipe(res);
    }
    async approve(actor, compositeId, reason) {
        const { source, id } = parseCompositeId(compositeId);
        if (source !== "TRADE")
            throw new AppError(400, "ACTION_NOT_SUPPORTED");
        const doc = await this.db.tradeDocument.findUnique({ where: { id } });
        if (!doc)
            throw new AppError(404, "DOCUMENT_NOT_FOUND");
        await this.tradeDocs.applyDocumentAction(doc.workspaceType, doc.workspaceId, "approve_document", actor, { documentId: id, reason });
        await this.emitDocAlert(doc, AlertKey.TRADE_DOC_REQUIRED_MISSING, "resolve");
        return this.getDetail(actor, compositeId);
    }
    async reject(actor, compositeId, reason) {
        const { source, id } = parseCompositeId(compositeId);
        if (source !== "TRADE")
            throw new AppError(400, "ACTION_NOT_SUPPORTED");
        const doc = await this.db.tradeDocument.findUnique({ where: { id } });
        if (!doc)
            throw new AppError(404, "DOCUMENT_NOT_FOUND");
        await this.tradeDocs.applyDocumentAction(doc.workspaceType, doc.workspaceId, "reject_document", actor, { documentId: id, reason });
        await upsertControlTowerAlert(this.db, {
            workspaceId: doc.workspaceId,
            alertKey: AlertKey.TRADE_DOC_REJECTED,
            severity: "WARNING",
            category: "ORDER",
            workspaceType: doc.workspaceType,
            title: "Document rejected",
            description: `${doc.documentType} rejected: ${reason}`,
        });
        return this.getDetail(actor, compositeId);
    }
    async requestRevision(actor, compositeId, reason) {
        const { source, id } = parseCompositeId(compositeId);
        if (source !== "TRADE")
            throw new AppError(400, "ACTION_NOT_SUPPORTED");
        const doc = await this.db.tradeDocument.findUnique({ where: { id } });
        if (!doc)
            throw new AppError(404, "DOCUMENT_NOT_FOUND");
        // Enforce the same workspace access + role checks as approve/reject, which
        // route through TradeDocumentsService. Without this, any authenticated user
        // could revise/overwrite another tenant's document review (cross-tenant IDOR).
        const workspaceType = doc.workspaceType;
        if (!(await canAccessTradeWorkspace(this.db, actor, workspaceType, doc.workspaceId))) {
            throw new AppError(403, "FORBIDDEN");
        }
        try {
            assertDocumentActionRole("reject_document", actor.role);
        }
        catch {
            throw new AppError(403, "FORBIDDEN_ROLE");
        }
        await this.db.$transaction(async (tx) => {
            await tx.tradeDocument.update({
                where: { id },
                data: { status: "REQUESTED", reviewComment: reason, reviewedById: actor.id, reviewedAt: new Date() },
            });
            await tx.documentReview.create({
                data: { documentId: id, reviewedById: actor.id, decision: "REJECTED", reason },
            });
            await tx.timelineEvent.create({
                data: {
                    workspaceId: doc.workspaceId,
                    eventType: "document.revision_requested",
                    actorUserId: actor.id,
                    payload: { documentId: id, reason },
                },
            });
        });
        await upsertControlTowerAlert(this.db, {
            workspaceId: doc.workspaceId,
            alertKey: AlertKey.TRADE_DOC_REJECTED,
            severity: "WARNING",
            category: "ORDER",
            workspaceType: doc.workspaceType,
            title: "Document revision requested",
            description: `${doc.documentType}: ${reason}`,
        });
        return this.getDetail(actor, compositeId);
    }
    async collectAccessible(actor) {
        const items = [];
        const staffView = hasPortfolioVisibility(actor.role);
        const shipmentWhere = staffView
            ? { type: "SHIPMENT" }
            : { type: "SHIPMENT", participants: { some: { userId: actor.id, leftAt: null } } };
        const orderWhere = staffView
            ? { type: "ORDER" }
            : { type: "ORDER", participants: { some: { userId: actor.id, leftAt: null } } };
        const rfqWhere = staffView
            ? { type: "RFQ" }
            : { type: "RFQ", participants: { some: { userId: actor.id, leftAt: null } } };
        const [tradeDocs, orderDocs, shipmentDocs, rfqAttachments, workspaces] = await Promise.all([
            this.db.tradeDocument.findMany({
                where: {
                    OR: [
                        { workspaceType: "ORDER", workspaceId: { in: (await this.db.workspace.findMany({ where: orderWhere, select: { id: true } })).map((w) => w.id) } },
                        { workspaceType: "SHIPMENT", workspaceId: { in: (await this.db.workspace.findMany({ where: shipmentWhere, select: { id: true } })).map((w) => w.id) } },
                    ],
                },
                include: { reviews: { orderBy: { createdAt: "desc" }, take: 1 } },
            }),
            this.db.orderDocument.findMany({
                where: { workspaceId: { in: (await this.db.workspace.findMany({ where: orderWhere, select: { id: true } })).map((w) => w.id) } },
            }),
            this.db.shipmentDocument.findMany({
                where: { workspaceId: { in: (await this.db.workspace.findMany({ where: shipmentWhere, select: { id: true } })).map((w) => w.id) } },
            }),
            this.db.rfqAttachment.findMany({
                where: { workspaceId: { in: (await this.db.workspace.findMany({ where: rfqWhere, select: { id: true } })).map((w) => w.id) } },
            }),
            this.db.workspace.findMany({
                where: { OR: [orderWhere, shipmentWhere, rfqWhere] },
                select: { id: true, externalRef: true, type: true, spawnedFromId: true },
            }),
        ]);
        const wsMap = new Map(workspaces.map((w) => [w.id, w]));
        const orderIds = workspaces.filter((w) => w.type === "ORDER").map((w) => w.id);
        const orderWorkspaces = orderIds.length
            ? await this.db.orderWorkspace.findMany({
                where: { workspaceId: { in: orderIds } },
                select: { workspaceId: true, buyerUserId: true, supplierUserId: true, parentWorkspaceId: true },
            })
            : [];
        const owMap = new Map(orderWorkspaces.map((o) => [o.workspaceId, o]));
        const parentIds = [...new Set(orderWorkspaces.map((o) => o.parentWorkspaceId).filter((id) => !!id))];
        const parents = parentIds.length
            ? await this.db.workspace.findMany({ where: { id: { in: parentIds } }, select: { id: true, externalRef: true } })
            : [];
        const parentMap = new Map(parents.map((p) => [p.id, p]));
        const userIds = new Set();
        for (const ow of orderWorkspaces) {
            userIds.add(ow.buyerUserId);
            userIds.add(ow.supplierUserId);
        }
        for (const d of tradeDocs)
            if (d.uploadedById)
                userIds.add(d.uploadedById);
        const users = userIds.size
            ? await this.db.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, displayName: true } })
            : [];
        const userName = new Map(users.map((u) => [u.id, u.displayName]));
        const purchaseOrders = orderIds.length
            ? await this.db.purchaseOrder.findMany({
                where: { orderId: { in: orderIds } },
                select: { id: true, orderId: true, poNumber: true },
            })
            : [];
        const poByOrderWorkspace = new Map(purchaseOrders.map((p) => [p.orderId, p]));
        const resolvePo = (orderWorkspaceId) => {
            const po = orderWorkspaceId ? poByOrderWorkspace.get(orderWorkspaceId) : undefined;
            return {
                poNumber: po?.poNumber ?? null,
                poOrderId: po?.orderId ?? null,
                orderWorkspaceUrl: orderWorkspaceId ? `/workspace/order/${orderWorkspaceId}` : null,
            };
        };
        const resolveTrade = (workspaceId, wsType) => {
            const ow = owMap.get(workspaceId);
            const parent = ow?.parentWorkspaceId ? parentMap.get(ow.parentWorkspaceId) : undefined;
            const tradeRootId = parent?.id ?? ow?.parentWorkspaceId ?? null;
            const tradeId = parent ? tradeRefFromRoot(parent) : null;
            return { tradeRootId, tradeId, buyerId: ow?.buyerUserId, supplierId: ow?.supplierUserId };
        };
        for (const d of tradeDocs) {
            const ws = wsMap.get(d.workspaceId);
            const trade = resolveTrade(d.workspaceId, d.workspaceType);
            const shipmentWs = d.workspaceType === "SHIPMENT" ? ws : undefined;
            items.push({
                id: `TRADE:${d.id}`,
                source: "TRADE",
                sourceDocumentId: d.id,
                documentName: d.fileName ?? d.documentType,
                documentType: d.documentType,
                category: mapCategory(d.documentType),
                tradeId: trade.tradeId,
                tradeRootId: d.tradeRootId ?? trade.tradeRootId,
                tradeWorkspaceUrl: trade.tradeRootId ? `/workspace/trade/${trade.tradeRootId}` : null,
                ...resolvePo(d.workspaceType === "SHIPMENT" ? shipmentWs?.spawnedFromId : d.workspaceId),
                relatedEntityType: d.workspaceType,
                relatedEntityId: d.workspaceId,
                relatedEntityRef: ws?.externalRef ?? "",
                buyerName: trade.buyerId ? userName.get(trade.buyerId) ?? null : null,
                supplierName: trade.supplierId ? userName.get(trade.supplierId) ?? null : null,
                shipmentRef: shipmentWs?.externalRef ?? null,
                status: mapStatus(d.status),
                version: d.version,
                uploadedByName: d.uploadedById ? userName.get(d.uploadedById) ?? null : null,
                uploadedById: d.uploadedById,
                uploadedAt: d.uploadedAt?.toISOString() ?? null,
                reviewOwnerName: null,
                lastUpdated: d.updatedAt.toISOString(),
                isRequired: true,
                openAlertCount: ["Missing", "Rejected", "Revision Requested", "Under Review"].includes(mapStatus(d.status)) ? 1 : 0,
                downloadUrl: d.fileId ? `/api/documents/TRADE:${d.id}/download` : null,
                detailUrl: `/documents/TRADE:${d.id}`,
                _uploadedAt: d.uploadedAt,
                _expiresAt: d.expiresAt,
                _buyerId: trade.buyerId,
                _supplierId: trade.supplierId,
                _uploadedBy: d.uploadedById,
                _workspaceId: d.workspaceId,
            });
        }
        for (const d of orderDocs) {
            const ws = wsMap.get(d.workspaceId);
            const trade = resolveTrade(d.workspaceId, "ORDER");
            items.push({
                id: `ORDER:${d.id}`,
                source: "ORDER",
                sourceDocumentId: d.id,
                documentName: d.fileName,
                documentType: d.documentType,
                category: mapCategory(d.documentType),
                tradeId: trade.tradeId,
                tradeRootId: trade.tradeRootId,
                tradeWorkspaceUrl: trade.tradeRootId ? `/workspace/trade/${trade.tradeRootId}` : null,
                ...resolvePo(d.workspaceId),
                relatedEntityType: "ORDER",
                relatedEntityId: d.workspaceId,
                relatedEntityRef: ws?.externalRef ?? "",
                buyerName: trade.buyerId ? userName.get(trade.buyerId) ?? null : null,
                supplierName: trade.supplierId ? userName.get(trade.supplierId) ?? null : null,
                shipmentRef: null,
                status: "Uploaded",
                version: d.version,
                uploadedByName: null,
                uploadedById: null,
                uploadedAt: d.uploadedAt.toISOString(),
                reviewOwnerName: null,
                lastUpdated: d.uploadedAt.toISOString(),
                isRequired: false,
                openAlertCount: 0,
                downloadUrl: `/api/orders/${d.workspaceId}/documents/${d.id}`,
                detailUrl: `/documents/ORDER:${d.id}`,
                _uploadedAt: d.uploadedAt,
                _buyerId: trade.buyerId,
                _supplierId: trade.supplierId,
            });
        }
        for (const d of shipmentDocs) {
            const ws = wsMap.get(d.workspaceId);
            const trade = resolveTrade(ws?.spawnedFromId ?? d.workspaceId, "SHIPMENT");
            items.push({
                id: `SHIPMENT:${d.id}`,
                source: "SHIPMENT",
                sourceDocumentId: d.id,
                documentName: d.fileName,
                documentType: d.documentType,
                category: mapCategory(d.documentType),
                tradeId: trade.tradeId,
                tradeRootId: trade.tradeRootId,
                tradeWorkspaceUrl: trade.tradeRootId ? `/workspace/trade/${trade.tradeRootId}` : null,
                ...resolvePo(ws?.spawnedFromId),
                relatedEntityType: "SHIPMENT",
                relatedEntityId: d.workspaceId,
                relatedEntityRef: ws?.externalRef ?? "",
                buyerName: trade.buyerId ? userName.get(trade.buyerId) ?? null : null,
                supplierName: trade.supplierId ? userName.get(trade.supplierId) ?? null : null,
                shipmentRef: ws?.externalRef ?? null,
                status: "Uploaded",
                version: d.version,
                uploadedByName: null,
                uploadedById: null,
                uploadedAt: d.uploadedAt.toISOString(),
                reviewOwnerName: null,
                lastUpdated: d.uploadedAt.toISOString(),
                isRequired: false,
                openAlertCount: 0,
                downloadUrl: `/api/shipments/${d.workspaceId}/documents/${d.id}`,
                detailUrl: `/documents/SHIPMENT:${d.id}`,
                _uploadedAt: d.uploadedAt,
                _buyerId: trade.buyerId,
                _supplierId: trade.supplierId,
            });
        }
        for (const d of rfqAttachments) {
            const ws = wsMap.get(d.workspaceId);
            const tradeRootId = d.workspaceId;
            items.push({
                id: `RFQ:${d.id}`,
                source: "RFQ",
                sourceDocumentId: d.id,
                documentName: d.fileName,
                documentType: "ATTACHMENT",
                category: "Other",
                tradeId: ws ? tradeRefFromRoot(ws) : null,
                tradeRootId,
                tradeWorkspaceUrl: `/workspace/trade/${tradeRootId}`,
                poNumber: null,
                poOrderId: null,
                orderWorkspaceUrl: null,
                relatedEntityType: "RFQ",
                relatedEntityId: d.workspaceId,
                relatedEntityRef: ws?.externalRef ?? "",
                buyerName: null,
                supplierName: null,
                shipmentRef: null,
                status: "Uploaded",
                version: d.version,
                uploadedByName: null,
                uploadedById: d.uploadedById,
                uploadedAt: d.uploadedAt.toISOString(),
                reviewOwnerName: null,
                lastUpdated: d.uploadedAt.toISOString(),
                isRequired: false,
                openAlertCount: 0,
                downloadUrl: `/api/rfq/${d.workspaceId}/attachments/${d.id}`,
                detailUrl: `/documents/RFQ:${d.id}`,
                _uploadedAt: d.uploadedAt,
                _uploadedBy: d.uploadedById,
            });
        }
        return items.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
    }
    async emitDocAlert(doc, _key, _action) {
        // Alerts auto-resolve on next scan when status changes
        void doc;
    }
}
function mapCategory(documentType) {
    return CATEGORY_MAP[documentType] ?? "Other";
}
function mapStatus(status) {
    return STATUS_MAP[status] ?? "Uploaded";
}
function parseCompositeId(compositeId) {
    const idx = compositeId.indexOf(":");
    if (idx <= 0)
        throw new AppError(400, "INVALID_DOCUMENT_ID");
    const source = compositeId.slice(0, idx);
    const id = compositeId.slice(idx + 1);
    if (!["TRADE", "ORDER", "SHIPMENT", "RFQ"].includes(source)) {
        throw new AppError(400, "INVALID_DOCUMENT_ID");
    }
    return { source, id };
}
function applyFilters(rows, query) {
    let out = rows;
    if (query.source)
        out = out.filter((r) => r.source === query.source);
    if (query.rfqId)
        out = out.filter((r) => r.relatedEntityId === query.rfqId && r.source === "RFQ");
    if (query.status)
        out = out.filter((r) => r.status === query.status);
    if (query.documentType) {
        const t = query.documentType.toLowerCase();
        out = out.filter((r) => r.documentType.toLowerCase().includes(t) || r.category.toLowerCase().includes(t));
    }
    if (query.tradeId) {
        const t = query.tradeId.toLowerCase();
        out = out.filter((r) => (r.tradeId ?? "").toLowerCase().includes(t));
    }
    if (query.buyerId)
        out = out.filter((r) => r._buyerId === query.buyerId);
    if (query.supplierId)
        out = out.filter((r) => r._supplierId === query.supplierId);
    if (query.shipmentId)
        out = out.filter((r) => r.relatedEntityId === query.shipmentId);
    if (query.uploadedBy)
        out = out.filter((r) => r._uploadedBy === query.uploadedBy);
    if (query.dateFrom) {
        const from = new Date(query.dateFrom).getTime();
        out = out.filter((r) => r._uploadedAt && r._uploadedAt.getTime() >= from);
    }
    if (query.dateTo) {
        const to = new Date(query.dateTo).getTime();
        out = out.filter((r) => r._uploadedAt && r._uploadedAt.getTime() <= to);
    }
    if (query.search?.trim()) {
        const q = query.search.trim().toLowerCase();
        out = out.filter((r) => r.documentName.toLowerCase().includes(q) ||
            (r.tradeId ?? "").toLowerCase().includes(q) ||
            r.relatedEntityRef.toLowerCase().includes(q) ||
            (r.buyerName ?? "").toLowerCase().includes(q) ||
            (r.supplierName ?? "").toLowerCase().includes(q));
    }
    return out;
}
function computeKpis(rows) {
    const now = Date.now();
    const soon = now + 30 * 86_400_000;
    return {
        totalDocuments: rows.filter((r) => r.status !== "Missing").length,
        missingDocuments: rows.filter((r) => r.status === "Missing").length,
        pendingReview: rows.filter((r) => ["Uploaded", "Under Review"].includes(r.status)).length,
        rejectedDocuments: rows.filter((r) => ["Rejected", "Revision Requested"].includes(r.status)).length,
        approvedDocuments: rows.filter((r) => r.status === "Approved").length,
        expiringSoon: rows.filter((r) => r._expiresAt && r._expiresAt.getTime() <= soon && r._expiresAt.getTime() > now).length,
    };
}
function formatEventLabel(eventType) {
    return eventType.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
export function shipmentDocumentStatusSummary(docs) {
    if (docs.some((d) => ["Rejected", "Revision Requested"].includes(d.status)))
        return "Rejected Documents";
    if (docs.some((d) => d.status === "Missing"))
        return "Missing Documents";
    if (docs.some((d) => ["Uploaded", "Under Review"].includes(d.status)))
        return "Pending Review";
    if (docs.length > 0 && docs.every((d) => d.status === "Approved" || d.status === "Uploaded"))
        return "All Approved";
    return "No Documents";
}
//# sourceMappingURL=document-center.service.js.map