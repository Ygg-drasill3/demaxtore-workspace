import fs from "node:fs";
import multer from "multer";
import { z } from "zod";
import { CreateDirectPurchaseOrderPublicSchema, CreateMinimalSupplierSchema, PurchaseOrderListQuerySchema, } from "@dmx/contracts/purchase-order.zod";
import { AppError } from "../../utils/httpErrors.js";
import { PurchaseOrderService } from "./purchase-order.service.js";
import { canAccessOrder } from "../order/order.policy.js";
import { canAccessPo } from "./purchase-order.policy.js";
import { DirectPurchaseOrderService } from "./direct-purchase-order.service.js";
import { assertDirectPoDocumentOwnership, uploadDirectPoDocument, } from "./direct-purchase-order.document.js";
import { storagePathFor } from "../../lib/file-storage.js";
import { createUploadFileFilter } from "../../lib/multer-file-guard.js";
import { DEFAULT_MAX_UPLOAD_BYTES } from "../../lib/upload-security.js";
import { SupplierSearchQuerySchema } from "@dmx/contracts/purchase-order.zod";
import { prisma } from "../../db.js";
import { CommercialDocumentListQuerySchema, CommercialDocumentReplaceMetaSchema, CommercialDocumentUploadMetaSchema, } from "@dmx/contracts/commercial-document.zod";
import { OperationalTimelineListQuerySchema } from "@dmx/contracts/operational-timeline.zod";
import { CommercialDocumentService } from "./commercial-document.service.js";
import { OperationalTimelineService } from "./operational-timeline.service.js";
const service = new PurchaseOrderService(prisma);
const directPoService = new DirectPurchaseOrderService(prisma);
const commercialDocumentService = new CommercialDocumentService(prisma);
const operationalTimelineService = new OperationalTimelineService(prisma);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: DEFAULT_MAX_UPLOAD_BYTES },
    fileFilter: createUploadFileFilter(),
});
const uploadSingle = upload.single("file");
const ActionBody = z.object({
    payload: z.record(z.unknown()).optional(),
});
const ACTION_MAP = {
    "submit-po": "submit_po",
    "approve-po": "approve_po",
    "start-execution": "start_execution",
    "complete-po": "complete_po",
    "acknowledge-po": "acknowledge_po",
    "request-amendment": "request_amendment",
    "approve-amendment": "approve_amendment",
    "reject-amendment": "reject_amendment",
    "close-po": "close_po",
    "cancel-po": "cancel_po",
};
function mapPolicyError(err) {
    if (err instanceof Error) {
        if (err.message === "DIRECT_PURCHASE_ORDER_FORBIDDEN") {
            throw new AppError(403, "DIRECT_PURCHASE_ORDER_FORBIDDEN");
        }
    }
    throw err;
}
export const purchaseOrderController = {
    async list(req, res) {
        const query = PurchaseOrderListQuerySchema.parse(req.query);
        res.json(await service.list(req.user, query));
    },
    async dashboard(req, res) {
        res.json(await service.getDashboard(req.user));
    },
    async updateDraft(req, res) {
        res.json(await service.updateDraft(req.params.id, req.user, req.body ?? {}, {
            ip: req.ip,
            userAgent: req.get("user-agent") ?? undefined,
        }));
    },
    async deleteDraft(req, res) {
        res.json(await service.deleteDraft(req.params.id, req.user));
    },
    async searchSuppliers(req, res) {
        const q = SupplierSearchQuerySchema.parse(req.query);
        res.json(await directPoService.searchSuppliers(req.user, q));
    },
    async createMinimalSupplier(req, res) {
        try {
            const body = CreateMinimalSupplierSchema.parse(req.body ?? {});
            res.status(201).json(await directPoService.createMinimalSupplier(req.user, body));
        }
        catch (err) {
            mapPolicyError(err);
        }
    },
    async uploadDirectDocument(req, res) {
        try {
            const file = req.file;
            if (!file)
                throw new AppError(400, "FILE_REQUIRED");
            const result = await uploadDirectPoDocument(prisma, req.user, {
                originalName: file.originalname,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                buffer: file.buffer,
            });
            res.status(201).json(result);
        }
        catch (err) {
            mapPolicyError(err);
        }
    },
    async downloadDirectDocument(req, res) {
        const uploadId = req.params.uploadId;
        const documentUrl = `/api/purchase-orders/direct/documents/${uploadId}`;
        await assertDirectPoDocumentOwnership(prisma, req.user, documentUrl);
        const row = await prisma.directPoDocumentUpload.findUniqueOrThrow({ where: { id: uploadId } });
        const absPath = await storagePathFor(row.storageKey);
        res.setHeader("Content-Type", row.mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(row.fileName)}"`);
        fs.createReadStream(absPath).pipe(res);
    },
    async createDirect(req, res) {
        try {
            const body = CreateDirectPurchaseOrderPublicSchema.parse(req.body ?? {});
            res.status(201).json(await directPoService.create(req.user, body));
        }
        catch (err) {
            mapPolicyError(err);
        }
    },
    async byOrder(req, res) {
        const orderId = req.params.id ?? req.params.orderId;
        if (!(await canAccessOrder(prisma, req.user, orderId))) {
            throw new AppError(403, "FORBIDDEN");
        }
        const summary = await service.getByOrderId(orderId);
        if (!summary)
            throw new AppError(404, "PO_NOT_FOUND");
        res.json(summary);
    },
    async get(req, res) {
        const poId = req.params.id;
        if (!(await canAccessPo(prisma, req.user, poId))) {
            throw new AppError(403, "FORBIDDEN");
        }
        res.json(await service.getSummary(poId));
    },
    async listRevisions(req, res) {
        const poId = req.params.id;
        if (!(await canAccessPo(prisma, req.user, poId))) {
            throw new AppError(403, "FORBIDDEN");
        }
        res.json(await service.listRevisions(poId));
    },
    async getRevision(req, res) {
        const poId = req.params.id;
        const revisionId = req.params.revisionId;
        if (!(await canAccessPo(prisma, req.user, poId))) {
            throw new AppError(403, "FORBIDDEN");
        }
        res.json(await service.getRevision(poId, revisionId));
    },
    async listDocuments(req, res) {
        const query = CommercialDocumentListQuerySchema.parse(req.query);
        res.json(await commercialDocumentService.list(req.params.id, req.user, query));
    },
    async getDocument(req, res) {
        res.json(await commercialDocumentService.get(req.params.id, decodeURIComponent(req.params.documentId), req.user));
    },
    async uploadDocument(req, res) {
        const file = req.file;
        if (!file)
            throw new AppError(400, "FILE_REQUIRED");
        const meta = CommercialDocumentUploadMetaSchema.parse({
            category: req.body?.category,
            title: req.body?.title,
            description: req.body?.description,
            referenceNumber: req.body?.referenceNumber,
            documentDate: req.body?.documentDate,
        });
        res.status(201).json(await commercialDocumentService.upload(req.params.id, req.user, file, meta));
    },
    async replaceDocument(req, res) {
        const file = req.file;
        if (!file)
            throw new AppError(400, "FILE_REQUIRED");
        const meta = CommercialDocumentReplaceMetaSchema.parse({
            category: req.body?.category,
            title: req.body?.title,
            description: req.body?.description,
            referenceNumber: req.body?.referenceNumber,
            documentDate: req.body?.documentDate,
        });
        res.json(await commercialDocumentService.replace(req.params.id, decodeURIComponent(req.params.documentId), req.user, file, meta));
    },
    async deleteDocument(req, res) {
        res.json(await commercialDocumentService.remove(req.params.id, decodeURIComponent(req.params.documentId), req.user));
    },
    async previewDocument(req, res) {
        await commercialDocumentService.stream(req.params.id, decodeURIComponent(req.params.documentId), req.user, res, "inline");
    },
    async downloadDocument(req, res) {
        await commercialDocumentService.stream(req.params.id, decodeURIComponent(req.params.documentId), req.user, res, "attachment");
    },
    async listTimeline(req, res) {
        const query = OperationalTimelineListQuerySchema.parse(req.query);
        res.json(await operationalTimelineService.list(req.params.id, req.user, query));
    },
    async action(req, res) {
        const actionKey = ACTION_MAP[req.params.action];
        if (!actionKey)
            throw new AppError(400, "UNKNOWN_ACTION");
        const body = ActionBody.parse(req.body ?? {});
        res.json(await service.applyPoAction(req.params.id, actionKey, req.user, body.payload ?? {}, { ip: req.ip, userAgent: req.headers["user-agent"] }));
    },
};
export { uploadSingle as directPoUploadMiddleware };
//# sourceMappingURL=purchase-order.controller.js.map