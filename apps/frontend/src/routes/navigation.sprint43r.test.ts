import { describe, expect, it } from "vitest";
import {
  BUYER_NAV_GROUPS_INTERNATIONAL,
  BUYER_QUICK_ACTIONS_INTERNATIONAL,
  NAV_BY_ROLE,
  navGroupsForRole,
  quickActionsForRole,
} from "./navigation";

describe("Sprint 43R international buyer navigation", () => {
  it("keeps sourcing ahead of execution and does not lead with Import Operations", () => {
    const ids = BUYER_NAV_GROUPS_INTERNATIONAL.map((g) => g.id);
    expect(ids.indexOf("sourcing")).toBeLessThan(ids.indexOf("execution"));
    expect(ids).not.toContain("import-ops");
  });

  it("surfaces RFQ, CommodityBid, tracking, exceptions, and documents", () => {
    const items = BUYER_NAV_GROUPS_INTERNATIONAL.flatMap((g) => g.items);
    const testIds = items.map((i) => i.testId);
    expect(testIds).toContain("buyer-rfq");
    expect(testIds).toContain("buyer-commoditybid");
    expect(testIds).toContain("buyer-shipments");
    expect(testIds).toContain("buyer-exceptions");
    expect(testIds).toContain("buyer-documents");
    expect(testIds).toContain("buyer-trade-documents");
  });

  it("does not put Turkey customs / inland / landed-cost / freestanding freight as primary nav", () => {
    const testIds = BUYER_NAV_GROUPS_INTERNATIONAL.flatMap((g) => g.items).map((i) => i.testId);
    expect(testIds).not.toContain("buyer-customs");
    expect(testIds).not.toContain("buyer-inland");
    expect(testIds).not.toContain("buyer-landed-cost");
    expect(testIds).not.toContain("buyer-imports");
    expect(testIds).not.toContain("buyer-freightiq");
  });

  it("quick actions prioritize Create Bid and New RFQ", () => {
    expect(BUYER_QUICK_ACTIONS_INTERNATIONAL[0]?.testId).toBe("qa-create-cb");
    expect(BUYER_QUICK_ACTIONS_INTERNATIONAL[1]?.testId).toBe("qa-new-rfq");
  });

  it("selects International nav for missing or INTERNATIONAL operating model", () => {
    expect(navGroupsForRole("BUYER")).toBe(BUYER_NAV_GROUPS_INTERNATIONAL);
    expect(navGroupsForRole("BUYER", "INTERNATIONAL")).toBe(BUYER_NAV_GROUPS_INTERNATIONAL);
    expect(navGroupsForRole("BUYER", "unknown")).toBe(BUYER_NAV_GROUPS_INTERNATIONAL);
    expect(quickActionsForRole("BUYER")[0]?.testId).toBe("qa-create-cb");
  });

  it("selects Turkey nav only for explicit TURKEY_IMPORTER", () => {
    const groups = navGroupsForRole("BUYER", "TURKEY_IMPORTER");
    expect(groups.map((g) => g.id)).toEqual(["home", "operations", "control"]);
    expect(groups.some((g) => g.id === "sourcing")).toBe(false);
    expect(quickActionsForRole("BUYER", "TURKEY_IMPORTER")[0]?.testId).toBe("qa-start-import");
  });

  it("default flat BUYER nav is International (existing customers)", () => {
    const tos = NAV_BY_ROLE.BUYER.map((i) => i.to);
    expect(tos).toContain("/buyer/rfq");
    expect(tos).not.toContain("/buyer/customs");
  });
});
