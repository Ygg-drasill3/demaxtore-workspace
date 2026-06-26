// Sprint 12D — Mixed Container allocation, proforma & payment coordination E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("Mixed Container allocation & payment (Sprint 12D)", () => {
  let containerId = "";
  let offerId = "";
  let allocationId = "";
  let paymentId = "";
  let buyerToken = "";
  let adminToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
  });

  async function dismissTour(page: import("@playwright/test").Page) {
    const tour = page.getByTestId("product-tour");
    if (await tour.isVisible().catch(() => false)) {
      await page.getByLabel("Dismiss tour").click();
    }
  }

  test("01 — Setup: buyer requests pricing and admin sends offer", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/mixed-container/catalog/rice");
    await page.getByTestId("mc-add-to-container-MC-RICE-001").click();
    await page.getByTestId("mc-add-confirm").click();
    await page.waitForURL(/\/buyer\/mixed-container\/requests\//);
    containerId = page.url().split("/").pop()!;
    await page.getByTestId("mc-request-pricing").click();
    await expect(page.getByTestId("mc-pricing-submitted")).toBeVisible({ timeout: 10000 });

    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/mixed-container/${containerId}`);
    await page.getByTestId("mc-start-procurement").click();
    await page.getByTestId(/mc-save-quote-/).first().click();
    await page.getByTestId("mc-create-offer").click();
    await page.getByTestId("mc-send-offer").click();
  });

  test("02 — Buyer approves offer", async ({ page }) => {
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

  test("03 — Operations creates supplier allocation", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await dismissTour(page);
    await page.goto("/admin/mixed-container/allocations");
    await expect(page.getByTestId("mc-allocations-inbox-page")).toBeVisible();
    await expect(page.getByTestId("mc-allocation-kpis")).toBeVisible();

    await page.goto(`/admin/mixed-container/allocations/${containerId}`);
    await expect(page.getByTestId("mc-allocation-workspace-page")).toBeVisible();
    await page.getByTestId(/mc-create-allocation-/).first().click();
    await expect(page.getByTestId("mc-allocation-Allocation 1")).toBeVisible({ timeout: 10000 });

    const req = await newRequest();
    const allocRes = await req.get(`${API_BASE}/api/admin/mixed-containers/allocations/${containerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allocData = await allocRes.json();
    allocationId = allocData.allocations[0].id;
    expect(allocData.allocations[0].supplierCode).toMatch(/SUP-/);
  });

  test("04 — Operations uploads proforma", async () => {
    const req = await newRequest();
    const now = new Date();
    const due = new Date(now.getTime() + 14 * 86400000);
    const upload = await req.post(
      `${API_BASE}/api/admin/mixed-containers/allocations/${containerId}/allocations/${allocationId}/proformas`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          proformaNumber: "PF-E2E-001",
          issueDate: now.toISOString(),
          dueDate: due.toISOString(),
          currency: "USD",
          amount: 1000,
          documentUrl: "https://example.com/proforma-e2e.pdf",
        },
      },
    );
    expect(upload.ok()).toBeTruthy();

    const allocRes = await req.get(`${API_BASE}/api/admin/mixed-containers/allocations/${containerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await allocRes.json();
    expect(data.proformas.length).toBeGreaterThan(0);
    expect(data.state).toBe("MC_PAYMENT_TRACKING");
  });

  test("05 — Buyer sees proformas without supplier identity", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/coordination/${containerId}`);
    await expect(page.getByTestId("mc-coordination-page")).toBeVisible();
    await expect(page.getByTestId("mc-buyer-proformas")).toBeVisible();
    await expect(page.getByTestId("mc-buyer-allocation-Allocation 1")).toBeVisible();
    await expect(page.getByText(/SUP-/)).toHaveCount(0);

    const req = await newRequest();
    const coordRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/coordination`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const coord = await coordRes.json();
    expect(coord.proformas.length).toBeGreaterThan(0);
    expect(JSON.stringify(coord)).not.toMatch(/SUP-/);
    expect(coord.allocations[0].allocationRef).toBe("Allocation 1");
    paymentId = coord.payments[0].id;
  });

  test("06 — Buyer marks payment sent, ops confirms", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await dismissTour(page);
    await page.goto(`/buyer/mixed-container/coordination/${containerId}`);
    await page.getByTestId("mc-mark-payment-sent-Allocation 1").click();
    await expect(page.getByTestId("mc-buyer-payment-status-Allocation 1")).toHaveText("PAYMENT_SENT", { timeout: 10000 });

    await uiLogin(page, USERS.admin);
    await dismissTour(page);
    await page.goto(`/admin/mixed-container/allocations/${containerId}`);
    await page.getByTestId("mc-confirm-payment-Allocation 1").click();
    await expect(page.getByTestId("mc-execution-ready-banner")).toBeVisible({ timeout: 10000 });
  });

  test("07 — Execution ready state and buyer timeline", async ({ page }) => {
    const req = await newRequest();
    const coordRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/coordination`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const coord = await coordRes.json();
    expect(coord.state).toBe("MC_EXECUTION_READY");
    expect(coord.timeline.find((t: { key: string }) => t.key === "execution_ready")?.completed).toBeTruthy();

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/coordination/${containerId}`);
    await expect(page.getByTestId("mc-buyer-execution-ready")).toBeVisible();
    await expect(page.getByTestId("mc-timeline-execution_ready")).toBeVisible();
  });

  test("08 — Control Tower alerts for coordination", async () => {
    const req = await newRequest();
    await req.post(`${API_BASE}/api/control-tower/scan`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const alerts = await req.get(
      `${API_BASE}/api/control-tower/alerts?category=MIXED_CONTAINER&workspaceId=${containerId}&limit=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const data = await alerts.json();
    const keys = (data.items ?? []).map((a: { alertKey: string }) => a.alertKey);
    expect(keys).toContain("mixed_container_execution_ready");
  });
});
