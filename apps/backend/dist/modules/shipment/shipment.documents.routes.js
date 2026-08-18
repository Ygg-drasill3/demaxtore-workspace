import { Router } from "express";
import fs from "node:fs";
import multer from "multer";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db.js";
import { canAccessShipment } from "./shipment.policy.js";
import { ShipmentService } from "./shipment.service.js";
import { AppError } from "../../utils/httpErrors.js";
import { writeStoredFile, storagePathFor } from "../../lib/file-storage.js";
import { uploadLimiter } from "../../middleware/rate-limit.js";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const uploadSingle = upload.single("file");
const shipmentService = new ShipmentService(prisma);
const router = Router({ mergeParams: true });
router.post("/", requireAuth, uploadLimiter, uploadSingle, asyncHandler(async (req, res) => {
    const workspaceId = req.params.id;
    if (!(await canAccessShipment(prisma, req.user, workspaceId)))
        throw new AppError(403, "FORBIDDEN");
    const file = req.file;
    if (!file)
        throw new AppError(400, "FILE_REQUIRED");
    const docType = String(req.body.documentType ?? "OTHER");
    const { storageKey } = await writeStoredFile(file.buffer, file.originalname);
    const result = await shipmentService.applyTransition({
        workspaceId,
        action: "upload_document",
        actor: { id: req.user.id, email: req.user.email, role: req.user.role },
        payload: {
            documentType: docType,
            fileName: file.originalname,
            mimeType: file.mimetype,
            storageKey,
            fileSizeBytes: file.size,
        },
    });
    res.status(201).json(result);
}));
router.get("/:docId", requireAuth, asyncHandler(async (req, res) => {
    const workspaceId = req.params.id;
    if (!(await canAccessShipment(prisma, req.user, workspaceId)))
        throw new AppError(403, "FORBIDDEN");
    const row = await shipmentService.getDocument(workspaceId, req.params.docId);
    const absPath = await storagePathFor(row.storageKey);
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(row.fileName)}"`);
    fs.createReadStream(absPath).pipe(res);
}));
export default router;
//# sourceMappingURL=shipment.documents.routes.js.map