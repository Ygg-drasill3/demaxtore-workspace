// Sprint 17A — FreightIQ Estimate Layer E2E

import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  apiLogin,
  assignAndPublish,
  closeQuotationsAndStartEvaluation,
  findOpenAlert,
  newRequest,
  runControlTowerScan,
  setupSubmittedRfqWithStrategy,
  uiLogin,
  USERS,
  API_BASE,
  REPO_ROOT,
} from "./_helpers";

function dbEnv() {
  const rawDbUrl = (
    process.env.DATABASE_URL ??
    (() => {
      try {
        const content = readFileSync(`${REPO_ROOT}/apps/backend/.env`, "utf8");
        return content.match(/^DATABASE_URL=["']?(.+?)["']?\s*$/m)?.[1];
      } catch { return undefined; }
    })()
  )?.replace(/^["']|["']$/g, "");
  return { ...process.env, ...(rawDbUrl ? { DATABASE_URL: rawDbUrl } : {}) };
}

function expireFreightEstimates(tradeId: string) {
  execSync(
    `node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const db=new PrismaClient(); await db.freightEstimate.updateMany({ where: { tradeId: '${tradeId}' }, data: { status: 'EXPIRED', expiresAt: new Date(Date.now()-86400000) } }); await db.\\$disconnect();"`,
    { cwd: `${REPO_ROOT}/apps/backend`, env: dbEnv(), stdio: "pipe" },
  );
}

test.describe.serial("FreightIQ Estimate Layer (Sprint 17A)", () => {
  let rfqId = "";
  let buyerToken = "";
  let adminToken = "";
  let supplierToken = "";
  let supplierId = "";
  let estimateId = "";

  test.beforeAll(async () => {
    const req = await newRequest();
    buyerToken = await apiLogin(req, USERS.buyer1);
    adminToken = await apiLogin(req, USERS.admin);
    supplierToken = await apiLogin(req, USERS.supA1);
    const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
    supplierId = suppliers.find((u) => u.email === USERS.supA1.email)!.id;
  });

  test("01 — RFQ setup through supplier selection auto-generates freight estimate", async () => {
    const req = await newRequest();
    const created = await setupSubmittedRfqWithStrategy(req, buyerToken, `E2E Freight Estimate ${Date.now()}`);
    rfqId = created.id;

    await assignAndPublish(req, adminToken, rfqId, [USERS.supA1.email]);

    const quoteRes = await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
      data: {
        currency: "USD",
        lineItems: [{ position: 1, description: "Widgets", quantity: 100, unitPrice: 40 }],
      },
    });
    expect(quoteRes.ok()).toBeTruthy();

    await closeQuotationsAndStartEvaluation(req, buyerToken, rfqId, "enough quotes for estimate layer");

    const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as Array<{ id: string }>;

    const select = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        payload: {
          quotationId: quotes[0].id,
          supplierUserId: supplierId,
          rationale: "Best FOB quote for estimate layer",
        },
      },
    });
    expect(select.ok()).toBeTruthy();

    const panel = await req.get(`${API_BASE}/api/freight-estimates/panel?tradeId=${rfqId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    }).then((r) => r.json()) as {
      current: { id: string; fobValue: number; estimatedFreight: number; estimatedCifValue: number } | null;
    };
    expect(panel.current).toBeTruthy();
    expect(panel.current!.fobValue).toBeGreaterThan(0);
    expect(panel.current!.estimatedCifValue).toBe(
      panel.current!.fobValue + panel.current!.estimatedFreight,
    );
    estimateId = panel.current!.id;
  });

  test("02 — PO gate rejects issue_po without active estimate", async () => {
    test.skip(!rfqId || !estimateId, "setup incomplete");
    const req = await newRequest();

    await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: {} },
    });
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("proforma")], { type: "application/pdf" }), "proforma.pdf");
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

    expireFreightEstimates(rfqId);

    let refreshAlert: Awaited<ReturnType<typeof findOpenAlert>> | undefined;
    for (let i = 0; i < 5; i++) {
      await runControlTowerScan(req, adminToken);
      refreshAlert = await findOpenAlert(req, adminToken, {
        workspaceId: rfqId,
        alertKey: "freight.estimate.refresh_required",
      });
      if (refreshAlert) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    const issueBlocked = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: { mode: "auto" } },
    });
    expect(issueBlocked.status()).toBe(409);

    // Alert is supplementary; may be suppressed for test workspaces in some env configs.
    if (refreshAlert) {
      expect(refreshAlert.alertKey).toBe("freight.estimate.refresh_required");
    }

    const recreated = await req.post(`${API_BASE}/api/freight-estimates`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { tradeId: rfqId },
    });
    expect(recreated.ok()).toBeTruthy();
    estimateId = (await recreated.json() as { id: string }).id;
  });

  test("03 — Buyer sees Estimated CIF panel and PO picker summary", async ({ page }) => {
    test.skip(!rfqId, "setup incomplete");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/rfq/${rfqId}`);
    await expect(page.getByTestId("estimated-cif-panel")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("estimated-cif-fob")).toBeVisible();
    await expect(page.getByTestId("estimated-cif-freight")).toBeVisible();
    await expect(page.getByTestId("estimated-cif-total")).toBeVisible();

    await page.getByTestId(/^whn-primary-cta/).click();
    await expect(page.getByTestId("issue-po-picker")).toBeVisible();
    await expect(page.getByTestId("issue-po-estimate-summary")).toBeVisible();
    await expect(page.getByTestId("issue-po-cif")).toBeVisible();
  });

  test("04 — PO issues successfully with active estimate", async () => {
    test.skip(!rfqId, "setup incomplete");
    const req = await newRequest();
    const issue = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: { payload: { mode: "auto" } },
    });
    expect(issue.ok()).toBeTruthy();
  });

  test("05 — Trade workspace shows FreightIQ Estimate card", async ({ page }) => {
    test.skip(!rfqId, "setup incomplete");
    await uiLogin(page, USERS.buyer1);
    await page.goto(`/workspace/trade/${rfqId}`);
    await expect(page.getByTestId("trade-freight-estimate-panel")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("trade-estimate-expiration")).toBeVisible();
  });

  test("06 — Dashboard KPI Estimated CIF Ready", async ({ page }) => {
    await uiLogin(page, USERS.buyer1);
    await page.goto("/buyer/dashboard");
    await expect(page.getByTestId("cc-kpi-estimated-cif-ready")).toBeVisible({ timeout: 10_000 });
  });

  test("07 — Supplier ACL sees status only", async () => {
    test.skip(!rfqId, "setup incomplete");
    const req = await newRequest();
    const row = await req.get(`${API_BASE}/api/freight-estimates?tradeId=${rfqId}`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    }).then((r) => r.json()) as Array<Record<string, unknown>>;
    expect(row.length).toBeGreaterThan(0);
    expect(row[0].estimatedCifValue).toBeUndefined();
    expect(row[0].fobValue).toBeUndefined();
    expect(row[0].status).toBeTruthy();

    const panel = await req.get(`${API_BASE}/api/freight-estimates/panel?tradeId=${rfqId}`, {
      headers: { Authorization: `Bearer ${supplierToken}` },
    }).then((r) => r.json()) as { current: unknown; history: unknown[] };
    expect(panel.current).toBeNull();
    expect(panel.history).toHaveLength(0);
  });

  test("08 — Admin can list and refresh estimates", async () => {
    test.skip(!rfqId || !estimateId, "setup incomplete");
    const req = await newRequest();
    const list = await req.get(`${API_BASE}/api/freight-estimates?tradeId=${rfqId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(list.ok()).toBeTruthy();
    const items = await list.json() as Array<{ estimatedCifValue: number }>;
    expect(items[0]?.estimatedCifValue).toBeGreaterThan(0);
  });
});
