import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { isUnifiedMessagingEnabled } from "../../config/env.js";
import { UnifiedMessagingService } from "./unified-messaging.service.js";
import { UnifiedMessagingErrors } from "./unified-messaging.errors.js";
import {
  AddContextRequestSchema,
  AssignConversationRequestSchema,
  ConversationListFiltersSchema,
  CreateConversationRequestSchema,
  CreateInternalNoteRequestSchema,
  CreateMessageRequestSchema,
  MessageListQuerySchema,
} from "@dmx/contracts/unified-messaging.zod";

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
    const msg = await service().createMessage(req.user!, req.params.conversationId, body);
    res.status(201).json(msg);
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

export const unifiedMessagingRouter = router;

export { UnifiedMessagingErrors };
