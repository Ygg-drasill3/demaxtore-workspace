import { describe, it, expect } from "vitest";
import {
  evaluateOrderShipmentDesync,
  planFromDesyncHit,
  planFromShipmentMilestone,
  buildShipmentCatchUpSteps,
} from "./order-shipment-orchestration.js";

describe("evaluateOrderShipmentDesync", () => {
  it("detects order in transit with pre-transit shipment", () => {
    const hit = evaluateOrderShipmentDesync("IN_TRANSIT", "SHIPMENT_CREATED");
    expect(hit?.rule).toBe("ORDER_IN_TRANSIT_SHIPMENT_PRE_TRANSIT");
    expect(hit?.laggingEntity).toBe("SHIPMENT");
  });

  it("returns null when aligned", () => {
    expect(evaluateOrderShipmentDesync("IN_TRANSIT", "IN_TRANSIT")).toBeNull();
  });
});

describe("planFromShipmentMilestone", () => {
  it("mirrors depart_vessel to mark_departed", () => {
    const plan = planFromShipmentMilestone({
      orderId: "o1",
      shipmentId: "s1",
      shipmentAction: "depart_vessel",
      orderState: "SHIPMENT_BOOKED",
      shipmentState: "LOADED_ON_VESSEL",
    });
    expect(plan?.suggestedActions).toContainEqual({ entity: "ORDER", action: "mark_departed", payload: {} });
  });
});

describe("planFromDesyncHit", () => {
  it("suggests shipment catch-up when order ahead", () => {
    const hit = evaluateOrderShipmentDesync("IN_TRANSIT", "SHIPMENT_CREATED")!;
    const plan = planFromDesyncHit({
      orderId: "o1",
      shipmentId: "s1",
      orderState: "IN_TRANSIT",
      shipmentState: "SHIPMENT_CREATED",
      hit,
    });
    expect(plan.suggestedActions.some((s) => s.entity === "SHIPMENT")).toBe(true);
  });
});

describe("buildShipmentCatchUpSteps", () => {
  it("walks valid transitions toward IN_TRANSIT", () => {
    const steps = buildShipmentCatchUpSteps("SHIPMENT_CREATED", "IN_TRANSIT");
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].action).toBe("confirm_booking");
  });
});
