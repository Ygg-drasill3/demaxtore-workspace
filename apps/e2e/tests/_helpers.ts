// apps/e2e/tests/_helpers.ts
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { request, type APIRequestContext, type Page } from "@playwright/test";

const _cwd = process.cwd();
const _rawApiBase = process.env.E2E_API_URL || "http://localhost:3001";
/** Origin for API calls — strips a trailing `/api` so `${API_BASE}/api/...` is never doubled. */
export const API_BASE = _rawApiBase.replace(/\/$/, "").replace(/\/api$/, "");
export const FRONTEND_BASE = process.env.E2E_FRONTEND_URL || "http://localhost:3000";
export const REPO_ROOT =
  process.env.E2E_REPO_ROOT ??
  (existsSync(`${_cwd}/apps/backend`) ? _cwd : `${_cwd}/../..`);

/** Read a secret from process.env or apps/backend/.env (server-side E2E only). */
function readBackendEnvVar(key: string): string | undefined {
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;
  const envPath = path.join(REPO_ROOT, "apps/backend/.env");
  if (!existsSync(envPath)) return undefined;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    if (line.startsWith(`${key}=`)) return line.slice(key.length + 1).trim();
  }
  return undefined;
}

/** Shared with backend webServer in playwright.config.ts for payment webhook E2E. */
export const E2E_PAYMENT_WEBHOOK_SECRET =
  readBackendEnvVar("PAYMENT_WEBHOOK_SECRET") ?? "e2e-payment-webhook-secret";

/** Shared with backend E2E_TEST_SECRET — rate-limit bypass for Playwright (header only). */
export const E2E_TEST_SECRET = readBackendEnvVar("E2E_TEST_SECRET") ?? "";

/** Extra headers for API / fetch calls during E2E (never log this value). */
export function e2eHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (E2E_TEST_SECRET.length >= 32) {
    headers["x-e2e-test-secret"] = E2E_TEST_SECRET;
  }
  return headers;
}

export function authHeaders(token: string): Record<string, string> {
  return e2eHeaders({ Authorization: `Bearer ${token}` });
}

/** Confirm workspace FSM action modal when it opens (order/shipment pages). */
export async function confirmWorkspaceActionModal(page: Page): Promise<void> {
  const modal = page.getByTestId("workspace-action-modal");
  if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByTestId("workspace-action-confirm").click();
    await modal.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  }
}

/** Click an order/shipment workspace action (primary CTA or "More actions" drawer). */
export async function clickWorkspaceAction(page: Page, testId: string): Promise<void> {
  await page.getByTestId("order-loading").waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
  await page.getByTestId("shipment-loading").waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});

  const btn = page.getByTestId(testId);
  const directlyVisible = await btn.waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false);

  if (directlyVisible) {
    const backdrop = page.getByTestId("order-action-drawer-backdrop");
    if (await backdrop.isVisible({ timeout: 200 }).catch(() => false)) {
      await page.keyboard.press("Escape");
      await backdrop.waitFor({ state: "detached", timeout: 3_000 }).catch(() => {});
    }
  } else {
    const moreBtn = page.getByTestId("order-more-actions");
    await moreBtn.click({ timeout: 8_000 });
    await btn.waitFor({ state: "visible", timeout: 8_000 });
    await page.waitForTimeout(300);
  }

  await btn.click({ timeout: 15_000 });
}
export const PW = "Passw0rd!";

export interface Creds { email: string; password: string }

export const USERS = {
  admin:   { email: "admin@demaxtore.local",      password: PW },
  buyer1:  { email: "buyer1@acme.test",            password: PW },
  buyer2:  { email: "buyer2@beta.test",            password: PW },
  supA1:   { email: "supplier1@acme-mfg.test",     password: PW },
  supB1:   { email: "supplier1@beta-industries.test", password: PW },
};

/** Login via UI, asserting we land on the role dashboard. */
export async function uiLogin(page: Page, creds: Creds, opts?: { force?: boolean }): Promise<void> {
  if (opts?.force) {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
  await page.goto("/login");
  // Wait for hydrate() to finish — if cookies linger from a previous test the
  // app might bounce away from /login before we can interact.
  await waitForHydrate(page);
  // If hydrate authenticated us already, just leave (unless forcing a new login).
  if (!opts?.force && !page.url().includes("/login")) return;
  if (!page.url().includes("/login")) {
    await page.goto("/login");
    await waitForHydrate(page);
  }
  await page.getByTestId("login-email").fill(creds.email);
  await page.getByTestId("login-password").fill(creds.password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15_000 });
  await waitForHydrate(page);
}

/** Wait for the RequireAuth loading spinner to disappear. */
export async function waitForHydrate(page: Page): Promise<void> {
  // Either the spinner never showed (already hydrated) or it disappears quickly.
  try {
    await page.getByTestId("auth-loading").waitFor({ state: "hidden", timeout: 8_000 });
  } catch { /* spinner may never have rendered */ }
}

/** API helper — direct REST, used for setup/teardown only. */
export async function apiLogin(req: APIRequestContext, creds: Creds): Promise<string> {
  const res = await req.post(`${API_BASE}/api/auth/login`, { data: creds });
  if (!res.ok()) throw new Error(`login failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).accessToken as string;
}

export async function newRequest(): Promise<APIRequestContext> {
  return await request.newContext({ extraHTTPHeaders: e2eHeaders() });
}

/** Create a fresh RFQ as buyer + submit it. Returns workspace DTO. */
export async function setupSubmittedRfq(
  req: APIRequestContext,
  buyerToken: string,
  title = "E2E test RFQ",
  opts?: { productCategory?: string },
): Promise<{ id: string; externalRef: string }> {
  const deadline = new Date(Date.now() + 10 * 86400_000).toISOString();
  const draft = await req.post(`${API_BASE}/api/rfq`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: {
      title,
      productCategory: opts?.productCategory ?? "E2E",
      productDescription: "E2E description ten chars",
      targetMarket: "EU", incoterm: "FOB", currency: "USD", deadlineAt: deadline,
      lineItems: [{ description: "widget", quantity: 100, uom: "PCS" }],
    },
  });
  if (!draft.ok()) throw new Error(`create rfq: ${await draft.text()}`);
  const d = await draft.json();
  const sub = await req.post(`${API_BASE}/api/rfq/${d.id}/actions/submit`, {
    headers: { Authorization: `Bearer ${buyerToken}` }, data: {},
  });
  if (!sub.ok()) throw new Error(`submit rfq: ${await sub.text()}`);
  return { id: d.id, externalRef: d.externalRef };
}

/** Submit RFQ + set Direct RFQ procurement strategy (Sprint 11A gate). */
export async function setupSubmittedRfqWithStrategy(
  req: APIRequestContext,
  buyerToken: string,
  title = "E2E test RFQ",
  opts?: { productCategory?: string },
): Promise<{ id: string; externalRef: string }> {
  const { id, externalRef } = await setupSubmittedRfq(req, buyerToken, title, opts);
  const strat = await req.post(`${API_BASE}/api/rfq/${id}/procurement-strategy`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { procurementMethod: "DIRECT_RFQ" },
  });
  if (!strat.ok()) throw new Error(`procurement strategy: ${await strat.text()}`);
  return { id, externalRef };
}

/** Admin assigns suppliers + publishes. */
export async function assignAndPublish(
  req: APIRequestContext, adminToken: string, rfqId: string, supplierEmails: string[],
): Promise<string[]> {
  const lookup = await req.get(`${API_BASE}/api/admin/rfq/suppliers?limit=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const suppliers = await lookup.json() as Array<{ id: string; email: string }>;
  const ids = supplierEmails.map((em) => suppliers.find((u) => u.email === em)!.id);
  const a = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/assign-suppliers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { payload: { supplierUserIds: ids } },
  });
  if (!a.ok()) throw new Error(`assign: ${await a.text()}`);
  const p = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/publish`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { payload: {} },
  });
  if (!p.ok()) throw new Error(`publish: ${await p.text()}`);
  return ids;
}

/** Close quotations (QUOTATIONS_CLOSED) then start buyer evaluation (UNDER_EVALUATION). */
export async function closeQuotationsAndStartEvaluation(
  req: APIRequestContext,
  buyerToken: string,
  rfqId: string,
  reason = "E2E close quotations",
): Promise<void> {
  const close = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/close-quotations`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { reason, payload: {} },
  });
  if (!close.ok()) throw new Error(`close-quotations: ${close.status()} ${await close.text()}`);
  const evalRes = await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/start-evaluation`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: { payload: {} },
  });
  if (!evalRes.ok()) throw new Error(`start-evaluation: ${evalRes.status()} ${await evalRes.text()}`);
}

export interface OpenAlertRef {
  id: string;
  workspaceId: string;
  alertKey: string;
}

/** Run Control Tower alert-engine scan (admin). */
export async function runControlTowerScan(
  req: APIRequestContext,
  adminToken: string,
): Promise<void> {
  const scan = await req.post(`${API_BASE}/api/control-tower/scan`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!scan.ok()) throw new Error(`CT scan failed: ${scan.status()} ${await scan.text()}`);
}

/** List open alerts with precise workspace + key filters (stable under large alert volumes). */
export async function findOpenAlert(
  req: APIRequestContext,
  adminToken: string,
  filter: { workspaceId: string; alertKey: string },
): Promise<OpenAlertRef | undefined> {
  const params = new URLSearchParams({
    resolved: "false",
    workspaceId: filter.workspaceId,
    alertKey: filter.alertKey,
    limit: "10",
  });
  const res = await req.get(`${API_BASE}/api/control-tower/alerts?${params}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok()) throw new Error(`list alerts: ${res.status()} ${await res.text()}`);
  const body = await res.json() as { items: OpenAlertRef[] };
  return body.items.find(
    (a) => a.workspaceId === filter.workspaceId && a.alertKey === filter.alertKey,
  );
}

/** Run CommodityBid SYSTEM scheduler tick (admin). */
export async function runCommodityBidScheduler(
  req: APIRequestContext,
  adminToken: string,
): Promise<void> {
  const res = await req.post(`${API_BASE}/api/admin/commoditybid/run-scheduler-tick`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok()) throw new Error(`CB scheduler failed: ${res.status()} ${await res.text()}`);
}

/** Poll scheduler until CommodityBid workspace reaches LIVE. */
export async function waitForCommodityBidLive(
  req: APIRequestContext,
  adminToken: string,
  viewerToken: string,
  cbId: string,
  maxAttempts = 40,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await runCommodityBidScheduler(req, adminToken);
    const ws = await req.get(`${API_BASE}/api/commoditybid/${cbId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    }).then((r) => r.json()) as { state: string };
    if (ws.state === "LIVE") return;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`CommodityBid ${cbId} never reached LIVE`);
}

/** Create scheduled auction and wait until LIVE. */
export async function setupLiveCommodityBid(
  req: APIRequestContext,
  buyerToken: string,
  adminToken: string,
  supplierUserIds: string[],
  titlePrefix = "E2E CB",
): Promise<{ cbId: string; lotId: string }> {
  const start = new Date(Date.now() + 3000).toISOString();
  const created = await req.post(`${API_BASE}/api/commoditybid`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
    data: {
      title: `${titlePrefix} ${Date.now()}`,
      description: "Production hardening commodity bid guard regression test description",
      currency: "USD",
      auctionStartsAt: start,
      auctionDurationMinutes: 45,
      invitationDeadlineMinutes: 60,
      supplierUserIds,
      lots: [{ commodity: "Wheat", quantity: 100, uom: "MT" }],
    },
  });
  if (!created.ok()) throw new Error(`create commoditybid: ${await created.text()}`);
  const dto = await created.json() as { id: string; lots: Array<{ id: string }> };
  await waitForCommodityBidLive(req, adminToken, buyerToken, dto.id);
  return { cbId: dto.id, lotId: dto.lots[0].id };
}

export interface AcknowledgedPoBootstrap {
  rfqId: string;
  orderId: string;
  poId: string;
}

/** Issue PO and supplier-acknowledge for amendment API tests. */
export async function bootstrapAcknowledgedPo(
  req: APIRequestContext,
  tokens: { buyer: string; admin: string; supplier: string; supplierId: string },
  title = "E2E PO amend",
): Promise<AcknowledgedPoBootstrap> {
  const { id: rfqId } = await setupSubmittedRfq(req, tokens.buyer, `${title} ${Date.now()}`);
  await assignAndPublish(req, tokens.admin, rfqId, [USERS.supA1.email]);
  await req.post(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
    headers: { Authorization: `Bearer ${tokens.supplier}` },
    data: { currency: "USD", lineItems: [{ position: 1, description: "widget", quantity: 10, unitPrice: 42 }] },
  });
  await closeQuotationsAndStartEvaluation(req, tokens.buyer, rfqId);
  const quotes = await req.get(`${API_BASE}/api/rfq/${rfqId}/quotations`, {
    headers: { Authorization: `Bearer ${tokens.buyer}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/select-supplier`, {
    headers: { Authorization: `Bearer ${tokens.buyer}` },
    data: { payload: { quotationId: quotes[0].id, supplierUserId: tokens.supplierId, rationale: "PO amend E2E" } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/request-proforma`, {
    headers: { Authorization: `Bearer ${tokens.buyer}` },
    data: { payload: {} },
  });
  const fd = new FormData();
  fd.append("file", new Blob([Buffer.from("pi")], { type: "application/pdf" }), "pi.pdf");
  const up = await fetch(`${API_BASE}/api/rfq/${rfqId}/attachments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.supplier}` },
    body: fd as unknown as BodyInit,
  });
  const upJson = await up.json() as { id: string };
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/submit-proforma`, {
    headers: { Authorization: `Bearer ${tokens.supplier}` },
    data: { payload: { proformaFileUrl: `${API_BASE}/api/rfq/${rfqId}/attachments/${upJson.id}` } },
  });
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/approve-proforma`, {
    headers: { Authorization: `Bearer ${tokens.buyer}` },
    data: { payload: {} },
  });
  await req.post(`${API_BASE}/api/rfq/${rfqId}/actions/issue-po`, {
    headers: { Authorization: `Bearer ${tokens.buyer}` },
    data: { payload: {} },
  });
  const orders = await req.get(`${API_BASE}/api/rfq/${rfqId}/spawned-orders`, {
    headers: { Authorization: `Bearer ${tokens.buyer}` },
  }).then((r) => r.json()) as Array<{ id: string }>;
  const orderId = orders[0].id;
  const po = await req.get(`${API_BASE}/api/orders/${orderId}/purchase-order`, {
    headers: { Authorization: `Bearer ${tokens.buyer}` },
  }).then((r) => r.json()) as { purchaseOrder: { id: string } };
  await req.post(`${API_BASE}/api/purchase-orders/${po.purchaseOrder.id}/actions/acknowledge-po`, {
    headers: { Authorization: `Bearer ${tokens.supplier}` },
    data: { payload: { status: "ACCEPTED" } },
  });
  return { rfqId, orderId, poId: po.purchaseOrder.id };
}

/** HMAC headers for a pre-serialized JSON webhook body (must match wire bytes). */
export function signWebhookRawBody(
  raw: string,
  secret: string = E2E_PAYMENT_WEBHOOK_SECRET,
): Record<string, string> {
  const digest = createHmac("sha256", secret).update(raw).digest("hex");
  return {
    "Content-Type": "application/json",
    "X-Demaxtore-Signature": `sha256=${digest}`,
  };
}

/** POST payment webhook with HMAC over exact request body. */
export async function postSignedPaymentWebhook(
  req: APIRequestContext,
  payload: Record<string, unknown>,
  secret: string = E2E_PAYMENT_WEBHOOK_SECRET,
) {
  const raw = JSON.stringify(payload);
  return req.post(`${API_BASE}/api/payments/webhook`, {
    headers: { ...signWebhookRawBody(raw, secret), ...e2eHeaders() },
    data: raw,
  });
}

/** Read persisted access token from browser localStorage (dmx.auth zustand key). */
export async function readAccessToken(page: Page): Promise<string> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("dmx.auth");
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
      return parsed.state?.accessToken ?? "";
    } catch {
      return "";
    }
  });
}

/**
 * Advance an order through production completion → skip inspection → FREIGHT_REQUESTED.
 * Requires production %100 before mark_production_completed (order FSM precondition).
 */
export async function advanceOrderToFreightRequested(
  req: APIRequestContext,
  orderId: string,
  tokens: { supplier: string; buyer: string },
  plannedCompletionDate?: string,
): Promise<void> {
  const future = plannedCompletionDate ?? new Date(Date.now() + 30 * 86400_000).toISOString();
  const steps: Array<{ path: string; token: string; payload: Record<string, unknown> }> = [
    { path: "supplier-confirm-order", token: tokens.supplier, payload: { plannedCompletionDate: future } },
    { path: "start-production", token: tokens.supplier, payload: { plannedCompletionDate: future } },
    {
      path: "mark-production-completed",
      token: tokens.supplier,
      payload: { percentage: 100, label: "Production complete" },
    },
    { path: "skip-inspection", token: tokens.buyer, payload: {} },
  ];
  for (const step of steps) {
    const res = await req.post(`${API_BASE}/api/orders/${orderId}/actions/${step.path}`, {
      headers: e2eHeaders({ Authorization: `Bearer ${step.token}` }),
      data: { payload: step.payload },
    });
    if (!res.ok()) {
      throw new Error(`${step.path} failed: ${res.status()} ${await res.text()}`);
    }
  }
  const order = await req.get(`${API_BASE}/api/orders/${orderId}`, {
    headers: e2eHeaders({ Authorization: `Bearer ${tokens.buyer}` }),
  }).then((r) => r.json()) as { state: string };
  if (order.state !== "FREIGHT_REQUESTED") {
    throw new Error(`expected FREIGHT_REQUESTED, got ${order.state}`);
  }
}
