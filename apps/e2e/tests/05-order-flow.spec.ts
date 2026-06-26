// Sprint 3B — RFQ → PO → Order full port-to-port flow (browser only for order leg)
import { test, expect } from "@playwright/test";
import { uiLogin, USERS, apiLogin, newRequest, API_BASE, confirmWorkspaceActionModal, clickWorkspaceAction, setupSubmittedRfqWithStrategy, closeQuotationsAndStartEvaluation } from "./_helpers";

test.describe.serial("Order workspace flow (RFQ spawn + order runtime)", () => {
  // Increase test timeout to 60 s — some actions involve file uploads (inspection report).
  test.setTimeout(60_000);
  let rfqId = "";
  let orderId = "";
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

  test("01 — Buyer RFQ ready for order flow (API + strategy)", async () => {
    const req = await newRequest();
    const ts = Date.now();
    const created = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Order RFQ ${ts}`);
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

  test("03 — Supplier submits quotation via UI", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    await uiLogin(page, USERS.supA1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("supplier-quote-form")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("quote-line-0-unit-price").fill("40");
    await page.getByTestId("quote-lead-time").fill("21");
    await page.getByTestId("quote-payment-terms").fill("Net 30");
    await page.getByTestId("quote-submit").click();
    await expect(page.getByTestId("quote-status-badge")).toHaveText("SUBMITTED", { timeout: 10_000 });
  });

  test("04 — Buyer selects supplier via UI", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId, "enough quotes for order E2E");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("rfq-workspace")).toBeVisible();

    await page.getByTestId("whn-primary-cta-select_supplier").click();
    await expect(page.getByTestId("select-supplier-picker")).toBeVisible();
    await expect(page.locator('[data-testid^="quotation-option-"]').first()).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid^="quotation-option-"]').first().click();
    await page.getByTestId("select-supplier-rationale").fill("Best price for order E2E flow");
    await page.getByTestId("select-supplier-confirm").click();
    await expect(page.getByTestId("select-supplier-picker")).toBeHidden({ timeout: 10_000 });

    const dto = await req.get(`${API_BASE}/api/rfq/${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as { state: string };
    expect(dto.state).toBe("SUPPLIER_SELECTED");
  });

  test("05 — Proforma path + PO issue via UI", async ({ page }) => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
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
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("rfq-workspace")).toBeVisible();
    const cta = page.getByTestId("whn-primary-cta");
    if (await cta.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await cta.click();
      await expect(page.getByTestId("issue-po-picker")).toBeVisible({ timeout: 8_000 });
      await page.getByTestId("issue-po-confirm").click();
      await expect(page.getByTestId("issue-po-picker")).toBeHidden({ timeout: 10_000 });
    } else {
      const issue = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
        headers: { Authorization: `Bearer ${buyerToken}` },
        data: { payload: {} },
      });
      expect(issue.ok()).toBeTruthy();
    }
    const dto = await req.get(`${API_BASE}/api/rfq/${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(dto.state).toBe("PO_ISSUED");
    expect(dto.poNumber).toMatch(/^PO-/);
  });

  test("06 — System spawned ORDER_CREATED workspace", async () => {
    test.skip(!rfqId, "no rfq");
    const req = await newRequest();
    const spawned = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ id: string; state: string }>;
    expect(spawned.length).toBeGreaterThanOrEqual(1);
    expect(spawned[0].state).toBe("ORDER_CREATED");
    orderId = spawned[0].id;
  });

  test("07 — Supplier confirms order", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.supA1);
    await page.goto(`/workspace/order/${orderId}`);
    await expect(page.getByTestId("order-workspace")).toBeVisible();
    const resp = page.waitForResponse((r) => r.url().includes("supplier-confirm-order") && r.status() === 200);
    await clickWorkspaceAction(page, "order-action-supplier_confirm_order");
    await confirmWorkspaceActionModal(page);
    await resp;
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "SUPPLIER_CONFIRMED", { timeout: 15_000 });
  });

  test("08 — Supplier starts production", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.supA1);
    await page.goto(`/workspace/order/${orderId}`);
    const resp = page.waitForResponse((r) => r.url().includes("start-production") && r.status() === 200);
    await clickWorkspaceAction(page, "order-action-start_production");
    await confirmWorkspaceActionModal(page);
    await resp;
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "PRODUCTION_STARTED", { timeout: 20_000 });
  });

  test("09 — Supplier updates production (partial)", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.supA1);
    await page.goto(`/workspace/order/${orderId}`);
    await expect(page.getByTestId("order-action-report_production_progress")).toBeVisible({ timeout: 10_000 });
    const resp = page.waitForResponse((r) => r.url().includes("report-production-progress") && r.status() === 200);
    await clickWorkspaceAction(page, "order-action-report_production_progress");
    await page.getByTestId("field-percentage").fill("50");
    await confirmWorkspaceActionModal(page);
    await resp;
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "PRODUCTION_IN_PROGRESS", { timeout: 20_000 });
  });

  test("10 — Supplier completes production at 100%", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.supA1);
    await page.goto(`/workspace/order/${orderId}`);
    const resp = page.waitForResponse((r) => r.url().includes("report-production-progress") && r.status() === 200);
    await clickWorkspaceAction(page, "order-action-report_production_progress");
    await page.getByTestId("field-percentage").fill("100");
    await confirmWorkspaceActionModal(page);
    await resp;
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "PRODUCTION_COMPLETED", { timeout: 15_000 });
  });

  test("11 — Buyer requests inspection", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/order/${orderId}`);
    await clickWorkspaceAction(page, "order-action-request_inspection");
    await confirmWorkspaceActionModal(page);
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "INSPECTION_REQUESTED", { timeout: 15_000 });
  });

  test("12 — Admin completes inspection", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/order/${orderId}`);
    await clickWorkspaceAction(page, "order-action-record_inspection_result");
    await confirmWorkspaceActionModal(page);
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "INSPECTION_COMPLETED", { timeout: 30_000 });
  });

  test("13 — Buyer requests freight", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/order/${orderId}`);
    await clickWorkspaceAction(page, "order-action-proceed_to_freight");
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "FREIGHT_REQUESTED", { timeout: 15_000 });
  });

  test("14 — Admin books shipment", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/order/${orderId}`);
    await clickWorkspaceAction(page, "order-action-book_shipment");
    await confirmWorkspaceActionModal(page);
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "SHIPMENT_BOOKED", { timeout: 15_000 });
  });

  test("15 — Admin marks departed (flash → IN_TRANSIT)", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/order/${orderId}`);
    await clickWorkspaceAction(page, "order-action-mark_departed");
    await confirmWorkspaceActionModal(page);
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "IN_TRANSIT", { timeout: 15_000 });
  });

  test("16 — Admin updates ETA (flash → IN_TRANSIT)", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/order/${orderId}`);
    await clickWorkspaceAction(page, "order-action-update_eta");
    await confirmWorkspaceActionModal(page);
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "IN_TRANSIT", { timeout: 15_000 });
  });

  test("17 — Admin marks arrived at port", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/order/${orderId}`);
    await clickWorkspaceAction(page, "order-action-mark_arrived");
    await confirmWorkspaceActionModal(page);
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "ARRIVED_PORT", { timeout: 15_000 });
  });

  test("18 — Buyer confirms delivery", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/order/${orderId}`);
    await clickWorkspaceAction(page, "order-action-mark_delivered");
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "DELIVERED", { timeout: 15_000 });
  });

  test("19 — Buyer closes order", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/order/${orderId}`);
    // close_order uses window.confirm() — Playwright auto-dismisses by default so we must accept it.
    page.on("dialog", (d) => void d.accept());
    await clickWorkspaceAction(page, "order-action-close_order");
    await confirmWorkspaceActionModal(page);
    await expect(page.getByTestId("order-state")).toHaveAttribute("data-state", "CLOSED", { timeout: 15_000 });
    const req = await newRequest();
    const tl = await req.get(`${API_BASE}/api/orders/${orderId}/timeline`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ eventType: string }>;
    expect(tl.map((e) => e.eventType)).toContain("order.closed");
  });
});
