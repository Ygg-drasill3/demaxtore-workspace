// Sprint 13B.1 — Packing Type standardization E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("Packing standardization (Sprint 13B.1)", () => {
  let buyerToken = "";
  let mcContainerId = "";
  let bcContainerId = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
  });

  test("01 — SmartContainer catalog shows packing types on product card", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/mixed-container/catalog/rice");
    await expect(page.getByTestId("mc-packing-types-MC-RICE-001")).toBeVisible();
    await expect(page.getByTestId("mc-packing-types-MC-RICE-001")).not.toHaveText("");
  });

  test("02 — SmartContainer packing type selector mandatory in add modal", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/mixed-container/catalog/rice");
    await page.getByTestId("mc-add-to-container-MC-RICE-001").click();
    await expect(page.getByTestId("mc-packing-type-selector")).toBeVisible();
    await expect(page.getByTestId("mc-packing-option-PT-MC-PULSE-5KG")).toBeVisible();
    await page.getByTestId("mc-packing-option-PT-MC-PULSE-1KG").click();
    await page.getByTestId("mc-add-confirm").click();
    await page.waitForURL(/\/buyer\/mixed-container\/requests\//, { timeout: 15000 });
    mcContainerId = page.url().split("/").pop()!;
    await expect(page.getByTestId("mc-builder-page")).toBeVisible();
  });

  test("03 — BulkContainer catalog shows packing types on product card", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/bulk-container/catalog/wheat-flour");
    await expect(page.getByTestId("bc-packing-types-BC-FLOUR-001")).toBeVisible();
  });

  test("04 — BulkContainer packing type selector mandatory in add modal", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/bulk-container/catalog/wheat-flour");
    await page.getByTestId("bc-add-spec-BC-FLOUR-001").click();
    await expect(page.getByTestId("bc-packing-type-selector")).toBeVisible();
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
    bcContainerId = page.url().split("/").pop()!;
    await expect(page.getByTestId("bc-builder-page")).toBeVisible();
  });

  test("05 — API rejects line without packing type", async () => {
    const req = await newRequest();
    const mc = await req.post(`${API_BASE}/api/mixed-containers`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { containerType: "CONTAINER_40FT", currency: "USD" },
    });
    const mcId = (await mc.json()).id;
    const products = await req.get(`${API_BASE}/api/mixed-container/catalog/products?category=rice&limit=1`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const productId = (await products.json()).items[0].id;
    const badLine = await req.post(`${API_BASE}/api/mixed-containers/${mcId}/lines`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { catalogProductId: productId, palletCount: 2 },
    });
    expect(badLine.status()).toBe(400);
  });

  test("06 — Admin packing types management page", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/admin/packing-types");
    await expect(page.getByTestId("packing-admin-page")).toBeVisible();
    await expect(page.getByTestId("packing-row-PT-MC-PASTA-500G")).toBeVisible();
    await expect(page.getByTestId("packing-row-PT-BC-FLOUR-25KG")).toBeVisible();
    await expect(page.getByTestId("packing-create-btn")).toBeVisible();
  });

  test("07 — Learning Center packing type article", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/learning");
    await expect(page.getByTestId("learning-card-packing-type")).toBeVisible();
    await expect(page.getByText(/Why Packing Type Matters/i)).toBeVisible();
    await expect(page.getByText(/Product ≠ Commercial SKU/i)).toBeVisible();
  });

  test("08 — Catalog API includes packingTypes array", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/mixed-container/catalog/products?category=rice&limit=1`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const item = (await res.json()).items[0];
    expect(item.packingTypes).toBeTruthy();
    expect(item.packingTypes.length).toBeGreaterThan(0);
    expect(item.packingTypes[0].name).toBeTruthy();
  });
});
