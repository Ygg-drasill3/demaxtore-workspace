import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { WhatsAppInboxService } from "./whatsapp-inbox.service.js";
import { assertStoredFileExists } from "../../lib/file-storage.js";
import fsp from "node:fs/promises";

const router = Router();
const inbox = () => new WhatsAppInboxService(prisma);

const INBOX_ROLES = ["SUPER_ADMIN", "ADMIN", "OPS_MANAGER", "SALES_CONTROL"] as const;

router.get(
  "/conversations",
  requireAuth,
  requireRole(...INBOX_ROLES),
  asyncHandler(async (req, res) => {
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const data = await inbox().listConversations(req.user!, { cursor, limit });
    res.json(data);
  }),
);

router.get(
  "/conversations/:id/messages",
  requireAuth,
  requireRole(...INBOX_ROLES),
  asyncHandler(async (req, res) => {
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const data = await inbox().getMessages(req.user!, req.params.id, { cursor, limit });
    res.json(data);
  }),
);

router.post(
  "/conversations/:id/read",
  requireAuth,
  requireRole(...INBOX_ROLES),
  asyncHandler(async (req, res) => {
    const data = await inbox().markRead(req.user!, req.params.id);
    res.json(data);
  }),
);

router.post(
  "/messages",
  requireAuth,
  requireRole(...INBOX_ROLES),
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const type = body.type ?? "text";
    if (!["text", "template", "image", "document"].includes(type)) {
      res.status(400).json({ code: "INVALID_MESSAGE_TYPE" });
      return;
    }
    const msg = await inbox().sendMessage(req.user!, {
      to: typeof body.to === "string" ? body.to : undefined,
      conversationId: typeof body.conversationId === "string" ? body.conversationId : req.body?.conversationId,
      type,
      text: typeof body.text === "string" ? body.text : undefined,
      templateName: typeof body.templateName === "string" ? body.templateName : undefined,
      templateLanguage: typeof body.templateLanguage === "string" ? body.templateLanguage : undefined,
      replyToMessageId: typeof body.replyToMessageId === "string" ? body.replyToMessageId : undefined,
      mediaId: typeof body.mediaId === "string" ? body.mediaId : undefined,
      caption: typeof body.caption === "string" ? body.caption : undefined,
      filename: typeof body.filename === "string" ? body.filename : undefined,
    });
    res.status(201).json(msg);
  }),
);

router.get(
  "/media/:messageId",
  requireAuth,
  requireRole(...INBOX_ROLES),
  asyncHandler(async (req, res) => {
    const media = await inbox().getMedia(req.user!, req.params.messageId);
    const absPath = await assertStoredFileExists(media.storageKey);
    res.setHeader("Content-Type", media.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${media.filename.replace(/"/g, "")}"`);
    const buf = await fsp.readFile(absPath);
    res.send(buf);
  }),
);

export const whatsappInboxRouter = router;
