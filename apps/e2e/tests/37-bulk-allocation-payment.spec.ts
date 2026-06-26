// Sprint 13D — BulkContainer allocation, proforma & payment coordination E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("BulkContainer allocation & payment (Sprint 13D)", () => {
  let containerId = "";
  let offerId = "";
  let allocationId = "";
  let buyerToken = "";
  let adminToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
  });

  test("01 — Setup: submit request, ops sends offer, buyer approves", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/bulk-container/catalog/wheat-flour");
    await page.getByTestId("bc-add-spec-BC-FLOUR-001").click();
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
    await page.getByTestId("bc-submit-request").click();
    await expect(page.getByTestId("bc-request-submitted")).toBeVisible({ timeout: 10000 });

    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/bulk-container/procurement/${containerId}`);
    await page.getByTestId("bc-start-procurement").click();
    await page.getByTestId(/bc-save-quote-/).first().click();
    await page.getByTestId("bc-create-offer").click();
    await page.getByTestId("bc-send-offer").click();

    const req = await newRequest();
    offerId = (await req.get(`${API_BASE}/api/bulk-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json())).activeOfferId;

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/bulk-container/offers/${offerId}`);
    await page.getByTestId("bc-approve-offer").click();
    await expect(page.getByTestId("bc-offer-approved")).toBeVisible({ timeout: 10000 });
  });

  test("02 — Operations creates supplier allocation", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/admin/bulk-container/allocations");
    await expect(page.getByTestId("bc-allocations-inbox-page")).toBeVisible();
    await expect(page.getByTestId("bc-allocation-kpis")).toBeVisible();

    await page.goto(`/admin/bulk-container/allocations/${containerId}`);
    await expect(page.getByTestId("bc-allocation-workspace-page")).toBeVisible();
    await page.getByTestId(/bc-create-allocation-/).first().click();
    await expect(page.getByTestId("bc-allocation-Allocation 1")).toBeVisible({ timeout: 10000 });

    const req = await newRequest();
    const allocRes = await req.get(`${API_BASE}/api/admin/bulk-container/allocations/${containerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allocData = await allocRes.json();
    allocationId = allocData.allocations[0].id;
    expect(allocData.allocations[0].supplierCode).toMatch(/SUP-/);
  });

  test("03 — Operations uploads proforma", async () => {
    const req = await newRequest();
    const upload = await req.post(
      `${API_BASE}/api/admin/bulk-container/allocations/${containerId}/allocations/${allocationId}/proformas`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          proformaNumber: "PF-BC-E2E-001",
          proformaFileUrl: "https://example.com/bulk-proforma-e2e.pdf",
          currency: "USD",
          amount: 3500,
        },
      },
    );
    expect(upload.ok()).toBeTruthy();

    const allocRes = await req.get(`${API_BASE}/api/admin/bulk-container/allocations/${containerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await allocRes.json();
    expect(data.proformas.length).toBeGreaterThan(0);
    expect(data.state).toBe("BC_PAYMENT_TRACKING");
  });

  test("04 — Buyer coordination page without supplier identity", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/bulk-container/coordination/${containerId}`);
    await expect(page.getByTestId("bc-coordination-page")).toBeVisible();
    await expect(page.getByTestId("bc-buyer-proformas")).toBeVisible();
    await expect(page.getByTestId("bc-buyer-allocation-Allocation 1")).toBeVisible();
    await expect(page.getByTestId("bc-progress-Allocation 1")).toBeVisible();
    await expect(page.getByText(/SUP-/)).toHaveCount(0);

    const req = await newRequest();
    const coord = await req.get(`${API_BASE}/api/bulk-containers/${containerId}/coordination`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(coord.proformas.length).toBeGreaterThan(0);
    expect(JSON.stringify(coord)).not.toMatch(/SUP-/);
    expect(coord.allocations[0].allocationRef).toBe("Allocation 1");
  });

  test("05 — Operations confirms payment → execution ready", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/bulk-container/allocations/${containerId}`);
    await page.getByTestId("bc-confirm-payment-Allocation 1").click();
    await expect(page.getByTestId("bc-execution-ready-banner")).toBeVisible({ timeout: 10000 });
  });

  test("06 — Execution ready state and buyer timeline", async ({ page }) => {
    const req = await newRequest();
    const coord = await req.get(`${API_BASE}/api/bulk-containers/${containerId}/coordination`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(coord.state).toBe("BC_EXECUTION_READY");
    expect(coord.executionReady).toBeTruthy();
    expect(coord.timeline.find((t: { key: string }) => t.key === "execution_ready")?.completed).toBeTruthy();

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/bulk-container/coordination/${containerId}`);
    await expect(page.getByTestId("bc-buyer-execution-ready")).toBeVisible();
    await expect(page.getByTestId("bc-timeline-execution_ready")).toBeVisible();
  });

  test("07 — Control Tower coordination alerts", async () => {
    const req = await newRequest();
    await req.post(`${API_BASE}/api/control-tower/scan`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const alerts = await req.get(
      `${API_BASE}/api/control-tower/alerts?category=BULK_CONTAINER&workspaceId=${containerId}&limit=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const keys = ((await alerts.json()).items ?? []).map((a: { alertKey: string }) => a.alertKey);
    expect(keys).toContain("bulk_execution_ready");
  });
});
