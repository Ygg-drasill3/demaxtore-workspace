import { describe, expect, it } from "vitest";
import { IntakeFreightOfferPayload } from "./freight-communications.zod";

describe("IntakeFreightOfferPayload", () => {
  const base = {
    forwarderContactId: "00000000-0000-4000-8000-000000000001",
    offerSource: "FORWARDER_EMAIL" as const,
    carrierName: "Maersk",
    vesselName: "Vessel A",
    etd: "2026-07-01T00:00:00.000Z",
    eta: "2026-07-20T00:00:00.000Z",
    transitDays: 19,
    cutOff: "2026-06-28T00:00:00.000Z",
    oceanFreight: 2500,
    currency: "USD" as const,
    validUntil: "2026-08-01T00:00:00.000Z",
  };

  it("accepts valid intake", () => {
    expect(IntakeFreightOfferPayload.safeParse(base).success).toBe(true);
  });

  it("rejects ETA before ETD", () => {
    const r = IntakeFreightOfferPayload.safeParse({
      ...base,
      eta: "2026-06-01T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-positive ocean freight", () => {
    expect(IntakeFreightOfferPayload.safeParse({ ...base, oceanFreight: 0 }).success).toBe(false);
  });
});
