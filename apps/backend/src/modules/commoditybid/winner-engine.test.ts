import { describe, expect, it } from "vitest";
import { findLowestValidBids } from "./winner-engine.js";

describe("findLowestValidBids tie-break", () => {
  it("picks earliest bid when unit prices tie", async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 60_000);
    const later = new Date(now.getTime() - 30_000);
    const tx = {
      commodityBidLot: {
        findMany: async () => [{ id: "lot-1" }],
      },
      commodityBidSubmission: {
        findMany: async () => [
          {
            id: "sub-late",
            lotId: "lot-1",
            supplierUserId: "sup-b",
            unitPrice: 100,
            createdAt: later,
            withdrawnAt: null,
            validUntil: new Date(now.getTime() + 86400_000),
          },
          {
            id: "sub-early",
            lotId: "lot-1",
            supplierUserId: "sup-a",
            unitPrice: 100,
            createdAt: earlier,
            withdrawnAt: null,
            validUntil: new Date(now.getTime() + 86400_000),
          },
        ],
      },
    } as unknown as Parameters<typeof findLowestValidBids>[0];

    const winners = await findLowestValidBids(tx, "ws-1");
    expect(winners).toHaveLength(1);
    expect(winners[0].submissionId).toBe("sub-early");
    expect(winners[0].supplierUserId).toBe("sup-a");
  });

  it("skips expired bids", async () => {
    const tx = {
      commodityBidLot: { findMany: async () => [{ id: "lot-1" }] },
      commodityBidSubmission: { findMany: async () => [] },
    } as unknown as Parameters<typeof findLowestValidBids>[0];
    const winners = await findLowestValidBids(tx, "ws-1");
    expect(winners).toHaveLength(0);
  });
});
