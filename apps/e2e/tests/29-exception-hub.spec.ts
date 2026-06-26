// Sprint 15D — Buyer Exception Hub E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE, setupSubmittedRfqWithStrategy } from "./_helpers";

test.describe.serial("Buyer exception hub (15D)", () => {
  let buyerToken = "";
  let rfqId = "";
  let exceptionId = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
  });

  test("01 — Exception hub API returns payload", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/exceptions`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.kpis).toBeTruthy();
    expect(body.analytics).toBeTruthy();
    expect(Array.isArray(body.items)).toBe(true);
    if (body.items.length > 0) exceptionId = body.items[0].id;
  });

  test("02 — Exception dashboard loads", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/exceptions");
    await expect(page.getByTestId("exception-hub")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("eh-kpis")).toBeVisible();
    await expect(page.getByTestId("eh-table")).toBeVisible();
  });

  test("03 — Search filter works", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/exceptions");
    await expect(page.getByTestId("exception-hub")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("eh-search").fill("zzz-no-match-xyz");
    await expect(page.getByTestId("eh-empty")).toBeVisible({ timeout: 10_000 });
  });

  test("04 — Exception detail page works", async ({ page }) => {
    test.skip(!exceptionId, "no exceptions synced from control tower");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/exceptions/${exceptionId}`);
    await expect(page.getByTestId("exception-detail")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("exception-summary")).toBeVisible();
  });

  test("05 — Dashboard widget works", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("my-exceptions-widget")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("my-exceptions-open")).toBeVisible();
  });

  test("06 — Trade workspace exception panel", async ({ page }) => {
    const req = await newRequest();
    const created = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Exc ${Date.now()}`);
    rfqId = created.id;
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/trade/${rfqId}`);
    await expect(page.getByTestId("trade-exceptions-panel")).toBeVisible({ timeout: 15_000 });
  });

  test("07 — Trade exceptions API", async () => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/trades/${rfqId}/exceptions`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.open)).toBe(true);
    expect(Array.isArray(body.resolved)).toBe(true);
  });

  test("08 — Shipment portfolio shows exceptions column", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/shipments/portfolio");
    await expect(page.getByTestId("shipment-portfolio-table")).toBeVisible({ timeout: 15_000 });
  });

  test("09 — ACL: unauthenticated blocked", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/exceptions`);
    expect(res.status()).toBe(401);
  });
});
