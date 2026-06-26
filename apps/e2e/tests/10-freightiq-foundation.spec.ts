// Sprint 5A — FreightIQ foundation
import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import {
  uiLogin, USERS, apiLogin, newRequest, API_BASE,
  setupSubmittedRfqWithStrategy, assignAndPublish, closeQuotationsAndStartEvaluation,
  runControlTowerScan, findOpenAlert,
} from "./_helpers";

const REPO = process.env.E2E_REPO_ROOT || `${process.cwd()}/../..`;

async function bootstrapOrderProductionComplete(): Promise<string> {
  const req = await newRequest();
  const buyerToken = await apiLogin(req, USERS.buyer1);
  const adminToken = await apiLogin(req, USERS.admin);
  const supplierToken = await apiLogin(req, USERS.supA1);
  const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
  const supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
  const ts = Date.now();
  const rfq = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E FreightIQ ${ts}`);
  await assignAndPublish(req, adminToken, rfq.id, [USERS.supA1.email]);
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/quotations`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 10, unitPrice: 8 }] },
  });
  await closeQuotationsAndStartEvaluation(req, buyerToken, rfq.id, "FreightIQ E2E");
  const quotes = await req.get(`${API_BASE}/api/rfq/${rfq.id}/quotations`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/select-supplier`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "fiq" } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/request-proforma`, {
    headers: { Authorization: `Bearer ${buyerToken}` }, data: { payload: {} },
  });
  const fd = new FormData();
  fd.append("file", new Blob([Buffer.from("x")], { type: "application/pdf" }), "p.pdf");
  const up = await fetch(`${API_BASE}/api/rfq/${rfq.id}/attachments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${supplierToken}` },
    body: fd as unknown as BodyInit,
  });
  const upJson = await up.json();
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/submit-proforma`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfq.id}/attachments/${upJson.id}` } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/approve-proforma`, {
    headers: { Authorization: `Bearer ${buyerToken}` }, data: { payload: {} },
  });
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/issue-po`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  const orders = await req.get(`${API_BASE}/api/rfq/${rfq.id}/spawned-orders`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  const orderId = orders[0].id;
  const future = new Date(Date.now() + 30 * 86400_000).toISOString();
  await req.post(`${API_BASE}/api/orders/${orderId}/actions/supplier-confirm-order`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: { plannedCompletionDate: future } },
  });
  await req.post(`${API_BASE}/api/orders/${orderId}/actions/start-production`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: { plannedCompletionDate: future } },
  });
  await req.post(`${API_BASE}/api/orders/${orderId}/actions/mark-production-completed`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: { percentage: 100, label: "Production complete" } },
  });
  const order = await req.get(`${API_BASE}/api/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as { state: string };
  expect(order.state).toBe("PRODUCTION_COMPLETED");
  return orderId;
}

test.describe.serial("FreightIQ foundation (Sprint 5A)", () => {
  let orderId = "";
  let offerA = "";
  let offerB = "";

  test.beforeAll(async () => {
    orderId = await bootstrapOrderProductionComplete();
  });

  test("01 — Create freight request", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/create-request`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          mode: "OCEAN_FCL",
          pol: "CNSHA",
          pod: "NLRTM",
          cargoDescription: "FreightIQ E2E cargo",
          containerType: "40HC",
        },
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { request: { status: string } };
    expect(body.request.status).toBe("REQUESTED");
  });

  test("02 — Submit and revise offers", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const validUntil = new Date(Date.now() + 14 * 86400_000).toISOString();
    const a = await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/submit-offer`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          providerName: "Forwarder A",
          carrierName: "Maersk",
          price: 3000,
          currency: "USD",
          transitDays: 30,
          validUntil,
        },
      },
    });
    const aBody = await a.json() as { offers: Array<{ id: string }> };
    offerA = aBody.offers[0].id;

    const b = await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/submit-offer`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          providerName: "Forwarder B",
          carrierName: "MSC",
          price: 2200,
          currency: "USD",
          transitDays: 25,
          validUntil,
        },
      },
    });
    const bBody = await b.json() as { offers: Array<{ id: string; price: number }> };
    offerB = bBody.offers.find((o) => o.price === 2200)!.id;

    const rev = await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/revise-offer`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          offerId: offerA,
          providerName: "Forwarder A",
          carrierName: "Maersk",
          price: 2800,
          currency: "USD",
          transitDays: 28,
          validUntil,
        },
      },
    });
    expect(rev.ok()).toBeTruthy();
  });

  test("03 — Compare offers and select", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { comparisonHints: { lowestPriceOfferId: string } };
    expect(summary.comparisonHints.lowestPriceOfferId).toBe(offerB);

    const sel = await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/select-offer`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: { offerId: offerB } },
    });
    expect(sel.ok()).toBeTruthy();
    const body = await sel.json() as { selection: { offerId: string } | null };
    expect(body.selection?.offerId).toBe(offerB);
  });

  test("04 — Shipment linked after freight selection", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { selection: { shipmentWorkspaceId: string | null } | null };
    expect(summary.selection?.shipmentWorkspaceId).toBeTruthy();

    const adminToken = await apiLogin(req, USERS.admin);
    await runControlTowerScan(req, adminToken);
    const hit = await findOpenAlert(req, adminToken, {
      workspaceId: orderId,
      alertKey: "freight_selected_no_shipment",
    });
    expect(hit).toBeFalsy();
  });

  test("05 — FreightIQ workspace visible on order page", async ({ page }) => {
    test.skip(!orderId || !offerB, "requires serial bootstrap");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/order/${orderId}`);
    await expect(page.getByTestId("order-freightiq-section")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("order-freightiq-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("freightiq-hero")).toBeVisible();
    await expect(page.getByTestId("freightiq-selected-winner")).toBeVisible();
    await expect(page.getByTestId("freightiq-open-shipment")).toBeVisible();
  });

  test("06 — Role isolation on freight ops", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const res = await req.get(`${API_BASE}/api/freightiq/operations/overview`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.status()).toBe(403);
  });
});
