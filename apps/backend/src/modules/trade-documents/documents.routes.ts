import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { createUploadFileFilter } from "../../lib/multer-file-guard.js";
import { DEFAULT_MAX_UPLOAD_BYTES, validateUpload } from "../../lib/upload-security.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { writeStoredFile, storagePathFor } from "../../lib/file-storage.js";
import { documentsController } from "./documents.controller.js";
import { TradeDocumentsService } from "./documents.service.js";
import { canAccessTradeWorkspace } from "./documents.policy.js";

export const tradeDocumentsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DEFAULT_MAX_UPLOAD_BYTES },
  fileFilter: createUploadFileFilter(),
});

const uploadSingle = upload.single("file");
const service = new TradeDocumentsService(prisma);

tradeDocumentsRouter.get(
  "/:workspaceType/:workspaceId",
  requireAuth,
  asyncHandler(documentsController.summary),
);

tradeDocumentsRouter.post(
  "/:workspaceType/:workspaceId/upload",
  requireAuth,
  uploadSingle,
  asyncHandler(async (req, res) => {
    const workspaceType = req.params.workspaceType;
    const workspaceId = req.params.workspaceId;
    if (workspaceType !== "ORDER" && workspaceType !== "SHIPMENT") {
      throw new AppError(400, "INVALID_WORKSPACE_TYPE");
    }
    if (!(await canAccessTradeWorkspace(prisma, req.user!, workspaceType, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    const file = req.file;
    if (!file) throw new AppError(400, "FILE_REQUIRED");
    validateUpload(file);
    const documentType = String(req.body.documentType ?? "OTHER");
    const { storageKey: fileId } = await writeStoredFile(file.buffer, file.originalname);
    const result = await service.applyDocumentAction(
      workspaceType,
      workspaceId,
      "upload_document",
      req.user!,
      {
        documentType,
        fileId,
        fileName: file.originalname,
        ownerRole: String(req.body.ownerRole ?? "SUPPLIER"),
      },
      { ip: req.ip, userAgent: req.headers["user-agent"] },
    );
    res.status(201).json(result);
  }),
);

tradeDocumentsRouter.post(
  "/:workspaceType/:workspaceId/actions/:action",
  requireAuth,
  asyncHandler(documentsController.action),
);

tradeDocumentsRouter.get(
  "/:workspaceType/:workspaceId/documents/:documentId/download",
  requireAuth,
  asyncHandler(async (req, res) => {
    const workspaceType = req.params.workspaceType;
    const workspaceId = req.params.workspaceId;
    const documentId = req.params.documentId;
    if (workspaceType !== "ORDER" && workspaceType !== "SHIPMENT") {
      throw new AppError(400, "INVALID_WORKSPACE_TYPE");
    }
    if (!(await canAccessTradeWorkspace(prisma, req.user!, workspaceType, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    const doc = await prisma.tradeDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.workspaceId !== workspaceId || doc.workspaceType !== workspaceType) {
      throw new AppError(404, "DOCUMENT_NOT_FOUND");
    }
    if (!doc.fileId) throw new AppError(404, "FILE_NOT_AVAILABLE");
    const absPath = await storagePathFor(doc.fileId);
    const fileName = doc.fileName ?? `${doc.documentType}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    fs.createReadStream(absPath).pipe(res);
  }),
);
