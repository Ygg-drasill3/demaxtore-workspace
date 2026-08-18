import { describe, expect, it } from "vitest";
import { ACADEMY_GUIDE_IDS } from "@dmx/contracts/workspace-academy";
import {
  GUIDE_REGISTRY,
  guideById,
  guidesForRole,
  routeMatches,
  validateRegistry,
} from "./guide-registry";

describe("workspace-academy guide registry", () => {
  it("has no validation errors", () => {
    expect(validateRegistry()).toEqual([]);
  });

  it("covers every contract guide id", () => {
    const registered = new Set(GUIDE_REGISTRY.map((g) => g.id));
    for (const id of ACADEMY_GUIDE_IDS) {
      expect(registered.has(id)).toBe(true);
    }
  });

  it("keeps automatic guides to at most 7 steps", () => {
    for (const g of GUIDE_REGISTRY.filter((x) => x.automatic)) {
      expect(g.steps.length).toBeLessThanOrEqual(7);
    }
  });

  it("marks key buyer commercial guides as automatic", () => {
    for (const id of [
      "buyer-dashboard-v1",
      "buyer-inbox-v1",
      "buyer-rfq-list-v1",
      "buyer-rfq-create-v1",
      "buyer-procurement-strategy-v1",
      "buyer-rfq-workspace-v1",
      "buyer-quotation-comparison-v1",
      "buyer-proforma-v1",
      "buyer-order-workspace-v1",
      "buyer-freightiq-v1",
      "buyer-shipment-workspace-v1",
      "buyer-documents-v1",
      "buyer-control-tower-v1",
      "buyer-commoditybid-list-v1",
      "buyer-mixed-container-v1",
      "buyer-bulk-container-v1",
      "buyer-po-list-v1",
      "buyer-orders-list-v1",
      "buyer-freightiq-hub-v1",
      "buyer-shipments-list-v1",
      "buyer-notifications-v1",
      "buyer-compliance-v1",
      "buyer-learning-v1",
      "buyer-account-v1",
    ] as const) {
      expect(guideById(id)?.automatic).toBe(true);
    }
  });

  it("matches buyer sidebar list/hub routes", () => {
    expect(routeMatches("/buyer/commoditybid", "/buyer/commoditybid")).toBe(true);
    expect(routeMatches("/buyer/mixed-container", "/buyer/mixed-container")).toBe(true);
    expect(routeMatches("/buyer/bulk-container", "/buyer/bulk-container")).toBe(true);
    expect(routeMatches("/buyer/purchase-orders", "/buyer/purchase-orders")).toBe(true);
    expect(routeMatches("/buyer/orders", "/buyer/orders")).toBe(true);
    expect(routeMatches("/buyer/freightiq", "/buyer/freightiq")).toBe(true);
    expect(routeMatches("/buyer/shipments", "/buyer/shipments")).toBe(true);
    expect(routeMatches("/notifications", "/notifications")).toBe(true);
    expect(routeMatches("/buyer/trade-documents", "/buyer/trade-documents")).toBe(true);
    expect(routeMatches("/learning", "/learning")).toBe(true);
    expect(routeMatches("/account", "/account")).toBe(true);
  });

  it("uses only stable data-guide selectors when present", () => {
    for (const g of GUIDE_REGISTRY) {
      for (const s of g.steps) {
        if (s.selector) {
          expect(s.selector).toMatch(/^\[data-guide="[a-z0-9-]+"\]$/);
        }
      }
    }
  });

  it("filters guides by role", () => {
    const buyer = guidesForRole("BUYER");
    expect(buyer.every((g) => g.roles.includes("BUYER"))).toBe(true);
    expect(buyer.some((g) => g.id.startsWith("forwarder-"))).toBe(false);
    expect(guidesForRole("FORWARDER").every((g) => g.roles.includes("FORWARDER"))).toBe(true);
  });

  it("matches parameterized routes including slugs", () => {
    expect(routeMatches("/workspace/rfq/:id", "/workspace/rfq/rawabifood")).toBe(true);
    expect(routeMatches("/workspace/rfq/:id", "/workspace/rfq/00518105-f939-41b0-adb4-1ba1613d70ca")).toBe(true);
    expect(routeMatches("/workspace/rfq/:id", "/workspace/rfq/x/procurement-strategy")).toBe(false);
    expect(routeMatches("/buyer/dashboard", "/buyer/dashboard")).toBe(true);
  });

  it("looks up guides by id", () => {
    expect(guideById("buyer-dashboard-v1")?.routeMatcher).toBe("/buyer/dashboard");
    expect(guideById("missing")).toBeUndefined();
  });
});
