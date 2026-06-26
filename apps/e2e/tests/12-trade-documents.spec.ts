// Sprint 5C — Trade documentation & compliance
import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import {
  uiLogin, USERS, apiLogin, newRequest, API_BASE,
  bootstrapAcknowledgedPo, runControlTowerScan, findOpenAlert, REPO_ROOT,
} from "./_helpers";

const REPO = REPO_ROOT;
const REQUIRED = ["COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING"] as const;

async function uploadTradeDoc(
  workspaceType: "ORDER" | "SHIPMENT",
  workspaceId: string,
  documentType: string,
  token: string,
) {
  const fd = new FormData();
  fd.append("file", new Blob([Buffer.from("%PDF")], { type: "application/pdf" }), `${documentType}.pdf`);
  fd.append("documentType", documentType);
  const res = await fetch(`${API_BASE}/api/trade-documents/${workspaceType}/${workspaceId}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`upload ${documentType}: ${await res.text()}`);
  return res.json();
}

async function bootstrapShipmentDelivered(): Promise<{ orderId: string; shipmentId: string }> {
  const req = await newRequest();
  const buyerToken = await apiLogin(req, USERS.buyer1);
  const adminToken = await apiLogin(req, USERS.admin);
  const supplierToken = await apiLogin(req, USERS.supA1);
  const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
  const supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
  // Use the robust shared helper which has proper error checking throughout.
  const { orderId } = await bootstrapAcknowledgedPo(req, {
    buyer: buyerToken,
    admin: adminToken,
    supplier: supplierToken,
    supplierId,
  }, `E2E TradeDocs ${Date.now()}`);
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
  await req.post(`${API_BASE}/api/orders/${orderId}/actions/skip-inspection`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  const ships = await req.get(`${API_BASE}/api/orders/${orderId}/spawned-shipments`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  const shipmentId = ships[0].id;
  const h = { headers: { Authorization: `Bearer ${adminToken}` } };
  const steps = [
    "confirm-booking", "confirm-booking", "assign-container", "load-vessel",
    "depart-vessel", "arrive-destination", "start-customs", "complete-customs",
  ];
  for (const step of steps) {
    const body = step === "assign-container"
      ? { payload: { containerNumber: "MSKU9999999" } }
      : step === "load-vessel"
        ? { payload: { vesselName: "MV TradeDocs" } }
        : step === "confirm-booking"
          ? { payload: { carrierName: "Maersk", bookingRef: "BK-TD" } }
          : { payload: {} };
    await req.post(`${API_BASE}/api/shipments/${shipmentId}/actions/${step}`, { ...h, data: body });
  }
  await req.post(`${API_BASE}/api/shipments/${shipmentId}/actions/confirm-delivery`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  const sh = await req.get(`${API_BASE}/api/shipments/${shipmentId}`, h).then((r) => r.json()) as { state: string };
  expect(sh.state).toBe("DELIVERED");
  return { orderId, shipmentId };
}

test.describe.serial("Trade documents (Sprint 5C)", () => {
  let shipmentId = "";
  let docIds: Record<string, string> = {};

  test.beforeAll(async () => {
    const ids = await bootstrapShipmentDelivered();
    shipmentId = ids.shipmentId;
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await uploadTradeDoc("SHIPMENT", shipmentId, "COMMERCIAL_INVOICE", adminToken);
    const summary = await req.get(`${API_BASE}/api/trade-documents/SHIPMENT/${shipmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { compliance: { status: string; requiredCount: number } };
    expect(summary.compliance.requiredCount).toBeGreaterThan(0);
    expect(summary.compliance.status).toBe("NOT_READY");
  });

  test("01 — Upload required documents", async () => {
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    for (const t of REQUIRED) {
      await uploadTradeDoc("SHIPMENT", shipmentId, t, supplierToken);
    }
    const adminToken = await apiLogin(req, USERS.admin);
    const body = await req.get(`${API_BASE}/api/trade-documents/SHIPMENT/${shipmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { documents: Array<{ documentType: string; id: string; status: string }> };
    for (const t of REQUIRED) {
      const d = body.documents.find((x) => x.documentType === t);
      expect(d?.status).toBe("UPLOADED");
      docIds[t] = d!.id;
    }
  });

  test("02 — Approve documents and compliance ready", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    for (const t of REQUIRED) {
      await req.post(`${API_BASE}/api/trade-documents/SHIPMENT/${shipmentId}/actions/approve-document`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { payload: { documentId: docIds[t] } },
      });
    }
    const summary = await req.get(`${API_BASE}/api/trade-documents/SHIPMENT/${shipmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { compliance: { status: string } };
    expect(summary.compliance.status).toBe("READY_FOR_SHIPMENT");
  });

  test("03 — Complete shipment when compliant", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.post(`${API_BASE}/api/shipments/${shipmentId}/actions/complete-shipment`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: {} },
    });
    expect(res.ok()).toBeTruthy();
    const sh = await req.get(`${API_BASE}/api/shipments/${shipmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { state: string };
    expect(sh.state).toBe("COMPLETED");
  });

  test("04 — Shipment completion blocked without compliance", async () => {
    const { shipmentId: sid } = await bootstrapShipmentDelivered();
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await req.post(`${API_BASE}/api/trade-documents/SHIPMENT/${sid}/actions/request-document`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: { documentType: "COMMERCIAL_INVOICE", ownerRole: "SUPPLIER" } },
    });
    const res = await req.post(`${API_BASE}/api/shipments/${sid}/actions/complete-shipment`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: {} },
    });
    expect(res.status()).toBe(409);
  });

  test("05 — Admin override completes shipment", async () => {
    const { shipmentId: sid } = await bootstrapShipmentDelivered();
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await req.post(`${API_BASE}/api/trade-documents/SHIPMENT/${sid}/actions/request-document`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: { documentType: "COMMERCIAL_INVOICE", ownerRole: "SUPPLIER" } },
    });
    const res = await req.post(`${API_BASE}/api/shipments/${sid}/actions/complete-shipment`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: { complianceOverride: true } },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("06 — Reject document and Control Tower alert", async () => {
    const { shipmentId: sid } = await bootstrapShipmentDelivered();
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    const adminToken = await apiLogin(req, USERS.admin);
    await uploadTradeDoc("SHIPMENT", sid, "COMMERCIAL_INVOICE", supplierToken);
    const sum = await req.get(`${API_BASE}/api/trade-documents/SHIPMENT/${sid}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json()) as { documents: Array<{ id: string; documentType: string }> };
    const docId = sum.documents.find((d) => d.documentType === "COMMERCIAL_INVOICE")!.id;
    await req.post(`${API_BASE}/api/trade-documents/SHIPMENT/${sid}/actions/reject-document`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: { documentId: docId, reason: "Illegible scan for E2E" } },
    });
    await runControlTowerScan(req, adminToken);
    const hit = await findOpenAlert(req, adminToken, {
      workspaceId: sid,
      alertKey: "trade_doc_rejected",
    });
    expect(hit).toBeTruthy();
  });

  test("07 — Role isolation", async () => {
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    const res = await req.post(
      `${API_BASE}/api/trade-documents/SHIPMENT/${shipmentId}/actions/approve-document`,
      {
        headers: { Authorization: `Bearer ${supplierToken}` },
        data: { payload: { documentId: docIds.COMMERCIAL_INVOICE ?? "00000000-0000-4000-8000-000000000001" } },
      },
    );
    expect(res.status()).toBe(403);
  });

  test("08 — Documents tab on shipment workspace", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/shipment/${shipmentId}`);
    await page.getByTestId("shipment-loading").waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
    await expect(page.getByTestId("trade-documents-tab")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("trade-docs-compliance")).toBeVisible({ timeout: 5_000 });
  });
});
