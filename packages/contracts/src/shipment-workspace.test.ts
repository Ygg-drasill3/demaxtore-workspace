import { describe, expect, it } from "vitest";
import {
  buildShipmentOperationalMilestones,
  shipmentBadgeGroup,
  SHIPMENT_STATUS_ALIAS_ACTIONS,
} from "./shipment-workspace";
import {
  CreateShipmentContainerSchema,
  PatchShipmentStatusAliasSchema,
  TransitionShipmentBookingSchema,
  UpsertShipmentBookingSchema,
} from "./shipment-workspace.zod";

describe("shipmentBadgeGroup", () => {
  it("maps FSM states to UI badge groups", () => {
    expect(shipmentBadgeGroup("SHIPMENT_CREATED")).toBe("DRAFT");
    expect(shipmentBadgeGroup("BOOKING_CONFIRMED")).toBe("BOOKED");
    expect(shipmentBadgeGroup("IN_TRANSIT")).toBe("TRANSIT");
    expect(shipmentBadgeGroup("DELIVERED")).toBe("DELIVERED");
    expect(shipmentBadgeGroup("CANCELLED")).toBe("CANCELLED");
  });
});

describe("buildShipmentOperationalMilestones", () => {
  it("marks completed milestones and current next step", () => {
    const ms = buildShipmentOperationalMilestones({
      state: "IN_TRANSIT",
      bookingConfirmedAt: "2026-01-01T00:00:00.000Z",
      loadedAt: "2026-01-02T00:00:00.000Z",
      departedAt: "2026-01-03T00:00:00.000Z",
      eta: "2026-01-20T00:00:00.000Z",
    });
    expect(ms.find((m) => m.key === "booking_confirmed")?.status).toBe("done");
    expect(ms.find((m) => m.key === "departed")?.status).toBe("done");
    expect(ms.find((m) => m.key === "arrived")?.status).toBe("current");
    expect(ms.find((m) => m.key === "delivered")?.status).toBe("pending");
  });
});

describe("shipment workspace zod", () => {
  it("parses booking upsert", () => {
    const parsed = UpsertShipmentBookingSchema.parse({
      bookingReference: "BK-1",
      carrier: "MSC",
      confirm: true,
    });
    expect(parsed.bookingReference).toBe("BK-1");
  });

  it("parses container create", () => {
    const parsed = CreateShipmentContainerSchema.parse({
      containerNumber: "MSCU1234567",
      packageCount: 10,
    });
    expect(parsed.containerNumber).toBe("MSCU1234567");
  });

  it("maps status aliases to FSM actions", () => {
    const parsed = PatchShipmentStatusAliasSchema.parse({ status: "booked" });
    expect(SHIPMENT_STATUS_ALIAS_ACTIONS[parsed.status]).toBe("confirm_booking");
  });

  it("accepts the operational booking fields the ops layer writes", () => {
    const parsed = UpsertShipmentBookingSchema.parse({
      status: "CONFIRMED",
      source: "MANUAL",
      carrierBookingNumber: "CBN-9",
      cargoReadyDate: "2026-02-01T00:00:00.000Z",
      siCutoff: "2026-02-02T00:00:00.000Z",
      vgmCutoff: "2026-02-03T00:00:00.000Z",
      cyCutoff: "2026-02-04T00:00:00.000Z",
      documentCutoff: "2026-02-05T00:00:00.000Z",
    });
    expect(parsed.carrierBookingNumber).toBe("CBN-9");
    expect(parsed.status).toBe("CONFIRMED");
  });

  it("transitions booking by target status", () => {
    const parsed = TransitionShipmentBookingSchema.parse({ toStatus: "CONFIRMED", reason: "ok" });
    expect(parsed.toStatus).toBe("CONFIRMED");
    expect(() => TransitionShipmentBookingSchema.parse({ toStatus: "NOPE" })).toThrow();
  });
});
