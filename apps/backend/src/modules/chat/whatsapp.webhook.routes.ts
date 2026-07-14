import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { TradeChatService } from "./chat.service.js";
import {
  parseInboundWebhook,
  verifySubscription,
  verifyWebhookSignature,
} from "./whatsapp.service.js";
import { logger } from "../../config/logger.js";

export const whatsappWebhookRouter = Router();

const chat = () => new TradeChatService(prisma);

whatsappWebhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;
  const result = verifySubscription(mode, token, challenge);
  if (!result) {
    res.status(403).send("Verification failed");
    return;
  }
  res.type("text/plain").send(result);
});

whatsappWebhookRouter.post("/", async (req, res) => {
  const raw = req.body as Buffer;
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  if (!verifyWebhookSignature(raw, signature)) {
    res.status(401).json({ ok: false, error: "INVALID_SIGNATURE" });
    return;
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
  } catch {
    res.status(400).json({ ok: false });
    return;
  }

  const { parseWhatsAppStatusWebhook } = await import(
    "../whatsapp-notification-bridge/whatsapp-bridge.webhook.js"
  );
  const { updateDeliveryStatusFromWebhook } = await import(
    "../whatsapp-notification-bridge/whatsapp-bridge.service.js"
  );
  for (const st of parseWhatsAppStatusWebhook(body)) {
    await updateDeliveryStatusFromWebhook(st.providerMessageId, st.status, st.raw);
  }

  const inbound = parseInboundWebhook(body);
  let processed = 0;
  for (const item of inbound) {
    const result = await chat().ingestInbound(
      item.fromPhone,
      item.messageText,
      item.whatsappMessageId,
    );
    if (result) processed += 1;
    else {
      logger.warn({ from: item.fromPhone, text: item.messageText.slice(0, 80) }, "[WA] no conversation match");
    }
  }

  res.json({ ok: true, processed });
});
