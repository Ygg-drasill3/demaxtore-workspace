import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../../db.js";
import { runCommodityBidSchedulerTick } from "./commoditybid.scheduler.js";
import { testApiFetch, testApiLogin } from "../../test/integration-http.js";
import { waitForCommodityBidLive } from "../../test/commoditybid-test-utils.js";

describe("CommodityBid SYSTEM scheduler (HTTP + tick)", () => {
  let buyerToken = "";
  let supplierToken = "";

  beforeAll(async () => {
    buyerToken = await testApiLogin("buyer1@acme.test");
    supplierToken = await testApiLogin("supplier1@acme-mfg.test");
  });

  it("auction_closed closes LIVE when auctionEndsAt passed and bids exist", async () => {
    const sup = await prisma.user.findUniqueOrThrow({ where: { email: "supplier1@acme-mfg.test" } });
    const created = await testApiFetch("/api/commoditybid", buyerToken, {
      method: "POST",
      body: JSON.stringify({
        title: `Scheduler close ${Date.now()}`,
        description: "SYSTEM auction close test",
        currency: "USD",
        auctionStartsAt: new Date(Date.now() + 60_000).toISOString(),
        auctionDurationMinutes: 1,
        invitationDeadlineMinutes: 60,
        supplierUserIds: [sup.id],
        lots: [{ commodity: "Wheat", quantity: 100, uom: "MT" }],
      }),
    });
    expect(created.status).toBe(201);
    const { id: wsId, lots } = (await created.json()) as { id: string; lots: Array<{ id: string }> };
    const lotId = lots[0].id;

    await waitForCommodityBidLive(wsId);

    const validUntil = new Date(Date.now() + 5 * 86400_000).toISOString();
    expect((await testApiFetch(`/api/commoditybid/${wsId}/lots/${lotId}/bids`, supplierToken, {
      method: "POST",
      body: JSON.stringify({ payload: { unitPrice: 100, validUntil, leadTimeDays: 14 } }),
    })).status).toBe(200);

    await prisma.commodityBidDetails.update({
      where: { workspaceId: wsId },
      data: { auctionEndsAt: new Date(Date.now() - 60_000) },
    });

    await runCommodityBidSchedulerTick();

    const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: wsId } });
    expect(["CLOSED", "WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL"]).toContain(ws.state);
  }, 60_000);

  it("auction_closed_no_bids expires LIVE when no bids and auctionEndsAt passed", async () => {
    const sup = await prisma.user.findUniqueOrThrow({ where: { email: "supplier1@beta-industries.test" } });
    const created = await testApiFetch("/api/commoditybid", buyerToken, {
      method: "POST",
      body: JSON.stringify({
        title: `Scheduler no bids ${Date.now()}`,
        description: "SYSTEM no-bids test",
        currency: "USD",
        auctionStartsAt: new Date(Date.now() + 60_000).toISOString(),
        auctionDurationMinutes: 1,
        invitationDeadlineMinutes: 60,
        supplierUserIds: [sup.id],
        lots: [{ commodity: "Corn", quantity: 50, uom: "MT" }],
      }),
    });
    expect(created.status).toBe(201);
    const { id: wsId } = (await created.json()) as { id: string };

    await waitForCommodityBidLive(wsId);

    await prisma.commodityBidDetails.update({
      where: { workspaceId: wsId },
      data: { auctionEndsAt: new Date(Date.now() - 60_000) },
    });

    await runCommodityBidSchedulerTick();

    const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: wsId } });
    expect(ws.state).toBe("EXPIRED");
  }, 60_000);
});
