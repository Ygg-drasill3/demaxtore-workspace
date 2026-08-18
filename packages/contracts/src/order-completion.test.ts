import { describe, expect, it } from "vitest";
import { COMPLETION_CHECK_KEYS, ORDER_COMPLETION_STATUSES } from "./order-completion";
import { CompleteOrderSchema, RecordDeliverySchema } from "./order-completion.zod";
import { ORDER_TERMINAL_STATES, findOrderTransition } from "./order.fsm";

describe("order-completion contracts", () => {
  it("exposes statuses and checklist keys", () => {
    expect(ORDER_COMPLETION_STATUSES).toContain("READY");
    expect(COMPLETION_CHECK_KEYS).toContain("DELIVERY_RECORDED");
  });

  it("validates delivery and complete payloads", () => {
    expect(
      RecordDeliverySchema.parse({
        deliveredBy: "Carrier",
        receivedBy: "Warehouse",
      }).deliveredBy,
    ).toBe("Carrier");
    expect(CompleteOrderSchema.parse({ notes: "Done" }).notes).toBe("Done");
  });
});

/**
 * These shapes are retired for the Turkey pilot: closure is FSM-driven, and this
 * module must not grow into a second, parallel closure path. The assertions below
 * pin the canonical route so a future re-wiring is a deliberate decision.
 */
describe("order closure stays canonical to the Order FSM", () => {
  it("delivery and closure are Order FSM transitions, not completion statuses", () => {
    expect(findOrderTransition("ARRIVED_PORT", "mark_delivered")).toBeDefined();
    expect(findOrderTransition("ARRIVED_PORT", "mark_partially_delivered")).toBeDefined();
    expect(findOrderTransition("DELIVERED", "close_order")).toBeDefined();
  });

  it("CLOSED is the terminal order state, so COMPLETED is not a lifecycle state", () => {
    expect(ORDER_TERMINAL_STATES).toContain("CLOSED");
    expect(ORDER_COMPLETION_STATUSES as readonly string[]).not.toContain("CLOSED");
  });

  it("every completion check is evidence that lives in another module", () => {
    // Nothing here is a source of truth; each key reads from shipment, inspection,
    // documents, issues, tasks or the delivery record.
    expect([...COMPLETION_CHECK_KEYS]).toEqual([
      "SHIPMENT_COMPLETED",
      "INSPECTION_COMPLETED",
      "REQUIRED_DOCUMENTS",
      "CRITICAL_ISSUES_CLOSED",
      "REQUIRED_TASKS_COMPLETED",
      "DELIVERY_RECORDED",
    ]);
  });
});
