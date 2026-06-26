import { describe, it, expect } from "vitest";
import {
  evaluateOrderShipmentDesync,
  planFromDesyncHit,
  planFromOrderMilestone,
  planFromShipmentMilestone,
  buildShipmentCatchUpSteps,
  ORDER_TO_SHIPMENT_MIRROR,
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

describe("planFromOrderMilestone", () => {
  it("mirrors cancel_order to cancel_shipment", () => {
    const plan = planFromOrderMilestone({
      orderId: "o1",
      shipmentId: "s1",
      orderAction: "cancel_order",
      orderState: "CANCELLED",
      shipmentState: "IN_TRANSIT",
    });
    expect(plan?.suggestedActions).toEqual([{ entity: "SHIPMENT", action: "cancel_shipment", payload: {} }]);
    expect(plan?.source).toBe("manual");
  });

  it("mirrors reject_order to reject_shipment", () => {
    const plan = planFromOrderMilestone({
      orderId: "o1",
      shipmentId: "s1",
      orderAction: "reject_order",
      orderState: "REJECTED",
      shipmentState: "BOOKING_CONFIRMED",
    });
    expect(plan?.suggestedActions[0]?.action).toBe("reject_shipment");
  });
});

describe("ORDER_TO_SHIPMENT_MIRROR", () => {
  it("defines cancel and reject mirrors", () => {
    expect(ORDER_TO_SHIPMENT_MIRROR.cancel_order).toBe("cancel_shipment");
    expect(ORDER_TO_SHIPMENT_MIRROR.reject_order).toBe("reject_shipment");
  });
});

describe("partial delivery", () => {
  it("detects partial delivery mismatch", () => {
    const hit = evaluateOrderShipmentDesync("PARTIALLY_DELIVERED", "IN_TRANSIT");
    expect(hit?.rule).toBe("ORDER_PARTIALLY_DELIVERED_MISMATCH");
  });

  it("mirrors confirm_partial_delivery", () => {
    const plan = planFromShipmentMilestone({
      orderId: "o1",
      shipmentId: "s1",
      shipmentAction: "confirm_partial_delivery",
      orderState: "ARRIVED_PORT",
      shipmentState: "READY_FOR_DELIVERY",
    });
    expect(plan?.suggestedActions[0]?.action).toBe("mark_partially_delivered");
  });
});
