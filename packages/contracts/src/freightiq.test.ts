import { describe, it, expect } from "vitest";
import { isFreightIntakeEligible } from "./freightiq";
import {
  CreateFreightRequestPayload,
  SubmitFreightOfferPayload,
  SelectFreightOfferPayload,
} from "./freightiq.zod";

describe("isFreightIntakeEligible", () => {
  it("allows admin on ORDER_CREATED", () => {
    expect(isFreightIntakeEligible("ORDER_CREATED", "ADMIN")).toBe(true);
  });

  it("allows buyer on ORDER_CREATED for freight quote request (Sprint 43)", () => {
    expect(isFreightIntakeEligible("ORDER_CREATED", "BUYER")).toBe(true);
  });

  it("blocks buyer on SHIPMENT_BOOKED", () => {
    expect(isFreightIntakeEligible("SHIPMENT_BOOKED", "BUYER")).toBe(false);
  });

  it("blocks everyone on CLOSED", () => {
    expect(isFreightIntakeEligible("CLOSED", "ADMIN")).toBe(false);
    expect(isFreightIntakeEligible("CLOSED", "BUYER")).toBe(false);
  });
});

describe("freightiq.zod", () => {
  it("validates create request", () => {
    const r = CreateFreightRequestPayload.safeParse({
      mode: "OCEAN_FCL",
      pol: "CNSHA",
      pod: "NLRTM",
      cargoDescription: "Steel coils palletized",
    });
    expect(r.success).toBe(true);
  });

  it("rejects non-positive offer price", () => {
    const r = SubmitFreightOfferPayload.safeParse({
      providerName: "Forwarder A",
      carrierName: "Maersk",
      price: 0,
      currency: "USD",
      transitDays: 21,
      validUntil: new Date(Date.now() + 86400_000).toISOString(),
    });
    expect(r.success).toBe(false);
  });

  it("rejects zero transit days", () => {
    const r = SubmitFreightOfferPayload.safeParse({
      providerName: "Forwarder A",
      carrierName: "Maersk",
      price: 1200,
      currency: "USD",
      transitDays: 0,
      validUntil: new Date(Date.now() + 86400_000).toISOString(),
    });
    expect(r.success).toBe(false);
  });

  it("requires validUntil on offer", () => {
    const r = SubmitFreightOfferPayload.safeParse({
      providerName: "A",
      carrierName: "B",
      price: 100,
      currency: "USD",
      transitDays: 10,
      validUntil: "not-a-date",
    });
    expect(r.success).toBe(false);
  });

  it("requires offerId on selection payload", () => {
    const r = SelectFreightOfferPayload.safeParse({});
    expect(r.success).toBe(false);
  });
});
