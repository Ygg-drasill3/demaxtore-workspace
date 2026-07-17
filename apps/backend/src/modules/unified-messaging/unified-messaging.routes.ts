import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { isUnifiedMessagingEnabled } from "../../config/env.js";
import { UnifiedMessagingService } from "./unified-messaging.service.js";
import { UnifiedMessagingErrors } from "./unified-messaging.errors.js";
import { UnifiedMessagingAttachmentsService } from "./unified-messaging-attachments.service.js";
import multer from "multer";
import { createUploadFileFilter } from "../../lib/multer-file-guard.js";
import { streamStoredFileToResponse } from "../../lib/file-storage.js";

import {
  AddContextRequestSchema,
  AddParticipantRequestSchema,
  AssignConversationRequestSchema,
  ConversationListFiltersSchema,
  CreateConversationRequestSchema,
  CreateInternalNoteRequestSchema,
  CreateMessageRequestSchema,
  MessageListQuerySchema,
  UpdatePriorityRequestSchema,
  UpdateStatusRequestSchema,
} from "@dmx/contracts/unified-messaging.zod";

const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: createUploadFileFilter(),
});

const router = Router();
const service = () => new UnifiedMessagingService(prisma);

const MESSAGING_ROLES = [
  "BUYER",
  "SUPPLIER",
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "SALES_CONTROL",
] as const;

function requireUnifiedMessagingEnabled(
  _req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  if (!isUnifiedMessagingEnabled()) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Unified messaging disabled" } });
  }
  next();
}

router.use(requireUnifiedMessagingEnabled);
router.use(requireAuth);
router.use(requireRole(...MESSAGING_ROLES));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filters = ConversationListFiltersSchema.parse(req.query);
    res.json(await service().listConversations(req.user!, filters));
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = CreateConversationRequestSchema.parse(req.body);
    const created = await service().createConversation(req.user!, body);
    res.status(201).json(created);
  }),
);

const attachments = () => new UnifiedMessagingAttachmentsService(prisma);

router.get(
  "/attachments/:attachmentId",
  asyncHandler(async (req, res) => {
    res.json(await attachments().getMetadata(req.user!, req.params.attachmentId));
  }),
);

router.get(
  "/attachments/:attachmentId/download",
  asyncHandler(async (req, res) => {
    const file = await attachments().download(req.user!, req.params.attachmentId);
    await streamStoredFileToResponse(file.storageKey, res, file);
  }),
);

router.delete(
  "/attachments/:attachmentId",
  asyncHandler(async (req, res) => {
    res.json(await attachments().remove(req.user!, req.params.attachmentId));
  }),
);

router.get(
  "/:conversationId",
  asyncHandler(async (req, res) => {
    res.json(await service().getConversation(req.user!, req.params.conversationId));
  }),
);

router.get(
  "/:conversationId/messages",
  asyncHandler(async (req, res) => {
    const q = MessageListQuerySchema.parse(req.query);
    res.json(
      await service().listMessages(req.user!, req.params.conversationId, q.cursor, q.limit),
    );
  }),
);

router.post(
  "/:conversationId/messages",
  asyncHandler(async (req, res) => {
    const body = CreateMessageRequestSchema.parse(req.body);
    const { message, duplicate } = await service().createMessage(
      req.user!,
      req.params.conversationId,
      body,
    );
    res.status(duplicate ? 200 : 201).json(message);
  }),
);

router.post(
  "/:conversationId/internal-notes",
  asyncHandler(async (req, res) => {
    const body = CreateInternalNoteRequestSchema.parse(req.body);
    const msg = await service().createInternalNote(req.user!, req.params.conversationId, body);
    res.status(201).json(msg);
  }),
);

router.post(
  "/:conversationId/read",
  asyncHandler(async (req, res) => {
    res.json(await service().markConversationRead(req.user!, req.params.conversationId));
  }),
);

router.post(
  "/:conversationId/assign",
  asyncHandler(async (req, res) => {
    const body = AssignConversationRequestSchema.parse(req.body);
    res.json(await service().assignConversation(req.user!, req.params.conversationId, body));
  }),
);

router.post(
  "/:conversationId/archive",
  asyncHandler(async (req, res) => {
    res.json(await service().archiveConversation(req.user!, req.params.conversationId));
  }),
);

router.post(
  "/:conversationId/unarchive",
  asyncHandler(async (req, res) => {
    res.json(await service().unarchiveConversation(req.user!, req.params.conversationId));
  }),
);

router.post(
  "/:conversationId/priority",
  asyncHandler(async (req, res) => {
    const body = UpdatePriorityRequestSchema.parse(req.body);
    res.json(await service().updatePriority(req.user!, req.params.conversationId, body.priority));
  }),
);

router.post(
  "/:conversationId/status",
  asyncHandler(async (req, res) => {
    const body = UpdateStatusRequestSchema.parse(req.body);
    res.json(await service().updateStatus(req.user!, req.params.conversationId, body.status));
  }),
);

router.post(
  "/:conversationId/messages/:messageId/retry",
  asyncHandler(async (req, res) => {
    res.json(
      await service().retryMessage(
        req.user!,
        req.params.conversationId,
        req.params.messageId,
      ),
    );
  }),
);

router.post(
  "/:conversationId/participants",
  asyncHandler(async (req, res) => {
    const body = AddParticipantRequestSchema.parse(req.body);
    res.status(201).json(await service().addParticipant(req.user!, req.params.conversationId, body));
  }),
);

router.delete(
  "/:conversationId/participants/:participantId",
  asyncHandler(async (req, res) => {
    res.json(
      await service().removeParticipant(
        req.user!,
        req.params.conversationId,
        req.params.participantId,
      ),
    );
  }),
);

router.post(
  "/:conversationId/contexts",
  asyncHandler(async (req, res) => {
    const body = AddContextRequestSchema.parse(req.body);
    res.json(await service().addContext(req.user!, req.params.conversationId, body));
  }),
);

router.delete(
  "/:conversationId/contexts/:contextId",
  asyncHandler(async (req, res) => {
    res.json(
      await service().removeContext(req.user!, req.params.conversationId, req.params.contextId),
    );
  }),
);

router.post(
  "/:conversationId/attachments",
  uploadAttachment.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: { code: "FILE_REQUIRED" } });
    const row = await attachments().upload(req.user!, req.params.conversationId, {
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      buffer: file.buffer,
    });
    res.status(201).json(row);
  }),
);

export const unifiedMessagingRouter = router;

export { UnifiedMessagingErrors };
