// Sprint 15A — Unified Trade Execution Workspace E2E
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE, setupSubmittedRfqWithStrategy } from "./_helpers";

test.describe.serial("Trade execution workspace (15A)", () => {
  let rfqId = "";
  let orderId = "";
  let buyerToken = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
  });

  test("01 — API returns trade workspace for RFQ root", async () => {
    const req = await newRequest();
    const created = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Trade WS ${Date.now()}`);
    rfqId = created.id;
    const res = await req.get(`${API_BASE}/api/trades/${rfqId}/workspace`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.header.tradeId).toMatch(/^TRADE-/);
    expect(body.header.rootWorkspaceId).toBe(rfqId);
    expect(body.summary).toBeTruthy();
    expect(Array.isArray(body.timeline)).toBe(true);
    expect(Array.isArray(body.documents)).toBe(true);
    expect(Array.isArray(body.relatedRecords)).toBe(true);
  });

  test("02 — Trade workspace page renders all panels", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/trade/${rfqId}`);
    await expect(page.getByTestId("trade-workspace")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("trade-workspace-header")).toBeVisible();
    await expect(page.getByTestId("trade-summary-panel")).toBeVisible();
    await expect(page.getByTestId("trade-po-panel")).toBeVisible();
    await expect(page.getByTestId("trade-order-panel")).toBeVisible();
    await expect(page.getByTestId("trade-freight-panel")).toBeVisible();
    await expect(page.getByTestId("trade-shipment-panel")).toBeVisible();
    await expect(page.getByTestId("trade-document-center")).toBeVisible();
    await expect(page.getByTestId("trade-timeline-panel")).toBeVisible();
    await expect(page.getByTestId("trade-alerts-panel")).toBeVisible();
    await expect(page.getByTestId("trade-related-panel")).toBeVisible();
  });

  test("03 — Document center search filters", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/trade/${rfqId}`);
    await expect(page.getByTestId("trade-document-center")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("trade-doc-search").fill("zzz-no-match-xyz");
    await expect(page.getByText("No documents match your filters.")).toBeVisible();
  });

  test("04 — Resolves from order id when order exists", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
    const spawned = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ id: string }>;
    if (!spawned.length) {
      test.skip(true, "no order spawned yet");
      return;
    }
    orderId = spawned[0].id;
    const res = await req.get(`${API_BASE}/api/trades/${orderId}/workspace`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.header.rootWorkspaceId).toBe(rfqId);

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/order/${orderId}`);
    await expect(page.getByTestId("order-trade-workspace-link")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("order-trade-workspace-link").click();
    await expect(page.getByTestId("trade-workspace")).toBeVisible({ timeout: 15_000 });
  });
});
