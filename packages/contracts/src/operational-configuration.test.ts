import { describe, expect, it } from "vitest";
import { OPS_AUTOMATION_RULE_KEYS } from "./operational-configuration";
import {
  PatchAutomationRuleSchema,
  UpdateOperationalConfigurationSchema,
  UpsertTaskTemplateSchema,
} from "./operational-configuration.zod";

describe("operational-configuration contracts", () => {
  it("exposes automation rule keys", () => {
    expect(OPS_AUTOMATION_RULE_KEYS).toContain("inspection.failed");
    expect(OPS_AUTOMATION_RULE_KEYS).toContain("milestone.activate_next");
  });

  it("validates risk thresholds", () => {
    expect(() =>
      UpdateOperationalConfigurationSchema.parse({
        version: 1,
        risk: { atRiskMinutes: 60, delayedMinutes: 30 },
      }),
    ).toThrow();
    expect(
      UpdateOperationalConfigurationSchema.parse({
        version: 2,
        risk: { atRiskMinutes: 30, delayedMinutes: 1440 },
      }).risk?.delayedMinutes,
    ).toBe(1440);
  });

  it("validates task template and automation patch", () => {
    expect(UpsertTaskTemplateSchema.parse({ name: "Upload BL", dueOffsetDays: 5 }).priority).toBe("MEDIUM");
    expect(PatchAutomationRuleSchema.parse({ enabled: false }).enabled).toBe(false);
  });
});
