import { test, expect } from "@playwright/test";
import { uiLogin, USERS } from "./_helpers";

test.describe("Unified Messages", () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page, USERS.admin);
  });

  test("admin opens /messages and sees conversation list", async ({ page }) => {
    await page.goto("/messages");
    await expect(page.getByTestId("unified-messages-list")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/messages/i).first()).toBeVisible();
  });

  test("legacy redirect to /messages works", async ({ page }) => {
    await page.goto("/buyer/inbox");
    await expect(page).toHaveURL(/\/messages/, { timeout: 10_000 });
  });

  test("context filter query params preserved", async ({ page }) => {
    await page.goto("/messages?contextType=RFQ");
    await expect(page).toHaveURL(/contextType=RFQ/);
  });

  test("mobile layout is usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/messages");
    await expect(page.getByRole("heading", { name: /messages/i })).toBeVisible();
  });
});
