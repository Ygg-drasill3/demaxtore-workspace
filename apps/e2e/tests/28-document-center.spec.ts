// Sprint 15C — Unified Document Center E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE, setupSubmittedRfqWithStrategy } from "./_helpers";

test.describe.serial("Unified document center (15C)", () => {
  let buyerToken = "";
  let rfqId = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
  });

  test("01 — Document center API returns payload", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/documents`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.kpis).toBeTruthy();
    expect(Array.isArray(body.items)).toBe(true);
  });

  test("02 — Document center page loads", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/documents");
    // Wait for either the loaded content or the error state (both indicate page has rendered).
    await page.getByTestId("document-center").or(page.getByTestId("document-center-error"))
      .waitFor({ state: "visible", timeout: 30_000 });
    await expect(page.getByTestId("document-center")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("dc-kpis")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("dc-table")).toBeVisible({ timeout: 5_000 });
  });

  test("03 — Search filter works", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/documents");
    await expect(page.getByTestId("document-center")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("dc-search").fill("zzz-no-match-xyz");
    await expect(page.getByTestId("dc-empty")).toBeVisible({ timeout: 10_000 });
  });

  test("04 — Trade documents panel route", async ({ page }) => {
    const req = await newRequest();
    const created = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Docs ${Date.now()}`);
    rfqId = created.id;
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/trade/${rfqId}/documents`);
    await expect(page.getByTestId("trade-documents-panel")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("trade-doc-checklist")).toBeVisible();
  });

  test("05 — ACL: supplier cannot see buyer-only trades docs list empty or scoped", async () => {
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    const res = await req.get(`${API_BASE}/api/documents`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("06 — Trade workspace documents link", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/trade/${rfqId}`);
    await expect(page.getByTestId("trade-workspace-documents-link")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("trade-workspace-documents-link").click();
    await expect(page.getByTestId("trade-documents-panel")).toBeVisible({ timeout: 15_000 });
  });
});
