import { COMMERCIAL_DOCUMENT_CATEGORIES, mapToCommercialDocumentCategory, } from "@dmx/contracts/commercial-document";
import { AppError } from "../../utils/httpErrors.js";
import { deleteStoredFile, writeStoredFile, } from "../../lib/file-storage.js";
import { validateUpload } from "../../lib/upload-security.js";
import { canAccessPo } from "./purchase-order.policy.js";
const PREVIEWABLE = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
]);
function parseCompositeId(id) {
    const idx = id.indexOf(":");
    if (idx <= 0)
        throw new AppError(400, "INVALID_DOCUMENT_ID");
    const prefix = id.slice(0, idx);
    const rawId = id.slice(idx + 1);
    if (prefix === "COMMERCIAL")
        return { source: "COMMERCIAL", rawId };
    if (prefix === "PURCHASE_ORDER"
        || prefix === "ORDER_WORKSPACE"
        || prefix === "SHIPMENT"
        || prefix === "INSPECTION"
        || prefix === "FREIGHT"
        || prefix === "LEGACY"
        || prefix === "DIRECT_PO_UPLOAD") {
        return { source: prefix, rawId };
    }
    throw new AppError(400, "INVALID_DOCUMENT_ID");
}
function apiPaths(poId, compositeId) {
    const base = `/api/purchase-orders/${poId}/documents/${encodeURIComponent(compositeId)}`;
    return {
        documentUrl: base,
        previewUrl: `${base}/preview`,
        downloadUrl: `${base}/download`,
    };
}
function canPreviewMime(mime) {
    return PREVIEWABLE.has(mime) || mime.startsWith("image/");
}
export class CommercialDocumentService {
    db;
    constructor(db) {
        this.db = db;
    }
    async list(poId, actor, query) {
        if (!(await canAccessPo(this.db, actor, poId)))
            throw new AppError(403, "FORBIDDEN");
        const all = await this.aggregate(poId, actor);
        const filtered = this.applyFilters(all, query);
        const sorted = this.sortDocs(filtered, query.sort, query.direction);
        const total = sorted.length;
        const start = (query.page - 1) * query.pageSize;
        const items = sorted.slice(start, start + query.pageSize);
        const availableCategories = [
            ...new Set(all.map((d) => d.category)),
        ];
        const availableSources = [...new Set(all.map((d) => d.source))];
        return {
            items,
            page: query.page,
            pageSize: query.pageSize,
            total,
            availableCategories: availableCategories.length
                ? availableCategories
                : [...COMMERCIAL_DOCUMENT_CATEGORIES],
            availableSources: availableSources.length
                ? availableSources
                : ["PURCHASE_ORDER", "ORDER_WORKSPACE"],
        };
    }
    async get(poId, documentId, actor) {
        if (!(await canAccessPo(this.db, actor, poId)))
            throw new AppError(403, "FORBIDDEN");
        const all = await this.aggregate(poId, actor);
        const found = all.find((d) => d.id === documentId);
        if (!found)
            throw new AppError(404, "DOCUMENT_NOT_FOUND");
        return found;
    }
    async upload(poId, actor, file, meta) {
        if (!(await canAccessPo(this.db, actor, poId)))
            throw new AppError(403, "FORBIDDEN");
        this.assertCanMutate(actor);
        if (actor.role === "SUPPLIER" && meta.category === "PURCHASE_ORDER") {
            throw new AppError(403, "FORBIDDEN_CATEGORY");
        }
        let safeName;
        try {
            ({ safeName } = validateUpload(file));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "UPLOAD_INVALID";
            if (msg.startsWith("UNSUPPORTED_MIME"))
                throw new AppError(400, "UNSUPPORTED_MIME");
            if (msg.startsWith("FILE_TOO_LARGE"))
                throw new AppError(400, "FILE_TOO_LARGE");
            throw new AppError(400, "UPLOAD_INVALID");
        }
        const po = await this.db.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
        const { storageKey } = await writeStoredFile(file.buffer, safeName);
        try {
            const row = await this.db.purchaseOrderCommercialDocument.create({
                data: {
                    purchaseOrderId: poId,
                    orderId: po.orderId,
                    category: meta.category,
                    title: meta.title?.trim() || null,
                    description: meta.description?.trim() || null,
                    referenceNumber: meta.referenceNumber?.trim() || null,
                    documentDate: meta.documentDate ? new Date(meta.documentDate) : null,
                    fileName: safeName,
                    originalFileName: file.originalname,
                    mimeType: file.mimetype,
                    storageKey,
                    fileSizeBytes: file.size,
                    uploadedById: actor.id,
                },
            });
            await this.auditAndTimeline(po.orderId, actor, "po.document.uploaded", {
                purchaseOrderId: poId,
                orderId: po.orderId,
                documentId: `COMMERCIAL:${row.id}`,
                category: meta.category,
                source: "PURCHASE_ORDER",
                fileName: safeName,
            });
            return (await this.get(poId, `COMMERCIAL:${row.id}`, actor));
        }
        catch (err) {
            await deleteStoredFile(storageKey).catch(() => undefined);
            throw err;
        }
    }
    async replace(poId, documentId, actor, file, meta) {
        if (!(await canAccessPo(this.db, actor, poId)))
            throw new AppError(403, "FORBIDDEN");
        this.assertCanMutate(actor);
        const parsed = parseCompositeId(documentId);
        if (parsed.source === "COMMERCIAL" || parsed.source === "PURCHASE_ORDER") {
            // COMMERCIAL library row
            if (parsed.source === "PURCHASE_ORDER" && parsed.rawId.startsWith("po-file-")) {
                return this.replaceCanonicalPoPdf(poId, actor, file);
            }
        }
        if (parsed.source !== "COMMERCIAL") {
            throw new AppError(409, "DOCUMENT_IMMUTABLE");
        }
        const existing = await this.db.purchaseOrderCommercialDocument.findFirst({
            where: { id: parsed.rawId, purchaseOrderId: poId, deletedAt: null },
        });
        if (!existing)
            throw new AppError(404, "DOCUMENT_NOT_FOUND");
        if (actor.role === "SUPPLIER" && existing.uploadedById !== actor.id && actor.role === "SUPPLIER") {
            // suppliers may only replace own uploads
            if (existing.uploadedById !== actor.id)
                throw new AppError(403, "FORBIDDEN");
        }
        let safeName;
        try {
            ({ safeName } = validateUpload(file));
        }
        catch {
            throw new AppError(400, "UPLOAD_INVALID");
        }
        const { storageKey } = await writeStoredFile(file.buffer, safeName);
        const previousKey = existing.storageKey;
        try {
            const updated = await this.db.purchaseOrderCommercialDocument.update({
                where: { id: existing.id },
                data: {
                    category: meta.category ?? existing.category,
                    title: meta.title !== undefined ? (meta.title?.trim() || null) : existing.title,
                    description: meta.description !== undefined
                        ? (meta.description?.trim() || null)
                        : existing.description,
                    referenceNumber: meta.referenceNumber !== undefined
                        ? (meta.referenceNumber?.trim() || null)
                        : existing.referenceNumber,
                    documentDate: meta.documentDate !== undefined
                        ? (meta.documentDate ? new Date(meta.documentDate) : null)
                        : existing.documentDate,
                    fileName: safeName,
                    originalFileName: file.originalname,
                    mimeType: file.mimetype,
                    storageKey,
                    fileSizeBytes: file.size,
                    previousStorageKey: previousKey,
                    replacedAt: new Date(),
                    uploadedById: actor.id,
                    uploadedAt: new Date(),
                },
            });
            const po = await this.db.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
            await this.auditAndTimeline(po.orderId, actor, "po.document.replaced", {
                purchaseOrderId: poId,
                orderId: po.orderId,
                documentId,
                category: updated.category,
                source: "PURCHASE_ORDER",
                fileName: safeName,
                previousFileName: existing.fileName,
            });
            // Do not delete previous storage immediately — may still be referenced; soft retain key.
            return this.get(poId, documentId, actor);
        }
        catch (err) {
            await deleteStoredFile(storageKey).catch(() => undefined);
            throw err;
        }
    }
    async remove(poId, documentId, actor) {
        if (!(await canAccessPo(this.db, actor, poId)))
            throw new AppError(403, "FORBIDDEN");
        this.assertCanMutate(actor);
        const parsed = parseCompositeId(documentId);
        if (parsed.source === "PURCHASE_ORDER" && parsed.rawId.startsWith("po-file-")) {
            throw new AppError(409, "CANONICAL_PO_DOCUMENT_PROTECTED");
        }
        if (parsed.source !== "COMMERCIAL") {
            throw new AppError(409, "DOCUMENT_IMMUTABLE");
        }
        const existing = await this.db.purchaseOrderCommercialDocument.findFirst({
            where: { id: parsed.rawId, purchaseOrderId: poId, deletedAt: null },
        });
        if (!existing)
            throw new AppError(404, "DOCUMENT_NOT_FOUND");
        if (actor.role === "SUPPLIER" && existing.uploadedById !== actor.id) {
            throw new AppError(403, "FORBIDDEN");
        }
        await this.db.purchaseOrderCommercialDocument.update({
            where: { id: existing.id },
            data: { deletedAt: new Date() },
        });
        const po = await this.db.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
        await this.auditAndTimeline(po.orderId, actor, "po.document.deleted", {
            purchaseOrderId: poId,
            orderId: po.orderId,
            documentId,
            category: existing.category,
            source: "PURCHASE_ORDER",
            fileName: existing.fileName,
        });
        return { ok: true };
    }
    async stream(poId, documentId, actor, res, disposition) {
        if (!(await canAccessPo(this.db, actor, poId)))
            throw new AppError(403, "FORBIDDEN");
        const resolved = await this.resolveStorage(poId, documentId);
        if (!resolved)
            throw new AppError(404, "DOCUMENT_NOT_FOUND");
        const { storagePathFor } = await import("../../lib/file-storage.js");
        const { buildContentDisposition } = await import("../../lib/content-disposition.js");
        const absPath = await storagePathFor(resolved.storageKey);
        const inline = disposition === "inline"
            && (resolved.mimeType === "application/pdf" || resolved.mimeType.startsWith("image/"));
        res.setHeader("Content-Type", resolved.mimeType);
        if (resolved.fileSizeBytes != null) {
            res.setHeader("Content-Length", String(resolved.fileSizeBytes));
        }
        res.setHeader("Content-Disposition", buildContentDisposition(resolved.fileName, inline));
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, no-store");
        const fs = await import("node:fs");
        fs.createReadStream(absPath).pipe(res);
    }
    // ── Aggregation ──────────────────────────────────────────────────────────
    async aggregate(poId, actor) {
        const po = await this.db.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
        const shipmentIds = await this.db.shipmentWorkspace.findMany({
            where: { orderWorkspaceId: po.orderId },
            select: { workspaceId: true },
        });
        const shipWsIds = shipmentIds.map((s) => s.workspaceId);
        const [commercial, orderDocs, tradeDocs, shipmentDocs, orderWs, actors] = await Promise.all([
            this.db.purchaseOrderCommercialDocument.findMany({
                where: { purchaseOrderId: poId, deletedAt: null },
                orderBy: { uploadedAt: "desc" },
            }),
            this.db.orderDocument.findMany({
                where: { workspaceId: po.orderId },
                orderBy: [{ documentType: "asc" }, { version: "desc" }],
            }),
            this.db.tradeDocument.findMany({
                where: {
                    workspaceType: "ORDER",
                    workspaceId: po.orderId,
                    fileId: { not: null },
                    fileName: { not: null },
                },
            }),
            shipWsIds.length
                ? this.db.shipmentDocument.findMany({
                    where: { workspaceId: { in: shipWsIds } },
                    orderBy: [{ documentType: "asc" }, { version: "desc" }],
                })
                : Promise.resolve([]),
            this.db.orderWorkspace.findUnique({
                where: { workspaceId: po.orderId },
                select: { inspectionReportUrl: true },
            }),
            Promise.resolve([]),
        ]);
        // Latest order/shipment doc per documentType only (dedupe versions).
        const latestOrder = latestByType(orderDocs);
        const latestShip = latestByType(shipmentDocs);
        const uploaderIds = [
            ...new Set([
                ...commercial.map((d) => d.uploadedById),
                ...latestOrder.map((d) => d.uploadedById),
                ...tradeDocs.map((d) => d.uploadedById).filter(Boolean),
                ...latestShip.map((d) => d.uploadedById),
                po.buyerId,
            ]),
        ];
        const users = uploaderIds.length
            ? await this.db.user.findMany({
                where: { id: { in: uploaderIds } },
                select: { id: true, displayName: true, email: true },
            })
            : [];
        const actorById = new Map(users.map((u) => [u.id, { id: u.id, name: u.displayName?.trim() || u.email || "Unknown user" }]));
        const mutate = this.canMutate(actor);
        const out = [];
        const seenKeys = new Set();
        const push = (doc) => {
            const key = doc._storageKey || `url:${doc.documentUrl}` || doc.id;
            if (seenKeys.has(key))
                return;
            seenKeys.add(key);
            const { _storageKey: _, ...rest } = doc;
            out.push(rest);
        };
        // 1) Canonical PO PDF
        if (po.documentUrl) {
            const id = `PURCHASE_ORDER:po-file-${po.id}`;
            const paths = apiPaths(poId, id);
            push({
                id,
                purchaseOrderId: poId,
                orderId: po.orderId,
                category: "PURCHASE_ORDER",
                source: "PURCHASE_ORDER",
                fileName: po.documentFileName ?? `PO-${po.poNumber}.pdf`,
                mimeType: "application/pdf",
                fileSize: null,
                ...paths,
                uploadedAt: (po.issuedAt ?? po.createdAt).toISOString(),
                uploadedBy: actorById.get(po.buyerId) ?? null,
                canPreview: true,
                canDownload: true,
                canReplace: mutate && (actor.role === "BUYER" || actor.role === "ADMIN" || actor.role === "SUPER_ADMIN"),
                canDelete: false,
                _storageKey: po.documentUrl.startsWith("/api/") ? null : po.documentUrl,
            });
        }
        // 2) Commercial library
        for (const row of commercial) {
            const id = `COMMERCIAL:${row.id}`;
            const paths = apiPaths(poId, id);
            const mime = row.mimeType;
            push({
                id,
                purchaseOrderId: poId,
                orderId: row.orderId ?? po.orderId,
                category: mapToCommercialDocumentCategory(row.category),
                source: "PURCHASE_ORDER",
                fileName: row.fileName,
                originalFileName: row.originalFileName,
                mimeType: mime,
                fileSize: row.fileSizeBytes,
                ...paths,
                uploadedAt: row.uploadedAt.toISOString(),
                uploadedBy: actorById.get(row.uploadedById) ?? null,
                title: row.title,
                description: row.description,
                referenceNumber: row.referenceNumber,
                documentDate: row.documentDate ? row.documentDate.toISOString().slice(0, 10) : null,
                canPreview: canPreviewMime(mime),
                canDownload: true,
                canReplace: mutate && (actor.role !== "SUPPLIER" || row.uploadedById === actor.id),
                canDelete: mutate && (actor.role !== "SUPPLIER" || row.uploadedById === actor.id),
                _storageKey: row.storageKey,
            });
        }
        // 3) Order workspace documents
        for (const row of latestOrder) {
            const id = `ORDER_WORKSPACE:${row.id}`;
            const paths = apiPaths(poId, id);
            const category = mapToCommercialDocumentCategory(row.documentType);
            const source = row.documentType.toUpperCase() === "FREIGHT" ? "FREIGHT" : "ORDER_WORKSPACE";
            push({
                id,
                purchaseOrderId: poId,
                orderId: po.orderId,
                category,
                source,
                fileName: row.fileName,
                mimeType: row.mimeType,
                fileSize: row.fileSizeBytes,
                ...paths,
                uploadedAt: row.uploadedAt.toISOString(),
                uploadedBy: actorById.get(row.uploadedById) ?? null,
                canPreview: canPreviewMime(row.mimeType),
                canDownload: true,
                canReplace: false,
                canDelete: false,
                _storageKey: row.storageKey,
            });
        }
        // 4) Trade documents on order
        for (const row of tradeDocs) {
            if (!row.fileId || !row.fileName)
                continue;
            const id = `ORDER_WORKSPACE:trade-${row.id}`;
            const paths = apiPaths(poId, id);
            push({
                id,
                purchaseOrderId: poId,
                orderId: po.orderId,
                category: mapToCommercialDocumentCategory(row.documentType),
                source: "ORDER_WORKSPACE",
                fileName: row.fileName,
                mimeType: guessMime(row.fileName),
                fileSize: null,
                ...paths,
                uploadedAt: (row.uploadedAt ?? row.createdAt).toISOString(),
                uploadedBy: row.uploadedById ? actorById.get(row.uploadedById) ?? null : null,
                canPreview: true,
                canDownload: true,
                canReplace: false,
                canDelete: false,
                _storageKey: row.fileId,
            });
        }
        // 5) Shipment documents
        for (const row of latestShip) {
            const id = `SHIPMENT:${row.id}`;
            const paths = apiPaths(poId, id);
            push({
                id,
                purchaseOrderId: poId,
                orderId: po.orderId,
                category: mapToCommercialDocumentCategory(row.documentType),
                source: "SHIPMENT",
                fileName: row.fileName,
                mimeType: row.mimeType,
                fileSize: row.fileSizeBytes,
                ...paths,
                uploadedAt: row.uploadedAt.toISOString(),
                uploadedBy: actorById.get(row.uploadedById) ?? null,
                canPreview: canPreviewMime(row.mimeType),
                canDownload: true,
                canReplace: false,
                canDelete: false,
                _storageKey: row.storageKey,
            });
        }
        // 6) Inspection report URL
        if (orderWs?.inspectionReportUrl) {
            const id = `INSPECTION:${po.orderId}`;
            push({
                id,
                purchaseOrderId: poId,
                orderId: po.orderId,
                category: "INSPECTION_REPORT",
                source: "INSPECTION",
                fileName: "Inspection report",
                mimeType: "application/pdf",
                fileSize: null,
                documentUrl: orderWs.inspectionReportUrl,
                previewUrl: orderWs.inspectionReportUrl,
                downloadUrl: orderWs.inspectionReportUrl,
                uploadedAt: po.updatedAt.toISOString(),
                uploadedBy: null,
                canPreview: true,
                canDownload: true,
                canReplace: false,
                canDelete: false,
                _storageKey: null,
            });
        }
        void actors;
        return out.map(({ _storageKey: _, ...rest }) => rest);
    }
    applyFilters(docs, query) {
        return docs.filter((d) => {
            if (query.category && d.category !== query.category)
                return false;
            if (query.source && d.source !== query.source)
                return false;
            if (query.uploadedFrom && d.uploadedAt.slice(0, 10) < query.uploadedFrom)
                return false;
            if (query.uploadedTo && d.uploadedAt.slice(0, 10) > query.uploadedTo)
                return false;
            if (query.search) {
                const q = query.search.toLowerCase();
                const hay = [d.fileName, d.title, d.referenceNumber, d.description]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                if (!hay.includes(q))
                    return false;
            }
            return true;
        });
    }
    sortDocs(docs, sort, direction) {
        const dir = direction === "asc" ? 1 : -1;
        return [...docs].sort((a, b) => {
            let cmp = 0;
            if (sort === "fileName")
                cmp = a.fileName.localeCompare(b.fileName);
            else if (sort === "category")
                cmp = a.category.localeCompare(b.category);
            else
                cmp = a.uploadedAt.localeCompare(b.uploadedAt);
            return cmp * dir || a.id.localeCompare(b.id);
        });
    }
    async resolveStorage(poId, documentId) {
        const parsed = parseCompositeId(documentId);
        const po = await this.db.purchaseOrder.findUnique({ where: { id: poId } });
        if (!po)
            return null;
        if (parsed.source === "PURCHASE_ORDER" && parsed.rawId === `po-file-${poId}`) {
            if (!po.documentUrl)
                return null;
            // Direct PO URLs are API paths — stream via DirectPoDocumentUpload when possible
            if (po.documentUrl.includes("/direct/documents/")) {
                const uploadId = po.documentUrl.split("/").pop();
                if (uploadId) {
                    const staging = await this.db.directPoDocumentUpload.findUnique({ where: { id: uploadId } });
                    if (staging) {
                        return {
                            storageKey: staging.storageKey,
                            fileName: po.documentFileName ?? staging.fileName,
                            mimeType: staging.mimeType,
                        };
                    }
                }
            }
            // If documentUrl is a storage key (rare), use it
            if (!po.documentUrl.startsWith("/") && !po.documentUrl.startsWith("http")) {
                return {
                    storageKey: po.documentUrl,
                    fileName: po.documentFileName ?? `PO-${po.poNumber}.pdf`,
                    mimeType: "application/pdf",
                };
            }
            return null;
        }
        if (parsed.source === "COMMERCIAL" || (parsed.source === "PURCHASE_ORDER" && !parsed.rawId.startsWith("po-file-"))) {
            const id = parsed.source === "COMMERCIAL" ? parsed.rawId : parsed.rawId;
            const row = await this.db.purchaseOrderCommercialDocument.findFirst({
                where: { id, purchaseOrderId: poId, deletedAt: null },
            });
            if (!row)
                return null;
            return {
                storageKey: row.storageKey,
                fileName: row.fileName,
                mimeType: row.mimeType,
                fileSizeBytes: row.fileSizeBytes,
            };
        }
        if (parsed.source === "ORDER_WORKSPACE") {
            if (parsed.rawId.startsWith("trade-")) {
                const tradeId = parsed.rawId.slice("trade-".length);
                const row = await this.db.tradeDocument.findFirst({
                    where: { id: tradeId, workspaceId: po.orderId, workspaceType: "ORDER" },
                });
                if (!row?.fileId || !row.fileName)
                    return null;
                return { storageKey: row.fileId, fileName: row.fileName, mimeType: guessMime(row.fileName) };
            }
            const row = await this.db.orderDocument.findFirst({
                where: { id: parsed.rawId, workspaceId: po.orderId },
            });
            if (!row)
                return null;
            return {
                storageKey: row.storageKey,
                fileName: row.fileName,
                mimeType: row.mimeType,
                fileSizeBytes: row.fileSizeBytes,
            };
        }
        if (parsed.source === "SHIPMENT") {
            const row = await this.db.shipmentDocument.findUnique({ where: { id: parsed.rawId } });
            if (!row)
                return null;
            const ship = await this.db.shipmentWorkspace.findFirst({
                where: { workspaceId: row.workspaceId, orderWorkspaceId: po.orderId },
            });
            if (!ship)
                return null;
            return {
                storageKey: row.storageKey,
                fileName: row.fileName,
                mimeType: row.mimeType,
                fileSizeBytes: row.fileSizeBytes,
            };
        }
        return null;
    }
    async replaceCanonicalPoPdf(poId, actor, file) {
        if (!(actor.role === "BUYER" || actor.role === "ADMIN" || actor.role === "SUPER_ADMIN")) {
            throw new AppError(403, "FORBIDDEN");
        }
        let safeName;
        try {
            ({ safeName } = validateUpload(file));
        }
        catch {
            throw new AppError(400, "UPLOAD_INVALID");
        }
        const { storageKey } = await writeStoredFile(file.buffer, safeName);
        // Persist as commercial library entry AND update pointer for backward compat via API path.
        // Keep legacy documentUrl: store commercial doc and leave documentUrl if already set —
        // replacing canonical means updating documentFileName + creating library copy.
        const po = await this.db.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
        const row = await this.db.purchaseOrderCommercialDocument.create({
            data: {
                purchaseOrderId: poId,
                orderId: po.orderId,
                category: "PURCHASE_ORDER",
                fileName: safeName,
                originalFileName: file.originalname,
                mimeType: file.mimetype,
                storageKey,
                fileSizeBytes: file.size,
                uploadedById: actor.id,
                title: "Purchase Order (replaced)",
            },
        });
        await this.db.purchaseOrder.update({
            where: { id: poId },
            data: {
                documentFileName: safeName,
                // Keep serving via commercial download when documentUrl was an old API path —
                // also set documentUrl to commercial download path for summary compatibility.
                documentUrl: `/api/purchase-orders/${poId}/documents/${encodeURIComponent(`COMMERCIAL:${row.id}`)}/download`,
            },
        });
        await this.auditAndTimeline(po.orderId, actor, "po.document.replaced", {
            purchaseOrderId: poId,
            orderId: po.orderId,
            documentId: `COMMERCIAL:${row.id}`,
            category: "PURCHASE_ORDER",
            source: "PURCHASE_ORDER",
            fileName: safeName,
        });
        return this.get(poId, `COMMERCIAL:${row.id}`, actor);
    }
    assertCanMutate(actor) {
        if (!this.canMutate(actor))
            throw new AppError(403, "FORBIDDEN");
    }
    canMutate(actor) {
        return ["BUYER", "SUPPLIER", "ADMIN", "SUPER_ADMIN"].includes(actor.role);
    }
    async auditAndTimeline(orderId, actor, action, payload) {
        const ws = await this.db.workspace.findUnique({ where: { id: orderId }, select: { state: true } });
        if (!ws)
            return;
        await this.db.$transaction(async (tx) => {
            await tx.auditLog.create({
                data: {
                    workspaceId: orderId,
                    actorUserId: actor.id,
                    actorEmail: actor.email,
                    actorRole: actor.role,
                    action,
                    fromState: ws.state,
                    toState: ws.state,
                    payload: payload,
                },
            });
            await tx.timelineEvent.create({
                data: {
                    workspaceId: orderId,
                    eventType: action,
                    actorUserId: actor.id,
                    payload: payload,
                },
            });
        });
    }
}
function latestByType(rows) {
    const map = new Map();
    for (const row of rows) {
        const cur = map.get(row.documentType);
        if (!cur || row.version > cur.version)
            map.set(row.documentType, row);
    }
    return [...map.values()];
}
function guessMime(fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".pdf"))
        return "application/pdf";
    if (lower.endsWith(".png"))
        return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
        return "image/jpeg";
    if (lower.endsWith(".webp"))
        return "image/webp";
    if (lower.endsWith(".docx")) {
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    if (lower.endsWith(".xlsx")) {
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    return "application/octet-stream";
}
//# sourceMappingURL=commercial-document.service.js.map