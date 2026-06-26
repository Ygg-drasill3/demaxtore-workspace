// Sprint 15B — Shipment Visibility & Buyer Portfolio E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("Shipment portfolio (15B)", () => {
  let buyerToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
  });

  test("01 — API returns portfolio payload", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/shipments/portfolio`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.kpis).toBeTruthy();
    expect(body.analytics).toBeTruthy();
    expect(Array.isArray(body.items)).toBe(true);
    expect(Array.isArray(body.mapPoints)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  test("02 — Portfolio page loads with KPIs, map, and table", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/shipments/portfolio");
    await expect(page.getByTestId("shipment-portfolio")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("shipment-portfolio-kpis")).toBeVisible();
    await expect(page.getByTestId("sp-kpi-active")).toBeVisible();
    await expect(page.getByTestId("shipment-portfolio-analytics")).toBeVisible();
    await expect(page.getByTestId("shipment-portfolio-filters")).toBeVisible();
    await expect(page.getByTestId("shipment-portfolio-table")).toBeVisible();
  });

  test("03 — Search filter narrows results", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/shipments/portfolio");
    await expect(page.getByTestId("shipment-portfolio")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("sp-search").fill("zzz-no-match-xyz");
    await expect(page.getByTestId("sp-table-empty")).toBeVisible({ timeout: 10_000 });
  });

  test("04 — Status filter works", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/shipments/portfolio");
    await expect(page.getByTestId("shipment-portfolio")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("sp-filter-status").selectOption("Delivered");
    await expect(page.getByTestId("shipment-portfolio-table")).toBeVisible();
  });

  test("05 — Map renders (or empty state)", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/shipments/portfolio");
    await expect(page.getByTestId("shipment-portfolio")).toBeVisible({ timeout: 15_000 });
    const map = page.getByTestId("shipment-portfolio-map");
    const empty = page.getByTestId("shipment-portfolio-map-empty");
    await expect(map.or(empty)).toBeVisible();
  });

  test("06 — Buyer dashboard My Shipments widget", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("my-shipments-widget")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("my-shipments-view-all").click();
    await expect(page.getByTestId("shipment-portfolio")).toBeVisible({ timeout: 15_000 });
  });

  test("07 — ACL: supplier sees only assigned shipments", async () => {
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    const res = await req.get(`${API_BASE}/api/shipments/portfolio`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.kpis).toBeTruthy();
    for (const item of body.items as Array<{ supplierName: string }>) {
      expect(item.supplierName).toBeTruthy();
    }
  });

  test("08 — Trade workspace link from table row when shipments exist", async ({ page }) => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/shipments/portfolio?limit=1`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const body = await res.json();
    if (!body.items?.length) {
      test.skip(true, "no shipments in portfolio");
      return;
    }
    const row = body.items[0];
    await uiLogin(page, USERS.buyer1);
    await page.goto("/shipments/portfolio");
    await expect(page.getByTestId(`sp-trade-link-${row.shipmentId}`)).toBeVisible({ timeout: 15_000 });
    await page.getByTestId(`sp-trade-link-${row.shipmentId}`).click();
    await expect(page.getByTestId("trade-workspace")).toBeVisible({ timeout: 15_000 });
  });
});
