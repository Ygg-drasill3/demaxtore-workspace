// PAY-UI-002 — consistent online payment disabled notice across workspaces
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE } from "./_helpers";

const NOTICE =
  "Online payment collection is not currently enabled. Payment milestones can still be recorded manually by authorized users.";

test.describe("Payment disabled notice (PAY-UI-002)", () => {
  test("capabilities API reports online collection disabled in production-like E2E", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const caps = await req
      .get(`${API_BASE}/api/payments/capabilities`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      })
      .then((r) => r.json()) as { onlineCollectionEnabled: boolean; message: string | null };
    expect(caps.onlineCollectionEnabled).toBe(false);
    expect(caps.message ?? NOTICE).toContain("not currently enabled");
  });

  test("order workspace shows payment disabled notice (buyer)", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const orders = await req
      .get(`${API_BASE}/api/order?limit=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()) as Array<{ id: string }>;
    test.skip(!orders.length, "no order workspace");
    await page.goto(`/workspace/order/${orders[0].id}`);
    const notice = page.getByTestId("online-payments-disabled-notice");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("not currently enabled");
    await expect(page.getByTestId("create-payment-intent")).toHaveCount(0);
  });

  test("trade workspace shows payment disabled notice (buyer)", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    const req = await newRequest();
    const token = await apiLogin(req, USERS.buyer1);
    const orders = await req
      .get(`${API_BASE}/api/order?limit=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()) as Array<{ id: string }>;
    test.skip(!orders.length, "no order");
    const order = orders[0];
    const detail = await req
      .get(`${API_BASE}/api/order/${order.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()) as { spawnedFrom?: { id: string } };
    const tradeId = detail.spawnedFrom?.id ?? order.id;
    await page.goto(`/workspace/trade/${tradeId}`);
    const notice = page.getByTestId("online-payments-disabled-notice");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("not currently enabled");
    await expect(page.getByTestId("create-payment-intent")).toHaveCount(0);
  });
});
