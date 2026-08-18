import { describe, expect, it } from "vitest";
import {
  deriveFreightIqExecutionState,
  nextFreightIqExecutionAction,
} from "./freightiq-execution";

describe("Sprint 33 freightiq execution derivation", () => {
  it("maps request → offers → selected → booking → transit", () => {
    expect(
      deriveFreightIqExecutionState({
        freightRequestStatus: "REQUESTED",
        hasActiveOffers: false,
        hasSelection: false,
        bookingStatus: null,
        shipmentState: null,
        trackingLinked: false,
        containerCount: 0,
      }),
    ).toBe("REQUESTED");

    expect(
      deriveFreightIqExecutionState({
        freightRequestStatus: "QUOTED",
        hasActiveOffers: true,
        hasSelection: false,
        bookingStatus: null,
        shipmentState: null,
        trackingLinked: false,
        containerCount: 0,
      }),
    ).toBe("OFFERS_AVAILABLE");

    expect(
      deriveFreightIqExecutionState({
        freightRequestStatus: "CONVERTED_TO_SHIPMENT",
        hasActiveOffers: false,
        hasSelection: true,
        bookingStatus: "REQUESTED",
        shipmentState: "SHIPMENT_CREATED",
        trackingLinked: false,
        containerCount: 0,
      }),
    ).toBe("BOOKING_REQUESTED");

    expect(
      deriveFreightIqExecutionState({
        freightRequestStatus: "CONVERTED_TO_SHIPMENT",
        hasActiveOffers: false,
        hasSelection: true,
        bookingStatus: "CONFIRMED",
        shipmentState: "BOOKING_CONFIRMED",
        trackingLinked: false,
        containerCount: 0,
      }),
    ).toBe("BOOKING_CONFIRMED");

    expect(
      deriveFreightIqExecutionState({
        freightRequestStatus: "CONVERTED_TO_SHIPMENT",
        hasActiveOffers: false,
        hasSelection: true,
        bookingStatus: "CONFIRMED",
        shipmentState: "IN_TRANSIT",
        trackingLinked: true,
        containerCount: 1,
      }),
    ).toBe("IN_TRANSIT");
  });

  it("keeps cancellation non-conflicting with transit when booking cancelled", () => {
    expect(
      deriveFreightIqExecutionState({
        freightRequestStatus: "CONVERTED_TO_SHIPMENT",
        hasActiveOffers: false,
        hasSelection: true,
        bookingStatus: "CANCELLED",
        shipmentState: "SHIPMENT_CREATED",
        trackingLinked: false,
        containerCount: 0,
      }),
    ).toBe("CANCELLED");
  });

  it("suggests proceed_to_booking after offer selection", () => {
    const next = nextFreightIqExecutionAction("OFFER_SELECTED", "shp-1");
    expect(next.nextAction).toBe("proceed_to_booking");
    expect(next.bookingUrl).toContain("focus=booking");
  });
});
