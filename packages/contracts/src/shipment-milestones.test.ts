import { describe, expect, it } from "vitest";
import {
  computeMilestoneDelayMinutes,
  computeMilestoneRisk,
  effectiveMilestoneAt,
  SHIPMENT_MILESTONE_TYPES,
} from "./shipment-milestones";
import {
  CreateShipmentMilestoneSchema,
  PatchShipmentMilestoneSchema,
} from "./shipment-milestones.zod";

describe("shipment-milestones contracts", () => {
  it("includes default milestone types", () => {
    expect(SHIPMENT_MILESTONE_TYPES).toContain("DEPARTURE");
    expect(SHIPMENT_MILESTONE_TYPES).toContain("DELIVERY");
  });

  it("computes delay from actual - planned", () => {
    const delay = computeMilestoneDelayMinutes({
      plannedAt: "2026-07-01T00:00:00.000Z",
      actualAt: "2026-07-01T02:00:00.000Z",
    });
    expect(delay).toBe(120);
  });

  it("falls back to estimated when actual missing", () => {
    const delay = computeMilestoneDelayMinutes({
      plannedAt: "2026-07-01T00:00:00.000Z",
      estimatedAt: "2026-07-01T01:30:00.000Z",
    });
    expect(delay).toBe(90);
  });

  it("classifies risk thresholds", () => {
    expect(computeMilestoneRisk(null)).toBe("ON_TRACK");
    expect(computeMilestoneRisk(0)).toBe("ON_TRACK");
    expect(computeMilestoneRisk(60)).toBe("AT_RISK");
    expect(computeMilestoneRisk(24 * 60)).toBe("DELAYED");
  });

  it("effectiveAt prefers actual > estimated > planned", () => {
    expect(
      effectiveMilestoneAt({
        plannedAt: "p",
        estimatedAt: "e",
        actualAt: "a",
      }),
    ).toBe("a");
    expect(effectiveMilestoneAt({ plannedAt: "p", estimatedAt: "e" })).toBe("e");
    expect(effectiveMilestoneAt({ plannedAt: "p" })).toBe("p");
  });

  it("validates create/patch schemas", () => {
    expect(
      CreateShipmentMilestoneSchema.parse({
        type: "BOOKING",
        plannedAt: "2026-07-01T00:00:00.000Z",
      }).type,
    ).toBe("BOOKING");
    expect(
      PatchShipmentMilestoneSchema.parse({
        estimatedAt: "2026-07-02T00:00:00.000Z",
      }).estimatedAt,
    ).toBe("2026-07-02T00:00:00.000Z");
  });
});
