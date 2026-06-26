// Sprint 12C — Mixed Container procurement & offer E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("Mixed Container procurement & offer (Sprint 12C)", () => {
  let containerId = "";
  let offerId = "";
  let buyerToken = "";
  let adminToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
  });

  test("01 — Buyer submits pricing request", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/mixed-container/catalog/rice");
    await page.getByTestId("mc-add-to-container-MC-RICE-001").click();
    await page.getByTestId("mc-add-confirm").click();
    await page.waitForURL(/\/buyer\/mixed-container\/requests\//);
    containerId = page.url().split("/").pop()!;
    await page.getByTestId("mc-request-pricing").click();
    await expect(page.getByTestId("mc-pricing-submitted")).toBeVisible({ timeout: 10000 });
  });

  test("02 — Operations receives request in inbox", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/admin/mixed-container");
    await expect(page.getByTestId("mc-admin-inbox-page")).toBeVisible();
    await expect(page.getByTestId("mc-admin-kpis")).toBeVisible();
    await expect(page.getByTestId(/mc-inbox-row-MC-/).first()).toBeVisible();
  });

  test("03 — Operations enters pricing and creates offer", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/mixed-container/${containerId}`);
    await expect(page.getByTestId("mc-procurement-page")).toBeVisible();
    await page.getByTestId("mc-start-procurement").click();
    await expect(page.getByTestId("mc-procurement-pricing")).toBeVisible();
    await page.getByTestId(/mc-save-quote-/).first().click();
    await page.getByTestId("mc-create-offer").click();
    await page.getByTestId("mc-send-offer").click();
    await expect(page.getByTestId("mc-offer-builder")).toBeVisible();
  });

  test("04 — Buyer sees offer with expiry countdown", async ({ page }) => {
    const req = await newRequest();
    const mcRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const mc = await mcRes.json();
    offerId = mc.activeOfferId;
    expect(offerId).toBeTruthy();

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/offers/${offerId}`);
    await expect(page.getByTestId("mc-offer-page")).toBeVisible();
    await expect(page.getByTestId("mc-offer-countdown")).toBeVisible();
    await expect(page.getByTestId("mc-offer-total")).not.toHaveText("$0");
    await expect(page.getByText(/SUP-/)).toHaveCount(0);
  });

  test("05 — Buyer requests revision", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/offers/${offerId}`);
    await page.getByTestId("mc-revision-type").selectOption("REDUCE_PALLETS");
    await page.getByTestId("mc-revision-comment").fill("Please reduce rice pallets by 1.");
    await page.getByTestId("mc-request-revision").click();
    await expect(page.getByTestId("mc-revision-submitted")).toBeVisible({ timeout: 10000 });
  });

  test("06 — Operations resumes and buyer approves", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/mixed-container/${containerId}`);
    await page.getByTestId("mc-resume-procurement").click();
    await page.getByTestId(/mc-save-quote-/).first().click();
    await page.getByTestId("mc-create-offer").click();
    await page.getByTestId("mc-send-offer").click();

    const req = await newRequest();
    const mcRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    offerId = (await mcRes.json()).activeOfferId;

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/offers/${offerId}`);
    await page.getByTestId("mc-approve-offer").click();
    await expect(page.getByTestId("mc-offer-approved")).toBeVisible({ timeout: 10000 });
  });

  test("07 — API: supplier identity hidden from buyer offer", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/mixed-containers/offers/${offerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.lines.length).toBeGreaterThan(0);
    expect(body).not.toHaveProperty("supplierCode");
    expect(JSON.stringify(body)).not.toMatch(/SUP-/);
  });

  test("08 — Control Tower alerts generated", async () => {
    const req = await newRequest();
    const scan = await req.post(`${API_BASE}/api/control-tower/scan`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(scan.ok()).toBeTruthy();

    const alerts = await req.get(
      `${API_BASE}/api/control-tower/alerts?category=MIXED_CONTAINER&workspaceId=${containerId}&limit=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(alerts.ok()).toBeTruthy();
    const data = await alerts.json();
    const keys = (data.items ?? []).map((a: { alertKey: string }) => a.alertKey);
    expect(keys.some((k: string) => k.startsWith("mixed_container"))).toBeTruthy();
  });
});
