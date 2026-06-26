import { describe, it, expect } from "vitest";
import {
  commodityBidWorkspaceGuidance,
  commodityBidChecklistProgress,
  COMMODITYBID_LEARNING,
} from "./commoditybid-learning";

describe("commoditybid learning content", () => {
  it("describes reverse auction not comparison", () => {
    expect(COMMODITYBID_LEARNING.whatIs).toBe(
      "CommodityBid is a competitive reverse-auction engine for commodity procurement.",
    );
    expect(COMMODITYBID_LEARNING.howItWorks.map((h) => h.step)).toContain("Lowest Valid Bid Wins");
    expect(COMMODITYBID_LEARNING.buyerRole).toEqual([
      "Create auction requirements",
      "Review winning result",
      "Approve execution",
    ]);
  });

  it("guidance for live auction stage", () => {
    const g = commodityBidWorkspaceGuidance("LIVE");
    expect(g.headline).toMatch(/live/i);
    expect(g.body).toMatch(/real time/i);
  });

  it("checklist progresses through auction states", () => {
    const early = commodityBidChecklistProgress("BID_DRAFT");
    expect(early).toEqual(["create_commoditybid"]);

    const live = commodityBidChecklistProgress("LIVE");
    expect(live).toContain("suppliers_invited");
    expect(live).not.toContain("order_created");

    const done = commodityBidChecklistProgress("ORDERS_SPAWNED");
    expect(done).toContain("order_created");
  });
});
