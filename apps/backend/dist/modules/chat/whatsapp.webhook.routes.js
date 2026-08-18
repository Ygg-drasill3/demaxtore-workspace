import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { parseInboundWebhook, validateWebhookSignature, verifySubscription, } from "./whatsapp.service.js";
import { logger } from "../../config/logger.js";
import { WhatsAppInboxService } from "../whatsapp-inbox/whatsapp-inbox.service.js";
export const whatsappWebhookRouter = Router();
const inbox = () => new WhatsAppInboxService(prisma);
whatsappWebhookRouter.get("/", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && verifySubscription(mode, token, challenge)) {
        return res.status(200).type("text/plain").send(String(challenge));
    }
    return res.sendStatus(403);
});
whatsappWebhookRouter.post("/", (req, res) => {
    const raw = req.body;
    const signature = req.headers["x-hub-signature-256"];
    const sig = validateWebhookSignature(raw, signature);
    if (!sig.ok) {
        const status = sig.reason === "WHATSAPP_SIGNATURE_INVALID" ? 403 : 401;
        res.status(status).json({ ok: false, error: sig.reason });
        return;
    }
    let body = {};
    try {
        body = JSON.parse(raw.toString("utf8"));
    }
    catch {
        res.status(200).json({ ok: true });
        return;
    }
    res.status(200).json({ ok: true });
    setImmediate(() => {
        void (async () => {
            try {
                const { parseWhatsAppStatusWebhook } = await import("../whatsapp-notification-bridge/whatsapp-bridge.webhook.js");
                const { updateDeliveryStatusFromWebhook } = await import("../whatsapp-notification-bridge/whatsapp-bridge.service.js");
                for (const st of parseWhatsAppStatusWebhook(body)) {
                    await updateDeliveryStatusFromWebhook(st.providerMessageId, st.status, st.raw);
                }
                const inboxResult = await inbox().processWebhookPayload(body);
                logger.info(inboxResult, "[WA] inbox webhook processed");
                try {
                    const { UnifiedMessagingInboundHandler } = await import("../unified-messaging/unified-messaging-inbound.handler.js");
                    const unifiedInbound = new UnifiedMessagingInboundHandler(prisma);
                    for (const st of parseWhatsAppStatusWebhook(body)) {
                        await unifiedInbound.mirrorDeliveryStatus(st.providerMessageId, st.status, st.raw);
                    }
                }
                catch (mirrorErr) {
                    logger.warn({ err: mirrorErr }, "[WA] unified mirror skipped");
                }
                // WhatsApp Cloud inbox is the sole writer into unified workspace_messages.
                // Never run legacy trade-chat ingest for the same Meta payload — even when
                // inboxResult.inbound===0 (duplicates / already stored). Dual ingest was
                // creating a second OUTBOUND ghost row for every supplier reply.
                const legacyInbound = parseInboundWebhook(body);
                if (legacyInbound.length > 0) {
                    logger.debug({ legacyCount: legacyInbound.length, inboxInbound: inboxResult.inbound }, "[WA] skipping legacy trade-chat ingest — inbox owns WhatsApp Cloud inbound");
                }
            }
            catch (err) {
                logger.error({ err }, "[WA] webhook async processing failed");
            }
        })();
    });
});
//# sourceMappingURL=whatsapp.webhook.routes.js.map