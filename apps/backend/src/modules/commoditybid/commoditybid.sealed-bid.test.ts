import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../../db.js";
import { testApiFetch, testApiLogin } from "../../test/integration-http.js";
import { waitForCommodityBidLive } from "../../test/commoditybid-test-utils.js";

describe("CommodityBid auction anonymity (HTTP)", () => {
  let buyerToken = "";
  let supplierAToken = "";
  let supplierBToken = "";
  let adminToken = "";
  let wsId = "";
  let lotId = "";
  let supAId = "";
  let supBId = "";

  beforeAll(async () => {
    buyerToken = await testApiLogin("buyer1@acme.test");
    supplierAToken = await testApiLogin("supplier1@acme-mfg.test");
    supplierBToken = await testApiLogin("supplier1@beta-industries.test");
    adminToken = await testApiLogin("admin@demaxtore.local");

    const supA = await prisma.user.findUniqueOrThrow({ where: { email: "supplier1@acme-mfg.test" } });
    const supB = await prisma.user.findUniqueOrThrow({ where: { email: "supplier1@beta-industries.test" } });
    supAId = supA.id;
    supBId = supB.id;

    const created = await testApiFetch("/api/commoditybid", buyerToken, {
      method: "POST",
      body: JSON.stringify({
        title: `Auction anonymity ${Date.now()}`,
        description: "Test commodity bid anonymity in live auction",
        currency: "USD",
        auctionStartsAt: new Date(Date.now() + 60_000).toISOString(),
        auctionDurationMinutes: 5,
        invitationDeadlineMinutes: 60,
        supplierUserIds: [supAId, supBId],
        lots: [{ commodity: "Wheat", quantity: 100, uom: "MT" }],
      }),
    });
    expect(created.status).toBe(201);
    const dto = (await created.json()) as { id: string; lots: Array<{ id: string }> };
    wsId = dto.id;
    lotId = dto.lots[0].id;

    await waitForCommodityBidLive(wsId);

    const validUntil = new Date(Date.now() + 5 * 86400_000).toISOString();
    await testApiFetch(`/api/commoditybid/${wsId}/lots/${lotId}/bids`, supplierAToken, {
      method: "POST",
      body: JSON.stringify({ payload: { unitPrice: 100, validUntil, leadTimeDays: 14 } }),
    });
    await testApiFetch(`/api/commoditybid/${wsId}/lots/${lotId}/bids`, supplierBToken, {
      method: "POST",
      body: JSON.stringify({ payload: { unitPrice: 95, validUntil, leadTimeDays: 10 } }),
    });
  }, 60_000);

  it("bid feed does not expose supplier identity to buyer", async () => {
    const res = await testApiFetch(`/api/commoditybid/${wsId}/bid-feed`, buyerToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body.length).toBeGreaterThan(0);
    for (const row of body) {
      expect(row.supplierUserId).toBeUndefined();
      expect(row.supplierEmail).toBeUndefined();
    }
  });

  it("supplier cannot access admin identity map", async () => {
    const res = await testApiFetch(`/api/commoditybid/${wsId}/admin/identity-map`, supplierAToken);
    expect(res.status).toBe(403);
  });

  it("supplier only sees own bid", async () => {
    const res = await testApiFetch(`/api/commoditybid/${wsId}/my-bids`, supplierAToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ unitPrice: number }>;
    expect(body.length).toBe(1);
    expect(body[0].unitPrice).toBe(100);
  });

  it("admin identity map resolves bidder codes", async () => {
    const res = await testApiFetch(`/api/commoditybid/${wsId}/admin/identity-map`, adminToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ bidderCode: string; supplierUserId: string }>;
    expect(body.length).toBeGreaterThan(0);
    for (const row of body) {
      expect(row.bidderCode).toMatch(/^[A-Z]{3}$/);
      expect(row.supplierUserId).toBeTruthy();
    }
  });
});
