import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  planFromShipmentMilestone,
  planFromDesyncHit,
  evaluateOrderShipmentDesync,
} from "@dmx/contracts/order-shipment-orchestration";

describe("OrderShipmentOrchestrator planning", () => {
  it("shadow plan mirrors depart_vessel to mark_departed", () => {
    const plan = planFromShipmentMilestone({
      orderId: "o1",
      shipmentId: "s1",
      shipmentAction: "depart_vessel",
      orderState: "SHIPMENT_BOOKED",
      shipmentState: "LOADED_ON_VESSEL",
    });
    expect(plan?.suggestedActions).toEqual([
      { entity: "ORDER", action: "mark_departed", payload: {} },
    ]);
  });

  it("desync catch-up suggests shipment steps when order is ahead", () => {
    const hit = evaluateOrderShipmentDesync("IN_TRANSIT", "SHIPMENT_CREATED")!;
    const plan = planFromDesyncHit({
      orderId: "o1",
      shipmentId: "s1",
      orderState: "IN_TRANSIT",
      shipmentState: "SHIPMENT_CREATED",
      hit,
    });
    expect(plan.suggestedActions.some((s) => s.entity === "SHIPMENT")).toBe(true);
    expect(plan.laggingEntity).toBe("SHIPMENT");
  });

  it("exception report suggests dispute when taxonomy maps category", () => {
    const plan = planFromShipmentMilestone({
      orderId: "o1",
      shipmentId: "s1",
      shipmentAction: "report_exception",
      orderState: "IN_TRANSIT",
      shipmentState: "IN_TRANSIT",
      exceptionCategory: "DELIVERY_DELAY",
    });
    expect(plan?.suggestedActions).toEqual([
      { entity: "ORDER", action: "suggest_dispute", payload: { category: "DELIVERY_DELAY" } },
    ]);
  });
});

describe("OrderShipmentOrchestrator idempotency", () => {
  it("skips duplicate desync plan via processed_events", async () => {
    const { Prisma } = await import("@prisma/client");
    const create = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "5.22.0" }),
    );
    const { claimProcessedEvent } = await import("../../lib/processed-event.js");
    const db = { processedEvent: { create } } as never;
    const ok = await claimProcessedEvent(db, { source: "orchestrator:plan:o1", eventId: "desync:o1:rule" });
    expect(ok).toBe(false);
  });
});
