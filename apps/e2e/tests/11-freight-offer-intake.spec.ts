// Sprint 5B — Freight offer intake & forwarder communications
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
  const rfq = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Freight 5B ${ts}`);
  await assignAndPublish(req, adminToken, rfq.id, [USERS.supA1.email]);
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/quotations`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 10, unitPrice: 8 }] },
  });
  await closeQuotationsAndStartEvaluation(req, buyerToken, rfq.id, "freight offer intake E2E");
  const quotes = await req.get(`${API_BASE}/api/rfq/${rfq.id}/quotations`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/select-supplier`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "5b" } },
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

test.describe.serial("Freight offer intake (Sprint 5B)", () => {
  let orderId = "";
  let forwarderA = "";
  let forwarderB = "";
  let offerLow = "";

  test.beforeAll(async () => {
    orderId = await bootstrapOrderProductionComplete();
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/create-request`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          mode: "OCEAN_FCL",
          pol: "CNSHA",
          pod: "NLRTM",
          cargoDescription: "5B intake cargo",
          containerType: "40HC",
        },
      },
    });
    const fa = await req.post(`${API_BASE}/api/freightiq/forwarders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        companyName: `Fwd A ${Date.now()}`,
        contactName: "Alice",
        email: `fwd-a-${Date.now()}@forwarder.test`,
        country: "NL",
      },
    });
    forwarderA = (await fa.json() as { id: string }).id;
    const fb = await req.post(`${API_BASE}/api/freightiq/forwarders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        companyName: `Fwd B ${Date.now()}`,
        contactName: "Bob",
        email: `fwd-b-${Date.now()}@forwarder.test`,
        country: "DE",
      },
    });
    forwarderB = (await fb.json() as { id: string }).id;
  });

  test("01 — Create forwarder", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const list = await req.get(`${API_BASE}/api/freightiq/forwarders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { items: Array<{ id: string }> };
    expect(list.items.some((f) => f.id === forwarderA)).toBeTruthy();
  });

  test("02 — Send freight request communications", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.post(
      `${API_BASE}/api/freightiq/orders/${orderId}/communications/send-communications`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          payload: {
            forwarderContactIds: [forwarderA, forwarderB],
            channel: "EMAIL",
            requestedReplyDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
          },
        },
      },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { communications: Array<{ status: string }> };
    expect(body.communications?.length).toBeGreaterThanOrEqual(2);
    expect(body.communications?.every((c) => c.status === "SENT")).toBeTruthy();
  });

  test("03 — Manual offer intake", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const validUntil = new Date(Date.now() + 21 * 86400_000).toISOString();
    const etd = new Date(Date.now() + 14 * 86400_000).toISOString();
    const eta = new Date(Date.now() + 40 * 86400_000).toISOString();
    const cutOff = new Date(Date.now() + 10 * 86400_000).toISOString();
    const intake = await req.post(
      `${API_BASE}/api/freightiq/orders/${orderId}/communications/intake-offer`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          payload: {
            forwarderContactId: forwarderA,
            offerSource: "FORWARDER_EMAIL",
            carrierName: "Maersk",
            vesselName: "MAERSK TEST",
            etd,
            eta,
            transitDays: 26,
            cutOff,
            oceanFreight: 1950,
            currency: "USD",
            validUntil,
          },
        },
      },
    );
    expect(intake.ok()).toBeTruthy();
    const low = await req.post(
      `${API_BASE}/api/freightiq/orders/${orderId}/communications/intake-offer`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          payload: {
            forwarderContactId: forwarderB,
            offerSource: "MANUAL_ENTRY",
            carrierName: "MSC",
            vesselName: "MSC TEST",
            etd,
            eta: new Date(Date.now() + 38 * 86400_000).toISOString(),
            transitDays: 24,
            cutOff,
            oceanFreight: 1800,
            currency: "USD",
            validUntil,
          },
        },
      },
    );
    const lowBody = await low.json() as { offers: Array<{ id: string; price: number }> };
    offerLow = lowBody.offers.find((o) => o.price === 1800)!.id;
  });

  test("04 — Compare multiple offers", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const summary = await req.get(`${API_BASE}/api/freightiq/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as {
      offers: Array<{ vesselName: string | null }>;
      comparisonHints: { lowestPriceOfferId: string };
    };
    expect(summary.offers.length).toBeGreaterThanOrEqual(2);
    expect(summary.offers[0].vesselName).toBeTruthy();
    expect(summary.comparisonHints.lowestPriceOfferId).toBe(offerLow);
  });

  test("05 — Select offer", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const sel = await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/select-offer`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: { offerId: offerLow } },
    });
    expect(sel.ok()).toBeTruthy();
  });

  test("06 — Control Tower alert for no communication 24h", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const orphan = await bootstrapOrderProductionComplete();
    await req.post(`${API_BASE}/api/freightiq/orders/${orphan}/actions/create-request`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          mode: "OCEAN_FCL",
          pol: "SGSIN",
          pod: "USLAX",
          cargoDescription: "Stale comms",
          containerType: "20GP",
        },
      },
    });
    execSync(`node scripts/e2e-age-freight-request.mjs ${orphan} 30`, {
      cwd: `${REPO}/apps/backend`,
      stdio: "inherit",
    });
    await runControlTowerScan(req, adminToken);
    const hit = await findOpenAlert(req, adminToken, {
      workspaceId: orphan,
      alertKey: "freight_no_communication_24h",
    });
    expect(hit).toBeTruthy();
  });

  test("07 — Role isolation", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const fwd = await req.post(`${API_BASE}/api/freightiq/forwarders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { companyName: "X", contactName: "Y", email: "x@test.com" },
    });
    expect(fwd.status()).toBe(403);
  });

  test("08 — Forwarders UI page", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/operations/forwarders");
    await expect(page.getByTestId("forwarders-page")).toBeVisible({ timeout: 10_000 });
  });
});
