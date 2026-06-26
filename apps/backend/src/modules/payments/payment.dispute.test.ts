import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentMilestoneService } from "./payment-milestone.service.js";

vi.mock("../../config/env.js", () => ({
  env: { PAYMENT_GATES_ENABLED: false },
}));

// C3 regression: PAYMENT_DISPUTED must NOT be a silent no-op. It must place an
// active hold and flag the plan as DISPUTED (PENDING PAYMENT_DISPUTED milestone),
// which getPlanDto surfaces as financialStatus = "DISPUTED".
describe("PaymentMilestoneService.recordDispute (C3)", () => {
  const paymentPlan = { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn() };
  const paymentMilestone = { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() };
  const paymentHold = { findFirst: vi.fn(), create: vi.fn() };
  const paymentEvent = { findFirst: vi.fn(), create: vi.fn() };
  const timelineEvent = { create: vi.fn() };

  const db = { paymentPlan, paymentMilestone, paymentHold, paymentEvent, timelineEvent } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    paymentPlan.findUnique.mockResolvedValue({ id: "plan-1", orderId: "order-1", currency: "USD" });
  });

  it("creates an active PAYMENT_DISPUTE hold, a PENDING dispute milestone, and a timeline event", async () => {
    paymentEvent.findFirst.mockResolvedValue(null);
    paymentHold.findFirst.mockResolvedValue(null);
    paymentMilestone.findFirst.mockResolvedValue(null);

    const svc = new PaymentMilestoneService(db);
    await svc.recordDispute("order-1", "chargeback-1");

    expect(paymentHold.create).toHaveBeenCalledWith({
      data: { orderId: "order-1", planId: "plan-1", reason: "PAYMENT_DISPUTE", active: true },
    });
    expect(paymentMilestone.create).toHaveBeenCalledWith({
      data: { planId: "plan-1", kind: "PAYMENT_DISPUTED", status: "PENDING", currency: "USD" },
    });
    expect(timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: "payment.disputed" }) }),
    );
  });

  it("is idempotent on externalEventId (duplicate webhook is a no-op)", async () => {
    paymentEvent.findFirst.mockResolvedValue({ id: "existing-event" });

    const svc = new PaymentMilestoneService(db);
    await svc.recordDispute("order-1", "chargeback-1");

    expect(paymentEvent.create).not.toHaveBeenCalled();
    expect(paymentHold.create).not.toHaveBeenCalled();
    expect(paymentMilestone.create).not.toHaveBeenCalled();
  });

  it("does not stack a second hold when one is already active", async () => {
    paymentEvent.findFirst.mockResolvedValue(null);
    paymentHold.findFirst.mockResolvedValue({ id: "hold-1", reason: "PAYMENT_DISPUTE", active: true });
    paymentMilestone.findFirst.mockResolvedValue({ id: "m-1", kind: "PAYMENT_DISPUTED", status: "PENDING" });

    const svc = new PaymentMilestoneService(db);
    await svc.recordDispute("order-1");

    expect(paymentHold.create).not.toHaveBeenCalled();
    expect(paymentMilestone.create).not.toHaveBeenCalled();
  });

  it("getPlanDto reports financialStatus DISPUTED when a PENDING dispute milestone exists", async () => {
    paymentPlan.findUniqueOrThrow.mockResolvedValue({
      id: "plan-1",
      status: "ACTIVE",
      milestones: [
        { id: "m1", kind: "DEPOSIT_PAID", status: "SATISFIED", amount: null, currency: "USD", dueAt: null, paidAt: null },
        { id: "m2", kind: "PAYMENT_DISPUTED", status: "PENDING", amount: null, currency: "USD", dueAt: null, paidAt: null },
      ],
      holds: [{ reason: "PAYMENT_DISPUTE", active: true }],
    });

    const svc = new PaymentMilestoneService(db);
    const dto = await svc.getPlanDto("order-1");
    expect(dto.financialStatus).toBe("DISPUTED");
  });
});
