import { describe, expect, it } from "vitest";
import { computeOpsConfigPermissions } from "./operational-configuration.service.js";

describe("computeOpsConfigPermissions", () => {
  it("allows viewers to read", () => {
    expect(computeOpsConfigPermissions("LOGISTICS_OPERATOR").canView).toBe(true);
    expect(computeOpsConfigPermissions("BUYER").canView).toBe(false);
  });

  it("gates template management to managers", () => {
    expect(computeOpsConfigPermissions("LOGISTICS_OPERATOR").canManageTemplates).toBe(false);
    expect(computeOpsConfigPermissions("DOCUMENT_CONTROLLER").canManageTemplates).toBe(true);
    expect(computeOpsConfigPermissions("OPS_MANAGER").canManageAll).toBe(true);
  });

  it("allows platform admins full access", () => {
    expect(computeOpsConfigPermissions("ADMIN").canManageAll).toBe(true);
    expect(computeOpsConfigPermissions("SUPER_ADMIN").canManageAll).toBe(true);
  });
});
