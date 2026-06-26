// Sprint 6B — FreightIQ revenue optimization & margin intelligence
import { test, expect } from "@playwright/test";
import {
  USERS, apiLogin, newRequest, API_BASE,
  setupSubmittedRfqWithStrategy, assignAndPublish, closeQuotationsAndStartEvaluation,
  runControlTowerScan, findOpenAlert,
} from "./_helpers";

const FREIGHT_MARGIN_LOW = "freight.margin.low";
const FREIGHT_MARGIN_NEGATIVE = "freight.margin.negative";

type FreightSummary = {
  offers: Array<{ id: string; commercial?: { freightiqMarginUsd: number }; price: number }>;
  marginIntakeHint?: { suggestedMarginUsd: number; policyName: string | null; lane: string };
};

async function bootstrapOrder(): Promise<string> {
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
  const rfq = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Freight 6B ${ts}`);
  await assignAndPublish(req, adminToken, rfq.id, [USERS.supA1.email]);
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/quotations`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 10, unitPrice: 8 }] },
  });
  await closeQuotationsAndStartEvaluation(req, buyerToken, rfq.id, "freight revenue E2E");
  const quotes = await req.get(`${API_BASE}/api/rfq/${rfq.id}/quotations`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/select-supplier`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "6b" } },
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
    data: { payload: {} },
  });
  return orderId;
}

test.describe.serial("Freight revenue optimization (Sprint 6B)", () => {
  let orderId = "";
  let forwarderId = "";
  const pol = "TRIST";
  const pod = "AEJEA";
  const policyMargin = 150;
  const internalCost = 1800;

  test.beforeAll(async () => {
    orderId = await bootstrapOrder();
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await req.post(`${API_BASE}/api/freightiq/commercial/analytics/margin/policies`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: `UAE lane ${Date.now()}`,
        routePattern: "Turkey → UAE",
        countryFrom: "Turkey",
        countryTo: "UAE",
        defaultMarginUsd: policyMargin,
        minMarginUsd: 100,
        maxMarginUsd: 500,
        isActive: true,
      },
    });
    await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/create-request`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          mode: "OCEAN_FCL",
          pol,
          pod,
          cargoDescription: "6B revenue",
          containerType: "40HC",
        },
      },
    });
    const fwd = await req.post(`${API_BASE}/api/freightiq/forwarders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        companyName: `6B Fwd ${Date.now()}`,
        contactName: "Ops",
        email: `fwd-6b-${Date.now()}@forwarder.test`,
        country: "TR",
      },
    });
    forwarderId = (await fwd.json() as { id: string }).id;
  });

  test("01 — Create margin policy", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const list = await req.get(`${API_BASE}/api/freightiq/commercial/analytics/margin/policies`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(list.ok()).toBeTruthy();
    const policies = await list.json() as Array<{ routePattern: string; defaultMarginUsd: number }>;
    expect(policies.some((p) => p.routePattern === "Turkey → UAE" && p.defaultMarginUsd === policyMargin)).toBeTruthy();
  });

  test("02 — Suggested margin applied on intake", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const suggest = await req.get(
      `${API_BASE}/api/freightiq/commercial/analytics/margin/suggest?pol=${pol}&pod=${pod}`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(suggest.ok()).toBeTruthy();
    const hint = await suggest.json() as { suggestedMarginUsd: number };
    expect(hint.suggestedMarginUsd).toBe(policyMargin);

    const validUntil = new Date(Date.now() + 21 * 86400_000).toISOString();
    const intake = await req.post(
      `${API_BASE}/api/freightiq/orders/${orderId}/communications/intake-offer`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          payload: {
            forwarderContactId: forwarderId,
            offerSource: "MANUAL_ENTRY",
            carrierName: "MSC",
            vesselName: "6B",
            etd: new Date(Date.now() + 14 * 86400_000).toISOString(),
            eta: new Date(Date.now() + 40 * 86400_000).toISOString(),
            transitDays: 26,
            cutOff: new Date(Date.now() + 10 * 86400_000).toISOString(),
            internalCostUsd: internalCost,
            currency: "USD",
            validUntil,
          },
        },
      },
    );
    expect(intake.ok()).toBeTruthy();
    const body = await intake.json() as FreightSummary;
    expect(body.marginIntakeHint?.suggestedMarginUsd).toBe(policyMargin);
    expect(body.offers[0].commercial?.freightiqMarginUsd).toBe(policyMargin);
    expect(body.offers[0].price).toBe(internalCost + policyMargin);
  });

  test("03 — Manual margin override", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as FreightSummary;
    const offerId = summary.offers[0].id;
    const overrideMargin = 400;
    await req.post(`${API_BASE}/api/freightiq/commercial/offers/${offerId}/margin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: { internalCostUsd: internalCost, freightiqMarginUsd: overrideMargin } },
    });
    const after = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as FreightSummary;
    expect(after.offers[0].commercial?.freightiqMarginUsd).toBe(overrideMargin);
  });

  test("04 — Revenue by route visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const insight = await req.get(`${API_BASE}/api/freightiq/commercial/analytics/insight`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { revenueByRoute: Array<{ route: string }> };
    expect(insight.revenueByRoute.length).toBeGreaterThan(0);
  });

  test("05 — Forwarder scorecard visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const score = await req.get(`${API_BASE}/api/freightiq/commercial/analytics/forwarders/scorecard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(score.ok()).toBeTruthy();
    const rows = await score.json() as Array<{ forwarderName: string; offerCount: number }>;
    expect(rows.some((r) => r.offerCount >= 1)).toBeTruthy();
  });

  test("06 — Low margin alert", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as FreightSummary;
    const offerId = summary.offers[0].id;
    await req.post(`${API_BASE}/api/freightiq/commercial/offers/${offerId}/margin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: { internalCostUsd: internalCost, freightiqMarginUsd: 25 } },
    });
    await runControlTowerScan(req, adminToken);
    const alert = await findOpenAlert(req, adminToken, {
      workspaceId: orderId,
      alertKey: FREIGHT_MARGIN_LOW,
    });
    expect(alert).toBeTruthy();
  });

  test("07 — Negative margin alert", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as FreightSummary;
    const offerId = summary.offers[0].id;
    await req.post(`${API_BASE}/api/freightiq/commercial/offers/${offerId}/margin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: { internalCostUsd: internalCost, freightiqMarginUsd: -50 } },
    });
    await runControlTowerScan(req, adminToken);
    const alert = await findOpenAlert(req, adminToken, {
      workspaceId: orderId,
      alertKey: FREIGHT_MARGIN_NEGATIVE,
    });
    expect(alert).toBeTruthy();
  });

  test("08 — Revenue per container calculation", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const insight = await req.get(`${API_BASE}/api/freightiq/commercial/analytics/insight`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { revenuePerContainer: number };
    expect(typeof insight.revenuePerContainer).toBe("number");
    expect(insight.revenuePerContainer).toBeGreaterThanOrEqual(0);
  });

  test("09 — Top route dashboard API", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const insight = await req.get(`${API_BASE}/api/freightiq/commercial/analytics/insight`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { topRoutes: unknown[] };
    expect(Array.isArray(insight.topRoutes)).toBeTruthy();
  });

  test("10 — CSV export", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const csv = await req.get(
      `${API_BASE}/api/freightiq/commercial/analytics/export/revenue-by-route.csv`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(csv.ok()).toBeTruthy();
    const text = await csv.text();
    expect(text).toContain("route");
  });

  test("11 — Role visibility (buyer blocked from analytics)", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const denied = await req.get(`${API_BASE}/api/freightiq/commercial/analytics/insight`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(denied.status()).toBe(403);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as FreightSummary;
    expect(summary.marginIntakeHint).toBeFalsy();
    expect(summary.offers[0].commercial).toBeUndefined();
  });
});
