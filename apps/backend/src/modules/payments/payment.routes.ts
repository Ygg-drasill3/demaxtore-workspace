import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../db/prisma.js";
import { PaymentService } from "./payment.service.js";
import { PaymentMilestoneService } from "./payment-milestone.service.js";
import { CreatePaymentIntentPayload } from "@dmx/contracts/payments";
import {
  assertCanAccessOrderPayment,
  resolveOrderIdForIntent,
} from "./payment.policy.js";
import { AppError } from "../../utils/httpErrors.js";

const paymentRouter = Router();
const service = new PaymentService(prisma);
const milestones = new PaymentMilestoneService(prisma);

paymentRouter.post("/orders/:orderId/intents", requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;
  await assertCanAccessOrderPayment(prisma, user, req.params.orderId);
  const payload = CreatePaymentIntentPayload.parse(req.body);
  res.status(201).json(await service.createIntent(req.params.orderId, payload, user.id));
}));

paymentRouter.get("/intents/:intentId", requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;
  const orderId = await resolveOrderIdForIntent(prisma, req.params.intentId);
  if (!orderId) throw new AppError(404, "PAYMENT_INTENT_NOT_FOUND");
  await assertCanAccessOrderPayment(prisma, user, orderId);
  res.json({ status: await service.getStatus(req.params.intentId) });
}));

paymentRouter.get("/orders/:orderId/plan", requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;
  await assertCanAccessOrderPayment(prisma, user, req.params.orderId);
  res.json(await milestones.getPlanDto(req.params.orderId));
}));

export { paymentRouter };
