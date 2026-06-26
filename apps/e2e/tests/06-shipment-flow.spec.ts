// Sprint 3C — RFQ → Order → Shipment workspace runtime
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE, setupSubmittedRfqWithStrategy, assignAndPublish, closeQuotationsAndStartEvaluation, confirmWorkspaceActionModal } from "./_helpers";
import type { Page } from "@playwright/test";

async function runShipmentAction(page: Page, action: string): Promise<void> {
  // Wait for shipment data to load before checking available actions.
  await page.getByTestId("shipment-loading").waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});

  const primary = page.getByTestId("whn-primary-cta");
  // Primary CTAs appear directly once loaded; give up to 5 s for the render cycle.
  const primaryVisible = await primary.waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false);
  if (primaryVisible) {
    await primary.click();
    await confirmWorkspaceActionModal(page);
    return;
  }
  // Not a primary action — open the drawer.
  await page.getByTestId("shipment-more-actions").click({ timeout: 8_000 });
  await page.getByTestId(`shipment-drawer-action-${action}`).waitFor({ state: "visible", timeout: 8_000 });
  await page.waitForTimeout(300);
  await page.getByTestId(`shipment-drawer-action-${action}`).click();
  await confirmWorkspaceActionModal(page);
}

test.describe.serial("Shipment workspace flow", () => {
  let rfqId = "";
  let orderId = "";
  let shipmentId = "";
  let buyerToken = "";
  let adminToken = "";
  let supplierToken = "";
  let supplierId = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
    supplierToken = await apiLogin(req, USERS.supA1);
    const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const suppliers = (await lookup.json()) as Array<{ id: string; email: string }>;
    supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
  });

  async function bootstrapOrderToFreight() {
    const req = await newRequest();
    const ts = Date.now();
    const rfq = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Shipment RFQ ${ts}`);
    rfqId = rfq.id;
    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);
    const quoteRes = await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: {
        currency: "USD",
        lineItems: [{ position: 1, description: "widget", quantity: 100, unitPrice: 40 }],
        leadTimeDays: 21,
        paymentTerms: "Net 30",
      },
    });
    if (!quoteRes.ok()) throw new Error(`submit quote: ${await quoteRes.text()}`);
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId, "shipment flow E2E");
    const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ id: string }>;
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "E2E shipment" } },
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
    const upJson = await up.json();
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
    orderId = spawned[0].id;
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
  }

  test("01 — Bootstrap order to FREIGHT_REQUESTED and spawn shipment", async () => {
    await bootstrapOrderToFreight();
    const req = await newRequest();
    const order = await req.get(`${API_BASE}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { state: string };
    expect(order.state).toBe("FREIGHT_REQUESTED");
    const ships = await req.get(`${API_BASE}/api/orders/${orderId}/spawned-shipments`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ id: string; state: string }>;
    expect(ships.length).toBeGreaterThanOrEqual(1);
    expect(ships[0].state).toBe("SHIPMENT_CREATED");
    shipmentId = ships[0].id;
    const tl = await req.get(`${API_BASE}/api/shipments/${shipmentId}/timeline`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ eventType: string }>;
    expect(tl.map((e) => e.eventType)).toContain("shipment.created");
  });

  test("02 — Booking confirmed (two-step)", async ({ page }) => {
    test.skip(!shipmentId, "no shipment");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/shipment/${shipmentId}`);
    await runShipmentAction(page, "confirm_booking");
    await expect(page.getByTestId("shipment-state")).toHaveAttribute("data-state", "BOOKING_PENDING", { timeout: 15_000 });
    await runShipmentAction(page, "confirm_booking");
    await expect(page.getByTestId("shipment-state")).toHaveAttribute("data-state", "BOOKING_CONFIRMED", { timeout: 15_000 });
  });

  test("03 — Container assigned", async ({ page }) => {
    test.skip(!shipmentId, "no shipment");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/shipment/${shipmentId}`);
    await runShipmentAction(page, "assign_container");
    await expect(page.getByTestId("shipment-state")).toHaveAttribute("data-state", "CONTAINER_ASSIGNED", { timeout: 15_000 });
  });

  test("04 — Loaded on vessel", async ({ page }) => {
    test.skip(!shipmentId, "no shipment");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/shipment/${shipmentId}`);
    await runShipmentAction(page, "load_vessel");
    await expect(page.getByTestId("shipment-state")).toHaveAttribute("data-state", "LOADED_ON_VESSEL", { timeout: 15_000 });
  });

  test("05 — In transit", async ({ page }) => {
    test.skip(!shipmentId, "no shipment");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/shipment/${shipmentId}`);
    await runShipmentAction(page, "depart_vessel");
    await expect(page.getByTestId("shipment-state")).toHaveAttribute("data-state", "IN_TRANSIT", { timeout: 15_000 });
  });

  test("06 — Arrived destination", async ({ page }) => {
    test.skip(!shipmentId, "no shipment");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/shipment/${shipmentId}`);
    await runShipmentAction(page, "arrive_destination");
    await expect(page.getByTestId("shipment-state")).toHaveAttribute("data-state", "ARRIVED_DESTINATION_PORT", { timeout: 15_000 });
  });

  test("07 — Customs clearance", async ({ page }) => {
    test.skip(!shipmentId, "no shipment");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/shipment/${shipmentId}`);
    await runShipmentAction(page, "start_customs");
    await expect(page.getByTestId("shipment-state")).toHaveAttribute("data-state", "CUSTOMS_CLEARANCE", { timeout: 15_000 });
    await runShipmentAction(page, "complete_customs");
    await expect(page.getByTestId("shipment-state")).toHaveAttribute("data-state", "READY_FOR_DELIVERY", { timeout: 15_000 });
  });

  test("08 — Delivered and completed", async ({ page }) => {
    test.skip(!shipmentId, "no shipment");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/shipment/${shipmentId}`);
    await runShipmentAction(page, "confirm_delivery");
    await expect(page.getByTestId("shipment-state")).toHaveAttribute("data-state", "DELIVERED", { timeout: 15_000 });
    const req = await newRequest();
    const complete = await req.post(`${API_BASE}/api/shipments/${shipmentId}/actions/complete-shipment`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { payload: { complianceOverride: true } },
    });
    expect(complete.ok()).toBeTruthy();
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/shipment/${shipmentId}`);
    await expect(page.getByTestId("shipment-state")).toHaveAttribute("data-state", "COMPLETED", { timeout: 15_000 });
  });

  test("09 — Timeline and audit verification", async () => {
    test.skip(!shipmentId, "no shipment");
    const req = await newRequest();
    const tl = await req.get(`${API_BASE}/api/shipments/${shipmentId}/timeline`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ eventType: string }>;
    const types = tl.map((e) => e.eventType);
    expect(types).toContain("shipment.booking.confirmed");
    expect(types).toContain("shipment.loaded_on_vessel");
    expect(types).toContain("shipment.completed");
    const orderTl = await req.get(`${API_BASE}/api/orders/${orderId}/timeline`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ eventType: string }>;
    expect(orderTl.map((e) => e.eventType)).toContain("shipment.spawned");
  });
});
