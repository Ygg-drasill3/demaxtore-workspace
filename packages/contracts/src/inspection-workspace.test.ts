import { describe, expect, it } from "vitest";
import {
  decisionToOrderResult,
  inspectionDurationHours,
  INSPECTION_DECISIONS,
  INSPECTION_STATUSES,
  INSPECTION_TYPES,
} from "./inspection-workspace";
import {
  AssignInspectorSchema,
  CreateInspectionFindingSchema,
  RecordInspectionDecisionSchema,
} from "./inspection-workspace.zod";

describe("inspection-workspace contracts", () => {
  it("exposes types and statuses", () => {
    expect(INSPECTION_TYPES).toContain("FINAL_RANDOM");
    expect(INSPECTION_STATUSES).toContain("APPROVED");
    expect(INSPECTION_DECISIONS).toContain("PASS");
  });

  it("maps decisions to order results", () => {
    expect(decisionToOrderResult("PASS")).toBe("PASS");
    expect(decisionToOrderResult("CONDITIONAL_PASS")).toBe("CONDITIONAL_PASS");
    expect(decisionToOrderResult("FAIL")).toBe("FAIL");
  });

  it("computes duration hours", () => {
    expect(
      inspectionDurationHours("2026-07-01T08:00:00.000Z", "2026-07-01T12:30:00.000Z"),
    ).toBe(4.5);
    expect(inspectionDurationHours(null, null)).toBeNull();
  });

  it("validates assign / finding / decision payloads", () => {
    expect(AssignInspectorSchema.parse({ inspectorName: "Jane QA" }).inspectorName).toBe("Jane QA");
    expect(
      CreateInspectionFindingSchema.parse({
        category: "Packaging",
        severity: "MAJOR",
        description: "Torn carton",
      }).severity,
    ).toBe("MAJOR");
    expect(RecordInspectionDecisionSchema.parse({ decision: "PASS", approve: true }).decision).toBe(
      "PASS",
    );
  });
});
