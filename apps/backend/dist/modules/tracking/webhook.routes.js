import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { env, isProd } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { verifyHmacSha256 } from "../../middleware/webhook-signature.js";
import { AppError } from "../../utils/httpErrors.js";
import { claimProcessedEvent, releaseProcessedEvent } from "../../lib/processed-event.js";
import { CarrierEventService, normalizeCarrierEvent } from "./carrier-event.service.js";
const carrierWebhookRouter = Router();
carrierWebhookRouter.post("/:provider", asyncHandler(async (req, res) => {
    const provider = String(req.params.provider ?? "").toLowerCase();
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ""));
    // In production HMAC is ALWAYS enforced and cannot be disabled by a flag.
    const enforce = isProd || (env.CARRIER_WEBHOOK_ENFORCE_HMAC ?? false);
    const secret = env.CARRIER_WEBHOOK_SECRET;
    if (enforce && !secret) {
        throw new AppError(500, "CARRIER_WEBHOOK_SECRET_NOT_CONFIGURED");
    }
    if (enforce || secret) {
        const signature = req.header("x-demaxtore-signature") ?? req.header("x-webhook-signature") ?? undefined;
        if (!secret || !verifyHmacSha256(rawBody, signature, secret)) {
            logger.warn({ provider, ip: req.ip }, "Carrier webhook signature verification failed");
            throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE");
        }
    }
    let body;
    try {
        body = JSON.parse(rawBody.toString("utf8"));
    }
    catch {
        throw new AppError(400, "INVALID_JSON");
    }
    const rawEventId = body.eventId ?? body.id;
    if (rawEventId === undefined || rawEventId === null || String(rawEventId).trim() === "") {
        throw new AppError(400, "EVENT_ID_REQUIRED");
    }
    const eventId = String(rawEventId).trim();
    const source = `webhook:carrier:${provider}`;
    const claimed = await claimProcessedEvent(prisma, {
        source,
        eventId,
        payload: body,
    });
    if (!claimed) {
        res.json({ received: true, duplicate: true });
        return;
    }
    logger.info({ provider, eventId, eventType: body.eventType ?? body.type }, "Carrier webhook received");
    // Release the claim if ingestion fails so the event is not lost on retry.
    try {
        const normalized = normalizeCarrierEvent(provider, body);
        if (normalized) {
            const result = await new CarrierEventService(prisma).ingest(normalized);
            res.json({ received: true, ...result });
            return;
        }
        res.json({ received: true });
    }
    catch (err) {
        await releaseProcessedEvent(prisma, source, eventId).catch(() => { });
        throw err;
    }
}));
export { carrierWebhookRouter };
//# sourceMappingURL=webhook.routes.js.map