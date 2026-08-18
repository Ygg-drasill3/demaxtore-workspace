import { describe, expect, it } from "vitest";
import { computeIssuePermissions } from "./operational-issue.service.js";

describe("computeIssuePermissions", () => {
  it("lets managers close issues", () => {
    const p = computeIssuePermissions("OPS_MANAGER");
    expect(p.canCreate).toBe(true);
    expect(p.canResolve).toBe(true);
    expect(p.canClose).toBe(true);
  });

  it("lets logistics create/resolve but not close", () => {
    const p = computeIssuePermissions("LOGISTICS_OPERATOR");
    expect(p.canCreate).toBe(true);
    expect(p.canResolve).toBe(true);
    expect(p.canClose).toBe(false);
  });

  it("keeps suppliers read-only", () => {
    const p = computeIssuePermissions("SUPPLIER");
    expect(p.canView).toBe(true);
    expect(p.canCreate).toBe(false);
    expect(p.canResolve).toBe(false);
  });
});
