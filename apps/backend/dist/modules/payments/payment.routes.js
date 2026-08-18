import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../db/prisma.js";
import { PaymentService } from "./payment.service.js";
import { PaymentMilestoneService } from "./payment-milestone.service.js";
import { CreatePaymentIntentPayload } from "@dmx/contracts/payments";
import { PAYMENT_MILESTONE_KINDS } from "@dmx/contracts/payment-milestones";
import { assertCanAccessOrderPayment, resolveOrderIdForIntent, } from "./payment.policy.js";
import { AppError } from "../../utils/httpErrors.js";
import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
const paymentRouter = Router();
const service = new PaymentService(prisma);
const milestones = new PaymentMilestoneService(prisma);
const ManualSatisfyMilestoneBody = z.object({
    kind: z.enum(PAYMENT_MILESTONE_KINDS),
    note: z.string().max(500).optional(),
});
paymentRouter.get("/capabilities", requireAuth, asyncHandler(async (_req, res) => {
    res.json(service.getCapabilities());
}));
paymentRouter.post("/orders/:orderId/intents", requireAuth, asyncHandler(async (req, res) => {
    const user = req.user;
    await assertCanAccessOrderPayment(prisma, user, req.params.orderId);
    const payload = CreatePaymentIntentPayload.parse(req.body);
    res.status(201).json(await service.createIntent(req.params.orderId, payload, user.id));
}));
paymentRouter.get("/intents/:intentId", requireAuth, asyncHandler(async (req, res) => {
    const user = req.user;
    const orderId = await resolveOrderIdForIntent(prisma, req.params.intentId);
    if (!orderId)
        throw new AppError(404, "PAYMENT_INTENT_NOT_FOUND");
    await assertCanAccessOrderPayment(prisma, user, orderId);
    res.json({ status: await service.getStatus(req.params.intentId) });
}));
paymentRouter.get("/orders/:orderId/plan", requireAuth, asyncHandler(async (req, res) => {
    const user = req.user;
    await assertCanAccessOrderPayment(prisma, user, req.params.orderId);
    res.json(await milestones.getPlanDto(req.params.orderId));
}));
/**
 * Manual milestone satisfaction for authorized staff when online collection is disabled.
 * Required so payment gates (e.g. start_production → DEPOSIT_PAID) remain operable.
 */
paymentRouter.post("/orders/:orderId/milestones/satisfy", requireAuth, asyncHandler(async (req, res) => {
    const user = req.user;
    if (!hasPortfolioVisibility(user.role)) {
        throw new AppError(403, "FORBIDDEN", { reason: "Staff role required to record payment milestones manually" });
    }
    await assertCanAccessOrderPayment(prisma, user, req.params.orderId);
    const body = ManualSatisfyMilestoneBody.parse(req.body);
    const eventId = `manual-${user.id}-${body.kind}-${Date.now()}`;
    await milestones.satisfyMilestone(req.params.orderId, body.kind, eventId);
    res.json(await milestones.getPlanDto(req.params.orderId));
}));
export { paymentRouter };
//# sourceMappingURL=payment.routes.js.map