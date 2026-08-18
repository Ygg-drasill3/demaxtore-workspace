// Sprint 06 — Organization module binding & event synchronization E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

test.describe.serial("SmartContainer organization sync (Sprint 06)", () => {
  let containerId = "";
  let buyerToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    await apiLogin(req, USERS.admin);
  });

  test("01 — Approval syncs timeline events to organization", async ({ page }) => {
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

    expect(org.synchronizationStatus).toMatch(/LIVE|SYNCED/);
    expect(org.lastSyncedAt).toBeTruthy();
    expect(org.activityTimeline.length).toBeGreaterThanOrEqual(2);

    const eventTypes = org.activityTimeline.map((e: { eventType: string }) => e.eventType);
    expect(eventTypes).toContain("mixed_container.organization_created");
    expect(eventTypes).toContain("mixed_container.offer_approved");

    const labels = org.activityTimeline.map((e: { label: string }) => e.label);
    expect(labels.some((l: string) => l.toLowerCase().includes("organization created"))).toBeTruthy();
    expect(labels.some((l: string) => l.toLowerCase().includes("commercial proposal approved"))).toBeTruthy();
  });

  test("02 — Buyer UI shows sync status and module cards", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/buyer/mixed-container/organization/${containerId}`);
    await expect(page.getByTestId("mc-organization-page")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("mc-org-sync-status")).toBeVisible();
    await expect(page.getByTestId("mc-org-timeline-mixed_container.organization_created")).toBeVisible();
    await expect(page.getByTestId("mc-org-timeline-mixed_container.offer_approved")).toBeVisible();
    await expect(page.getByTestId("mc-org-module-PURCHASE_ORDERS")).toBeVisible();
  });

  test("03 — Operations sees synchronization panel", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`/admin/mixed-container/organization/${containerId}`);
    await expect(page.getByTestId("mc-admin-organization-page")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("mc-org-sync-panel")).toBeVisible();
  });
});
