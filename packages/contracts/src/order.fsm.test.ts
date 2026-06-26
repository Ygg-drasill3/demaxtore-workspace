import { describe, it, expect } from "vitest";
import {
  ORDER_TRANSITIONS,
  ORDER_TERMINAL_STATES,
  isOrderTerminal,
  findOrderTransition,
  resolveOrderTargetState,
  ORDER_ACTIVE_STATES,
} from "./order.fsm";

describe("Order FSM", () => {
  it("has at least 31 transitions per order-state-machine.md", () => {
    expect(ORDER_TRANSITIONS.length).toBeGreaterThanOrEqual(31);
  });

  it("documents active + terminal states including Faz 1 exceptions", () => {
    expect(ORDER_ACTIVE_STATES.length).toBe(15);
    expect(ORDER_TERMINAL_STATES).toEqual(["CLOSED", "CANCELLED", "REJECTED"]);
  });

  it("every transition has audit event", () => {
    for (const t of ORDER_TRANSITIONS) {
      expect(t.auditEvent).toMatch(/^[a-z]+(\.[a-z_]+)+$/);
    }
  });

  it("findOrderTransition resolves start_production from SUPPLIER_CONFIRMED", () => {
    const t = findOrderTransition("SUPPLIER_CONFIRMED", "start_production", "SUPPLIER");
    expect(t?.to).toBe("PRODUCTION_STARTED");
  });

  it("findOrderTransition resolves request_inspection from PRODUCTION_COMPLETED", () => {
    const t = findOrderTransition("PRODUCTION_COMPLETED", "request_inspection", "BUYER");
    expect(t?.to).toBe("INSPECTION_REQUESTED");
  });

  it("flash state auto_to_in_transit follows mark_departed path", () => {
    const departed = findOrderTransition("SHIPMENT_BOOKED", "mark_departed", "ADMIN");
    const auto = findOrderTransition("DEPARTED", "auto_to_in_transit", "SYSTEM");
    expect(departed?.to).toBe("DEPARTED");
    expect(auto?.to).toBe("IN_TRANSIT");
  });

  it("resolveOrderTargetState keeps state on upload_document", () => {
    const t = findOrderTransition("IN_TRANSIT", "upload_document", "ADMIN")!;
    expect(resolveOrderTargetState("IN_TRANSIT", t)).toBe("IN_TRANSIT");
  });

  it("reject_order from active state", () => {
    const t = findOrderTransition("IN_TRANSIT", "reject_order", "ADMIN");
    expect(t?.to).toBe("REJECTED");
  });

  it("partial delivery flow", () => {
    const partial = findOrderTransition("ARRIVED_PORT", "mark_partially_delivered", "BUYER");
    const complete = findOrderTransition("PARTIALLY_DELIVERED", "mark_delivered", "BUYER");
    expect(partial?.to).toBe("PARTIALLY_DELIVERED");
    expect(complete?.to).toBe("DELIVERED");
  });

  it("terminal states are terminal only", () => {
    for (const s of ORDER_TERMINAL_STATES) expect(isOrderTerminal(s)).toBe(true);
    expect(isOrderTerminal("ORDER_CREATED")).toBe(false);
  });
});
