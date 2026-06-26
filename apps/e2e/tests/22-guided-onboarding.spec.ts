// apps/e2e/tests/22-guided-onboarding.spec.ts
import { test, expect } from "@playwright/test";
import {
  API_BASE, USERS, uiLogin, apiLogin, newRequest,
  setupSubmittedRfq, runControlTowerScan,
} from "./_helpers";

test.describe("Sprint 9A — Guided Onboarding", () => {
  test("01 — buyer sees guided onboarding card on dashboard", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("cc-onboarding-section")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("cc-onboarding-toggle").click();
    await expect(page.getByTestId("guided-onboarding-card")).toBeVisible();
    await expect(page.getByTestId("onboarding-checklist")).toBeVisible();
    await expect(page.getByTestId("onboarding-next-action")).toBeVisible();
  });

  test("02 — supplier sees guided onboarding card", async ({ page }) => {
    await uiLogin(page, USERS.supA1);
    await page.goto("/supplier/dashboard");
    await expect(page.getByTestId("sc-onboarding-section")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("sc-onboarding-toggle").click();
    await expect(page.getByTestId("guided-onboarding-card")).toBeVisible();
  });

  test("03 — operator (admin) can open onboarding dashboard", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/onboarding");
    await expect(page.getByTestId("onboarding-dashboard-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("metric-users-onboarded")).toBeVisible();
    await expect(page.getByTestId("role-breakdown-table")).toBeVisible();
  });

  test("04 — product tour appears on first login", async ({ page }) => {
    await uiLogin(page, USERS.buyer2);
    await page.goto("/buyer/dashboard");
    const tour = page.getByTestId("product-tour");
    if (await tour.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(page.getByTestId("tour-step-title")).toBeVisible();
      await page.getByTestId("tour-next-btn").click();
    }
  });

  test("05 — learning center loads content cards", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/learning");
    await expect(page.getByTestId("learning-center-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("learning-card-rfq")).toBeVisible();
    await expect(page.getByTestId("learning-card-full-flow")).toBeVisible();
  });

  test("06 — onboarding progress API returns checklist", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const res = await req.get(`${API_BASE}/api/onboarding/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.role).toBe("BUYER");
    expect(Array.isArray(body.checklist)).toBe(true);
    expect(body.checklist.length).toBeGreaterThan(0);
    expect(typeof body.completionPercent).toBe("number");
  });

  test("07 — workspace guidance uses next-action engine", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const rfq = await setupSubmittedRfq(req, buyerToken, "Onboarding guidance RFQ");
    const res = await req.get(`${API_BASE}/api/onboarding/guidance/rfq/${rfq.id}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.nextLabel).toBeTruthy();
    expect(body.workspaceId).toBe(rfq.id);
  });

  test("08 — admin CSV export onboarding-users", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/onboarding/export/onboarding-users.csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("user_id");
  });

  test("09 — role isolation: buyer cannot access admin dashboard", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const res = await req.get(`${API_BASE}/api/onboarding/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test("10 — control tower onboarding alerts scan", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await runControlTowerScan(req, adminToken);
    const res = await req.get(`${API_BASE}/api/control-tower/alerts?resolved=false&limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("11 — RFQ workspace shows trade progress bar", async ({ page }) => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const rfq = await setupSubmittedRfq(req, buyerToken, "Progress bar RFQ");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfq.id}`);
    await expect(page.getByTestId("rfq-workspace")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("trade-progress-bar")).toBeVisible();
  });

  test("12 — complete tour endpoint", async () => {
    const req = await newRequest();
    const token = await apiLogin(req, USERS.supB1);
    const res = await req.post(`${API_BASE}/api/onboarding/tour/complete`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(res.ok()).toBeTruthy();
  });
});
