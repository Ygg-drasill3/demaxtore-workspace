import { Router, type RequestHandler } from "express";
import multer from "multer";
import { createUploadFileFilter } from "../../lib/multer-file-guard.js";
import { DEFAULT_MAX_UPLOAD_BYTES } from "../../lib/upload-security.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { communicationController } from "./communication.controller.js";

const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DEFAULT_MAX_UPLOAD_BYTES },
  fileFilter: createUploadFileFilter(),
}).single("file") as unknown as RequestHandler;

export const workspaceCommunicationRouter = Router({ mergeParams: true });

workspaceCommunicationRouter.get(
  "/",
  requireAuth,
  asyncHandler(communicationController.get),
);

workspaceCommunicationRouter.get(
  "/search",
  requireAuth,
  asyncHandler(communicationController.search),
);

workspaceCommunicationRouter.post(
  "/attachments",
  requireAuth,
  uploadSingleFile,
  asyncHandler(communicationController.uploadAttachment),
);

workspaceCommunicationRouter.get(
  "/attachments/:attachmentId/download",
  requireAuth,
  asyncHandler(communicationController.downloadAttachment),
);

workspaceCommunicationRouter.post(
  "/actions/:action",
  requireAuth,
  asyncHandler(communicationController.action),
);
