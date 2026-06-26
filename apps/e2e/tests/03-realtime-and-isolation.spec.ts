// apps/e2e/tests/03-realtime-and-isolation.spec.ts
//
// Two specific guarantees we promised the user this sprint:
//   (a) `notification:new` actually pops a toast in the recipient's browser
//   (b) cross-role isolation: a different BUYER cannot view another BUYER's RFQ
//
import { test, expect } from "@playwright/test";
import {
  uiLogin, USERS, apiLogin, newRequest, API_BASE, setupSubmittedRfq, assignAndPublish,
} from "./_helpers";

test.describe.serial("Realtime + isolation", () => {
  test("notification:new pops a toast in the OWNER browser when admin assigns suppliers", async ({ browser }) => {
    // Setup an RFQ owned by buyer1, sitting in RFQ_SUBMITTED.
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const adminToken = await apiLogin(req, USERS.admin);
    const rfq = await setupSubmittedRfq(req, buyerToken, "Toast E2E");

    // Buyer opens their dashboard in a real browser.
    const buyerCtx  = await browser.newContext();
    const buyerPage = await buyerCtx.newPage();
    await uiLogin(buyerPage, USERS.buyer1);
    await buyerPage.goto("/buyer/dashboard");
    await expect(buyerPage.getByTestId("buyer-dashboard")).toBeVisible();

    // Admin assigns suppliers via REST — this fires `rfq.suppliers.assigned.buyer`
    // notification to the OWNER (buyer1). The toast must appear in buyer1's browser.
    await assignAndPublish(req, adminToken, rfq.id, [USERS.supA1.email]);

    // Toast IDs are dynamic; assert any toast in the host element.
    const toastHost = buyerPage.getByTestId("toast-host");
    await expect(toastHost).toBeVisible();
    await expect(toastHost.locator('[data-testid^="toast-"]').first()).toBeVisible({ timeout: 10_000 });
    const toastText = await toastHost.locator('[data-testid^="toast-"]').first().innerText();
    expect(toastText.length).toBeGreaterThan(0);

    await buyerCtx.close();
  });

  test("buyer2 cannot view buyer1's RFQ workspace", async ({ browser }) => {
    // Setup buyer1's RFQ in PROFORMA_RECEIVED or any non-terminal state.
    const req = await newRequest();
    const buyer1Token = await apiLogin(req, USERS.buyer1);
    const rfq = await setupSubmittedRfq(req, buyer1Token, "Iso E2E");

    // buyer2 logs in via UI and tries to navigate to buyer1's workspace by URL.
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    await uiLogin(page, USERS.buyer2);
    await page.goto(`/workspace/rfq/${rfq.id}`);

    // The page should NOT render the workspace shell. Expect either a redirect
    // or an empty/forbidden state. We accept either: no rfq-workspace testid,
    // OR no rfq-list-row for that id on the listing.
    // Use domcontentloaded to avoid hanging on WebSocket keepalive traffic.
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const workspaceShell = page.getByTestId("rfq-workspace");
    const visible = await workspaceShell.isVisible().catch(() => false);

    // Either the workspace is hidden (RequireRole / 403 from API → blank), OR
    // the title field shows empty content. We assert that buyer2 cannot see
    // the real RFQ title.
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("Iso E2E");

    await ctx.close();
  });
});
