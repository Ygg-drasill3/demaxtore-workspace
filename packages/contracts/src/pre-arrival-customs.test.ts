import { describe, expect, it } from "vitest";
import {
  derivePreArrivalPhase,
  escalateSeverityByEta,
  preArrivalUrgency,
  buildPreArrivalSummary,
} from "./pre-arrival-customs.js";

describe("Sprint 38 pre-arrival customs", () => {
  it("READY_BEFORE_ARRIVAL requires readiness READY_FOR_BROKER and no blockers", () => {
    expect(
      derivePreArrivalPhase({
        caseStatus: "PREPARING",
        readinessStatus: "READY_FOR_BROKER",
        blockingCount: 0,
        arrived: false,
        hasCase: true,
      }),
    ).toBe("READY_BEFORE_ARRIVAL");
    expect(
      derivePreArrivalPhase({
        caseStatus: "PREPARING",
        readinessStatus: "PARTIALLY_READY",
        blockingCount: 0,
        arrived: false,
        hasCase: true,
      }),
    ).not.toBe("READY_BEFORE_ARRIVAL");
  });

  it("does not confuse READY_BEFORE_ARRIVAL with CLEARED", () => {
    expect(
      derivePreArrivalPhase({
        caseStatus: "CLEARED",
        readinessStatus: "READY_FOR_BROKER",
        blockingCount: 0,
        arrived: true,
        hasCase: true,
      }),
    ).toBe("CLEARED");
  });

  it("escalates severity as ETA approaches", () => {
    expect(escalateSeverityByEta("MEDIUM", 10, false)).toBe("MEDIUM");
    expect(escalateSeverityByEta("MEDIUM", 2, false)).toBe("HIGH");
    expect(escalateSeverityByEta("MEDIUM", 0.5, false)).toBe("CRITICAL");
    expect(escalateSeverityByEta("LOW", null, true)).toBe("HIGH");
  });

  it("urgency is time-aware and deterministic", () => {
    expect(
      preArrivalUrgency({
        daysToArrival: 12,
        arrived: false,
        blockingCount: 1,
        warningCount: 0,
        cleared: false,
        cancelled: false,
      }),
    ).toBe("MEDIUM");
    expect(
      preArrivalUrgency({
        daysToArrival: 2,
        arrived: false,
        blockingCount: 1,
        warningCount: 0,
        cleared: false,
        cancelled: false,
      }),
    ).toBe("HIGH");
  });

  it("buildPreArrivalSummary exposes ETA source provenance", () => {
    const s = buildPreArrivalSummary({
      caseStatus: "PREPARING",
      readinessStatus: "NOT_READY",
      blockingCount: 2,
      warningCount: 1,
      eta: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      etaSource: "MARITIME",
      bookingEta: new Date(Date.now() + 8 * 86_400_000).toISOString(),
      maritimeEta: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      ata: null,
      hasCase: true,
    });
    expect(s.etaSource).toBe("MARITIME");
    expect(s.bookingEta).toBeTruthy();
    expect(s.maritimeEta).toBeTruthy();
    expect(s.phase).toBe("ACTION_REQUIRED");
  });
});
