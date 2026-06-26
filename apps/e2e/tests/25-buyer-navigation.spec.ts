import { test, expect } from "@playwright/test";
import { uiLogin, USERS } from "./_helpers";

const BUYER_GROUPS = [
  "nav-group-home", "nav-group-sourcing", "nav-group-execution",
  "nav-group-collaboration", "nav-group-documents", "nav-group-knowledge",
];

const BUYER_NAV_ITEMS = [
  "buyer-dashboard", "buyer-rfq", "buyer-commoditybid",
  "buyer-purchase-orders", "buyer-orders", "buyer-shipments",
  "buyer-messages", "buyer-notifications", "buyer-trade-documents", "buyer-learning",
];

const ADMIN_NAV_SAMPLE = [
  "admin-operations", "admin-freight-ops", "admin-dashboard", "admin-rfq", "admin-orders",
];

test.describe("Sprint 10A.1 — Buyer navigation architecture", () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
  });

  test("01 — Grouped navigation renders on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("sidebar")).toBeVisible();
    for (const groupId of BUYER_GROUPS) {
      await expect(page.getByTestId(groupId)).toBeVisible();
    }
    for (const testId of BUYER_NAV_ITEMS) {
      await expect(page.getByTestId(`nav-${testId}`)).toBeVisible();
    }
  });

  test("02 — Quick actions are available", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("nav-quick-actions")).toBeVisible();
    await expect(page.getByTestId("qa-new-rfq")).toBeVisible();
    await expect(page.getByTestId("qa-create-cb")).toBeVisible();
    await expect(page.getByTestId("qa-open-messages")).toBeVisible();
    await expect(page.getByTestId("qa-view-shipments")).toBeVisible();
    await expect(page.getByTestId("qa-open-documents")).toBeVisible();
  });

  test("03 — Purchase Orders list page loads", async ({ page }) => {
    await page.goto("/buyer/purchase-orders");
    await expect(page.getByTestId("po-list-page")).toBeVisible();
    await expect(page.getByTestId("nav-buyer-purchase-orders")).toHaveClass(/text-white/);
  });

  test("04 — Shipments list page loads", async ({ page }) => {
    await page.goto("/buyer/shipments");
    await expect(page.getByTestId("shipments-list-page")).toBeVisible();
    await expect(page.getByTestId("nav-buyer-shipments")).toHaveClass(/text-white/);
  });

  test("05 — Trade Documents list page loads", async ({ page }) => {
    await page.goto("/buyer/trade-documents");
    await expect(page.getByTestId("trade-documents-list-page")).toBeVisible();
    await expect(page.getByTestId("nav-buyer-trade-documents")).toHaveClass(/text-white/);
  });

  test("06 — Messages page loads (Workspace general chat)", async ({ page }) => {
    await page.goto("/buyer/messages");
    await expect(page.getByTestId("general-messages-page")).toBeVisible();
    await expect(page.getByTestId("nav-buyer-messages")).toHaveClass(/text-white/);
  });

  test("07 — Supplier does not see buyer execution nav", async ({ page }) => {
    await uiLogin(page, USERS.supA1, { force: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/supplier/dashboard");
    await expect(page.getByTestId("nav-supplier-orders")).toBeVisible();
    await expect(page.getByTestId("nav-buyer-purchase-orders")).toHaveCount(0);
    await expect(page.getByTestId("nav-buyer-shipments")).toHaveCount(0);
    await expect(page.getByTestId("nav-buyer-messages")).toHaveCount(0);
  });

  test("08 — Mobile navigation drawer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("sidebar")).toBeHidden();
    await page.getByTestId("mobile-nav-open").click();
    const drawer = page.getByTestId("mobile-nav");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId("nav-group-execution")).toBeVisible();
    await expect(drawer.getByTestId("nav-buyer-shipments")).toBeVisible();
    await drawer.getByTestId("nav-buyer-shipments").click();
    await expect(page).toHaveURL(/\/buyer\/shipments/);
    await expect(page.getByTestId("shipments-list-page")).toBeVisible();
  });

  test("09 — Deep links resolve (no 404)", async ({ page }) => {
    const paths = [
      "/buyer/dashboard",
      "/buyer/rfq",
      "/buyer/commoditybid",
      "/buyer/purchase-orders",
      "/buyer/orders",
      "/buyer/shipments",
      "/buyer/messages",
      "/buyer/trade-documents",
      "/learning",
      "/notifications",
    ];
    for (const path of paths) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
      if (path === "/buyer/commoditybid") {
        await expect(page.getByTestId("embed-shell-layout")).toBeVisible();
      } else {
        await expect(page.getByTestId("app-layout")).toBeVisible();
      }
    }
  });

  test("10 — Admin nav differs from buyer", async ({ page }) => {
    await uiLogin(page, USERS.admin, { force: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/operations");
    for (const testId of ADMIN_NAV_SAMPLE) {
      await expect(page.getByTestId(`nav-${testId}`)).toBeVisible();
    }
    await expect(page.getByTestId("nav-buyer-purchase-orders")).toHaveCount(0);
  });
});
