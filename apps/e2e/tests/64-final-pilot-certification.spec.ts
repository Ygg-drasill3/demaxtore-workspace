// FINAL-PILOT-CERT-20260716 — real-time messaging + greenfield workflow certification
import { test, expect } from "@playwright/test";
import {
  uiLogin,
  USERS,
  apiLogin,
  newRequest,
  API_BASE,
  setupSubmittedRfqWithStrategy,
  assignAndPublish,
  closeQuotationsAndStartEvaluation,
  waitForHydrate,
} from "./_helpers";

const PREFIX = "FINAL-PILOT-CERT-20260716";
const hubUrl = (orderId: string) => `/workspace/order/${orderId}`;

async function bootstrapGreenfieldOrder(): Promise<{ orderId: string; rfqId: string }> {
  const req = await newRequest();
  const buyerToken = await apiLogin(req, USERS.buyer1);
  const adminToken = await apiLogin(req, USERS.admin);
  const supplierToken = await apiLogin(req, USERS.supA1);
  const tag = `${PREFIX}-${Date.now()}`;
  const { id: rfqId } = await setupSubmittedRfqWithStrategy(req, buyerToken, tag);
  await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
  await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { currency: "USD", lineItems: [{ position: 1, description: "cert widget", quantity: 50, unitPrice: 55 }] },
  });
  await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId, "final pilot cert");
  const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
  const supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
  const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "cert" } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  const fd = new FormData();
  fd.append("file", new Blob([Buffer.from("pi")], { type: "application/pdf" }), "pi.pdf");
  const up = await fetch(`${API_BASE}/api/rfq/${rfqId}/attachments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${supplierToken}` },
    body: fd as unknown as BodyInit,
  });
  const upJson = await up.json() as { id: string };
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  const spawned = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  return { orderId: spawned[0].id, rfqId };
}

async function openOrderThread(page: import("@playwright/test").Page, orderId: string) {
  await page.goto(hubUrl(orderId));
  await waitForHydrate(page);
  await page.getByTestId("order-loading").waitFor({ state: "detached", timeout: 25_000 }).catch(() => {});
  const panel = page.getByTestId("order-communication");
  await panel.scrollIntoViewIfNeeded();
  await expect(panel).toBeVisible({ timeout: 20_000 });
  return panel;
}

test.describe.serial("Final pilot certification — messaging", () => {
  let orderId = "";

  test.beforeAll(async () => {
    const boot = await bootstrapGreenfieldOrder();
    orderId = boot.orderId;
  });

  test("real-time delivery buyer → supplier without reload", async ({ browser }) => {
    test.skip(!orderId, "no order");
    const buyerCtx = await browser.newContext();
    const supplierCtx = await browser.newContext();
    const buyerPage = await buyerCtx.newPage();
    const supplierPage = await supplierCtx.newPage();

    await uiLogin(buyerPage, USERS.buyer1, { force: true });
    await uiLogin(supplierPage, USERS.supA1, { force: true });

    const buyerPanel = await openOrderThread(buyerPage, orderId);
    const supplierPanel = await openOrderThread(supplierPage, orderId);

    const msg = `${PREFIX} buyer realtime ${Date.now()}`;
    await buyerPanel.getByTestId("hub-input").fill(msg);
    await buyerPanel.getByTestId("hub-send").click();
    await expect(buyerPanel.getByTestId("hub-timeline")).toContainText(msg, { timeout: 15_000 });

    await expect(supplierPanel.getByTestId("hub-timeline")).toContainText(msg, { timeout: 20_000 });

    await buyerCtx.close();
    await supplierCtx.close();
  });

  test("real-time delivery supplier → buyer without reload", async ({ browser }) => {
    test.skip(!orderId, "no order");
    const buyerCtx = await browser.newContext();
    const supplierCtx = await browser.newContext();
    const buyerPage = await buyerCtx.newPage();
    const supplierPage = await supplierCtx.newPage();

    await uiLogin(buyerPage, USERS.buyer1, { force: true });
    await uiLogin(supplierPage, USERS.supA1, { force: true });

    const buyerPanel = await openOrderThread(buyerPage, orderId);
    const supplierPanel = await openOrderThread(supplierPage, orderId);

    const msg = `${PREFIX} supplier realtime ${Date.now()}`;
    await supplierPanel.getByTestId("hub-input").fill(msg);
    await supplierPanel.getByTestId("hub-send").click();
    await expect(supplierPanel.getByTestId("hub-timeline")).toContainText(msg, { timeout: 15_000 });
    await expect(buyerPanel.getByTestId("hub-timeline")).toContainText(msg, { timeout: 20_000 });

    await buyerCtx.close();
    await supplierCtx.close();
  });

  test("socket reconnect recovers missed messages without duplicates", async ({ browser }) => {
    test.skip(!orderId, "no order");
    const buyerCtx = await browser.newContext();
    const supplierCtx = await browser.newContext();
    const buyerPage = await buyerCtx.newPage();
    const supplierPage = await supplierCtx.newPage();

    await uiLogin(buyerPage, USERS.buyer1, { force: true });
    await uiLogin(supplierPage, USERS.supA1, { force: true });

    await openOrderThread(buyerPage, orderId);
    const supplierPanel = await openOrderThread(supplierPage, orderId);

    await supplierCtx.setOffline(true);
    const offlineMsg = `${PREFIX} offline queue ${Date.now()}`;
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const clientMessageId = crypto.randomUUID();
    await req.post(`${API_BASE}/api/workspaces/order/${orderId}/conversation/timeline`, {
      headers: { Authorization: `Bearer ${buyerToken}`, "Idempotency-Key": clientMessageId },
      data: {
        body: offlineMsg,
        itemType: "MESSAGE",
        visibility: "ALL_PARTICIPANTS",
        clientMessageId,
      },
    });

    await supplierCtx.setOffline(false);
    await expect(supplierPanel.getByTestId("hub-timeline")).toContainText(offlineMsg, { timeout: 30_000 });

    const timelineText = await supplierPanel.getByTestId("hub-timeline").innerText();
    const occurrences = timelineText.split(offlineMsg).length - 1;
    expect(occurrences).toBe(1);

    await buyerCtx.close();
    await supplierCtx.close();
  });

  test("double-click send creates one timeline entry (MSG-001 UI)", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.buyer1, { force: true });
    const panel = await openOrderThread(page, orderId);
    const msg = `${PREFIX} double-click guard ${Date.now()}`;
    await panel.getByTestId("hub-input").fill(msg);
    await panel.getByTestId("hub-send").dblclick({ delay: 50 });
    await page.waitForTimeout(2000);
    const timelineText = await panel.getByTestId("hub-timeline").innerText();
    expect(timelineText.split(msg).length - 1).toBe(1);
  });
});

test.describe("Final pilot certification — greenfield RFQ → PO → Order", () => {
  test("greenfield chain reaches order workspace with payment notice", async ({ page }) => {
    const { orderId, rfqId } = await bootstrapGreenfieldOrder();
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);

    const orderRes = await req.get(`${API_BASE}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(orderRes.ok()).toBeTruthy();
    const orderBody = await orderRes.json() as { id?: string; workspace?: { id: string } };
    const resolvedId = orderBody.id ?? orderBody.workspace?.id;
    expect(resolvedId).toBe(orderId);

    await uiLogin(page, USERS.buyer1, { force: true });
    await page.goto(hubUrl(orderId));
    await waitForHydrate(page);
    await expect(page.getByTestId("order-payment-section")).toBeVisible();
    await expect(page.getByTestId("online-payments-disabled-notice")).toContainText("not currently enabled");
    await expect(page.getByTestId("create-payment-intent")).toHaveCount(0);

    const spawned = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ id: string }>;
    expect(spawned.some((o) => o.id === orderId)).toBe(true);
  });
});
