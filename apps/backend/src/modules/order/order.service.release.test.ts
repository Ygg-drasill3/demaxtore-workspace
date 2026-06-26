import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "./order.service.js";

vi.mock("../../lib/processed-event.js", () => ({
  claimProcessedEvent: vi.fn(),
  releaseProcessedEvent: vi.fn(),
}));

import { claimProcessedEvent, releaseProcessedEvent } from "../../lib/processed-event.js";

// C6 regression: when the FSM transaction rolls back, the processed-event claim
// must be released so the same idempotencyKey is not permanently "bricked".
describe("OrderService claim release on transaction failure (C6)", () => {
  const auditFindFirst = vi.fn();
  const $transaction = vi.fn();
  const prisma = { auditLog: { findFirst: auditFindFirst }, $transaction } as never;

  beforeEach(() => {
    auditFindFirst.mockReset().mockResolvedValue(null);
    $transaction.mockReset();
    vi.mocked(claimProcessedEvent).mockReset().mockResolvedValue(true);
    vi.mocked(releaseProcessedEvent).mockReset().mockResolvedValue(undefined);
  });

  it("releases the claim and rethrows when the transaction fails", async () => {
    $transaction.mockRejectedValue(new Error("rolled back"));
    const svc = new OrderService(prisma);

    await expect(
      svc.applyTransition({
        workspaceId: "ws-1",
        action: "start_production",
        actor: { id: "u1", email: "s@x.com", role: "SUPPLIER" },
        idempotencyKey: "idem-fail",
      }),
    ).rejects.toThrow("rolled back");

    expect(claimProcessedEvent).toHaveBeenCalledTimes(1);
    expect(releaseProcessedEvent).toHaveBeenCalledWith(prisma, "fsm:order", "ws-1:idem-fail");
  });

  it("does not release when there is no idempotencyKey", async () => {
    $transaction.mockRejectedValue(new Error("rolled back"));
    const svc = new OrderService(prisma);

    await expect(
      svc.applyTransition({
        workspaceId: "ws-1",
        action: "start_production",
        actor: { id: "u1", email: "s@x.com", role: "SUPPLIER" },
      }),
    ).rejects.toThrow("rolled back");

    expect(releaseProcessedEvent).not.toHaveBeenCalled();
  });
});
