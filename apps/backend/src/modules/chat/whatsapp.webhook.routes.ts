import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import {
  parseInboundWebhook,
  validateWebhookSignature,
  verifySubscription,
} from "./whatsapp.service.js";
import { logger } from "../../config/logger.js";
import { TradeChatService } from "./chat.service.js";
import { WhatsAppInboxService } from "../whatsapp-inbox/whatsapp-inbox.service.js";

export const whatsappWebhookRouter = Router();

const chat = () => new TradeChatService(prisma);
const inbox = () => new WhatsAppInboxService(prisma);

whatsappWebhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  if (mode === "subscribe" && verifySubscription(mode, token, challenge)) {
    return res.status(200).type("text/plain").send(String(challenge));
  }

  return res.sendStatus(403);
});

whatsappWebhookRouter.post("/", (req, res) => {
  const raw = req.body as Buffer;
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const sig = validateWebhookSignature(raw, signature);
  if (!sig.ok) {
    const status = sig.reason === "WHATSAPP_SIGNATURE_INVALID" ? 403 : 401;
    res.status(status).json({ ok: false, error: sig.reason });
    return;
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
  } catch {
    res.status(200).json({ ok: true });
    return;
  }

  res.status(200).json({ ok: true });

  setImmediate(() => {
    void (async () => {
      try {
        const { parseWhatsAppStatusWebhook } = await import(
          "../whatsapp-notification-bridge/whatsapp-bridge.webhook.js"
        );
        const { updateDeliveryStatusFromWebhook } = await import(
          "../whatsapp-notification-bridge/whatsapp-bridge.service.js"
        );
        for (const st of parseWhatsAppStatusWebhook(body)) {
          await updateDeliveryStatusFromWebhook(st.providerMessageId, st.status, st.raw);
        }

        const inboxResult = await inbox().processWebhookPayload(body);
        logger.info(inboxResult, "[WA] inbox webhook processed");

        try {
          const { UnifiedMessagingInboundHandler } = await import(
            "../unified-messaging/unified-messaging-inbound.handler.js"
          );
          const unifiedInbound = new UnifiedMessagingInboundHandler(prisma);
          if (inboxResult && typeof inboxResult === "object") {
            await unifiedInbound.mirrorWhatsAppInboxResult(inboxResult as never);
          }
          for (const st of parseWhatsAppStatusWebhook(body)) {
            await unifiedInbound.mirrorDeliveryStatus(st.providerMessageId, st.status);
          }
        } catch (mirrorErr) {
          logger.warn({ err: mirrorErr }, "[WA] unified mirror skipped");
        }

        const legacyInbound = parseInboundWebhook(body);
        for (const item of legacyInbound) {
          const result = await chat().ingestInbound(
            item.fromPhone,
            item.messageText,
            item.whatsappMessageId,
          );
          if (!result) {
            logger.debug({ from: item.fromPhone }, "[WA] trade chat — no conversation match");
          }
        }
      } catch (err) {
        logger.error({ err }, "[WA] webhook async processing failed");
      }
    })();
  });
});
