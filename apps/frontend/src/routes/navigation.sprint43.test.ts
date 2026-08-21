import { describe, expect, it } from "vitest";
import { BUYER_NAV_GROUPS, BUYER_QUICK_ACTIONS } from "./navigation";

/** Turkey Importer customer navigation — spec v1.0 §Navigation (HOME/OPERATIONS/CONTROL). */
describe("Turkey importer simplified navigation", () => {
  it("exposes exactly the HOME / OPERATIONS / CONTROL groups", () => {
    expect(BUYER_NAV_GROUPS.map((g) => g.id)).toEqual(["home", "operations", "control"]);
  });

  it("surfaces the 10 approved customer items", () => {
    const testIds = BUYER_NAV_GROUPS.flatMap((g) => g.items).map((i) => i.testId);
    for (const id of [
      "buyer-dashboard",
      "buyer-imports",
      "buyer-inbox",
      "buyer-freightiq",
      "buyer-shipments",
      "buyer-customs",
      "buyer-inland",
      "buyer-control-tower",
      "buyer-documents",
      "buyer-landed-cost",
    ]) {
      expect(testIds).toContain(id);
    }
    expect(testIds).toHaveLength(10);
  });

  it("does NOT surface sourcing, orders, products or exceptions in the Turkey navigation (§6/§36)", () => {
    const testIds = BUYER_NAV_GROUPS.flatMap((g) => g.items).map((i) => i.testId);
    for (const leaked of [
      "buyer-rfq",
      "buyer-commoditybid",
      "buyer-commoditybid-list",
      "buyer-mixed-container",
      "buyer-bulk-container",
      "buyer-orders",
      "buyer-products",
      "buyer-purchase-orders",
      "buyer-exceptions",
      "buyer-learning",
      "buyer-trade-documents",
    ]) {
      expect(testIds).not.toContain(leaked);
    }
  });

  it("leads quick actions with Start Import and carries no sourcing CTA", () => {
    expect(BUYER_QUICK_ACTIONS[0]?.testId).toBe("qa-start-import");
    expect(BUYER_QUICK_ACTIONS[1]?.testId).toBe("qa-freight-quote");
    expect(BUYER_QUICK_ACTIONS.map((q) => q.testId)).not.toContain("qa-new-rfq");
  });
});
