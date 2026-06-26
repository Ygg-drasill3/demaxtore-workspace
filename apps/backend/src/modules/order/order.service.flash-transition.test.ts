import { describe, it, expect, vi } from "vitest";
import { OrderService } from "./order.service.js";
import type { ApplyTransitionResult } from "./order.service.js";

// C1 regression: applyTransition chains the SYSTEM auto_to_in_transit only when
// THIS call actually transitioned into a flash state (DEPARTED / ETA_UPDATED).
// On an idempotent replay the order is already IN_TRANSIT, so chaining the auto
// transition would throw UNKNOWN_ACTION and brick the retry.

type Result = ApplyTransitionResult;

function makeSvc() {
  const svc = new OrderService({} as never);
  // notifyOrchestrator is fire-and-forget; stub it out.
  vi.spyOn(svc as unknown as { notifyOrchestrator: () => Promise<void> }, "notifyOrchestrator").mockResolvedValue(
    undefined,
  );
  return svc;
}

function spyRunOne(svc: OrderService) {
  return vi.spyOn(svc as unknown as { runOneTransition: (i: unknown) => Promise<Result> }, "runOneTransition");
}

const ADMIN = { id: "u1", email: "a@x.com", role: "ADMIN" as const };

describe("OrderService flash-state auto-transition (C1)", () => {
  it("chains auto_to_in_transit after a real mark_departed (lands in DEPARTED)", async () => {
    const svc = makeSvc();
    const spy = spyRunOne(svc)
      .mockResolvedValueOnce({ workspaceId: "o1", fromState: "SHIPMENT_BOOKED", toState: "DEPARTED", timelineEventId: "tl-1", auditLogId: "a1", notificationsCreated: 0 })
      .mockResolvedValueOnce({ workspaceId: "o1", fromState: "DEPARTED", toState: "IN_TRANSIT", timelineEventId: "tl-2", auditLogId: "a2", notificationsCreated: 0 });

    await svc.applyTransition({ workspaceId: "o1", action: "mark_departed", actor: ADMIN });

    expect(spy).toHaveBeenCalledTimes(2);
    expect((spy.mock.calls[1][0] as { action: string }).action).toBe("auto_to_in_transit");
  });

  it("chains auto_to_in_transit after a real update_eta (lands in ETA_UPDATED)", async () => {
    const svc = makeSvc();
    const spy = spyRunOne(svc)
      .mockResolvedValueOnce({ workspaceId: "o1", fromState: "IN_TRANSIT", toState: "ETA_UPDATED", timelineEventId: "tl-1", auditLogId: "a1", notificationsCreated: 0 })
      .mockResolvedValueOnce({ workspaceId: "o1", fromState: "ETA_UPDATED", toState: "IN_TRANSIT", timelineEventId: "tl-2", auditLogId: "a2", notificationsCreated: 0 });

    await svc.applyTransition({ workspaceId: "o1", action: "update_eta", actor: ADMIN, payload: { newEta: "2026-01-01" } });

    expect(spy).toHaveBeenCalledTimes(2);
    expect((spy.mock.calls[1][0] as { action: string }).action).toBe("auto_to_in_transit");
  });

  it("does NOT chain on idempotent replay — retry must not crash (C1)", async () => {
    const svc = makeSvc();
    const spy = spyRunOne(svc).mockResolvedValueOnce({
      workspaceId: "o1",
      fromState: "SHIPMENT_BOOKED",
      toState: "DEPARTED", // replay still reports the original toState…
      timelineEventId: "(idempotent-replay)", // …but this marks it a replay
      auditLogId: "a1",
      notificationsCreated: 0,
    });

    const res = await svc.applyTransition({ workspaceId: "o1", action: "mark_departed", actor: ADMIN, idempotencyKey: "K" });

    expect(spy).toHaveBeenCalledTimes(1); // no chained auto_to_in_transit
    expect(res.toState).toBe("DEPARTED");
  });

  it("does not chain when the action did not land in a flash state", async () => {
    const svc = makeSvc();
    const spy = spyRunOne(svc).mockResolvedValueOnce({
      workspaceId: "o1",
      fromState: "PRODUCTION_STARTED",
      toState: "PRODUCTION_COMPLETED",
      timelineEventId: "tl-1",
      auditLogId: "a1",
      notificationsCreated: 0,
    });

    await svc.applyTransition({ workspaceId: "o1", action: "mark_production_completed", actor: { id: "u1", email: "s@x.com", role: "SUPPLIER" } });

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
