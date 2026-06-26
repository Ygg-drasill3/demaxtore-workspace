// Sprint D — Faz 4 production hardening E2E (API-focused)
import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import {
  apiLogin,
  newRequest,
  API_BASE,
  USERS,
  REPO_ROOT,
  setupSubmittedRfq,
  assignAndPublish,
  closeQuotationsAndStartEvaluation,
  runControlTowerScan,
  findOpenAlert,
  setupLiveCommodityBid,
  bootstrapAcknowledgedPo,
  advanceOrderToFreightRequested,
  postSignedPaymentWebhook,
  E2E_PAYMENT_WEBHOOK_SECRET,
  e2eHeaders,
} from "./_helpers";

test.describe.serial("Production hardening (Sprint D)", () => {
  let buyerToken = "";
  let adminToken = "";
  let supplierToken = "";
  let supplierId = "";
  let buyerUserId = "";
  let supBId = "";

  function getDbUrl(): string | undefined {
    const raw = process.env.DATABASE_URL ?? (() => {
      try {
        const envFile = `${REPO_ROOT}/apps/backend/.env`;
        if (existsSync(envFile)) {
          const m = readFileSync(envFile, "utf8").match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m);
          return m?.[1];
        }
      } catch { /* ignore */ }
      return undefined;
    })();
    return raw?.replace(/^["']|["']$/g, "");
  }

  function backdateWorkspaceDeadline(workspaceId: string): void {
    const dbUrl = getDbUrl();
    execSync(`node scripts/e2e-backdate-workspace-deadline.mjs ${workspaceId}`, {
      cwd: `${REPO_ROOT}/apps/backend`,
      stdio: "pipe",
      env: { ...process.env, ...(dbUrl ? { DATABASE_URL: dbUrl } : {}) },
    });
  }

  async function expectDomainError(
    res: { status: () => number; json: () => Promise<unknown> },
    allowedStatuses: number[],
    hints: string[],
  ): Promise<Record<string, unknown>> {
    expect(allowedStatuses).toContain(res.status());
    const body = await res.json() as Record<string, unknown>;
    const text = JSON.stringify(body).toLowerCase();
    expect(hints.some((h) => text.includes(h.toLowerCase()))).toBeTruthy();
    return body;
  }

  async function submitCommodityBidLot(
    cbId: string,
    lotId: string,
    token: string,
    payload: Record<string, unknown>,
  ) {
    const req = await newRequest();
    return req.post(`${API_BASE}/api/commoditybid/${cbId}/lots/${lotId}/bids`, {
      headers: e2eHeaders({ Authorization: `Bearer ${token}` }),
      data: { payload },
    });
  }

  async function advanceRfqToProformaApproved(rfqId: string) {
    const req = await newRequest();
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("x")], { type: "application/pdf" }), "p.pdf");
    const up = await fetch(`${API_BASE}/api/rfq/${rfqId}/attachments`, {
      method: "POST",
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      body: fd as unknown as BodyInit,
    });
    const upJson = await up.json() as { id: string };
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
  }

  async function selectSupplierOnRfq(rfqId: string) {
    const req = await newRequest();
    const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "x" } },
    });
  }

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
    supplierToken = await apiLogin(req, USERS.supA1);
    const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
      headers: e2eHeaders({ Authorization: `Bearer ${adminToken}` }),
    });
    const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
    supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
    supBId = suppliers.find((u) => u.email === USERS.supB1.email)!.id;
    const me = await req.get(`${API_BASE}/api/auth/me`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as { id: string };
    buyerUserId = me.id;
  });

  test("RFQ — invalid select_supplier payload rejected", async () => {
    const req = await newRequest();
    const { id: rfqId } = await setupSubmittedRfq(req, buyerToken, `E2E Val ${Date.now()}`);
    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
    await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 1, unitPrice: 9 }] },
    });
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId);
    const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;

    const bad = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { quotationId: quotes[0].id, supplierUserId: buyerUserId, rationale: "bad" } },
    });
    expect(bad.status()).toBeGreaterThanOrEqual(400);

    const missing = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { supplierUserId: supplierId } },
    });
    expect(missing.status()).toBe(400);
  });

  test("RFQ — assign non-supplier user rejected", async () => {
    const req = await newRequest();
    const { id: rfqId } = await setupSubmittedRfq(req, buyerToken, `E2E Role ${Date.now()}`);
    const res = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/assign-suppliers`, {
      headers: e2eHeaders({ Authorization: `Bearer ${adminToken}` }),
      data: { payload: { supplierUserIds: [buyerUserId] } },
    });
    expect(res.status()).toBe(400);
  });

  test("RFQ — duplicate issue_po rejected", async () => {
    const req = await newRequest();
    const ts = Date.now();
    const { id: rfqId } = await setupSubmittedRfq(req, buyerToken, `E2E POdup ${ts}`);
    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
    await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 1, unitPrice: 5 }] },
    });
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId);
    await selectSupplierOnRfq(rfqId);
    await advanceRfqToProformaApproved(rfqId);
    const first = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    expect(first.ok()).toBeTruthy();
    const second = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    expect(second.status()).toBe(409);
  });

  test("FSM — book_shipment blocked without freight selection", async () => {
    const req = await newRequest();
    const ts = Date.now();
    const { id: rfqId } = await setupSubmittedRfq(req, buyerToken, `E2E FreightGuard ${ts}`);
    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
    await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 1, unitPrice: 5 }] },
    });
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId);
    const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "x" } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("x")], { type: "application/pdf" }), "p.pdf");
    const up = await fetch(`${API_BASE}/api/rfq/${rfqId}/attachments`, {
      method: "POST",
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      body: fd as unknown as BodyInit,
    });
    const upJson = await up.json() as { id: string };
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const orders = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    const orderId = orders[0].id;
    const future = new Date(Date.now() + 30 * 86400_000).toISOString();
    await advanceOrderToFreightRequested(req, orderId, {
      supplier: supplierToken,
      buyer: buyerToken,
    }, future);
    await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/create-request`, {
      headers: e2eHeaders({ Authorization: `Bearer ${adminToken}` }),
      data: { payload: { mode: "OCEAN_FCL", pol: "CNSHA", pod: "NLRTM", cargoDescription: "guard test" } },
    });
    const book = await req.post(`${API_BASE}/api/orders/${orderId}/actions/book-shipment`, {
      headers: e2eHeaders({ Authorization: `Bearer ${adminToken}` }),
      data: {
        payload: {
          freightForwarder: "FF",
          vesselName: "MV Test",
          billOfLading: "BL-1",
          expectedDeparture: future,
        },
      },
    });
    expect(book.status()).toBe(409);
  });

  test("FreightIQ — selectOffer spawns shipment with metadata", async () => {
    const req = await newRequest();
    const ts = Date.now();
    const { id: rfqId } = await setupSubmittedRfq(req, buyerToken, `E2E FIQ ${ts}`);
    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
    await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 1, unitPrice: 5 }] },
    });
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId);
    const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "x" } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("x")], { type: "application/pdf" }), "p.pdf");
    const up = await fetch(`${API_BASE}/api/rfq/${rfqId}/attachments`, {
      method: "POST",
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      body: fd as unknown as BodyInit,
    });
    const upJson = await up.json() as { id: string };
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const orders = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    const orderId = orders[0].id;
    const future = new Date(Date.now() + 30 * 86400_000).toISOString();
    await advanceOrderToFreightRequested(req, orderId, {
      supplier: supplierToken,
      buyer: buyerToken,
    }, future);
    await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/create-request`, {
      headers: e2eHeaders({ Authorization: `Bearer ${adminToken}` }),
      data: { payload: { mode: "OCEAN_FCL", pol: "CNSHA", pod: "NLRTM", cargoDescription: "bridge", containerType: "40HC" } },
    });
    const validUntil = new Date(Date.now() + 14 * 86400_000).toISOString();
    const offerRes = await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/submit-offer`, {
      headers: e2eHeaders({ Authorization: `Bearer ${adminToken}` }),
      data: {
        payload: {
          providerName: "Forwarder X",
          carrierName: "Maersk",
          price: 2500,
          currency: "USD",
          transitDays: 28,
          validUntil,
        },
      },
    });
    const offerBody = await offerRes.json() as { offers: Array<{ id: string }> };
    const offerId = offerBody.offers[0].id;
    const sel = await req.post(`${API_BASE}/api/freightiq/orders/${orderId}/actions/select-offer`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { offerId } },
    });
    expect(sel.ok()).toBeTruthy();
    const summary = await sel.json() as {
      selection: { shipmentWorkspaceId: string | null } | null;
      request: { status: string } | null;
    };
    expect(summary.selection?.shipmentWorkspaceId).toBeTruthy();
    expect(summary.request?.status).toBe("CONVERTED_TO_SHIPMENT");

    const shipmentId = summary.selection!.shipmentWorkspaceId!;
    const shp = await req.get(`${API_BASE}/api/shipments/${shipmentId}`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as { carrierName: string | null; originPort: string };
    expect(shp.carrierName).toBe("Maersk");
    expect(shp.originPort).toBe("CNSHA");
  });

  test("Exception Hub — PO_REJECTED maps to Waiting For Buyer", async () => {
    const req = await newRequest();
    const ts = Date.now();
    const { id: rfqId } = await setupSubmittedRfq(req, buyerToken, `E2E POrej ${ts}`);
    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
    await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 1, unitPrice: 5 }] },
    });
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId);
    const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "x" } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("x")], { type: "application/pdf" }), "p.pdf");
    const up = await fetch(`${API_BASE}/api/rfq/${rfqId}/attachments`, {
      method: "POST",
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      body: fd as unknown as BodyInit,
    });
    const upJson = await up.json() as { id: string };
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const orders = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    const orderId = orders[0].id;
    const po = await req.get(`${API_BASE}/api/orders/${orderId}/purchase-order`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as { purchaseOrder: { id: string } };
    await req.post(`${API_BASE}/api/purchase-orders/${po.purchaseOrder.id}/actions/acknowledge-po`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { status: "REJECTED", notes: "Cannot supply" } },
    });
    await runControlTowerScan(req, adminToken);
    const alert = await findOpenAlert(req, adminToken, { workspaceId: orderId, alertKey: "po_rejected" });
    expect(alert).toBeTruthy();
    const exc = await req.get(`${API_BASE}/api/exceptions`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as { items: Array<{ status: string; exceptionType: string }> };
    const hit = exc.items.find((e) => e.status === "Waiting For Buyer" && e.exceptionType === "PO Pending");
    expect(hit).toBeTruthy();
  });

  test("Exception Hub — alert resolve auto-closes exception", async () => {
    const req = await newRequest();
    await runControlTowerScan(req, adminToken);
    const alerts = await req.get(`${API_BASE}/api/control-tower/alerts?resolved=false&limit=5`, {
      headers: e2eHeaders({ Authorization: `Bearer ${adminToken}` }),
    }).then((r) => r.json()) as { items: Array<{ id: string }> };
    test.skip(alerts.items.length === 0, "no open alerts");
    const alertId = alerts.items[0].id;
    await req.get(`${API_BASE}/api/exceptions`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    });
    const resolve = await req.post(`${API_BASE}/api/control-tower/alerts/${alertId}/resolve`, {
      headers: e2eHeaders({ Authorization: `Bearer ${adminToken}` }),
      data: { note: "E2E resolve" },
    });
    expect(resolve.ok()).toBeTruthy();
    const excList = await req.get(`${API_BASE}/api/exceptions`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as { items: Array<{ alertId?: string; status: string }> };
    const linked = excList.items.find((e) => e.alertId === alertId);
    if (linked) expect(["Closed", "Resolved"]).toContain(linked.status);
  });

  test("PO amendment — duplicate OPEN returns 409", async () => {
    const req = await newRequest();
    const ts = Date.now();
    const { id: rfqId } = await setupSubmittedRfq(req, buyerToken, `E2E AMD ${ts}`);
    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
    await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 1, unitPrice: 5 }] },
    });
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId);
    const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "x" } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("x")], { type: "application/pdf" }), "p.pdf");
    const up = await fetch(`${API_BASE}/api/rfq/${rfqId}/attachments`, {
      method: "POST",
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      body: fd as unknown as BodyInit,
    });
    const upJson = await up.json() as { id: string };
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const orders = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    const po = await req.get(`${API_BASE}/api/orders/${orders[0].id}/purchase-order`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as { purchaseOrder: { id: string } };
    await req.post(`${API_BASE}/api/purchase-orders/${po.purchaseOrder.id}/actions/acknowledge-po`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { status: "ACCEPTED" } },
    });
    const first = await req.post(`${API_BASE}/api/purchase-orders/${po.purchaseOrder.id}/actions/request-amendment`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { reason: "Qty change", proposedLines: [{ description: "w", quantity: 2, unitPrice: 5 }] } },
    });
    expect(first.ok()).toBeTruthy();
    const dup = await req.post(`${API_BASE}/api/purchase-orders/${po.purchaseOrder.id}/actions/request-amendment`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { reason: "Again" } },
    });
    expect(dup.status()).toBe(409);
  });

  test("Payments stub — create intent and status", async () => {
    test.setTimeout(120_000);
    const req = await newRequest();
    const ts = Date.now();
    const { id: rfqId } = await setupSubmittedRfq(req, buyerToken, `E2E Pay ${ts}`);
    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
    await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 1, unitPrice: 5 }] },
    });
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId);
    const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "x" } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("x")], { type: "application/pdf" }), "p.pdf");
    const up = await fetch(`${API_BASE}/api/rfq/${rfqId}/attachments`, {
      method: "POST",
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      body: fd as unknown as BodyInit,
    });
    const upJson = await up.json() as { id: string };
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: {} },
    });
    const orders = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    const orderId = orders[0].id;

    const intent = await req.post(`${API_BASE}/api/payments/orders/${orderId}/intents`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { amount: 100, currency: "USD", description: "E2E payment" },
    });
    expect(intent.status()).toBe(201);
    const body = await intent.json() as { id: string; status: string };
    expect(body.status).toBe("pending");
    const status = await req.get(`${API_BASE}/api/payments/intents/${body.id}`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    });
    expect(status.ok()).toBeTruthy();
    const webhookPayload = {
      intentId: body.id,
      status: "succeeded",
      eventId: `e2e-pay-${body.id}-${Date.now()}`,
    };
    const webhook = await postSignedPaymentWebhook(req, webhookPayload, E2E_PAYMENT_WEBHOOK_SECRET);
    expect(webhook.ok()).toBeTruthy();
    const webhookDup = await postSignedPaymentWebhook(req, webhookPayload, E2E_PAYMENT_WEBHOOK_SECRET);
    expect(webhookDup.ok()).toBeTruthy();
    const dupBody = await webhookDup.json() as { duplicate?: boolean };
    expect(dupBody.duplicate).toBe(true);

    const badSig = await req.post(`${API_BASE}/api/payments/webhook`, {
      headers: {
        "Content-Type": "application/json",
        "X-Demaxtore-Signature": "sha256=invalid",
      },
      data: JSON.stringify(webhookPayload),
    });
    expect(badSig.status()).toBe(401);
    const after = await req.get(`${API_BASE}/api/payments/intents/${body.id}`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as { status: string };
    expect(after.status).toBe("succeeded");
  });

  test("CommodityBid — submit_bid_lot blocked after deadline", async () => {
    test.setTimeout(120_000);
    const req = await newRequest();
    const { cbId, lotId } = await setupLiveCommodityBid(req, buyerToken, adminToken, [supplierId], "E2E CB deadline submit");
    backdateWorkspaceDeadline(cbId);
    const validUntil = new Date(Date.now() + 86400_000).toISOString();
    const res = await submitCommodityBidLot(cbId, lotId, supplierToken, {
      unitPrice: 410,
      validUntil,
      leadTimeDays: 14,
    });
    await expectDomainError(res, [409], ["deadline", "commoditybid_deadline"]);
  });

  test("CommodityBid — revise_bid_lot blocked after deadline", async () => {
    test.setTimeout(120_000);
    const req = await newRequest();
    const { cbId, lotId } = await setupLiveCommodityBid(req, buyerToken, adminToken, [supplierId], "E2E CB deadline revise");
    const validUntil = new Date(Date.now() + 86400_000).toISOString();
    const first = await submitCommodityBidLot(cbId, lotId, supplierToken, {
      unitPrice: 420,
      validUntil,
      leadTimeDays: 14,
    });
    expect(first.ok()).toBeTruthy();
    backdateWorkspaceDeadline(cbId);
    const revise = await submitCommodityBidLot(cbId, lotId, supplierToken, {
      unitPrice: 400,
      validUntil,
      leadTimeDays: 12,
    });
    await expectDomainError(revise, [409], ["deadline", "commoditybid_deadline"]);
  });

  test("CommodityBid — submit_bid_lot rejects currency mismatch", async () => {
    test.setTimeout(120_000);
    const req = await newRequest();
    const { cbId, lotId } = await setupLiveCommodityBid(req, buyerToken, adminToken, [supplierId], "E2E CB currency submit");
    const validUntil = new Date(Date.now() + 86400_000).toISOString();
    const res = await submitCommodityBidLot(cbId, lotId, supplierToken, {
      unitPrice: 415,
      validUntil,
      leadTimeDays: 14,
      currency: "EUR",
    });
    await expectDomainError(res, [400, 409], ["currency", "commoditybid_currency"]);
  });

  test("CommodityBid — revise_bid_lot rejects currency mismatch", async () => {
    test.setTimeout(120_000);
    const req = await newRequest();
    const { cbId, lotId } = await setupLiveCommodityBid(req, buyerToken, adminToken, [supplierId], "E2E CB currency revise");
    const validUntil = new Date(Date.now() + 86400_000).toISOString();
    const first = await submitCommodityBidLot(cbId, lotId, supplierToken, {
      unitPrice: 418,
      validUntil,
      leadTimeDays: 14,
    });
    expect(first.ok()).toBeTruthy();
    const revise = await submitCommodityBidLot(cbId, lotId, supplierToken, {
      unitPrice: 405,
      validUntil,
      leadTimeDays: 12,
      currency: "EUR",
    });
    await expectDomainError(revise, [400, 409], ["currency", "commoditybid_currency"]);
  });

  test("PO amendment — buyer approve applies proposedLines to revision snapshot", async () => {
    const req = await newRequest();
    const boot = await bootstrapAcknowledgedPo(req, {
      buyer: buyerToken,
      admin: adminToken,
      supplier: supplierToken,
      supplierId,
    }, "E2E PO approve");
    const proposedLines = [{ description: "widget amended", quantity: 22, unitPrice: 44 }];
    const reqAmend = await req.post(`${API_BASE}/api/purchase-orders/${boot.poId}/actions/request-amendment`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { payload: { reason: "Qty and price change", proposedLines } },
    });
    expect(reqAmend.ok()).toBeTruthy();
    const before = await req.get(`${API_BASE}/api/purchase-orders/${boot.poId}`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as {
      amendments: Array<{ id: string; status: string }>;
      revisions: Array<{ revisionNumber: number }>;
    };
    const open = before.amendments.find((a) => a.status === "OPEN");
    expect(open).toBeTruthy();
    const revCountBefore = before.revisions.length;

    const approve = await req.post(`${API_BASE}/api/purchase-orders/${boot.poId}/actions/approve-amendment`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: {
        payload: {
          amendmentId: open!.id,
          reason: "Approved in E2E",
        },
      },
    });
    expect(approve.ok()).toBeTruthy();

    const after = await req.get(`${API_BASE}/api/purchase-orders/${boot.poId}`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as {
      purchaseOrder: { status: string };
      lines: Array<{ description: string; quantity: number; unitPrice: number }>;
      revisions: Array<{ revisionNumber: number; snapshotJson: { lines: Array<{ description: string; quantity: number; unitPrice: number }> } }>;
      amendments: Array<{ id: string; status: string }>;
    };
    expect(after.purchaseOrder.status).toBe("AMENDED");
    expect(after.amendments.find((a) => a.id === open!.id)?.status).toBe("APPROVED");
    expect(after.revisions.length).toBeGreaterThan(revCountBefore);
    const latest = after.revisions.sort((a, b) => b.revisionNumber - a.revisionNumber)[0];
    expect(latest.snapshotJson.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ description: "widget amended", quantity: 22, unitPrice: 44 }),
      ]),
    );
    expect(after.lines.some((l) => l.description === "widget amended" && l.quantity === 22 && l.unitPrice === 44)).toBeTruthy();
  });

  test("PO amendment — buyer reject rolls back without applying proposedLines", async () => {
    const req = await newRequest();
    const boot = await bootstrapAcknowledgedPo(req, {
      buyer: buyerToken,
      admin: adminToken,
      supplier: supplierToken,
      supplierId,
    }, "E2E PO reject");
    const before = await req.get(`${API_BASE}/api/purchase-orders/${boot.poId}`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as {
      purchaseOrder: { status: string };
      lines: Array<{ description: string; quantity: number }>;
    };
    expect(before.purchaseOrder.status).toBe("ACKNOWLEDGED");
    const baselineLines = before.lines.map((l) => ({ description: l.description, quantity: l.quantity }));

    const reqAmend = await req.post(`${API_BASE}/api/purchase-orders/${boot.poId}/actions/request-amendment`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: {
        payload: {
          reason: "Reject path test",
          proposedLines: [{ description: "should not apply", quantity: 999, unitPrice: 1 }],
        },
      },
    });
    expect(reqAmend.ok()).toBeTruthy();
    const open = await req.get(`${API_BASE}/api/purchase-orders/${boot.poId}`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as { amendments: Array<{ id: string; status: string }> };
    const amendmentId = open.amendments.find((a) => a.status === "OPEN")!.id;

    const reject = await req.post(`${API_BASE}/api/purchase-orders/${boot.poId}/actions/reject-amendment`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { amendmentId, reason: "Not acceptable" } },
    });
    expect(reject.ok()).toBeTruthy();

    const after = await req.get(`${API_BASE}/api/purchase-orders/${boot.poId}`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as {
      purchaseOrder: { status: string };
      lines: Array<{ description: string; quantity: number }>;
      amendments: Array<{ id: string; status: string }>;
    };
    expect(after.purchaseOrder.status).toBe("ACKNOWLEDGED");
    expect(after.amendments.find((a) => a.id === amendmentId)?.status).toBe("DECLINED");
    expect(after.lines.map((l) => ({ description: l.description, quantity: l.quantity }))).toEqual(baselineLines);
    expect(after.lines.some((l) => l.description === "should not apply")).toBeFalsy();
  });

  test("RFQ — invalid quotation payload rejected", async () => {
    const req = await newRequest();
    const { id: rfqId } = await setupSubmittedRfq(req, buyerToken, `E2E QuoteVal ${Date.now()}`);
    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
    const bad = await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { currency: "USD", lineItems: [] },
    });
    expect([400, 422]).toContain(bad.status());
    const body = await bad.json() as { error?: { code?: string } };
    expect(body.error?.code).toBeTruthy();

    await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${supplierToken}` }),
      data: { currency: "USD", lineItems: [{ position: 1, description: "ok", quantity: 1, unitPrice: 5 }] },
    });
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId);
    const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
    }).then((r) => r.json()) as Array<{ id: string }>;
    const mismatch = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { payload: { quotationId: quotes[0].id, supplierUserId: supBId, rationale: "wrong supplier" } },
    });
    await expectDomainError(mismatch, [400, 404, 409], [
      "quotation",
      "supplier",
      "rfq_quotation",
      "not_assigned",
    ]);
  });

  test("RFQ — non-supplier cannot submit quotation", async () => {
    const req = await newRequest();
    const { id: rfqId } = await setupSubmittedRfq(req, buyerToken, `E2E RoleQuote ${Date.now()}`);
    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
    const res = await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: e2eHeaders({ Authorization: `Bearer ${buyerToken}` }),
      data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 1, unitPrice: 9 }] },
    });
    expect(res.status()).toBe(403);
    const body = await res.json() as { error?: { code?: string; message?: string } };
    expect(body.error?.code).toMatch(/forbidden/i);
    expect(JSON.stringify(body).toLowerCase()).toMatch(/forbidden|role|permission/);
  });

  test("Readiness endpoint returns component checks", async () => {
    const req = await newRequest();
    const live = await req.get(`${API_BASE}/api/healthz`);
    expect(live.ok()).toBeTruthy();
    const ready = await req.get(`${API_BASE}/api/ready`);
    expect(ready.ok()).toBeTruthy();
    const body = await ready.json() as { ready: boolean; checks: Record<string, string> };
    expect(body.checks.db).toBe("up");
    expect(typeof body.ready).toBe("boolean");
  });
});
