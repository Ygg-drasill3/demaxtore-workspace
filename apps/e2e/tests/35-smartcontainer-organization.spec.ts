// Sprint 05 — SmartContainer Organization Workspace E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("SmartContainer organization workspace (Sprint 05)", () => {
  let containerId = "";
  let organizationRef = "";
  let buyerToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    await apiLogin(req, USERS.admin);
  });

  test("01 — Approve proposal creates organization workspace", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/mixed-container/catalog/pulses");
    await page.getByTestId("mc-product-card-MC-PUL-RL").click();
    await page.getByTestId("mc-add-confirm").click();
    await page.getByTestId("mc-sidebar-review").click();
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

    const req = await newRequest();
    const mcRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const offerId = (await mcRes.json()).activeOfferId;

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/offers/${offerId}`);
    await page.getByTestId("mc-approve-offer").click();
    await expect(page.getByTestId("mc-proposal-approved")).toBeVisible({ timeout: 10000 });

    const orgRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/organization`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(orgRes.ok()).toBeTruthy();
    const org = await orgRes.json();
    organizationRef = org.organizationRef;
    expect(organizationRef).toMatch(/^OR-\d{4}-\d{6}$/);
    expect(org.procurementRequestRef).toMatch(/^PR-/);
    expect(org.commercialProposalRef).toMatch(/^CP-/);
    expect(org.organizationStatus).toBe("ORGANIZATION_STARTED");
    expect(org.modules.length).toBe(6);
  });

  test("02 — Buyer views organization dashboard", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/organization/${containerId}`);
    await expect(page.getByTestId("mc-organization-page")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("mc-org-ref")).toContainText(organizationRef);
    await expect(page.getByTestId("mc-org-modules")).toBeVisible();
    await expect(page.getByTestId("mc-org-module-PURCHASE_ORDERS")).toBeVisible();
    await expect(page.getByTestId("mc-org-module-FREIGHTIQ")).toBeVisible();
    await expect(page.getByTestId("mc-org-activity")).toBeVisible();
  });

  test("03 — Operations updates organization status (forward only)", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/mixed-container/organization/${containerId}`);
    await expect(page.getByTestId("mc-admin-organization-page")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("mc-org-status-select").selectOption("SUPPLIER_CONFIRMATION");
    await page.getByTestId("mc-org-update-status").click();

    const req = await newRequest();
    const orgRes = await req.get(`${API_BASE}/api/mixed-containers/${containerId}/organization`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const org = await orgRes.json();
    expect(org.organizationStatus).toBe("SUPPLIER_CONFIRMATION");
    expect(org.statusHistory.length).toBeGreaterThanOrEqual(2);

    const backward = await req.post(`${API_BASE}/api/admin/mixed-containers/organization/${containerId}/status`, {
      headers: { Authorization: `Bearer ${await apiLogin(req, USERS.admin)}` },
      data: { status: "ORGANIZATION_STARTED" },
    });
    expect(backward.status()).toBe(409);
  });
});
