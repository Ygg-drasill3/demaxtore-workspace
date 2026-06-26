import { test, expect } from "@playwright/test";
import { uiLogin, USERS } from "./_helpers";

const SUPPLIER_GROUPS = [
  "nav-group-home", "nav-group-opportunities", "nav-group-execution",
  "nav-group-collaboration", "nav-group-documents", "nav-group-knowledge",
];

const SUPPLIER_NAV_ITEMS = [
  "supplier-dashboard", "supplier-rfq", "supplier-commoditybid",
  "supplier-purchase-orders", "supplier-orders", "supplier-shipments",
  "supplier-messages", "supplier-notifications", "supplier-trade-documents", "supplier-learning",
];

test.describe("Sprint 10B — Supplier Workspace Experience", () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page, USERS.supA1);
    await page.goto("/supplier/dashboard");
    await expect(page.getByTestId("supplier-dashboard")).toBeVisible({ timeout: 15_000 });
  });

  test("01 — Grouped navigation renders on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/supplier/dashboard");
    await expect(page.getByTestId("sidebar")).toBeVisible();
    for (const groupId of SUPPLIER_GROUPS) {
      await expect(page.getByTestId(groupId)).toBeVisible();
    }
    for (const testId of SUPPLIER_NAV_ITEMS) {
      await expect(page.getByTestId(`nav-${testId}`)).toBeVisible();
    }
  });

  test("02 — Quick actions are available", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/supplier/dashboard");
    await expect(page.getByTestId("nav-quick-actions")).toBeVisible();
    await expect(page.getByTestId("sqa-open-rfqs")).toBeVisible();
    await expect(page.getByTestId("sqa-join-auction")).toBeVisible();
    await expect(page.getByTestId("sqa-view-orders")).toBeVisible();
    await expect(page.getByTestId("sqa-open-messages")).toBeVisible();
    await expect(page.getByTestId("sqa-upload-docs")).toBeVisible();
  });

  test("03 — Command center layout loads", async ({ page }) => {
    await expect(page.getByText("Supplier · Command Center")).toBeVisible();
    await expect(page.getByTestId("sc-kpi-row")).toBeVisible();
    await expect(page.getByTestId("supplier-dashboard")).toHaveAttribute("data-dashboard-mode", /new_supplier|active_supplier|top_supplier/);
  });

  test("04 — KPI row renders and links", async ({ page }) => {
    await expect(page.getByTestId("sc-kpi-rfq-invites")).toBeVisible();
    await expect(page.getByTestId("sc-kpi-live-auctions")).toBeVisible();
    await expect(page.getByTestId("sc-kpi-pending-pos")).toBeVisible();
    await expect(page.getByTestId("sc-kpi-active-orders")).toBeVisible();
    await expect(page.getByTestId("sc-kpi-shipments")).toBeVisible();
    await expect(page.getByTestId("sc-kpi-unread-messages")).toBeVisible();
    await page.getByTestId("sc-kpi-rfq-invites").click();
    await expect(page).toHaveURL(/\/supplier\/rfq/);
  });

  test("05 — Action Inbox renders", async ({ page }) => {
    await page.goto("/supplier/dashboard");
    await expect(page.getByTestId("sc-action-inbox")).toBeVisible();
  });

  test("06 — Opportunity Center renders", async ({ page }) => {
    await expect(page.getByTestId("sc-opportunity-center")).toBeVisible();
    await page.getByTestId("sc-opportunities-rfq").click();
    await expect(page).toHaveURL(/\/supplier\/rfq/);
  });

  test("07 — Execution Center renders", async ({ page }) => {
    await expect(page.getByTestId("sc-execution-center")).toBeVisible();
  });

  test("08 — Document Center renders and links", async ({ page }) => {
    await expect(page.getByTestId("sc-documents")).toBeVisible();
    await page.getByTestId("sc-documents-all").click();
    await expect(page).toHaveURL(/\/supplier\/trade-documents/);
    await expect(page.getByTestId("trade-documents-list-page")).toBeVisible();
  });

  test("09 — Communication Center renders and links", async ({ page }) => {
    await expect(page.getByTestId("sc-messages")).toBeVisible();
    await page.getByTestId("sc-messages-all").click();
    await expect(page).toHaveURL(/\/supplier\/messages/);
    await expect(page.getByTestId("general-messages-page")).toBeVisible();
  });

  test("10 — Upcoming Events render", async ({ page }) => {
    await expect(page.getByTestId("sc-upcoming-events")).toBeVisible();
  });

  test("11 — Onboarding section repositioned (collapsible)", async ({ page }) => {
    await expect(page.getByTestId("sc-onboarding-section")).toBeVisible();
    await expect(page.getByTestId("sc-onboarding-toggle")).toBeVisible();
  });

  test("12 — List pages load from execution nav", async ({ page }) => {
    await page.goto("/supplier/purchase-orders");
    await expect(page.getByTestId("po-list-page")).toBeVisible();
    await expect(page.getByTestId("nav-supplier-purchase-orders")).toHaveClass(/bg-white/);

    await page.goto("/supplier/shipments");
    await expect(page.getByTestId("shipments-list-page")).toBeVisible();
    await expect(page.getByTestId("nav-supplier-shipments")).toHaveClass(/bg-white/);
  });

  test("13 — Mobile layout stacks widgets", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/supplier/dashboard");
    await expect(page.getByTestId("sc-kpi-row")).toBeVisible();
    await expect(page.getByTestId("sc-action-inbox")).toBeVisible();
    await expect(page.getByTestId("mobile-nav-open")).toBeVisible();
  });

  test("14 — Mobile navigation drawer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/supplier/dashboard");
    await page.getByTestId("mobile-nav-open").click();
    const drawer = page.getByTestId("mobile-nav");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId("nav-group-opportunities")).toBeVisible();
    await drawer.getByTestId("nav-supplier-commoditybid").click();
    await expect(page).toHaveURL(/\/supplier\/commoditybid/);
  });

  test("15 — Buyer does not see supplier command center KPIs", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("buyer-dashboard")).toBeVisible();
    await expect(page.getByTestId("sc-kpi-row")).toHaveCount(0);
  });

  test("16 — Deep links resolve (no 404)", async ({ page }) => {
    const paths = [
      "/supplier/dashboard",
      "/supplier/rfq",
      "/supplier/commoditybid",
      "/supplier/purchase-orders",
      "/supplier/orders",
      "/supplier/shipments",
      "/supplier/messages",
      "/supplier/trade-documents",
      "/learning",
      "/notifications",
    ];
    for (const path of paths) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
      await expect(page.getByTestId("app-layout")).toBeVisible();
    }
  });
});
