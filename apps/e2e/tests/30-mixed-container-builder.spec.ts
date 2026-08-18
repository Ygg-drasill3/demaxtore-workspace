// Sprint 12B + Sprint 02 — Mixed Container discovery & builder E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("Mixed Container builder (Sprint 12B)", () => {
  let containerId = "";
  let buyerToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
  });

  test("01 — Navigation visible under Sourcing", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await expect(page.getByTestId("nav-buyer-mixed-container")).toBeVisible();
    await page.getByTestId("nav-buyer-mixed-container").click();
    await expect(page.getByTestId("mc-home-page")).toBeVisible();
    await expect(page.getByTestId("mc-build-container-cta")).toBeVisible();
  });

  test("02 — Categories and products visible", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/mixed-container/catalog");
    await expect(page.getByTestId("mc-discovery-layout")).toBeVisible();
    await expect(page.getByTestId("mc-catalog-categories")).toBeVisible();
    await expect(page.getByTestId("mc-industry-label")).toHaveText("Food & Beverages");
    await expect(page.getByTestId("mc-category-pulses")).toBeVisible();
    await page.getByTestId("mc-category-pulses").click();
    await expect(page.getByTestId("mc-catalog-products")).toBeVisible();
    await expect(page.getByTestId("mc-product-card-MC-PUL-RL")).toBeVisible();
    await expect(page.getByText(/supplier.*@/i)).toHaveCount(0);
    await expect(page.getByText(/\$\d/)).toHaveCount(0);
  });

  test("03 — Add to container, pallet adjustment, fill meter", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/mixed-container/catalog/pulses");
    await page.getByTestId("mc-product-card-MC-PUL-RL").click();
    await expect(page.getByTestId("mc-product-detail")).toBeVisible();
    await page.getByTestId("mc-packaging-option-5-kg").click();
    await page.getByTestId("mc-pallet-increase").click();
    await expect(page.getByTestId("mc-pallet-count")).toHaveText("3");
    await page.getByTestId("mc-add-confirm").click();
    await expect(page.getByTestId("mc-sidebar")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("mc-sidebar-pallet-count")).not.toHaveText("0");
    await page.getByTestId("mc-sidebar-review").click();
    await page.waitForURL(/\/buyer\/mixed-container\/requests\//, { timeout: 15000 });
    containerId = page.url().split("/").pop()!;
    await expect(page.getByTestId("mc-builder-page")).toBeVisible();
    await expect(page.getByTestId("mc-fill-meter")).toBeVisible();
    await expect(page.getByTestId("mc-fill-percent")).not.toHaveText("0%");
    await page.getByTestId(/mc-line-inc-/).first().click();
    await expect(page.getByTestId("mc-fill-percent")).toBeVisible();
  });

  test("04 — Remove product works", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/requests/${containerId}`);
    const removeBtn = page.getByTestId(/mc-line-remove-/).first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
    }
    await expect(page.getByTestId("mc-builder-page")).toBeVisible();
  });

  test("05 — Request live pricing and appears in My Containers", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/mixed-container/catalog/pulses");
    await page.getByTestId("mc-product-card-MC-PUL-RL").click();
    await page.getByTestId("mc-add-confirm").click();
    await page.getByTestId("mc-sidebar-review").click();
    await page.waitForURL(/\/buyer\/mixed-container\/requests\//);
    containerId = page.url().split("/").pop()!;
    await page.getByTestId("mc-request-pricing").click();
    await expect(page.getByTestId("mc-procurement-request-detail")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("mc-pr-ref")).toHaveText(/PR-\d{4}-\d{6}/);
    await page.goto("/buyer/mixed-container/requests");
    await expect(page.getByTestId("mc-requests-page")).toBeVisible();
    await expect(page.getByTestId(/mc-request-row-MC-/).first()).toBeVisible();
  });

  test("06 — API: no pricing or supplier fields in discovery DTO", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/mixed-container/catalog/products?category=pulses&limit=1`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const item = body.items[0];
    expect(item).toBeTruthy();
    expect(item.packagingOptions.length).toBeGreaterThan(0);
    expect(item).not.toHaveProperty("supplierAvailabilityLabel");
    expect(item).not.toHaveProperty("indicativeLow");
    expect(item).not.toHaveProperty("supplierOrgId");
    expect(item).not.toHaveProperty("supplierName");
    expect(item).not.toHaveProperty("factoryName");
    expect(JSON.stringify(item)).not.toMatch(/supplier\d@/i);
  });
});
