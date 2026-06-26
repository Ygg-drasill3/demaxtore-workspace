// Pilot Readiness Fix Pack — FIX-01 Orders list, FIX-02 RFQ→Order bridge, FIX-03 nav cleanup
import { test, expect } from "@playwright/test";
import {
  uiLogin, USERS, apiLogin, newRequest, API_BASE,
  setupSubmittedRfqWithStrategy,
  closeQuotationsAndStartEvaluation,
} from "./_helpers";

const BUYER_NAV = [
  "buyer-dashboard", "buyer-rfq", "buyer-commoditybid",
  "buyer-purchase-orders", "buyer-orders", "buyer-shipments",
  "buyer-messages", "buyer-notifications", "buyer-trade-documents", "buyer-learning",
];
const SUPPLIER_NAV = [
  "supplier-dashboard", "supplier-rfq", "supplier-commoditybid",
  "supplier-purchase-orders", "supplier-orders", "supplier-shipments",
  "supplier-messages", "supplier-notifications", "supplier-trade-documents", "supplier-learning",
];
const ADMIN_NAV = [
  "admin-operations", "admin-freight-ops", "admin-forwarders",
  "admin-dashboard", "admin-rfq", "admin-orders", "admin-notifications",
];

test.describe.serial("Pilot readiness (FIX-01..03)", () => {
  let rfqId = "";
  let orderId = "";
  let shipmentId = "";
  let buyerToken = "";
  let adminToken = "";
  let supplierToken = "";
  let supplierId = "";
  let poNumber = "";

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

  test("01 — Buyer RFQ ready (API + Direct RFQ strategy)", async () => {
    const req = await newRequest();
    const ts = Date.now();
    const created = await setupSubmittedRfqWithStrategy(req, buyerToken, `Pilot RFQ ${ts}`);
    rfqId = created.id;
    expect(rfqId).toBeTruthy();
  });

  test("02 — Admin assigns supplier and publishes", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await page.getByTestId("whn-primary-cta-assign_suppliers").click();
    await page.getByTestId(`supplier-option-${supplierId}`).click();
    await page.getByTestId("assign-suppliers-confirm").click();
    await page.getByTestId("whn-primary-cta-publish_rfq").click();
  });

  test("03 — Supplier submits quotation", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    await uiLogin(page, USERS.supA1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("supplier-quote-form")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("quote-line-0-unit-price").fill("42");
    await page.getByTestId("quote-lead-time").fill("14");
    await page.getByTestId("quote-payment-terms").fill("Net 30");
    await page.getByTestId("quote-submit").click();
    await expect(page.getByTestId("quote-status-badge")).toHaveText("SUBMITTED", { timeout: 10_000 });
  });

  test("04 — Buyer selects supplier and issues PO", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId, "pilot readiness E2E");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await page.getByTestId("whn-primary-cta").click();
    await page.locator('[data-testid^="quotation-option-"]').first().click();
    await page.getByTestId("select-supplier-rationale").fill("Pilot selection");
    await page.getByTestId("select-supplier-confirm").click();
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
    await page.goto(`/workspace/rfq/${rfqId}`);
    const cta = page.getByTestId("whn-primary-cta");
    if (await cta.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await cta.click();
      await page.getByTestId("issue-po-confirm").click();
    } else {
      await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
        data: { payload: {} },
      });
    }
    await expect(page.getByTestId("rfq-state-badge-PO_ISSUED")).toBeVisible({ timeout: 15_000 });
    const rfqDto = await req.get(`${API_BASE}/api/rfq/${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { poNumber: string };
    poNumber = rfqDto.poNumber;
    expect(poNumber).toMatch(/^PO-/);
  });

  test("05 — Spawned orders visible on RFQ workspace", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
    const spawned = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ id: string; externalRef: string; state: string }>;
    expect(spawned.length).toBeGreaterThanOrEqual(1);
    orderId = spawned[0].id;

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("rfq-spawned-orders")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId(`rfq-spawned-order-${orderId}`)).toBeVisible();
  });

  test("06 — Buyer opens Order from RFQ WHN fallback in one click", async ({ page }) => {
    test.skip(!orderId, "no rfq");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await page.getByTestId("whn-fallback-cta").click();
    await page.waitForURL(new RegExp(`/workspace/order/${orderId}`), { timeout: 10_000 });
    await expect(page.getByTestId("order-workspace")).toBeVisible();
  });

  test("07 — Buyer finds Order from Orders menu", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.buyer1);
    await page.getByTestId("nav-buyer-orders").click();
    await expect(page.getByTestId("orders-list-page")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId(`orders-list-row-${orderId}`)).toBeVisible();
    await page.getByTestId(`orders-open-${orderId}`).click();
    await page.waitForURL(new RegExp(`/workspace/order/${orderId}`));
    await expect(page.getByTestId("order-workspace")).toBeVisible();
  });

  test("08 — Orders search and bucket filters work", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/orders");
    await page.getByTestId("orders-list-search").fill(poNumber.slice(0, 12));
    await expect(page.getByTestId(`orders-list-row-${orderId}`)).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("orders-list-search").fill("zzz-nonexistent-order-ref-999");
    await expect(page.getByTestId("orders-list-empty")).toBeVisible({ timeout: 8_000 });
    await page.getByTestId("orders-list-search").fill("");
    await page.getByTestId("orders-list-bucket-filter").selectOption("active");
    await expect(page.getByTestId(`orders-list-row-${orderId}`)).toBeVisible();
    await page.getByTestId("orders-list-bucket-filter").selectOption("completed");
    await expect(page.getByTestId(`orders-list-row-${orderId}`)).not.toBeVisible({ timeout: 8_000 });
  });

  test("09 — Supplier confirms order; buyer opens shipment from order", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.supA1);
    await page.goto(`/workspace/order/${orderId}`);
    const resp = page.waitForResponse((r) => r.url().includes("supplier-confirm-order") && r.status() === 200);
    await page.getByTestId("order-action-supplier_confirm_order").click();
    await resp;

    const req = await newRequest();
    await req.post(`${API_BASE}/api/orders/${orderId}/actions/start-production`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { payload: { plannedCompletionDate: new Date(Date.now() + 30 * 86400_000).toISOString() } },
    });
    await req.post(`${API_BASE}/api/orders/${orderId}/actions/report-production-progress`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { payload: { label: "Pilot milestone", percentage: 50 } },
    });
    await req.post(`${API_BASE}/api/orders/${orderId}/actions/report-production-progress`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { payload: { label: "Production complete", percentage: 100 } },
    });
    const skip = await req.post(`${API_BASE}/api/orders/${orderId}/actions/skip-inspection`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: {} },
    });
    expect(skip.ok()).toBeTruthy();
    const week = new Date(Date.now() + 7 * 86400_000).toISOString();
    const book = await req.post(`${API_BASE}/api/orders/${orderId}/actions/book-shipment`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        payload: {
          freightForwarder: "Pilot FF",
          vesselName: "MV Pilot",
          billOfLading: "BL-PILOT",
          expectedDeparture: week,
        },
      },
    });
    expect(book.ok()).toBeTruthy();
    const spawned = await req.get(`${API_BASE}/api/orders/${orderId}/spawned-shipments`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ id: string }>;
    expect(spawned.length).toBeGreaterThanOrEqual(1);
    shipmentId = spawned[0].id;

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/order/${orderId}`);
    await page.getByTestId(`order-shipment-link-${shipmentId}`).click();
    await page.waitForURL(new RegExp(`/workspace/shipment/${shipmentId}`));
    await expect(page.getByTestId("shipment-workspace")).toBeVisible({ timeout: 10_000 });
  });

  test("10 — Primary navigation has no placeholder dead ends (buyer)", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    for (const testId of BUYER_NAV) {
      await page.getByTestId(`nav-${testId}`).click();
      await expect(page.getByTestId("placeholder-page")).toHaveCount(0);
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("11 — Primary navigation has no placeholder dead ends (supplier)", async ({ page }) => {
    await uiLogin(page, USERS.supA1);
    for (const testId of SUPPLIER_NAV) {
      await page.getByTestId(`nav-${testId}`).click();
      await expect(page.getByTestId("placeholder-page")).toHaveCount(0);
    }
  });

  test("12 — Primary navigation has no placeholder dead ends (admin)", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    for (const testId of ADMIN_NAV) {
      await page.getByTestId(`nav-${testId}`).click();
      await expect(page.getByTestId("placeholder-page")).toHaveCount(0);
    }
  });

  test("13 — Role isolation: buyer2 does not see buyer1 order in list", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.buyer2);
    await page.goto("/buyer/orders");
    await expect(page.getByTestId("orders-list-page")).toBeVisible();
    await expect(page.getByTestId(`orders-list-row-${orderId}`)).toHaveCount(0);
  });
});
