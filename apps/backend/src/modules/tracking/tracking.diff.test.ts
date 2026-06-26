import { describe, it, expect } from "vitest";
import { diffSnapshots, etaAlertSeverity, isDelayed } from "./tracking.diff.js";
import type { ProviderSnapshot } from "./tracking.types.js";

const base = (): ProviderSnapshot => ({
  provider: "MANUAL",
  vesselName: "MV Test",
  imo: null,
  mmsi: null,
  carrier: "C",
  voyage: "V1",
  pol: "CNSHA",
  pod: "NLRTM",
  etd: new Date("2026-06-01T00:00:00Z"),
  eta: new Date("2026-06-15T00:00:00Z"),
  lastPositionAt: new Date(),
  trackingStatus: "IN_TRANSIT",
  delayFlag: "NONE",
});

describe("tracking.diff", () => {
  it("detects ETA shift hours", () => {
    const prev = base();
    const next = { ...base(), eta: new Date("2026-06-18T00:00:00Z") };
    const d = diffSnapshots(prev, next);
    expect(d.etaShiftHours).toBe(72);
    expect(etaAlertSeverity(d.etaShiftHours)).toBe("CRITICAL");
  });

  it("detects delay flag change", () => {
    const d = diffSnapshots(base(), { ...base(), delayFlag: "MAJOR" });
    expect(d.delayDetected).toBe(true);
    expect(isDelayed("MAJOR")).toBe(true);
  });

  it("detects arrival", () => {
    const d = diffSnapshots(
      { ...base(), trackingStatus: "IN_TRANSIT" },
      { ...base(), trackingStatus: "ARRIVED_PORT" },
    );
    expect(d.arrived).toBe(true);
  });
});
