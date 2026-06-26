import { test, expect } from "@playwright/test";
import { uiLogin, USERS, readAccessToken } from "./_helpers";

test.describe("FreightIQ embed — Execution nav", () => {
  test("01 — Buyer Execution → FreightIQ embed loads or shows error", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/buyer/dashboard");
    await page.getByTestId("nav-buyer-freightiq").click();
    await expect(page).toHaveURL(/\/buyer\/freightiq/);
    await expect(page.getByTestId("embed-shell-layout")).toBeVisible();
    await expect(page.getByTestId("freightiq-embed-page")).toBeVisible();

    const embed = page.getByTestId("freightiq-external-embed");
    await expect(embed).toBeVisible({ timeout: 20_000 });

    const iframe = embed.locator("iframe");
    const error = page.getByTestId("query-state-error");
    await expect
      .poll(async () => {
        const hasIframe = (await iframe.count()) > 0;
        const hasError = (await error.count()) > 0;
        const embedError = await embed.locator("p.text-red-600").count();
        return hasIframe || hasError > 0 || embedError > 0;
      }, { timeout: 25_000 })
      .toBe(true);
  });

  test("02 — Supplier Execution → FreightIQ embed loads or shows error", async ({ page }) => {
    await uiLogin(page, USERS.supA1);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/supplier/freightiq");
    await expect(page.getByTestId("freightiq-embed-page")).toBeVisible();
    await expect(page.getByTestId("freightiq-external-embed")).toBeVisible({ timeout: 20_000 });
  });

  test("03 — SSO endpoint responds quickly", async ({ page, request }) => {
    await uiLogin(page, USERS.buyer1);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(
      "/api/integrations/freightiq/sso?next=/dashboard&embed=workspace",
      { headers: { Authorization: `Bearer ${token}` }, timeout: 15_000 },
    );
    expect(res.status()).toBeLessThan(500);
    const body = await res.json();
    expect(body.bridgeUrl).toContain("freightiq");
    expect(body.embedUrl).toContain("freightiq");
    expect(body.embedUrl).toContain("fi_t=");
    expect(typeof body.sso).toBe("string");
    expect((body.sso as string).length).toBeGreaterThan(20);
  });
});
