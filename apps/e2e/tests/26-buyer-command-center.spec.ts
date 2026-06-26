import { test, expect } from "@playwright/test";
import { uiLogin, USERS } from "./_helpers";

test.describe("Sprint 10A.2 — Buyer Command Center", () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("buyer-dashboard")).toBeVisible({ timeout: 15_000 });
  });

  test("01 — Dashboard loads with command center layout", async ({ page }) => {
    await expect(page.getByText("Buyer · Command Center")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-row")).toBeVisible();
  });

  test("02 — KPI cards render and link", async ({ page }) => {
    await expect(page.getByTestId("cc-kpi-open-rfqs")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-live-auctions")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-active-orders")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-shipments")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-unread-messages")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-awaiting-auction-approval")).toBeVisible();
    await page.getByTestId("cc-kpi-open-rfqs").click();
    await expect(page).toHaveURL(/\/buyer\/rfq/);
  });

  test("03 — Action Inbox renders", async ({ page }) => {
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("cc-action-inbox")).toBeVisible();
  });

  test("04 — Active Trades table renders", async ({ page }) => {
    await expect(page.getByTestId("cc-active-trades")).toBeVisible();
  });

  test("04b — Trade pipeline snippet renders", async ({ page }) => {
    await expect(page.getByTestId("cc-trade-pipeline-snippet")).toBeVisible();
  });

  test("05 — Live Auctions widget renders", async ({ page }) => {
    await expect(page.getByTestId("cc-live-auctions")).toBeVisible();
  });

  test("06 — Shipment widget renders", async ({ page }) => {
    await expect(page.getByTestId("cc-shipments")).toBeVisible();
  });

  test("07 — Documents widget renders", async ({ page }) => {
    await expect(page.getByTestId("cc-documents")).toBeVisible();
    await page.getByTestId("cc-documents-all").click();
    await expect(page).toHaveURL(/\/buyer\/trade-documents/);
  });

  test("08 — Messages widget renders", async ({ page }) => {
    await expect(page.getByTestId("cc-messages")).toBeVisible();
    await page.getByTestId("cc-messages-all").click();
    await expect(page).toHaveURL(/\/buyer\/messages/);
  });

  test("09 — Upcoming Events render", async ({ page }) => {
    await expect(page.getByTestId("cc-upcoming-events")).toBeVisible();
  });

  test("10 — Onboarding section repositioned (collapsible)", async ({ page }) => {
    await expect(page.getByTestId("cc-onboarding-section")).toBeVisible();
    await expect(page.getByTestId("cc-onboarding-toggle")).toBeVisible();
  });

  test("11 — Mobile layout stacks widgets", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("cc-kpi-row")).toBeVisible();
    await expect(page.getByTestId("cc-action-inbox")).toBeVisible();
    await expect(page.getByTestId("mobile-nav-open")).toBeVisible();
  });

  test("12 — Supplier does not see buyer command center", async ({ page }) => {
    await uiLogin(page, USERS.supA1);
    await page.goto("/supplier/dashboard");
    await expect(page.getByTestId("supplier-dashboard")).toBeVisible();
    await expect(page.getByTestId("cc-kpi-row")).toHaveCount(0);
  });
});
