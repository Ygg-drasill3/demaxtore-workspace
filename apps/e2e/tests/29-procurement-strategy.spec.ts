import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe("Sprint 11A — Procurement Strategy Architecture", () => {
  test("01 — Create RFQ lands on procurement strategy selection", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/rfq/new");
    const ts = Date.now();
    await page.getByTestId("rfq-title").fill(`ProcStrategy RFQ ${ts}`);
    await page.getByTestId("rfq-category").fill("E2E");
    await page.getByTestId("rfq-market").fill("EU");
    await page.getByTestId("rfq-description").fill("Procurement strategy E2E test description");
    await page.getByTestId("rfq-incoterm").selectOption("FOB");
    await page.getByTestId("rfq-currency").selectOption("USD");
    const deadline = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 16);
    await page.getByTestId("rfq-deadline").fill(deadline);
    await page.locator('[data-testid="rfq-line-0"] input').first().fill("steel");
    await page.locator('[data-testid="rfq-line-0"] input').nth(1).fill("50");
    await page.locator('[data-testid="rfq-line-0"] input').nth(2).fill("MT");
    await page.getByTestId("rfq-submit").click();
    await page.waitForURL(/procurement-strategy/, { timeout: 15_000 });
    await expect(page.getByTestId("procurement-strategy-page")).toBeVisible();
    await expect(page.getByTestId("procurement-direct-rfq")).toBeVisible();
    await expect(page.getByTestId("procurement-commoditybid-auction")).toBeVisible();
  });

  test("02 — Direct RFQ path works", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/rfq/new");
    const ts = Date.now();
    await page.getByTestId("rfq-title").fill(`Direct RFQ ${ts}`);
    await page.getByTestId("rfq-category").fill("E2E");
    await page.getByTestId("rfq-market").fill("EU");
    await page.getByTestId("rfq-description").fill("Direct RFQ path test description");
    await page.getByTestId("rfq-incoterm").selectOption("FOB");
    await page.getByTestId("rfq-currency").selectOption("USD");
    const deadline = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 16);
    await page.getByTestId("rfq-deadline").fill(deadline);
    await page.locator('[data-testid="rfq-line-0"] input').first().fill("widget");
    await page.locator('[data-testid="rfq-line-0"] input').nth(1).fill("10");
    await page.locator('[data-testid="rfq-line-0"] input').nth(2).fill("PCS");
    await page.getByTestId("rfq-submit").click();
    await page.waitForURL(/procurement-strategy/, { timeout: 15_000 });
    await page.getByTestId("procurement-direct-rfq").click();
    await page.getByTestId("procurement-direct-confirm").click();
    await page.waitForURL(/\/workspace\/rfq\/[^/]+$/, { timeout: 15_000 });
    await expect(page.getByTestId("rfq-workspace")).toBeVisible({ timeout: 15_000 });
  });

  test("02b — Non-commodity RFQ blocks CommodityBid option", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/rfq/new");
    const ts = Date.now();
    await page.getByTestId("rfq-title").fill(`Non-commodity RFQ ${ts}`);
    await page.getByTestId("rfq-category").fill("Industrial");
    await page.getByTestId("rfq-market").fill("EU");
    await page.getByTestId("rfq-description").fill("Non-commodity procurement strategy test");
    await page.getByTestId("rfq-incoterm").selectOption("FOB");
    await page.getByTestId("rfq-currency").selectOption("USD");
    const deadline = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 16);
    await page.getByTestId("rfq-deadline").fill(deadline);
    await page.locator('[data-testid="rfq-line-0"] input').first().fill("steel beams");
    await page.locator('[data-testid="rfq-line-0"] input').nth(1).fill("10");
    await page.locator('[data-testid="rfq-line-0"] input').nth(2).fill("MT");
    await page.getByTestId("rfq-submit").click();
    await page.waitForURL(/procurement-strategy/, { timeout: 15_000 });
    await expect(page.getByTestId("procurement-cb-ineligible-banner")).toBeVisible();
    await expect(page.getByTestId("procurement-commoditybid-auction")).toBeDisabled();
    await page.getByTestId("procurement-direct-rfq").click();
    await page.getByTestId("procurement-direct-confirm").click();
    await page.waitForURL(/\/workspace\/rfq\/[^/]+$/, { timeout: 15_000 });
  });

  test("03 — CommodityBid path spawns auction from RFQ", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/rfq/new");
    const ts = Date.now();
    await page.getByTestId("rfq-title").fill(`CB Spawn RFQ ${ts}`);
    await page.getByTestId("rfq-category").fill("Commodity");
    await page.getByTestId("rfq-market").fill("EU");
    await page.getByTestId("rfq-description").fill("CommodityBid spawn test description");
    await page.getByTestId("rfq-incoterm").selectOption("FOB");
    await page.getByTestId("rfq-currency").selectOption("USD");
    const deadline = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 16);
    await page.getByTestId("rfq-deadline").fill(deadline);
    await page.locator('[data-testid="rfq-line-0"] input').first().fill("Spaghetti");
    await page.locator('[data-testid="rfq-line-0"] input').nth(1).fill("100");
    await page.locator('[data-testid="rfq-line-0"] input').nth(2).fill("MT");
    await page.getByTestId("rfq-submit").click();
    await page.waitForURL(/procurement-strategy/, { timeout: 15_000 });
    await page.getByTestId("procurement-commoditybid-auction").click();
    await expect(page.getByTestId("procurement-cb-embed-section")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("cb-external-embed-create")).toBeVisible({ timeout: 30_000 });
  });

  test("04 — CommodityBid navigation unchanged in buyer menu", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("buyer-dashboard")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("nav-buyer-commoditybid")).toBeVisible();
    await page.getByTestId("cc-kpi-live-auctions").click();
    await expect(page).toHaveURL(/\/buyer\/commoditybid/);
  });

  test("05 — Dashboard shows procurement KPIs", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("cc-kpi-open-rfqs")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-live-auctions")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-awaiting-auction-approval")).toBeVisible();
    await expect(page.getByText("Live CommodityBid Auctions")).toBeVisible();
  });

  test("06 — Learning Center updated with strategy guides", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/learning");
    await expect(page.getByTestId("learning-center-page")).toBeVisible();
    await expect(page.getByTestId("learning-card-direct-rfq")).toBeVisible();
    await expect(page.getByTestId("learning-card-commoditybid")).toBeVisible();
    await expect(page.getByText("When to Use Direct RFQ")).toBeVisible();
    await expect(page.getByText("When to Use CommodityBid")).toBeVisible();
  });

  test("07 — Admin procurement strategy report (API)", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/growth/procurement-strategy`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("directRfqCount");
    expect(body).toHaveProperty("commodityBidCount");
    expect(body).toHaveProperty("auctionConversionRate");
  });

  test("08 — Supplier cannot access procurement strategy endpoint", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const supplierToken = await apiLogin(req, USERS.supA1);
    const deadline = new Date(Date.now() + 10 * 86400_000).toISOString();
    const draft = await req.post(`${API_BASE}/api/rfq`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        title: "Role gate RFQ",
        productCategory: "E2E",
        productDescription: "Role gate test description",
        targetMarket: "EU", incoterm: "FOB", currency: "USD", deadlineAt: deadline,
        lineItems: [{ description: "x", quantity: 1, uom: "PCS" }],
      },
    });
    const { id } = await draft.json();
    const res = await req.post(`${API_BASE}/api/rfq/${id}/procurement-strategy`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { procurementMethod: "DIRECT_RFQ" },
    });
    expect(res.status()).toBe(403);
  });
});
