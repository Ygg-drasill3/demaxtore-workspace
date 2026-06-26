// apps/e2e/tests/01-auth.spec.ts
//
// Smoke: every seeded role can log in via the UI and lands on its dashboard.
//
import { test, expect } from "@playwright/test";
import { uiLogin, USERS } from "./_helpers";

test.describe("Auth (UI)", () => {
  test("admin logs in and sees the admin dashboard", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await expect(page.getByTestId("operations-command-center")).toBeVisible();
  });

  test("buyer1 logs in and lands on buyer control tower (ROLE_DASHBOARD)", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await expect(page).toHaveURL(/\/buyer\/control-tower/);
    await expect(page.getByTestId("import-control-tower")).toBeVisible();
  });

  test("supplier1 logs in and sees the supplier dashboard", async ({ page }) => {
    await uiLogin(page, USERS.supA1);
    await expect(page.getByTestId("supplier-dashboard")).toBeVisible();
  });

  test("wrong password shows the inline error", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(USERS.admin.email);
    await page.getByTestId("login-password").fill("not-the-password");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible({ timeout: 10_000 });
  });
});
