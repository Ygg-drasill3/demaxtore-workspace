import type { ProviderSnapshot } from "./tracking.types.js";
import type { TrackingDelayFlag } from "@dmx/contracts/shipment-tracking";

const H_MS = 3_600_000;

export interface SnapshotDiff {
  etaShiftHours: number | null;
  statusChanged: boolean;
  delayDetected: boolean;
  arrived: boolean;
  departed: boolean;
}

export function diffSnapshots(
  prev: ProviderSnapshot | null,
  next: ProviderSnapshot,
): SnapshotDiff {
  const etaShiftHours =
    prev?.eta && next.eta
      ? Math.abs(next.eta.getTime() - prev.eta.getTime()) / H_MS
      : null;

  return {
    etaShiftHours,
    statusChanged: prev?.trackingStatus !== next.trackingStatus,
    delayDetected: next.delayFlag !== "NONE" && next.delayFlag !== (prev?.delayFlag ?? "NONE"),
    arrived: next.trackingStatus === "ARRIVED_PORT" && prev?.trackingStatus !== "ARRIVED_PORT",
    departed: next.trackingStatus === "DEPARTED" && prev?.trackingStatus !== "DEPARTED",
  };
}

export function etaAlertSeverity(shiftHours: number | null): "WARNING" | "CRITICAL" | null {
  if (shiftHours == null) return null;
  if (shiftHours >= 72) return "CRITICAL";
  if (shiftHours >= 24) return "WARNING";
  return null;
}

export function isDelayed(flag: TrackingDelayFlag): boolean {
  return flag === "MINOR" || flag === "MAJOR";
}
