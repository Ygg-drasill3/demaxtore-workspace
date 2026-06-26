import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { PaymentService } from "./payment.service.js";
import { env, isProd } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { verifyHmacSha256 } from "../../middleware/webhook-signature.js";
import { AppError } from "../../utils/httpErrors.js";
import { claimProcessedEvent, releaseProcessedEvent } from "../../lib/processed-event.js";

const paymentWebhookRouter = Router();
const service = new PaymentService(prisma);
const PAYMENT_WEBHOOK_SOURCE = "webhook:payment";

paymentWebhookRouter.post("/", asyncHandler(async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ""));
  // In production HMAC is ALWAYS enforced and cannot be disabled by a flag.
  const enforce = isProd || (env.PAYMENT_WEBHOOK_ENFORCE_HMAC ?? false);
  const secret = env.PAYMENT_WEBHOOK_SECRET;

  // Fail closed: when enforcement is on but no secret is configured we refuse
  // to mutate any state (returns 500 before touching the payment layer).
  if (enforce && !secret) {
    throw new AppError(500, "PAYMENT_WEBHOOK_SECRET_NOT_CONFIGURED");
  }

  // Whenever enforcement is on, or a secret exists, a valid signature is
  // mandatory — a missing or invalid signature is rejected with 401.
  if (enforce || secret) {
    const signature = req.header("x-demaxtore-signature") ?? req.header("x-webhook-signature") ?? undefined;
    if (!secret || !verifyHmacSha256(rawBody, signature, secret)) {
      logger.warn({ path: req.path, ip: req.ip }, "Payment webhook signature verification failed");
      throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE");
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new AppError(400, "INVALID_JSON");
  }

  const eventId = String(body.eventId ?? body.intentId ?? "").trim();
  if (!eventId) {
    throw new AppError(400, "EVENT_ID_REQUIRED");
  }
  const claimed = await claimProcessedEvent(prisma, {
    source: PAYMENT_WEBHOOK_SOURCE,
    eventId,
    payload: body,
  });
  if (!claimed) {
    res.json({ received: true, duplicate: true });
    return;
  }

  // If processing fails, release the claim so the provider's retry can be
  // processed again — the event must never be silently dropped.
  try {
    await service.handleWebhook(body);
  } catch (err) {
    await releaseProcessedEvent(prisma, PAYMENT_WEBHOOK_SOURCE, eventId).catch(() => {});
    throw err;
  }
  res.json({ received: true });
}));

export { paymentWebhookRouter };
