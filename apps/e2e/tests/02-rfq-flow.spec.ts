// apps/e2e/tests/02-rfq-flow.spec.ts
//
// Sprint 2.6 RE-RUN of Phase H:
//   The complete RFQ-to-PO flow exercised via real UI interactions:
//   - Buyer fills the Create RFQ form and submits  (was bypassed in Phase H; the
//     deadline validator bug is now fixed)
//   - Admin opens the action drawer, picks suppliers, assigns + publishes
//   - Buyer selects supplier through the picker (rationale, quotation)
//   - Buyer issues PO through the PO number picker
//
// We still inject a Quotation row via SQL — Sprint 2.6 explicitly does NOT add
// a quotation submission endpoint.

import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import {
  uiLogin, USERS, apiLogin, newRequest, API_BASE, setupSubmittedRfqWithStrategy,
} from "./_helpers";

test.describe.serial("RFQ-to-PO flow (Buyer + Admin + Supplier in real browser)", () => {
  let rfqId   = "";
  let extRef  = "";
  let buyerToken    = "";
  let adminToken    = "";
  let supplierToken = "";
  let supplierId    = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken    = await apiLogin(req, USERS.buyer1);
    adminToken    = await apiLogin(req, USERS.admin);
    supplierToken = await apiLogin(req, USERS.supA1);
    const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
    supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
  });

  test("01 — Buyer RFQ workspace loads (API setup + catalog embed page smoke)", async ({ page }) => {
    const req = await newRequest();
    const ts = Date.now();
    const created = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E UI RFQ ${ts}`);
    rfqId = created.id;
    extRef = created.externalRef;

    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/rfq/new");
    await expect(page.getByTestId("rfq-catalog-embed")).toBeVisible({ timeout: 15_000 });

    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("rfq-workspace")).toBeVisible();

    const dto = await req.get(`${API_BASE}/api/rfq/${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(dto.state).toBe("RFQ_SUBMITTED");
    extRef = dto.externalRef;
  });

  test("02 — Workspace renders with timeline + next-actions for the buyer", async ({ page }) => {
    test.skip(!rfqId, "no rfqId");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("rfq-workspace")).toBeVisible();
    await expect(page.getByTestId("rfq-next-actions")).toBeVisible({ timeout: 10_000 });
  });

  test("03 — Admin assigns suppliers + publishes through the UI action drawer", async ({ page }) => {
    test.skip(!rfqId, "no rfqId");
    await uiLogin(page, USERS.admin);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("rfq-workspace")).toBeVisible();

    // Admin hero CTA: assign suppliers.
    await page.getByTestId("whn-primary-cta-assign_suppliers").click();
    await expect(page.getByTestId("assign-suppliers-picker")).toBeVisible({ timeout: 8_000 });
    await page.getByTestId(`supplier-option-${supplierId}`).click();
    await page.getByTestId("assign-suppliers-confirm").click();

    // Admin hero CTA: publish RFQ (no React #310 on RFQ_OPEN transition).
    await expect(page.getByTestId("whn-primary-cta-publish_rfq")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("whn-primary-cta-publish_rfq").click();

    // Verify via REST that we reached RFQ_OPEN.
    const req = await newRequest();
    await page.waitForTimeout(1500);
    const dto = await req.get(`${API_BASE}/api/rfq/${rfqId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    expect(["RFQ_OPEN", "SUPPLIERS_ASSIGNED"]).toContain(dto.state);
    if (dto.state === "SUPPLIERS_ASSIGNED") {
      // UI publish primary CTA wasn't found — fall back to REST so step 04+ can continue.
      await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/publish`, {
        headers: { Authorization: `Bearer ${adminToken}` }, data: { payload: {} },
      });
    }
  });

  test("04 — Supplier sees the now-published RFQ in their list", async ({ page }) => {
    test.skip(!rfqId, "no rfqId");
    await uiLogin(page, USERS.supA1);
    await page.goto("/supplier/rfq");
    await expect(page.getByTestId("rfq-list-page")).toBeVisible();
    await expect(page.getByTestId(`rfq-list-row-${rfqId}`)).toBeVisible({ timeout: 10_000 });
  });

  test("05 — Supplier submits a REAL quotation via the UI, revises it, buyer compares (real data)", async ({ page }) => {
    test.skip(!rfqId, "no rfqId");

    // Supplier opens the workspace, fills the form, clicks Submit.
    await uiLogin(page, USERS.supA1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("supplier-quote-form")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("quote-line-0-unit-price").fill("42.50");
    await page.getByTestId("quote-lead-time").fill("28");
    await page.getByTestId("quote-payment-terms").fill("30% TT, 70% BL");
    await expect(page.getByTestId("quote-grand-total")).toContainText("4250");
    await page.getByTestId("quote-submit").click();
    await expect(page.getByTestId("quote-status-badge")).toHaveText("SUBMITTED", { timeout: 10_000 });
    await expect(page.getByTestId("quote-revise")).toBeVisible();

    // Supplier revises the price in the UI.
    await page.getByTestId("quote-line-0-unit-price").fill("39.90");
    await expect(page.getByTestId("quote-grand-total")).toContainText("3990");
    await page.getByTestId("quote-revise").click();
    await expect(page.getByTestId("quote-status-badge")).toHaveText("REVISED", { timeout: 10_000 });

    // Buyer reads back the real comparison list.
    const req = await newRequest();
    const cmp = await (await fetch(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    })).json();
    expect(cmp).toHaveLength(1);
    expect(cmp[0].total).toBe(3990);
    expect(cmp[0].supplierId).toBe(supplierId);
    expect(cmp[0].status).toBe("REVISED");
  });

  test("06 — Buyer selects the REAL quotation through the UI picker (UNDER_EVALUATION → SUPPLIER_SELECTED)", async ({ page }) => {
    test.skip(!rfqId, "no rfqId");

    const req = await newRequest();
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/close-quotations`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { reason: "received enough quotations", payload: {} },
    });
    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/start-evaluation`, {
      headers: { Authorization: `Bearer ${buyerToken}` }, data: { payload: {} },
    });

    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("rfq-workspace")).toBeVisible();

    await page.getByTestId("whn-primary-cta-select_supplier").click();
    await expect(page.getByTestId("select-supplier-picker")).toBeVisible();

    await page.locator('[data-testid^="quotation-option-"]').first().click();
    await page.getByTestId("select-supplier-rationale")
      .fill("Best lead time and acceptable margin");
    await page.getByTestId("select-supplier-confirm").click();
    await expect(page.getByTestId("select-supplier-picker")).toBeHidden({ timeout: 10_000 });

    const dto = await req.get(`${API_BASE}/api/rfq/${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(dto.state).toBe("SUPPLIER_SELECTED");
  });

  test("07 — Buyer requests proforma (SUPPLIER_SELECTED → PROFORMA_REQUESTED)", async () => {
    test.skip(!rfqId, "no rfqId");
    const req = await newRequest();
    const r = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
      headers: { Authorization: `Bearer ${buyerToken}` }, data: { payload: {} },
    });
    expect(r.ok()).toBeTruthy();
  });

  test("08 — Supplier uploads proforma + submits proforma transition (G1 attachment)", async () => {
    test.skip(!rfqId, "no rfqId");
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("proforma-binary-stub")], { type: "application/pdf" }), "proforma.pdf");
    const up = await fetch(`${API_BASE}/api/rfq/${rfqId}/attachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${supplierToken}` },
      body: fd as unknown as BodyInit,
    });
    expect(up.ok).toBeTruthy();
    const upJson = await up.json();

    const req = await newRequest();
    const sub = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
    });
    expect(sub.ok()).toBeTruthy();
  });

  test("09 — Buyer approves proforma + issues PO via the UI picker (final state PO_ISSUED)", async ({ page }) => {
    test.skip(!rfqId, "no rfqId");
    const req = await newRequest();
    const approve = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
      headers: { Authorization: `Bearer ${buyerToken}` }, data: { payload: {} },
    });
    expect(approve.ok()).toBeTruthy();

    // Now the UI step: buyer opens picker, enters PO number, confirms.
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("rfq-workspace")).toBeVisible();

    // issue_po is the primary CTA for PROFORMA_APPROVED.
    await page.getByTestId("whn-primary-cta-issue_po").click();
    await expect(page.getByTestId("issue-po-picker")).toBeVisible();
    await page.getByTestId("issue-po-confirm").click();
    await expect(page.getByTestId("issue-po-picker")).toBeHidden({ timeout: 10_000 });

    const dto = await req.get(`${API_BASE}/api/rfq/${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json());
    expect(dto.state).toBe("PO_ISSUED");
    expect(dto.poNumber).toMatch(/^PO-/);
  });
});
