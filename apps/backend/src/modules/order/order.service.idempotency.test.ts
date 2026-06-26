import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "./order.service.js";

vi.mock("../../lib/processed-event.js", () => ({
  claimProcessedEvent: vi.fn(),
}));

import { claimProcessedEvent } from "../../lib/processed-event.js";

describe("OrderService idempotency", () => {
  const findFirst = vi.fn();
  const prisma = { auditLog: { findFirst } } as never;

  beforeEach(() => {
    findFirst.mockReset();
    vi.mocked(claimProcessedEvent).mockReset();
  });

  it("replays from audit log when idempotencyKey already applied", async () => {
    findFirst.mockResolvedValue({
      id: "audit-1",
      fromState: "CONFIRMED",
      toState: "IN_PRODUCTION",
    });
    const svc = new OrderService(prisma);
    const result = await svc.applyTransition({
      workspaceId: "ws-1",
      action: "start_production",
      actor: { id: "u1", email: "s@x.com", role: "SUPPLIER" },
      idempotencyKey: "idem-1",
    });
    expect(result.auditLogId).toBe("audit-1");
    expect(result.timelineEventId).toBe("(idempotent-replay)");
    expect(claimProcessedEvent).not.toHaveBeenCalled();
  });

  it("replays when processed_events claim fails but audit exists", async () => {
    findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "audit-2",
        fromState: "CONFIRMED",
        toState: "IN_PRODUCTION",
      });
    vi.mocked(claimProcessedEvent).mockResolvedValue(false);
    const svc = new OrderService(prisma);
    const result = await svc.applyTransition({
      workspaceId: "ws-1",
      action: "start_production",
      actor: { id: "u1", email: "s@x.com", role: "SUPPLIER" },
      idempotencyKey: "idem-2",
    });
    expect(result.auditLogId).toBe("audit-2");
    expect(claimProcessedEvent).toHaveBeenCalledWith(prisma, {
      source: "fsm:order",
      eventId: "ws-1:idem-2",
      workspaceId: "ws-1",
      action: "start_production",
    });
  });
});
