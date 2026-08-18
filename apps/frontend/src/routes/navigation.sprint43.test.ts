import { describe, expect, it } from "vitest";
import { BUYER_NAV_GROUPS, BUYER_QUICK_ACTIONS } from "./navigation";

/** Sprint 43 — Turkey importer commercial workspace navigation. */
describe("Sprint 43 buyer import-ops navigation", () => {
  it("surfaces customs, inland, and landed cost in Import Operations group", () => {
    const importOps = BUYER_NAV_GROUPS.find((g) => g.id === "import-ops");
    expect(importOps).toBeDefined();
    const testIds = importOps!.items.map((i) => i.testId);
    expect(testIds).toContain("buyer-customs");
    expect(testIds).toContain("buyer-inland");
    expect(testIds).toContain("buyer-landed-cost");
    expect(testIds).toContain("buyer-imports");
    expect(testIds).toContain("buyer-freightiq");
  });

  it("keeps sourcing as secondary group", () => {
    const sourcing = BUYER_NAV_GROUPS.find((g) => g.id === "sourcing");
    expect(sourcing?.items.some((i) => i.testId === "buyer-rfq")).toBe(true);
    const homeIdx = BUYER_NAV_GROUPS.findIndex((g) => g.id === "home");
    const sourcingIdx = BUYER_NAV_GROUPS.findIndex((g) => g.id === "sourcing");
    const importIdx = BUYER_NAV_GROUPS.findIndex((g) => g.id === "import-ops");
    expect(importIdx).toBeLessThan(sourcingIdx);
    expect(homeIdx).toBeLessThan(importIdx);
  });

  it("quick actions prioritize freight and start import", () => {
    expect(BUYER_QUICK_ACTIONS[0]?.testId).toBe("qa-freight-quote");
    expect(BUYER_QUICK_ACTIONS[1]?.testId).toBe("qa-start-import");
  });

  it("flat turkey nav includes customs routes", () => {
    const tos = BUYER_NAV_GROUPS.flatMap((g) => g.items).map((i) => i.to);
    expect(tos).toContain("/buyer/customs");
    expect(tos).toContain("/buyer/inland");
    expect(tos).toContain("/buyer/landed-cost");
  });
});
