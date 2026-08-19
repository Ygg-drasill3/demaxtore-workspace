import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV_GROUPS,
  OPS_NAV_GROUPS,
  OPS_QUICK_ACTIONS,
  NAV_GROUPS_BY_ROLE,
  navGroupsForRole,
  quickActionsForRole,
} from "./navigation";

/** Multi-role UX redesign — role-appropriate navigation. */
describe("multi-role navigation", () => {
  it("gives Ops execution roles the focused Ops surface, not the full Admin control surface", () => {
    for (const role of ["OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER"] as const) {
      expect(NAV_GROUPS_BY_ROLE[role]).toBe(OPS_NAV_GROUPS);
      expect(navGroupsForRole(role)).toBe(OPS_NAV_GROUPS);
      expect(quickActionsForRole(role)).toBe(OPS_QUICK_ACTIONS);
    }
  });

  it("Ops surface is execution-first (Work / Execution / Coordination) and compact", () => {
    expect(OPS_NAV_GROUPS.map((g) => g.id)).toEqual(["work", "execution", "coordination"]);
    const items = OPS_NAV_GROUPS.flatMap((g) => g.items);
    expect(items.length).toBeLessThanOrEqual(10);
    expect(items[0]?.testId).toBe("ops-work-queue");
    // Ops should NOT carry sourcing/admin-config noise.
    const testIds = items.map((i) => i.testId);
    for (const noise of ["admin-rfq", "admin-commoditybid", "admin-executive", "admin-system-ops", "admin-mixed-container"]) {
      expect(testIds).not.toContain(noise);
    }
  });

  it("Admin keeps broad visibility but grouped for progressive disclosure", () => {
    // Admin/Super Admin retain the control surface.
    expect(NAV_GROUPS_BY_ROLE.ADMIN).toBe(ADMIN_NAV_GROUPS);
    expect(NAV_GROUPS_BY_ROLE.SUPER_ADMIN).toBe(ADMIN_NAV_GROUPS);
    // Themed groups (more, smaller) instead of two giant buckets.
    expect(ADMIN_NAV_GROUPS.length).toBeGreaterThanOrEqual(6);
    for (const g of ADMIN_NAV_GROUPS) {
      expect(g.items.length).toBeLessThanOrEqual(6);
    }
    // No capability lost — all previous admin routes still present.
    const testIds = ADMIN_NAV_GROUPS.flatMap((g) => g.items).map((i) => i.testId);
    for (const kept of [
      "admin-dashboard", "admin-operations", "admin-rfq", "admin-commoditybid", "admin-freightiq",
      "admin-orders", "admin-freight-ops", "admin-freight-intake", "admin-reference-freight",
      "admin-freight-commercial", "admin-mixed-container", "admin-bulk-container", "admin-conversations",
      "admin-whatsapp-inbox", "admin-onboarding", "admin-forwarders", "admin-shippers",
      "admin-phone-verifications", "admin-sales-control", "admin-executive", "admin-growth",
      "admin-market-intelligence", "admin-system-ops", "admin-learning", "admin-notifications",
    ]) {
      expect(testIds).toContain(kept);
    }
  });
});
