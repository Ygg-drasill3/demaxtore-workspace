import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { TradeChatService } from "./chat.service.js";
import { integrationStatus } from "./whatsapp.service.js";

const router = Router();
const chat = () => new TradeChatService(prisma);

/** Production API: /api/conversations */
router.get("/status", requireAuth, asyncHandler(async (_req, res) => {
  res.json(integrationStatus());
}));

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const rows = await chat().listConversations(req.user!.id, req.user!.role);
  res.json(rows);
}));

router.get("/admin/all", requireAuth, requireRole("ADMIN", "SUPER_ADMIN", "OPS_MANAGER"), asyncHandler(async (_req, res) => {
  const rows = await chat().listAllForAdmin();
  res.json(rows);
}));

router.get("/by-rfq", requireAuth, asyncHandler(async (req, res) => {
  const workspaceRfqId = typeof req.query.workspaceRfqId === "string" ? req.query.workspaceRfqId : undefined;
  const freightIqRfqId = typeof req.query.freightIqRfqId === "string" ? req.query.freightIqRfqId : undefined;
  const rows = await chat().listByRfqLink({
    workspaceRfqId,
    freightIqRfqId,
    actor: req.user!,
  });
  res.json(rows);
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
  const freightToken = typeof req.body?.freightToken === "string" ? req.body.freightToken : undefined;
  const rows = await chat().ensureRfqConversations(req.params.rfqWorkspaceId, req.user!, freightToken);
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

router.get("/:conversationId", requireAuth, asyncHandler(async (req, res) => {
  const data = await chat().getConversation(req.params.conversationId, req.user!.id, req.user!.role);
  res.json(data);
}));

router.post("/:conversationId/messages", requireAuth, asyncHandler(async (req, res) => {
  const body = String(req.body?.messageText ?? req.body?.body ?? "");
  const msg = await chat().sendMessage(req.params.conversationId, req.user!, body);
  res.json(msg);
}));

export const conversationsRouter = router;
