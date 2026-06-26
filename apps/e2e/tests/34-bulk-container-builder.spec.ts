// Sprint 13B — BulkContainer builder E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("BulkContainer builder (Sprint 13B)", () => {
  let containerId = "";
  let buyerToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
  });

  test("01 — Navigation visible under Sourcing", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await expect(page.getByTestId("nav-buyer-bulk-container")).toBeVisible();
    await page.getByTestId("nav-buyer-bulk-container").click();
    await expect(page.getByTestId("bc-home-page")).toBeVisible();
    await expect(page.getByTestId("bc-build-cta")).toBeVisible();
  });

  test("02 — Categories and specification cards visible", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/bulk-container/catalog");
    await expect(page.getByTestId("bc-catalog-categories")).toBeVisible();
    await expect(page.getByTestId("bc-category-wheat-flour")).toBeVisible();
    await page.getByTestId("bc-category-wheat-flour").click();
    await expect(page.getByTestId("bc-catalog-products")).toBeVisible();
    await expect(page.getByTestId("bc-product-card-BC-FLOUR-001")).toBeVisible();
    await expect(page.getByText(/USD\/MT|\/ MT/i)).toBeVisible();
    await expect(page.getByText(/supplier.*@/i)).toHaveCount(0);
  });

  test("03 — Add line with MT quantity, capacity meter, estimated value", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/bulk-container/catalog/wheat-flour");
    await page.getByTestId("bc-add-spec-BC-FLOUR-001").click();
    await expect(page.getByTestId("bc-add-modal")).toBeVisible();
    await page.getByTestId("bc-packing-option-PT-BC-FLOUR-25KG").click();
    await page.getByTestId("bc-spec-protein").fill("12");
    await page.getByTestId("bc-spec-ash").fill("0.55");
    await page.getByTestId("bc-spec-moisture").fill("14");
    await page.getByTestId("bc-spec-wetGluten").fill("28");
    await page.locator('[data-testid="bc-spec-packing"]').selectOption({ index: 1 });
    await page.locator('[data-testid="bc-spec-origin"]').selectOption({ index: 1 });
    await page.getByTestId("bc-mt-quantity").fill("10");
    await page.getByTestId("bc-add-confirm").click();
    await page.waitForURL(/\/buyer\/bulk-container\/requests\//, { timeout: 15000 });
    containerId = page.url().split("/").pop()!;
    await expect(page.getByTestId("bc-builder-page")).toBeVisible();
    await expect(page.getByTestId("bc-capacity-meter")).toBeVisible();
    await expect(page.getByTestId("bc-mt-used")).toContainText("10");
    await expect(page.getByTestId("bc-fill-percent")).not.toHaveText("0%");
    await expect(page.getByTestId("bc-est-value")).not.toHaveText("—");
  });

  test("04 — Partial container warning below 20 MT", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/bulk-container/requests/${containerId}`);
    await expect(page.getByTestId("bc-warning-partial_container")).toBeVisible();
  });

  test("05 — Submit procurement request and appears in My Bulk Containers", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/bulk-container/requests/${containerId}`);
    await page.getByTestId("bc-submit-request").click();
    await expect(page.getByTestId("bc-request-submitted")).toBeVisible({ timeout: 10000 });
    await page.goto("/buyer/bulk-container/requests");
    await expect(page.getByTestId("bc-requests-page")).toBeVisible();
    await expect(page.getByTestId(/bc-request-row-BC-/).first()).toBeVisible();
  });

  test("06 — API: no supplier fields in catalog DTO", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/bulk-container/catalog/products?category=wheat-flour&limit=1`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const item = body.items[0];
    expect(item).toBeTruthy();
    expect(item.specTemplate).toBeTruthy();
    expect(item).not.toHaveProperty("supplierOrgId");
    expect(item).not.toHaveProperty("supplierName");
    expect(JSON.stringify(item)).not.toMatch(/supplier\d@/i);
  });

  test("07 — Admin catalog page loads", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/admin/bulk-container/catalog");
    await expect(page.getByTestId("bc-admin-catalog")).toBeVisible();
  });
});
