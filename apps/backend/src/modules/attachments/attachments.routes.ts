// apps/backend/src/modules/attachments/attachments.routes.ts
//
// Mounted at /api/rfq/:id/attachments (Phase G1).
//   POST   /        — multipart upload, field "file"
//   GET    /:attId  — download (binary stream)
//
// List endpoint (GET /) lives in rfq.routes.ts and uses the existing service.
import { Router, type Request, type Response, type RequestHandler } from "express";
import fs from "node:fs";
import multer from "multer";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { Validation } from "../../lib/errors.js";
import * as svc from "./attachments.service.js";
import { createUploadFileFilter } from "../../lib/multer-file-guard.js";
import { DEFAULT_MAX_UPLOAD_BYTES } from "../../lib/upload-security.js";
import { getRfqId, resolveRfqParam } from "../../lib/resolve-rfq-ref.js";
import { uploadLimiter } from "../../middleware/rate-limit.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: DEFAULT_MAX_UPLOAD_BYTES },
  fileFilter: createUploadFileFilter(),
});
const uploadSingleFile = upload.single("file") as unknown as RequestHandler;

const router = Router({ mergeParams: true });
router.use(resolveRfqParam);

router.post(
  "/",
  requireAuth,
  uploadLimiter,
  uploadSingleFile,
  asyncHandler(async (req: Request, res: Response) => {
    const file = (req as Request & { file?: { originalname: string; mimetype: string; size: number; buffer: Buffer } }).file;
    if (!file) throw Validation("Missing 'file' field in multipart form");
    const workspaceId = getRfqId(req);
    const dto = await svc.uploadAttachment(workspaceId, req.user!, {
      originalName: file.originalname,
      mimeType:     file.mimetype,
      sizeBytes:    file.size,
      buffer:       file.buffer,
    });
    res.status(201).json(dto);
  }),
);

router.get(
  "/:attId",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = getRfqId(req);
    const { attId } = req.params;
    const { row, absPath } = await svc.getAttachmentForDownload(workspaceId, attId, req.user!);
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("Content-Length", String(row.fileSizeBytes));
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(row.fileName)}"`);
    fs.createReadStream(absPath).pipe(res);
  }),
);

router.delete(
  "/:attId",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = getRfqId(req);
    const { attId } = req.params;
    await svc.deleteAttachment(workspaceId, attId, req.user!);
    res.status(204).end();
  }),
);

export default router;
