import { describe, it, expect } from "vitest";
import {
  SHIPMENT_TRANSITIONS,
  SHIPMENT_TERMINAL_STATES,
  SHIPMENT_ACTIVE_STATES,
  isShipmentTerminal,
  findShipmentTransition,
  resolveShipmentTargetState,
} from "./shipment.fsm";

describe("Shipment FSM", () => {
  it("defines active + terminal states including Faz 1 exceptions", () => {
    expect(SHIPMENT_ACTIVE_STATES.length).toBe(14);
    expect(SHIPMENT_TERMINAL_STATES).toEqual(["COMPLETED", "CANCELLED", "REJECTED"]);
  });

  it("every transition has audit event", () => {
    for (const t of SHIPMENT_TRANSITIONS) {
      expect(t.auditEvent).toMatch(/^shipment\./);
    }
  });

  it("confirm_booking advances booking flow", () => {
    const pending = findShipmentTransition("SHIPMENT_CREATED", "confirm_booking", "ADMIN");
    const confirmed = findShipmentTransition("BOOKING_PENDING", "confirm_booking", "ADMIN");
    expect(pending?.to).toBe("BOOKING_PENDING");
    expect(confirmed?.to).toBe("BOOKING_CONFIRMED");
  });

  it("load_vessel from origin port", () => {
    const t = findShipmentTransition("AT_ORIGIN_PORT", "load_vessel", "ADMIN");
    expect(t?.to).toBe("LOADED_ON_VESSEL");
  });

  it("complete_shipment closes from DELIVERED", () => {
    const t = findShipmentTransition("DELIVERED", "complete_shipment", "ADMIN");
    expect(t?.to).toBe("COMPLETED");
  });

  it("resolveShipmentTargetState keeps state on upload_document", () => {
    const t = findShipmentTransition("IN_TRANSIT", "upload_document", "ADMIN")!;
    expect(resolveShipmentTargetState("IN_TRANSIT", t)).toBe("IN_TRANSIT");
  });

  it("reject_shipment from active state", () => {
    const t = findShipmentTransition("IN_TRANSIT", "reject_shipment", "ADMIN");
    expect(t?.to).toBe("REJECTED");
  });

  it("partial delivery flow", () => {
    const partial = findShipmentTransition("READY_FOR_DELIVERY", "confirm_partial_delivery", "BUYER");
    const complete = findShipmentTransition("PARTIALLY_DELIVERED", "confirm_delivery", "BUYER");
    expect(partial?.to).toBe("PARTIALLY_DELIVERED");
    expect(complete?.to).toBe("DELIVERED");
  });

  it("terminal states are terminal", () => {
    for (const s of SHIPMENT_TERMINAL_STATES) expect(isShipmentTerminal(s)).toBe(true);
    expect(isShipmentTerminal("SHIPMENT_CREATED")).toBe(false);
  });
});
