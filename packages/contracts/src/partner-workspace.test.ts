import { describe, expect, it } from "vitest";
import {
  isPartnerRole,
  partnerHasCapability,
  partnerCapabilities,
} from "./partner-workspace";

describe("Sprint 35 partner workspace contracts", () => {
  it("recognizes partner roles", () => {
    expect(isPartnerRole("SUPPLIER")).toBe(true);
    expect(isPartnerRole("ORIGIN_AGENT")).toBe(true);
    expect(isPartnerRole("CUSTOMS_BROKER")).toBe(true);
    expect(isPartnerRole("TRUCKER")).toBe(true);
    expect(isPartnerRole("BUYER")).toBe(false);
  });

  it("supplier can confirm cargo ready but not gate-in", () => {
    expect(partnerHasCapability("SUPPLIER", "CONFIRM_CARGO_READY")).toBe(true);
    expect(partnerHasCapability("SUPPLIER", "CONFIRM_GATE_IN")).toBe(false);
  });

  it("origin agent can confirm gate-in and view booking", () => {
    expect(partnerHasCapability("ORIGIN_AGENT", "CONFIRM_GATE_IN")).toBe(true);
    expect(partnerHasCapability("ORIGIN_AGENT", "BOOKING_VIEW")).toBe(true);
    expect(partnerHasCapability("ORIGIN_AGENT", "CONFIRM_CARGO_READY")).toBe(false);
  });

  it("broker/trucker foundation has no Turkey/inland actions", () => {
    expect(partnerHasCapability("CUSTOMS_BROKER", "CONFIRM_GATE_IN")).toBe(false);
    expect(partnerHasCapability("TRUCKER", "CONFIRM_CARGO_READY")).toBe(false);
    expect(partnerCapabilities("CUSTOMS_BROKER")).toContain("TASK_VIEW");
    expect(partnerCapabilities("TRUCKER")).toContain("SHIPMENT_VIEW");
  });
});
