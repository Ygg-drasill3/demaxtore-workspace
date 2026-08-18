import { describe, expect, it } from "vitest";
import { computeInspectionPermissions } from "./inspection.service.js";

describe("computeInspectionPermissions", () => {
  it("gives suppliers read-only", () => {
    const p = computeInspectionPermissions("SUPPLIER");
    expect(p.canView).toBe(true);
    expect(p.canAssign).toBe(false);
    expect(p.canDecide).toBe(false);
    expect(p.canManageFindings).toBe(false);
  });

  it("gives ops managers full QA capabilities", () => {
    const p = computeInspectionPermissions("OPS_MANAGER");
    expect(p.canAssign).toBe(true);
    expect(p.canDecide).toBe(true);
    expect(p.canManageFindings).toBe(true);
    expect(p.canManageNcr).toBe(true);
  });

  it("lets logistics operators manage findings but not decide", () => {
    const p = computeInspectionPermissions("LOGISTICS_OPERATOR");
    expect(p.canManageFindings).toBe(true);
    expect(p.canSchedule).toBe(true);
    expect(p.canDecide).toBe(false);
    expect(p.canAssign).toBe(false);
  });
});
