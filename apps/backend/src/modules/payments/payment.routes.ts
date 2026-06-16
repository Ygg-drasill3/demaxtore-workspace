import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../db/prisma.js";
import { PaymentService } from "./payment.service.js";
import { CreatePaymentIntentPayload } from "@dmx/contracts/payments";

const paymentRouter = Router();
const service = new PaymentService(prisma);

paymentRouter.post("/orders/:orderId/intents", requireAuth, asyncHandler(async (req, res) => {
  const payload = CreatePaymentIntentPayload.parse(req.body);
  res.status(201).json(await service.createIntent(req.params.orderId, payload));
}));

paymentRouter.get("/intents/:intentId", requireAuth, asyncHandler(async (req, res) => {
  res.json({ status: await service.getStatus(req.params.intentId) });
}));

paymentRouter.post("/webhook", asyncHandler(async (req, res) => {
  await service.handleWebhook(req.body as Record<string, unknown>);
  res.json({ received: true });
}));

export { paymentRouter };
