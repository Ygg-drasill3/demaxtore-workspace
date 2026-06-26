import { test, expect } from "@playwright/test";
import { uiLogin, USERS } from "./_helpers";

const BUYER_ROUTE_SMOKE = [
  "/buyer/control-tower",
  "/buyer/rfq",
  "/buyer/orders",
  "/buyer/shipments",
  "/buyer/messages",
  "/buyer/trade-documents",
  "/notifications",
  "/documents",
  "/buyer/freightiq",
  "/buyer/commoditybid",
];

test.describe("BUG-001/002/003 — Auth session regression", () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
  });

  test("full page reload keeps buyer session (no infinite auth spinner)", async ({ page }) => {
    await page.goto("/buyer/control-tower");
    await expect(page.getByTestId("auth-loading")).toHaveCount(0, { timeout: 20_000 });
    await page.reload();
    await expect(page.getByTestId("auth-loading")).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByTestId("auth-timeout")).toHaveCount(0);
    await expect(page).toHaveURL(/control-tower/);
  });

  test("buyer routes load after hard navigation (no auth deadlock)", async ({ page }) => {
    for (const path of BUYER_ROUTE_SMOKE) {
      await page.goto(path);
      await expect(page.getByTestId("auth-loading")).toHaveCount(0, { timeout: 25_000 });
      await expect(page.getByTestId("auth-timeout")).toHaveCount(0);
      if (path.includes("freightiq") || path.includes("commoditybid")) {
        await expect(page.getByTestId("embed-shell-layout")).toBeVisible();
      } else if (path === "/notifications") {
        await expect(page.getByTestId("notifications-page")).toBeVisible();
      } else if (path === "/documents") {
        await expect(page.getByTestId("document-center")).toBeVisible();
      } else {
        await expect(page.getByTestId("app-layout")).toBeVisible();
      }
    }
  });

  test("legacy buyer paths redirect to canonical routes", async ({ page }) => {
    await page.goto("/buyer/notifications");
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.getByTestId("notifications-page")).toBeVisible();

    await page.goto("/buyer/documents");
    await expect(page).toHaveURL(/\/documents$/);
  });

  test("buyer hitting /admin redirects to buyer home (permission guard)", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.getByTestId("auth-loading")).toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/buyer\/control-tower/);
  });
});

test.describe("Supplier entry redirect", () => {
  test("/supplier redirects to supplier dashboard when authenticated", async ({ page }) => {
    await uiLogin(page, USERS.supA1);
    await page.goto("/supplier");
    await expect(page).toHaveURL(/\/supplier\/dashboard/);
    await expect(page.getByTestId("auth-loading")).toHaveCount(0, { timeout: 20_000 });
  });
});
