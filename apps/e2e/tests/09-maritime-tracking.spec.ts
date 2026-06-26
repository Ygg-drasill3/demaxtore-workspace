// Sprint 4B — Port-to-port maritime tracking
import { test, expect } from "@playwright/test";
import {
  uiLogin, USERS, apiLogin, newRequest, API_BASE,
  setupSubmittedRfqWithStrategy, assignAndPublish, closeQuotationsAndStartEvaluation, findOpenAlert,
} from "./_helpers";

async function bootstrapShipmentId(): Promise<string> {
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
  const rfq = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Track RFQ ${ts}`);
  await assignAndPublish(req, adminToken, rfq.id, [USERS.supA1.email]);
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/quotations`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 10, unitPrice: 5 }] },
  });
  await closeQuotationsAndStartEvaluation(req, buyerToken, rfq.id, "maritime tracking E2E");
  const quotes = await req.get(`${API_BASE}/api/rfq/${rfq.id}/quotations`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  await req.post(`${API_BASE}/api/rfq/${rfq.id}/actions/select-supplier`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "track" } },
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
    headers: { Authorization: `Bearer ${supplierToken}` }, data: { payload: {} },
  });
  await req.post(`${API_BASE}/api/orders/${orderId}/actions/skip-inspection`, {
    headers: { Authorization: `Bearer ${buyerToken}` }, data: { payload: {} },
  });
  const ships = await req.get(`${API_BASE}/api/orders/${orderId}/spawned-shipments`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  return ships[0].id;
}

test.describe.serial("Maritime tracking (Sprint 4B)", () => {
  let shipmentId = "";
  let buyerToken = "";

  test.beforeAll(async () => {
    shipmentId = await bootstrapShipmentId();
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
  });

  test("01 — Link shipment tracking via API", async () => {
    const req = await newRequest();
    const res = await req.post(`${API_BASE}/api/shipments/${shipmentId}/link-tracking`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { containerNumber: "MSKU1234567", bookingNumber: "BK-TRACK-01" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { linked: boolean; latestSnapshot: { vesselName: string | null } | null };
    expect(body.linked).toBe(true);
    expect(body.latestSnapshot?.vesselName).toBeTruthy();
  });

  test("02 — Sync tracking advances snapshot", async () => {
    const req = await newRequest();
    for (let i = 0; i < 3; i++) {
      await req.post(`${API_BASE}/api/shipments/${shipmentId}/sync-tracking`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      });
    }
    const tr = await req.get(`${API_BASE}/api/shipments/${shipmentId}/tracking`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const dto = await tr.json() as { events: Array<{ eventType: string }> };
    expect(dto.events.some((e) => e.eventType === "shipment.eta.updated")).toBeTruthy();
  });

  test("03 — Shipment UI shows vessel info", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/shipment/${shipmentId}`);
    await expect(page.getByTestId("shipment-tracking-section")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("tracking-vessel")).not.toHaveText("—");
    await expect(page.getByTestId("tracking-eta")).toBeVisible();
  });

  test("04 — Delay alert visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const tr = await req.get(`${API_BASE}/api/shipments/${shipmentId}/tracking`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const dto = await tr.json() as { latestSnapshot: { delayFlag: string } | null };
    expect(["MINOR", "MAJOR"]).toContain(dto.latestSnapshot?.delayFlag);

    const delay = await findOpenAlert(req, adminToken, {
      workspaceId: shipmentId,
      alertKey: "tracking_delay_detected",
    });
    expect(delay).toBeTruthy();
  });

  test("05 — Operations shows shipment tracking section", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/operations");
    await expect(page.getByTestId("operations-shipment-tracking")).toBeVisible();
    await expect(page.getByTestId("ops-delayed")).toBeVisible();
  });

  test("06 — Arrival visible after sync to arrived state", async () => {
    const req = await newRequest();
    for (let i = 0; i < 5; i++) {
      await req.post(`${API_BASE}/api/shipments/${shipmentId}/sync-tracking`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
      });
    }
    const tr = await req.get(`${API_BASE}/api/shipments/${shipmentId}/tracking`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const dto = await tr.json() as { latestSnapshot: { trackingStatus: string } | null };
    expect(["ARRIVED_PORT", "COMPLETED"]).toContain(dto.latestSnapshot?.trackingStatus);
  });
});
