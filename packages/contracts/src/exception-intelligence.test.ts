import { describe, expect, it } from "vitest";
import {
  evaluateBookingStalled,
  evaluateEtaDeliveryRisk,
  evaluateDocumentMissing,
  BOOKING_STALLED_THRESHOLD_MS,
} from "./exception-intelligence";

describe("Sprint 34 exception intelligence rules", () => {
  it("TEST 16 — small ETA shift without delivery date does not raise HIGH", () => {
    const out = evaluateEtaDeliveryRisk({
      etaShiftHours: 12,
      currentEta: "2026-09-20T00:00:00.000Z",
      expectedDeliveryDate: null,
    });
    expect(out?.raiseException).toBe(false);
    expect(out?.createTask).toBe(false);
    expect(out?.severity).toBe("LOW");
  });

  it("TEST 17 — ETA after expected delivery creates DELIVERY_RISK HIGH+", () => {
    const out = evaluateEtaDeliveryRisk({
      etaShiftHours: 48,
      currentEta: "2026-09-25T00:00:00.000Z",
      expectedDeliveryDate: "2026-09-20T00:00:00.000Z",
    });
    expect(out?.raiseException).toBe(true);
    expect(out?.impactType).toBe("DELIVERY_RISK");
    expect(["HIGH", "CRITICAL"]).toContain(out?.severity);
    expect(out?.createTask).toBe(true);
    expect(out?.ownerRole).toBe("OPERATIONS");
    expect(out?.recommendedAction).toMatch(/delivery/i);
  });

  it("TEST 18 — booking stalled beyond threshold", () => {
    const now = new Date();
    const out = evaluateBookingStalled({
      bookingStatus: "PENDING",
      bookingRequestedAt: new Date(now.getTime() - BOOKING_STALLED_THRESHOLD_MS - 1000),
      now,
    });
    expect(out?.raiseException).toBe(true);
    expect(out?.impactType).toBe("BOOKING_RISK");
    expect(out?.createTask).toBe(true);
  });

  it("booking not stalled under threshold", () => {
    const now = new Date();
    const out = evaluateBookingStalled({
      bookingStatus: "PENDING",
      bookingRequestedAt: new Date(now.getTime() - 1000),
      now,
    });
    expect(out).toBeNull();
  });

  it("TEST 19 — missing document creates DOCUMENT_RISK", () => {
    const out = evaluateDocumentMissing({ documentType: "BILL_OF_LADING", overdueHours: 80 });
    expect(out.impactType).toBe("DOCUMENT_RISK");
    expect(out.severity).toBe("HIGH");
    expect(out.createTask).toBe(true);
  });
});
