import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentMilestoneService, isPaymentGatesEnabled } from "./payment-milestone.service.js";
import { AppError } from "../../utils/httpErrors.js";

vi.mock("../../config/env.js", () => ({
  env: { PAYMENT_GATES_ENABLED: false },
}));

describe("isPaymentGatesEnabled", () => {
  it("returns false when flag unset", () => {
    expect(isPaymentGatesEnabled()).toBe(false);
  });
});

describe("PaymentMilestoneService", () => {
  const paymentPlan = {
    findUnique: vi.fn(),
    create: vi.fn(),
  };
  const paymentMilestone = { updateMany: vi.fn() };
  const paymentHold = { updateMany: vi.fn() };
  const paymentEvent = { findFirst: vi.fn(), create: vi.fn() };
  const timelineEvent = { create: vi.fn() };

  const db = {
    paymentPlan,
    paymentMilestone,
    paymentHold,
    paymentEvent,
    timelineEvent,
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assertOrderActionAllowed is no-op when gates disabled", async () => {
    const svc = new PaymentMilestoneService(db);
    await expect(svc.assertOrderActionAllowed("start_production", "order-1")).resolves.toBeUndefined();
    expect(paymentPlan.findUnique).not.toHaveBeenCalled();
  });

  it("assertOrderActionAllowed blocks when deposit not satisfied", async () => {
    const { env } = await import("../../config/env.js");
    (env as { PAYMENT_GATES_ENABLED: boolean }).PAYMENT_GATES_ENABLED = true;

    paymentPlan.findUnique.mockResolvedValue({
      id: "plan-1",
      orderId: "order-1",
      milestones: [
        { kind: "DEPOSIT_PAID", status: "PENDING" },
        { kind: "BALANCE_PAID", status: "PENDING" },
      ],
      holds: [],
    });

    const svc = new PaymentMilestoneService(db);
    await expect(svc.assertOrderActionAllowed("start_production", "order-1")).rejects.toMatchObject({
      status: 409,
      code: "PAYMENT_MILESTONE_REQUIRED",
    });

    (env as { PAYMENT_GATES_ENABLED: boolean }).PAYMENT_GATES_ENABLED = false;
  });

  it("assertOrderActionAllowed passes when required milestone satisfied", async () => {
    const { env } = await import("../../config/env.js");
    (env as { PAYMENT_GATES_ENABLED: boolean }).PAYMENT_GATES_ENABLED = true;

    paymentPlan.findUnique.mockResolvedValue({
      id: "plan-1",
      orderId: "order-1",
      milestones: [{ kind: "DEPOSIT_PAID", status: "SATISFIED" }],
      holds: [],
    });

    const svc = new PaymentMilestoneService(db);
    await expect(svc.assertOrderActionAllowed("start_production", "order-1")).resolves.toBeUndefined();

    (env as { PAYMENT_GATES_ENABLED: boolean }).PAYMENT_GATES_ENABLED = false;
  });

  it("assertOrderActionAllowed blocks on active payment hold", async () => {
    const { env } = await import("../../config/env.js");
    (env as { PAYMENT_GATES_ENABLED: boolean }).PAYMENT_GATES_ENABLED = true;

    paymentPlan.findUnique.mockResolvedValue({
      id: "plan-1",
      milestones: [{ kind: "DEPOSIT_PAID", status: "SATISFIED" }],
      holds: [{ active: true, reason: "MANUAL_HOLD" }],
    });

    const svc = new PaymentMilestoneService(db);
    await expect(svc.assertOrderActionAllowed("book_shipment", "order-1")).rejects.toBeInstanceOf(AppError);

    (env as { PAYMENT_GATES_ENABLED: boolean }).PAYMENT_GATES_ENABLED = false;
  });

  it("satisfyMilestone updates milestone and timeline", async () => {
    paymentPlan.findUnique.mockResolvedValue(null);
    paymentPlan.create.mockResolvedValue({ id: "plan-new", orderId: "order-1" });
    paymentMilestone.updateMany.mockResolvedValue({ count: 1 });
    paymentEvent.findFirst.mockResolvedValue(null);
    timelineEvent.create.mockResolvedValue({});

    const svc = new PaymentMilestoneService(db);
    await svc.satisfyMilestone("order-1", "DEPOSIT_PAID", "ext-evt-1");

    expect(paymentMilestone.updateMany).toHaveBeenCalled();
    expect(timelineEvent.create).toHaveBeenCalled();
  });

  it("satisfyMilestone skips duplicate external event", async () => {
    paymentPlan.findUnique.mockResolvedValue({ id: "plan-1", orderId: "order-1" });
    paymentEvent.findFirst.mockResolvedValue({ id: "existing" });

    const svc = new PaymentMilestoneService(db);
    await svc.satisfyMilestone("order-1", "DEPOSIT_PAID", "ext-dup");

    expect(paymentMilestone.updateMany).not.toHaveBeenCalled();
  });
});
