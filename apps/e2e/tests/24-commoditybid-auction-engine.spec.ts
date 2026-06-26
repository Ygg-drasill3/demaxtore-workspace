import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("Sprint 9B — CommodityBid auction engine", () => {
  let cbId = "";
  let lotId = "";
  let buyerToken = "";
  let adminToken = "";
  let supAToken = "";
  let supBToken = "";
  let supAId = "";
  let supBId = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
    supAToken = await apiLogin(req, USERS.supA1);
    supBToken = await apiLogin(req, USERS.supB1);
    const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
    supAId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
    supBId = suppliers.find((u) => u.email === USERS.supB1.email)!.id;
  });

  const runScheduler = async () => {
    const req = await newRequest();
    await req.post(`${API_BASE}/api/admin/commoditybid/run-scheduler-tick`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  };

  test("01 — Create route opens CommodityBid create shell (authoritative flow in test 02)", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/commoditybid/new");
    const tour = page.getByTestId("product-tour");
    if (await tour.isVisible().catch(() => false)) {
      await page.getByLabel("Dismiss tour").click();
    }
    await expect(page.getByTestId("cb-external-embed-create")).toBeVisible({ timeout: 30_000 });
  });

  test("02 — Buyer seeds scheduled auction via API", async () => {
    const req = await newRequest();
    const ts = Date.now();
    const start = new Date(Date.now() + 45_000).toISOString();
    const created = await req.post(`${API_BASE}/api/commoditybid`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        title: `E2E Auction ${ts}`,
        description: "Sprint 9B auction engine end-to-end test description",
        currency: "USD",
        auctionStartsAt: start,
        auctionDurationMinutes: 1,
        invitationDeadlineMinutes: 60,
        supplierUserIds: [supAId, supBId],
        lots: [{ commodity: "Wheat", quantity: 100, uom: "MT" }],
      },
    }).then((r) => r.json());
    cbId = created.id;
    expect(created.state).toBe("SCHEDULED");
    lotId = created.lots[0].id;
  });

  test("03 — Scheduler invites suppliers and opens auction", async () => {
    test.setTimeout(120_000);
    test.skip(!cbId, "no cbId");
    await runScheduler();
    const req = await newRequest();
    let state = "SCHEDULED";
    for (let i = 0; i < 30 && state !== "LIVE"; i++) {
      await runScheduler();
      const ws = await req.get(`${API_BASE}/api/commoditybid/${cbId}`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      }).then((r) => r.json());
      state = ws.state;
      if (state !== "LIVE") await new Promise((r) => setTimeout(r, 2000));
    }
    expect(state).toBe("LIVE");
  });

  test("04 — Suppliers submit improving bids", async () => {
    test.skip(!cbId || !lotId, "setup");
    const req = await newRequest();
    const validUntil = new Date(Date.now() + 86400_000).toISOString();
    await req.post(`${API_BASE}/api/commoditybid/${cbId}/actions/join-auction`, {
      headers: { Authorization: `Bearer ${supAToken}` }, data: {},
    });
    await req.post(`${API_BASE}/api/commoditybid/${cbId}/actions/join-auction`, {
      headers: { Authorization: `Bearer ${supBToken}` }, data: {},
    });
    await req.post(`${API_BASE}/api/commoditybid/${cbId}/lots/${lotId}/bids`, {
      headers: { Authorization: `Bearer ${supAToken}` },
      data: { payload: { unitPrice: 420, validUntil, leadTimeDays: 14 } },
    });
    await req.post(`${API_BASE}/api/commoditybid/${cbId}/lots/${lotId}/bids`, {
      headers: { Authorization: `Bearer ${supBToken}` },
      data: { payload: { unitPrice: 400, validUntil, leadTimeDays: 12 } },
    });
    await req.post(`${API_BASE}/api/commoditybid/${cbId}/lots/${lotId}/bids`, {
      headers: { Authorization: `Bearer ${supBToken}` },
      data: { payload: { unitPrice: 385, validUntil, leadTimeDays: 10 } },
    });
    const status = await req.get(`${API_BASE}/api/commoditybid/${cbId}/auction-status`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(status.lowestBidAmount).toBe(385);
  });

  test("05 — Auction closes and winner identified automatically", async () => {
    test.setTimeout(180_000);
    test.skip(!cbId, "setup");
    const req = await newRequest();
    const details = await req.get(`${API_BASE}/api/commoditybid/${cbId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const endsAt = new Date(details.auctionEndsAt).getTime();
    const waitMs = Math.max(0, endsAt - Date.now() + 2000);
    await new Promise((r) => setTimeout(r, waitMs));
    for (let i = 0; i < 20; i++) {
      await runScheduler();
      const ws = await req.get(`${API_BASE}/api/commoditybid/${cbId}`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      }).then((r) => r.json());
      if (["AWAITING_BUYER_APPROVAL", "WINNER_IDENTIFIED"].includes(ws.state)) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    const final = await req.get(`${API_BASE}/api/commoditybid/${cbId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(["AWAITING_BUYER_APPROVAL", "WINNER_IDENTIFIED"]).toContain(final.state);
    expect(final.lowestBidAmount).toBe(385);
  });

  test("06 — Buyer approves and spawns order", async ({ page }) => {
    test.skip(!cbId, "setup");
    const req = await newRequest();
    await req.post(`${API_BASE}/api/commoditybid/${cbId}/actions/approve-winner`, {
      headers: { Authorization: `Bearer ${buyerToken}` }, data: {},
    });
    await req.post(`${API_BASE}/api/commoditybid/${cbId}/actions/spawn-orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` }, data: {},
    });
    const ws = await req.get(`${API_BASE}/api/commoditybid/${cbId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(ws.state).toBe("ORDERS_SPAWNED");
    const orders = await req.get(`${API_BASE}/api/commoditybid/${cbId}/spawned-orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(orders.length).toBeGreaterThan(0);

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/commoditybid/${cbId}`);
    await expect(page.getByTestId("cb-order-handoff")).toBeVisible();
    await expect(page.getByTestId("cb-winner-summary")).not.toBeVisible();
    await expect(page.getByTestId("cb-comparison")).toHaveCount(0);
  });

  test("07 — Learning center includes CommodityBid guide (API-backed cards)", async ({ page }) => {
    const req = await newRequest();
    const cards = await req.get(`${API_BASE}/api/onboarding/learning`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { cards: Array<{ id: string; slug: string }> };
    expect(cards.cards.some((c) => c.slug === "commoditybid" || c.id === "commoditybid")).toBeTruthy();

    await uiLogin(page, USERS.buyer1);
    await page.goto("/learning");
    await expect(page.getByTestId("learning-center-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("learning-card-commoditybid")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Scheduled reverse-auction|reverse auction|CommodityBid/i).first()).toBeVisible();
  });
});
