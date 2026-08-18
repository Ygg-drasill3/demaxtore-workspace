import { PAYMENT_GATED_ORDER_ACTIONS } from "@dmx/contracts/payment-milestones";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/httpErrors.js";
export function isPaymentGatesEnabled() {
    return env.PAYMENT_GATES_ENABLED === true;
}
export class PaymentMilestoneService {
    db;
    constructor(db) {
        this.db = db;
    }
    async ensurePlan(orderId, currency = "USD") {
        const existing = await this.db.paymentPlan.findUnique({ where: { orderId } });
        if (existing)
            return existing;
        return this.db.paymentPlan.create({
            data: {
                orderId,
                currency,
                status: "ACTIVE",
                milestones: {
                    create: [
                        { kind: "DEPOSIT_PAID", status: "PENDING", currency, amount: null },
                        { kind: "BALANCE_PAID", status: "PENDING", currency, amount: null },
                    ],
                },
            },
            include: { milestones: true, holds: { where: { active: true } } },
        });
    }
    async getPlanDto(orderId) {
        const plan = await this.ensurePlan(orderId);
        const full = await this.db.paymentPlan.findUniqueOrThrow({
            where: { id: plan.id },
            include: { milestones: true, holds: { where: { active: true } } },
        });
        const hasHold = full.holds.length > 0;
        const overdue = full.milestones.some((m) => m.status === "OVERDUE");
        const disputed = full.milestones.some((m) => m.kind === "PAYMENT_DISPUTED" && m.status === "PENDING");
        return {
            orderId,
            status: full.status,
            financialStatus: disputed ? "DISPUTED" : overdue ? "OVERDUE" : hasHold ? "HOLD" : "CLEAR",
            holds: full.holds.map((h) => ({ reason: h.reason, active: h.active })),
            milestones: full.milestones.map((m) => ({
                id: m.id,
                kind: m.kind,
                status: m.status,
                amount: m.amount ? Number(m.amount) : null,
                currency: m.currency,
                dueAt: m.dueAt?.toISOString() ?? null,
                paidAt: m.paidAt?.toISOString() ?? null,
            })),
        };
    }
    async satisfyMilestone(orderId, kind, externalEventId) {
        const plan = await this.ensurePlan(orderId);
        if (externalEventId) {
            const dup = await this.db.paymentEvent.findFirst({
                where: { orderId, externalEventId },
            });
            if (dup)
                return;
            await this.db.paymentEvent.create({
                data: { orderId, eventType: kind, externalEventId, payload: { kind } },
            });
        }
        await this.db.paymentMilestone.updateMany({
            where: { planId: plan.id, kind },
            data: { status: "SATISFIED", paidAt: new Date() },
        });
        if (kind === "DEPOSIT_PAID" || kind === "BALANCE_PAID") {
            await this.db.paymentHold.updateMany({
                where: { orderId, active: true },
                data: { active: false, releasedAt: new Date() },
            });
        }
        await this.db.timelineEvent.create({
            data: {
                workspaceId: orderId,
                eventType: "payment.milestone.satisfied",
                actorUserId: null,
                payload: { kind },
            },
        });
        if (isPaymentGatesEnabled()) {
            const { OrderShipmentOrchestrator } = await import("../orchestration/order-shipment-orchestrator.service.js");
            await new OrderShipmentOrchestrator(this.db).onPaymentEvent(orderId, kind);
        }
    }
    /**
     * Records a payment dispute / chargeback. Unlike a normal milestone this must
     * never be a silent no-op: it places an active hold AND flags the plan as
     * DISPUTED (via a PENDING PAYMENT_DISPUTED milestone, which getPlanDto surfaces
     * as financialStatus = "DISPUTED"). Idempotent on externalEventId and on the
     * hold/milestone so duplicate webhooks do not stack records.
     */
    async recordDispute(orderId, externalEventId) {
        const plan = await this.ensurePlan(orderId);
        if (externalEventId) {
            const dup = await this.db.paymentEvent.findFirst({
                where: { orderId, externalEventId },
            });
            if (dup)
                return;
            await this.db.paymentEvent.create({
                data: { orderId, eventType: "PAYMENT_DISPUTED", externalEventId, payload: { kind: "PAYMENT_DISPUTED" } },
            });
        }
        const activeDisputeHold = await this.db.paymentHold.findFirst({
            where: { orderId, active: true, reason: "PAYMENT_DISPUTE" },
        });
        if (!activeDisputeHold) {
            await this.db.paymentHold.create({
                data: { orderId, planId: plan.id, reason: "PAYMENT_DISPUTE", active: true },
            });
        }
        const disputeMilestone = await this.db.paymentMilestone.findFirst({
            where: { planId: plan.id, kind: "PAYMENT_DISPUTED" },
        });
        if (!disputeMilestone) {
            await this.db.paymentMilestone.create({
                data: { planId: plan.id, kind: "PAYMENT_DISPUTED", status: "PENDING", currency: plan.currency },
            });
        }
        else if (disputeMilestone.status !== "PENDING") {
            await this.db.paymentMilestone.update({
                where: { id: disputeMilestone.id },
                data: { status: "PENDING" },
            });
        }
        await this.db.timelineEvent.create({
            data: {
                workspaceId: orderId,
                eventType: "payment.disputed",
                actorUserId: null,
                payload: { kind: "PAYMENT_DISPUTED" },
            },
        });
    }
    async assertOrderActionAllowed(action, orderId) {
        if (!isPaymentGatesEnabled())
            return;
        const required = PAYMENT_GATED_ORDER_ACTIONS[action];
        if (!required)
            return;
        const plan = await this.db.paymentPlan.findUnique({
            where: { orderId },
            include: { milestones: true, holds: true },
        });
        if (!plan)
            throw new AppError(409, "PAYMENT_PLAN_REQUIRED");
        if (plan.holds.some((h) => h.active))
            throw new AppError(409, "PAYMENT_HOLD_ACTIVE");
        const milestone = plan.milestones.find((m) => m.kind === required);
        if (!milestone || milestone.status !== "SATISFIED") {
            throw new AppError(409, "PAYMENT_MILESTONE_REQUIRED", { required });
        }
    }
}
//# sourceMappingURL=payment-milestone.service.js.map