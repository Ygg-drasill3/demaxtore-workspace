import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertCanAccessOrderPayment, resolveOrderIdForIntent } from "./payment.policy.js";
import { AppError } from "../../utils/httpErrors.js";

describe("payment.policy", () => {
  const findFirstParticipant = vi.fn();
  const findFirstTimeline = vi.fn();
  const db = {
    workspaceParticipant: { findFirst: findFirstParticipant },
    timelineEvent: { findFirst: findFirstTimeline },
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin without participant row", async () => {
    await expect(
      assertCanAccessOrderPayment(db, { id: "u1", email: "a@test", role: "ADMIN" }, "order-1"),
    ).resolves.toBeUndefined();
    expect(findFirstParticipant).not.toHaveBeenCalled();
  });

  it("denies non-participant buyer", async () => {
    findFirstParticipant.mockResolvedValue(null);
    await expect(
      assertCanAccessOrderPayment(db, { id: "u1", email: "b@test", role: "BUYER" }, "order-1"),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("resolves order from payment.pending timeline", async () => {
    findFirstTimeline.mockResolvedValue({ workspaceId: "order-abc" });
    const orderId = await resolveOrderIdForIntent(db, "pi_stub_123");
    expect(orderId).toBe("order-abc");
  });
});
