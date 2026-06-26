import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShipmentService } from "./shipment.service.js";

vi.mock("../../lib/processed-event.js", () => ({
  claimProcessedEvent: vi.fn(),
}));

import { claimProcessedEvent } from "../../lib/processed-event.js";

describe("ShipmentService idempotency", () => {
  const findFirst = vi.fn();
  const prisma = { auditLog: { findFirst } } as never;

  beforeEach(() => {
    findFirst.mockReset();
    vi.mocked(claimProcessedEvent).mockReset();
  });

  it("replays from audit log when idempotencyKey already applied", async () => {
    findFirst.mockResolvedValue({
      id: "audit-s1",
      fromState: "BOOKING_CONFIRMED",
      toState: "CONTAINER_ASSIGNED",
    });
    const svc = new ShipmentService(prisma);
    const result = await svc.applyTransition({
      workspaceId: "ship-1",
      action: "assign_container",
      actor: { id: "u1", email: "a@x.com", role: "ADMIN" },
      idempotencyKey: "idem-s1",
    });
    expect(result.auditLogId).toBe("audit-s1");
    expect(result.timelineEventId).toBe("(idempotent-replay)");
    expect(claimProcessedEvent).not.toHaveBeenCalled();
  });

  it("replays when processed_events claim fails but audit exists", async () => {
    findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "audit-s2",
        fromState: "BOOKING_CONFIRMED",
        toState: "CONTAINER_ASSIGNED",
      });
    vi.mocked(claimProcessedEvent).mockResolvedValue(false);
    const svc = new ShipmentService(prisma);
    const result = await svc.applyTransition({
      workspaceId: "ship-1",
      action: "assign_container",
      actor: { id: "u1", email: "a@x.com", role: "ADMIN" },
      idempotencyKey: "idem-s2",
    });
    expect(result.auditLogId).toBe("audit-s2");
    expect(claimProcessedEvent).toHaveBeenCalledWith(prisma, {
      source: "fsm:shipment",
      eventId: "ship-1:idem-s2",
      workspaceId: "ship-1",
      action: "assign_container",
    });
  });
});
