/**
 * Sprint 36A — International Execution Bridge unit coverage.
 */
import { describe, expect, it } from "vitest";
import {
  canonicalizeOrderWorkspaceOrigin,
  canonicalizePurchaseOrderSource,
} from "@dmx/contracts/purchase-order";
import { originFromParentType } from "../order/order.spawn.js";

describe("Sprint 36A — source identity", () => {
  it("TEST 2 — direct PO source remains DIRECT", () => {
    expect(canonicalizePurchaseOrderSource("DIRECT")).toBe("DIRECT");
    expect(canonicalizePurchaseOrderSource("manual")).toBe("DIRECT");
    expect(canonicalizeOrderWorkspaceOrigin("DIRECT_PO")).toBe("DIRECT_PO");
  });

  it("TEST 5/12 — RFQ and CommodityBid sources canonicalize correctly", () => {
    expect(canonicalizePurchaseOrderSource("RFQ")).toBe("RFQ");
    expect(canonicalizePurchaseOrderSource("COMMODITY_BID")).toBe("COMMODITY_BID");
    expect(canonicalizePurchaseOrderSource("commoditybid")).toBe("COMMODITY_BID");
    expect(canonicalizeOrderWorkspaceOrigin("COMMODITYBID")).toBe("COMMODITY_BID");
    expect(canonicalizeOrderWorkspaceOrigin("COMMODITY_BID")).toBe("COMMODITY_BID");
  });

  it("TEST 3/4 — direct path does not require RFQ or CommodityBid labels", () => {
    const direct = canonicalizePurchaseOrderSource("DIRECT");
    expect(direct).not.toBe("RFQ");
    expect(direct).not.toBe("COMMODITY_BID");
  });

  it("spawn parentType maps CommodityBid to COMMODITY_BID origin", () => {
    expect(originFromParentType("RFQ")).toBe("RFQ");
    expect(originFromParentType("DIRECT_PO")).toBe("DIRECT_PO");
    expect(originFromParentType("COMMODITYBID")).toBe("COMMODITY_BID");
    expect(originFromParentType("MIXED_CONTAINER")).toBe("LEGACY");
  });

  it("TEST 27 — ambiguous/unknown sources do not fabricate RFQ/CB", () => {
    expect(canonicalizePurchaseOrderSource("weird")).toBe("LEGACY");
    expect(canonicalizePurchaseOrderSource(null)).toBe("LEGACY");
    expect(canonicalizeOrderWorkspaceOrigin("MIXED_CONTAINER")).toBe("LEGACY");
  });
});
