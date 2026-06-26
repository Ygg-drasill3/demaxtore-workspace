import { test, expect } from "@playwright/test";
import { uiLogin, USERS } from "./_helpers";

const ADMIN_GROUPS = ["nav-group-home", "nav-group-operations", "nav-group-workspaces", "nav-group-collaboration"];

test.describe("Sprint 10C — Operations Command Center", () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/admin/dashboard");
    await expect(page.getByTestId("operations-command-center")).toBeVisible({ timeout: 15_000 });
  });

  test("01 — Dashboard loads with command center layout", async ({ page }) => {
    await expect(page.getByText("Operations · Command Center")).toBeVisible();
    await expect(page.getByTestId("oc-kpi-row")).toBeVisible();
    await expect(page.getByTestId("operations-command-center")).toHaveAttribute(
      "data-dashboard-mode",
      /operations_agent|operations_manager|executive/,
    );
  });

  test("02 — KPI row renders and links", async ({ page }) => {
    await expect(page.getByTestId("oc-kpi-active-trades")).toBeVisible();
    await expect(page.getByTestId("oc-kpi-live-auctions")).toBeVisible();
    await expect(page.getByTestId("oc-kpi-pending-approvals")).toBeVisible();
    await expect(page.getByTestId("oc-kpi-shipments")).toBeVisible();
    await expect(page.getByTestId("oc-kpi-open-alerts")).toBeVisible();
    await expect(page.getByTestId("oc-kpi-revenue")).toBeVisible();
    await expect(page.getByTestId("oc-kpi-messages")).toBeVisible();
    await expect(page.getByTestId("oc-kpi-blocked")).toBeVisible();
  });

  test("03 — Action Inbox renders", async ({ page }) => {
    await expect(page.getByTestId("oc-action-inbox")).toBeVisible();
  });

  test("04 — Trade Operations Board renders", async ({ page }) => {
    await expect(page.getByTestId("oc-trade-board")).toBeVisible();
  });

  test("05 — Auction Monitor renders", async ({ page }) => {
    await expect(page.getByTestId("oc-auction-monitor")).toBeVisible();
    await page.getByTestId("oc-auctions-all").click();
    await expect(page).toHaveURL(/\/admin\/commoditybid/);
  });

  test("06 — FreightIQ panel renders", async ({ page }) => {
    await expect(page.getByTestId("oc-freight-panel")).toBeVisible();
    await page.getByTestId("oc-freight-all").click();
    await expect(page).toHaveURL(/\/operations\/freight/);
  });

  test("07 — Shipment Command Center renders", async ({ page }) => {
    await expect(page.getByTestId("oc-shipments")).toBeVisible();
  });

  test("08 — Document Control Center renders", async ({ page }) => {
    await expect(page.getByTestId("oc-documents")).toBeVisible();
  });

  test("09 — Communication Monitor renders", async ({ page }) => {
    await expect(page.getByTestId("oc-communications")).toBeVisible();
  });

  test("10 — Control Tower integration renders", async ({ page }) => {
    await expect(page.getByTestId("oc-control-tower")).toBeVisible();
    await page.getByTestId("oc-control-tower-all").click();
    await expect(page).toHaveURL(/\/operations/);
    await expect(page.getByTestId("operations-page")).toBeVisible();
  });

  test("11 — Revenue widgets render", async ({ page }) => {
    await expect(page.getByTestId("oc-revenue")).toBeVisible();
    await expect(page.getByTestId("oc-revenue-month")).toBeVisible();
    await page.getByTestId("oc-revenue-all").click();
    await expect(page).toHaveURL(/\/operations\/freight-commercial/);
  });

  test("12 — Workload widgets render", async ({ page }) => {
    await expect(page.getByTestId("oc-workload")).toBeVisible();
  });

  test("13 — Upcoming events render", async ({ page }) => {
    await expect(page.getByTestId("oc-upcoming-events")).toBeVisible();
  });

  test("14 — Admin quick actions available", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/admin/dashboard");
    await expect(page.getByTestId("nav-quick-actions")).toBeVisible();
    await expect(page.getByTestId("aqa-control-tower")).toBeVisible();
    await expect(page.getByTestId("aqa-rfq-triage")).toBeVisible();
  });

  test("15 — Mobile layout stacks widgets", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/dashboard");
    await expect(page.getByTestId("oc-kpi-row")).toBeVisible();
    await expect(page.getByTestId("oc-action-inbox")).toBeVisible();
    await expect(page.getByTestId("mobile-nav-open")).toBeVisible();
  });

  test("16 — Buyer does not see operations command center", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("buyer-dashboard")).toBeVisible();
    await expect(page.getByTestId("oc-kpi-row")).toHaveCount(0);
  });

  test("17 — Deep links resolve (no 404)", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    const paths = [
      "/admin/dashboard",
      "/admin/rfq",
      "/operations",
      "/operations/freight",
      "/operations/freight-commercial",
      "/operations/executive",
      "/operations/growth",
      "/operations/market-intelligence",
      "/notifications",
    ];
    for (const path of paths) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
      await expect(page.getByTestId("app-layout")).toBeVisible({ timeout: 15_000 });
    }
  });

  test("18 — Grouped navigation includes Command Center home", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/admin/dashboard");
    for (const groupId of ADMIN_GROUPS) {
      await expect(page.getByTestId(groupId)).toBeVisible();
    }
    await expect(page.getByTestId("nav-admin-dashboard")).toBeVisible();
  });
});
