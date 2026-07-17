import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { TradeChatService } from "./chat.service.js";
import { integrationStatus } from "./whatsapp.service.js";
import {
  getLegacyMessagingAdapters,
  shouldUseAdapterLayer,
  toMessagingActor,
} from "../unified-messaging/adapters/legacy/index.js";

/** Legacy alias — prefer /api/conversations */
const router = Router();
const chat = () => new TradeChatService(prisma);
const adapters = () => getLegacyMessagingAdapters(prisma);

router.get("/status", requireAuth, asyncHandler(async (_req, res) => {
  res.json(integrationStatus());
}));

router.get("/conversations", requireAuth, asyncHandler(async (req, res) => {
  const actor = req.user!;
  if (!shouldUseAdapterLayer()) {
    res.json(await chat().listConversations(actor.id, actor.role));
    return;
  }
  res.json(
    await adapters().directChat.listConversations(
      () => chat().listConversations(actor.id, actor.role),
      toMessagingActor(actor),
    ),
  );
}));

router.get("/workspace/:contextType/:contextWorkspaceId", requireAuth, asyncHandler(async (req, res) => {
  const contextType = req.params.contextType.toUpperCase();
  if (contextType !== "RFQ" && contextType !== "ORDER_FREIGHT") {
    res.status(400).json({ message: "Invalid contextType" });
    return;
  }
  const rows = await chat().listForWorkspace(
    contextType as "RFQ" | "ORDER_FREIGHT",
    req.params.contextWorkspaceId,
    req.user!,
  );
  res.json(rows);
}));

router.post("/rfq/:rfqWorkspaceId/ensure", requireAuth, asyncHandler(async (req, res) => {
  const rows = await chat().ensureRfqConversations(req.params.rfqWorkspaceId, req.user!);
  res.json(rows);
}));

router.post("/order/:orderWorkspaceId/freight/sync", requireAuth, asyncHandler(async (req, res) => {
  const rows = await chat().syncOrderFreightFromCommunications(req.params.orderWorkspaceId, req.user!);
  res.json(rows);
}));

router.post("/order/:orderWorkspaceId/freight/:forwarderContactId/ensure", requireAuth, asyncHandler(async (req, res) => {
  const conv = await chat().ensureOrderFreightConversation(
    req.params.orderWorkspaceId,
    req.params.forwarderContactId,
    req.user!,
  );
  res.json(conv);
}));

router.get("/conversations/:id", requireAuth, asyncHandler(async (req, res) => {
  const actor = req.user!;
  if (!shouldUseAdapterLayer()) {
    res.json(await chat().getConversation(req.params.id, actor.id, actor.role));
    return;
  }
  res.json(
    await adapters().directChat.getConversation(
      () => chat().getConversation(req.params.id, actor.id, actor.role),
      req.params.id,
      toMessagingActor(actor),
    ),
  );
}));

router.post("/conversations/:id/messages", requireAuth, asyncHandler(async (req, res) => {
  const body = String(req.body?.messageText ?? req.body?.body ?? "");
  const msg = await chat().sendMessage(req.params.id, req.user!, body);
  res.json(msg);
}));

export const chatRouter = router;
