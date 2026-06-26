// Sprint 5D — Purchase Order management runtime
import { test, expect } from "@playwright/test";
import {
  uiLogin,
  USERS,
  apiLogin,
  newRequest,
  API_BASE,
  setupSubmittedRfqWithStrategy,
  assignAndPublish,
  closeQuotationsAndStartEvaluation,
  runControlTowerScan,
  findOpenAlert,
} from "./_helpers";

type PoSummary = {
  purchaseOrder: { id: string; orderId: string; poNumber: string; status: string };
  lines: Array<{ id: string; lineTotal: number }>;
  revisions: Array<{ revisionNumber: number; reason: string }>;
  amendments: Array<{ id: string; status: string }>;
};

async function bootstrapIssuedPo(): Promise<{ rfqId: string; orderId: string; poId: string; poNumber: string }> {
  const req = await newRequest();
  const buyerToken = await apiLogin(req, USERS.buyer1);
  const adminToken = await apiLogin(req, USERS.admin);
  const supplierToken = await apiLogin(req, USERS.supA1);

  const { id: rfqId } = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E PO ${Date.now()}`);
  await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);

  await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { currency: "USD", lineItems: [{ position: 1, description: "w", quantity: 10, unitPrice: 42 }] },
  });
  await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId, "enough for PO E2E");
  const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
  const supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
  const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;

  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: { quotationId: quotes[0].id, supplierUserId: supplierId, rationale: "PO E2E" } },
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
  const upJson = await up.json() as { id: string };

  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
    data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });

  const issue = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  expect(issue.ok()).toBeTruthy();
  const rfqDto = await req.get(`${API_BASE}/api/rfq/${rfqId}`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as { poNumber: string };
  const poNumber = rfqDto.poNumber;
  expect(poNumber).toMatch(/^PO-/);

  const spawned = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  const orderId = spawned[0].id;

  const po = await req.get(`${API_BASE}/api/orders/${orderId}/purchase-order`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json()) as PoSummary;

  return { rfqId, orderId, poId: po.purchaseOrder.id, poNumber };
}

test.describe.serial("PO management (Sprint 5D)", () => {
  let orderId = "";
  let poId = "";
  let amendmentId = "";

  test("01 — Issue PO creates linked purchase order", async () => {
    const boot = await bootstrapIssuedPo();
    orderId = boot.orderId;
    poId = boot.poId;
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const po = await req.get(`${API_BASE}/api/purchase-orders/${poId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as PoSummary;
    expect(po.purchaseOrder.status).toBe("ISSUED");
    expect(po.lines.length).toBeGreaterThan(0);
    expect(po.revisions.some((r) => r.revisionNumber === 1)).toBeTruthy();
  });

  test("02 — View PO workspace", async ({ page }) => {
    test.skip(!poId, "no po");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/po/${poId}`);
    await expect(page.getByTestId("po-workspace")).toBeVisible();
    await expect(page.getByTestId("po-status")).toContainText("ISSUED");
    await expect(page.getByTestId("po-linked-order")).toBeVisible();
  });

  test("03 — Supplier acknowledges PO", async ({ page }) => {
    test.skip(!poId, "no po");
    await uiLogin(page, USERS.supA1);
    await page.goto(`/workspace/po/${poId}`);
    const resp = page.waitForResponse(
      (r) => r.url().includes("acknowledge-po") && r.status() === 200,
    );
    await page.getByTestId("po-action-accept").click();
    await resp;
    await expect(page.getByTestId("po-status")).toContainText("ACKNOWLEDGED", { timeout: 15_000 });
  });

  test("04 — Supplier requests amendment", async ({ page }) => {
    test.skip(!poId, "no po");
    page.once("dialog", async (dialog) => {
      await dialog.accept("Quantity adjustment requested (E2E)");
    });
    await uiLogin(page, USERS.supA1);
    await page.goto(`/workspace/po/${poId}`);
    const resp = page.waitForResponse(
      (r) => r.url().includes("request-amendment") && r.status() === 200,
    );
    await page.getByTestId("po-action-request-amendment").click();
    await resp;
    await expect(page.getByTestId("po-status")).toContainText("AMENDMENT_REQUESTED", { timeout: 15_000 });
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    const po = await req.get(`${API_BASE}/api/purchase-orders/${poId}`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    }).then((r) => r.json()) as PoSummary;
    const open = po.amendments.find((a) => a.status === "OPEN");
    expect(open).toBeTruthy();
    amendmentId = open!.id;
  });

  test("05 — Buyer approves amendment", async ({ page }) => {
    test.skip(!poId || !amendmentId, "no amendment");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/po/${poId}`);
    const resp = page.waitForResponse(
      (r) => r.url().includes("approve-amendment") && r.status() === 200,
    );
    await page.getByTestId("po-action-approve-amendment").click();
    await resp;
    await expect(page.getByTestId("po-status")).toContainText("AMENDED", { timeout: 15_000 });
  });

  test("06 — Revision history append-only", async () => {
    test.skip(!poId, "no po");
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const po = await req.get(`${API_BASE}/api/purchase-orders/${poId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as PoSummary;
    expect(po.revisions.length).toBeGreaterThanOrEqual(2);
    const nums = po.revisions.map((r) => r.revisionNumber).sort((a, b) => a - b);
    expect(nums[0]).toBe(1);
    expect(nums[nums.length - 1]).toBeGreaterThanOrEqual(2);
  });

  test("07 — Control Tower alert on PO rejection", async () => {
    const boot = await bootstrapIssuedPo();
    const req = await newRequest();
    const supplierToken = await apiLogin(req, USERS.supA1);
    const adminToken = await apiLogin(req, USERS.admin);
    await req.post(`${API_BASE}/api/purchase-orders/${boot.poId}/actions/acknowledge-po`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: { payload: { status: "REJECTED", notes: "Cannot supply E2E" } },
    });
    await runControlTowerScan(req, adminToken);
    const hit = await findOpenAlert(req, adminToken, {
      workspaceId: boot.orderId,
      alertKey: "po_rejected",
    });
    expect(hit).toBeTruthy();
  });

  test("08 — Role isolation", async () => {
    test.skip(!poId, "no po");
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const res = await req.post(`${API_BASE}/api/purchase-orders/${poId}/actions/acknowledge-po`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: { status: "ACCEPTED" } },
    });
    expect(res.status()).toBe(403);
  });

  test("09 — PO dashboard widget (admin)", async ({ page }) => {
    await uiLogin(page, USERS.admin);
    await page.goto("/operations");
    await expect(page.getByTestId("po-overview-widget")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("po-metric-open")).toBeVisible();
  });

  test("10 — Order workspace PO summary panel", async ({ page }) => {
    test.skip(!orderId, "no order");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/order/${orderId}`);
    await expect(page.getByTestId("order-po-summary")).toBeVisible();
    await expect(page.getByTestId("order-po-workspace-link")).toBeVisible();
  });
});
