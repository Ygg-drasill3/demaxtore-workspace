#!/usr/bin/env node
/**
 * Phase 8 — Full pilot role live API / empty-state validation sweep.
 * Read-focused; no business mutations on R4 or pilot fixtures.
 *
 * Usage:
 *   node apps/backend/scripts/phase-8-role-surface-sweep.mjs
 *   OUT=/tmp/phase-8-role-surface-results.json node apps/backend/scripts/phase-8-role-surface-sweep.mjs
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const API = (process.env.API_BASE ?? "http://127.0.0.1:3001").replace(/\/$/, "");
const PW = process.env.E2E_PASSWORD ?? "Passw0rd!";
const OUT = process.env.OUT ?? "/tmp/phase-8-role-surface-results.json";
const PG = "PGPASSWORD='DemaxtoreStrongPass123!' psql -h 127.0.0.1 -U demaxtore_user -d demaxtore -t -A -F'|'";

const R4 = {
  marker: "MVP-UI17-R4-20260814-R2M5",
  shipmentId: "9f1c326a-97ad-4937-a200-09e628251070",
  orderId: "39b6c5d8-11dd-4c45-bb1a-70ae7308b0d4",
  poId: "32ce9003-af7e-438e-aa21-0848c8e338c1",
  productId: "b5748ad0-ba1d-4c7f-9402-3352c41ba606",
  productSku: "FLOUR-UI17R4-R2M5",
  customsCaseId: "8a96c974-700e-40ba-9db0-0b331f7d4583",
  inlandId: "5110057f-904d-4219-95e3-689aa6cf701c",
  landedCostId: "54bd93ab-cdd8-4da7-8dc5-8bea6c08a93c",
  freightReqId: "c3a98b58-53fb-4b3b-a947-f84f560f132e",
  containerId: "26fb47e8-a311-41c4-bb9c-218d1215230b",
};

const ACTORS = {
  buyer: { email: "buyer1@acme.test", role: "BUYER" },
  admin: { email: "admin@demaxtore.local", role: "ADMIN" },
  supplier: { email: "supplier1@acme-mfg.test", role: "SUPPLIER" },
  broker: { email: "broker.smoke@demaxtore.local", role: "CUSTOMS_BROKER" },
  trucker: { email: "trucker.smoke@demaxtore.local", role: "TRUCKER" },
  originAgent: { email: "origin.agent.smoke@demaxtore.local", role: "ORIGIN_AGENT" },
  buyerBeta: { email: "buyer2@beta.test", role: "BUYER" },
};

const SENSITIVE_KEYS = [
  "buyRate", "buyPrice", "margin", "internalMargin", "spread",
  "carrierCost", "procurementCost", "internalNotes", "buy_rate",
  "internal_margin", "carrier_cost",
];

function psql(sql) {
  const out = execSync(`${PG} -c ${JSON.stringify(sql)}`, { encoding: "utf8" }).trim();
  return out ? out.split("\n").filter(Boolean) : [];
}

async function login(email) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PW }),
  });
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${await res.text()}`);
  return (await res.json()).accessToken;
}

async function req(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 300) };
  }
  return { status: res.status, json, text: text.slice(0, 800) };
}

function deepFindKeys(obj, keys, path = "", hits = []) {
  if (!obj || typeof obj !== "object") return hits;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => deepFindKeys(v, keys, `${path}[${i}]`, hits));
    return hits;
  }
  for (const [k, v] of Object.entries(obj)) {
    const full = path ? `${path}.${k}` : k;
    if (keys.some((sk) => k.toLowerCase() === sk.toLowerCase())) hits.push(full);
    deepFindKeys(v, keys, full, hits);
  }
  return hits;
}

function classifyEmpty(json, context) {
  if (json === null || json === undefined) return "MALFORMED_EMPTY";
  if (typeof json !== "object") return "VALID_EMPTY";
  const keys = Object.keys(json);
  if (keys.length === 0) return "MALFORMED_EMPTY";
  for (const [field, expectPopulated] of Object.entries(context.expectArrays ?? {})) {
    const val = json[field];
    if (!Array.isArray(val)) continue;
    if (expectPopulated && val.length === 0) return "SUSPICIOUS_EMPTY";
    if (!expectPopulated && val.length === 0) return "VALID_EMPTY";
  }
  if (context.expectPopulated && keys.every((k) => {
    const v = json[k];
    return v === null || v === undefined || (Array.isArray(v) && v.length === 0);
  })) return "SUSPICIOUS_EMPTY";
  return "VALID_POPULATED";
}

function shapeCheck(json, requiredFields) {
  const missing = requiredFields.filter((f) => !(f in (json ?? {})));
  return missing.length ? { ok: false, missing } : { ok: true };
}

async function probe(results, meta, token, method, path, opts = {}) {
  await new Promise((r) => setTimeout(r, opts.delay ?? 60));
  const res = await req(token, method, path, opts.body);
  const row = {
    ...meta,
    method,
    path,
    status: res.status,
    result: "PASS",
    severity: null,
    emptyClass: null,
    shapeOk: true,
    sensitiveHits: [],
    notes: "",
  };

  if (res.status >= 500) {
    row.result = "FAIL";
    row.severity = "P0";
    row.notes = "unexpected-5xx";
    results.push(row);
    return res;
  }

  if (opts.expectDeny) {
    const denied = [401, 403, 404].includes(res.status);
    row.result = denied ? "PASS" : "FAIL";
    row.severity = denied ? null : "P0";
    row.notes = denied ? "denied-as-expected" : "false-success-200";
    if (!denied && res.status >= 200 && res.status < 300) row.emptyClass = "FALSE_SUCCESS";
    results.push(row);
    return res;
  }

  if (opts.expectStatus !== undefined) {
    if (res.status === opts.expectStatus) {
      row.notes = `status-${res.status}-as-expected`;
      results.push(row);
      return res;
    }
    row.result = "FAIL";
    row.severity = opts.severity ?? "P1";
    row.notes = `expected-${opts.expectStatus}-got-${res.status}`;
    results.push(row);
    return res;
  }

  if (res.status < 200 || res.status >= 300) {
    row.result = "FAIL";
    row.severity = opts.severity ?? "P1";
    row.notes = `unexpected-status-${res.status}`;
    results.push(row);
    return res;
  }

  if (opts.requiredFields?.length) {
    const sc = shapeCheck(res.json, opts.requiredFields);
    row.shapeOk = sc.ok;
    if (!sc.ok) {
      row.result = "FAIL";
      row.severity = opts.severity ?? "P1";
      row.notes = `missing-fields:${sc.missing.join(",")}`;
    }
  }

  if (opts.sensitiveScan !== false && res.json) {
    row.sensitiveHits = deepFindKeys(res.json, SENSITIVE_KEYS);
    if (row.sensitiveHits.length) {
      row.result = "FAIL";
      row.severity = "P0";
      row.notes = `sensitive-leak:${row.sensitiveHits.slice(0, 3).join(",")}`;
    }
  }

  if (opts.emptyContext) {
    row.emptyClass = classifyEmpty(res.json, opts.emptyContext);
    if (row.emptyClass === "SUSPICIOUS_EMPTY" || row.emptyClass === "MALFORMED_EMPTY" || row.emptyClass === "FALSE_SUCCESS") {
      if (row.result === "PASS") {
        row.result = "FAIL";
        row.severity = opts.severity ?? "P1";
        row.notes = row.emptyClass;
      }
    }
  }

  if (opts.customCheck) {
    const verdict = opts.customCheck(res.json, res);
    if (verdict && !verdict.ok) {
      row.result = "FAIL";
      row.severity = verdict.severity ?? "P1";
      row.notes = verdict.note ?? "custom-check-failed";
    }
  }

  results.push(row);
  return res;
}

function discoverResources() {
  const r = {};
  const q = (label, sql) => {
    const rows = psql(sql);
    r[label] = rows[0]?.split("|") ?? [];
  };
  q("supplierRfq", `SELECT w.id FROM workspaces w JOIN workspace_participants wp ON wp.workspace_id=w.id JOIN users u ON u.id=wp.user_id AND u.email='supplier1@acme-mfg.test' WHERE w.type='RFQ' LIMIT 1`);
  q("supplierOrder", `SELECT w.id FROM workspaces w JOIN workspace_participants wp ON wp.workspace_id=w.id JOIN users u ON u.id=wp.user_id AND u.email='supplier1@acme-mfg.test' WHERE w.type='ORDER' LIMIT 1`);
  q("commoditybid", `SELECT w.id FROM workspaces w JOIN workspace_participants wp ON wp.workspace_id=w.id JOIN users u ON u.id=wp.user_id AND u.email='buyer1@acme.test' WHERE w.type='COMMODITYBID' LIMIT 1`);
  q("rfq", `SELECT w.id FROM workspaces w JOIN workspace_participants wp ON wp.workspace_id=w.id JOIN users u ON u.id=wp.user_id AND u.email='buyer1@acme.test' WHERE w.type='RFQ' LIMIT 1`);
  q("betaCase", `SELECT cc.id FROM customs_cases cc WHERE cc.organisation_id='00000000-0000-0000-0000-00000000c003' LIMIT 1`);
  q("originWs", `SELECT pa.workspace_id FROM partner_assignments pa JOIN users u ON u.id=pa.user_id AND u.email='origin.agent.smoke@demaxtore.local' AND pa.partner_role='ORIGIN_AGENT' AND pa.revoked_at IS NULL LIMIT 1`);
  q("dutyTaxCalc", `SELECT dtc.id FROM duty_tax_calculations dtc WHERE dtc.customs_case_id='${R4.customsCaseId}' LIMIT 1`);
  q("containerNum", `SELECT sc.container_number FROM shipment_containers sc WHERE sc.id='${R4.containerId}'`);
  return r;
}

async function healthCheck() {
  const hz = await fetch(`${API}/api/healthz`);
  const rd = await fetch(`${API}/api/ready`);
  return {
    healthz: { status: hz.status, body: await hz.json().catch(() => null) },
    ready: { status: rd.status, body: await rd.json().catch(() => null) },
  };
}

async function main() {
  console.error(`Phase 8 role surface sweep → ${API}`);
  const startedAt = new Date().toISOString();
  const healthBefore = await healthCheck();
  const resources = discoverResources();
  const tokens = {};
  for (const [k, { email }] of Object.entries(ACTORS)) {
    tokens[k] = await login(email);
    await new Promise((r) => setTimeout(r, 100));
  }

  const results = [];

  // ── BUYER — Products ──
  await probe(results, { role: "BUYER", family: "Products", context: "list" }, tokens.buyer, "GET", "/api/products", {
    requiredFields: ["items"],
    emptyContext: { expectArrays: { items: false } },
  });
  await probe(results, { role: "BUYER", family: "Products", context: "detail-r4" }, tokens.buyer, "GET", `/api/products/${R4.productId}`, {
    requiredFields: ["id", "sku", "name"],
    customCheck: (j) => (j?.sku === R4.productSku ? { ok: true } : { ok: false, note: "r4-sku-mismatch", severity: "P1" }),
  });
  await probe(results, { role: "BUYER", family: "Products", context: "search-r4" }, tokens.buyer, "GET", `/api/products?search=${R4.productSku}`, {
    customCheck: (j) => {
      const items = j?.items ?? [];
      return items.some((p) => p.sku === R4.productSku) ? { ok: true } : { ok: false, note: "search-missing-r4-product", severity: "P1" };
    },
  });
  await probe(results, { role: "BUYER", family: "Products", context: "related-po" }, tokens.buyer, "GET", `/api/products/${R4.productId}/purchase-orders`);

  // ── BUYER — PO ──
  await probe(results, { role: "BUYER", family: "PurchaseOrders", context: "list" }, tokens.buyer, "GET", "/api/purchase-orders", {
    requiredFields: ["items"],
  });
  await probe(results, { role: "BUYER", family: "PurchaseOrders", context: "detail-r4" }, tokens.buyer, "GET", `/api/purchase-orders/${R4.poId}`, {
    requiredFields: ["purchaseOrder"],
    customCheck: (j) => (j?.purchaseOrder?.id === R4.poId ? { ok: true } : { ok: false, note: "po-wrapper-missing", severity: "P1" }),
  });
  await probe(results, { role: "BUYER", family: "PurchaseOrders", context: "related-r4" }, tokens.buyer, "GET", `/api/purchase-orders/${R4.poId}/related-entities`);

  // ── BUYER — RFQ / CommodityBid ──
  if (resources.rfq[0]) {
    await probe(results, { role: "BUYER", family: "RFQ", context: "list" }, tokens.buyer, "GET", "/api/rfq");
    await probe(results, { role: "BUYER", family: "RFQ", context: "detail" }, tokens.buyer, "GET", `/api/rfq/${resources.rfq[0]}`);
    await probe(results, { role: "BUYER", family: "RFQ", context: "next-actions" }, tokens.buyer, "GET", `/api/rfq/${resources.rfq[0]}/next-actions`);
  }
  if (resources.commoditybid[0]) {
    await probe(results, { role: "BUYER", family: "CommodityBid", context: "list" }, tokens.buyer, "GET", "/api/commoditybid");
    await probe(results, { role: "BUYER", family: "CommodityBid", context: "detail" }, tokens.buyer, "GET", `/api/commoditybid/${resources.commoditybid[0]}`);
  }

  // ── BUYER — FreightIQ ──
  await probe(results, { role: "BUYER", family: "FreightIQ", context: "order-r4" }, tokens.buyer, "GET", `/api/freightiq/orders/${R4.orderId}`, {
    sensitiveScan: true,
    customCheck: (j) => {
      const s = JSON.stringify(j ?? {}).toLowerCase();
      if (s.includes("buyrate") || s.includes("internalmargin")) return { ok: false, severity: "P0", note: "freightiq-internal-leak" };
      return { ok: true };
    },
  });

  // ── BUYER — Shipment / Booking / Container / Tracking ──
  await probe(results, { role: "BUYER", family: "Shipment", context: "list" }, tokens.buyer, "GET", "/api/portfolio/shipments", {
    requiredFields: ["items"],
  });
  await probe(results, { role: "BUYER", family: "Shipment", context: "detail-r4" }, tokens.buyer, "GET", `/api/shipments/${R4.shipmentId}`, {
    requiredFields: ["id", "state"],
    customCheck: (j) => (j?.state ? { ok: true } : { ok: false, note: "missing-shipment-state", severity: "P1" }),
  });
  await probe(results, { role: "BUYER", family: "Shipment", context: "related-r4" }, tokens.buyer, "GET", `/api/shipments/${R4.shipmentId}/related-entities`);
  await probe(results, { role: "BUYER", family: "Booking", context: "r4-booking-embedded" }, tokens.buyer, "GET", `/api/shipments/${R4.shipmentId}`, {
    customCheck: (j) => {
      if (!j?.bookingRef) return { ok: false, note: "missing-bookingRef-on-confirmed-shipment", severity: "P1" };
      if (j.state !== "BOOKING_CONFIRMED" && !j.bookingRef) return { ok: false, note: "booking-state-mismatch", severity: "P2" };
      return { ok: true };
    },
  });
  await probe(results, { role: "BUYER", family: "Container", context: "r4-containers" }, tokens.buyer, "GET", `/api/shipments/${R4.shipmentId}/containers`, {
    emptyContext: { expectArrays: { items: true }, expectPopulated: true },
    customCheck: (j) => {
      const items = j?.items ?? j ?? [];
      const arr = Array.isArray(items) ? items : items?.items ?? [];
      return arr.length > 0 ? { ok: true } : { ok: false, note: "r4-container-missing", severity: "P1" };
    },
  });
  await probe(results, { role: "BUYER", family: "Tracking", context: "r4-tracking" }, tokens.buyer, "GET", `/api/shipments/${R4.shipmentId}/tracking`);
  await probe(results, { role: "BUYER", family: "Tracking", context: "r4-milestones" }, tokens.buyer, "GET", `/api/shipments/${R4.shipmentId}/milestones`);

  // ── BUYER — Documents ──
  await probe(results, { role: "BUYER", family: "Documents", context: "shipment-docs-r4" }, tokens.buyer, "GET", `/api/shipments/${R4.shipmentId}/documents`);
  await probe(results, { role: "BUYER", family: "Documents", context: "trade-docs-r4" }, tokens.buyer, "GET", `/api/trade-documents/SHIPMENT/${R4.shipmentId}`);
  await probe(results, { role: "BUYER", family: "Documents", context: "doc-center-r4" }, tokens.buyer, "GET", `/api/documents?shipmentId=${R4.shipmentId}`);

  // ── BUYER — Customs / DutyTax / Inland / LandedCost ──
  await probe(results, { role: "BUYER", family: "Customs", context: "list" }, tokens.buyer, "GET", "/api/customs/cases");
  await probe(results, { role: "BUYER", family: "Customs", context: "detail-r4" }, tokens.buyer, "GET", `/api/customs/cases/${R4.customsCaseId}`, {
    requiredFields: ["id", "status"],
    customCheck: (j) => (j?.status === "CLEARED" ? { ok: true } : { ok: false, note: `customs-status-${j?.status}`, severity: "P2" }),
  });
  await probe(results, { role: "BUYER", family: "Customs", context: "readiness-r4" }, tokens.buyer, "GET", `/api/customs/cases/${R4.customsCaseId}/readiness`);
  await probe(results, { role: "BUYER", family: "Customs", context: "events-r4" }, tokens.buyer, "GET", `/api/customs/cases/${R4.customsCaseId}/events`);
  await probe(results, { role: "BUYER", family: "Customs", context: "by-shipment-r4" }, tokens.buyer, "GET", `/api/customs/shipments/${R4.shipmentId}`);
  await probe(results, { role: "BUYER", family: "DutyTax", context: "calc-r4" }, tokens.buyer, "GET", `/api/customs/cases/${R4.customsCaseId}/duty-tax`, {
    customCheck: (j) => {
      if (!j) return { ok: true };
      const s = JSON.stringify(j);
      if (/unsupported.*0|"amount":0.*unsupported/i.test(s)) return { ok: false, note: "zero-for-unsupported", severity: "P1" };
      return { ok: true };
    },
  });
  await probe(results, { role: "BUYER", family: "Inland", context: "detail-r4" }, tokens.buyer, "GET", `/api/inland/${R4.inlandId}`, {
    requiredFields: ["id", "status"],
    customCheck: (j) => (j?.status === "DELIVERED" ? { ok: true } : { ok: false, note: `inland-status-${j?.status}`, severity: "P1" }),
  });
  await probe(results, { role: "BUYER", family: "Inland", context: "by-shipment-r4" }, tokens.buyer, "GET", `/api/inland/by-shipment/${R4.shipmentId}`);
  await probe(results, { role: "BUYER", family: "LandedCost", context: "list" }, tokens.buyer, "GET", "/api/landed-cost");
  await probe(results, { role: "BUYER", family: "LandedCost", context: "detail-r4" }, tokens.buyer, "GET", `/api/landed-cost/${R4.landedCostId}`, {
    sensitiveScan: true,
  });
  await probe(results, { role: "BUYER", family: "LandedCost", context: "by-shipment-r4" }, tokens.buyer, "GET", `/api/landed-cost/by-shipment/${R4.shipmentId}`);

  // ── BUYER — Tasks / Issues / Control Tower ──
  await probe(results, { role: "BUYER", family: "Tasks", context: "order-r4" }, tokens.buyer, "GET", `/api/orders/${R4.orderId}/tasks`);
  await probe(results, { role: "BUYER", family: "Issues", context: "order-r4" }, tokens.buyer, "GET", `/api/orders/${R4.orderId}/issues`);
  await probe(results, { role: "BUYER", family: "Tasks", context: "nonexistent-parent" }, tokens.buyer, "GET", `/api/orders/${crypto.randomUUID()}/tasks`, {
    expectStatus: 404,
    severity: "P2",
  });
  await probe(results, { role: "BUYER", family: "ControlTower", context: "dashboard" }, tokens.buyer, "GET", "/api/control-tower/dashboard");
  await probe(results, { role: "BUYER", family: "ControlTower", context: "ops-denied" }, tokens.buyer, "GET", "/api/control-tower/ops-dashboard", { expectStatus: 403, severity: "P2" });

  // ── ADMIN / OPS ──
  await probe(results, { role: "ADMIN", family: "ControlTower", context: "ops-dashboard" }, tokens.admin, "GET", "/api/control-tower/ops-dashboard");
  await probe(results, { role: "ADMIN", family: "FreightOps", context: "freight-bookings-panel-r4" }, tokens.admin, "GET", `/api/freight-bookings/panel?tradeId=${R4.shipmentId}`);
  await probe(results, { role: "ADMIN", family: "FreightOps", context: "freight-estimates-panel-r4" }, tokens.admin, "GET", `/api/freight-estimates/panel?tradeId=${R4.shipmentId}`);
  await probe(results, { role: "ADMIN", family: "FreightOps", context: "freightiq-ops" }, tokens.admin, "GET", "/api/freightiq/operations/overview");
  await probe(results, { role: "ADMIN", family: "PartnerAssignment", context: "assignments-r4" }, tokens.admin, "GET", `/api/partner/assignments?workspaceId=${R4.shipmentId}`);
  await probe(results, { role: "ADMIN", family: "PartnerAssignment", context: "assignable-broker" }, tokens.admin, "GET", "/api/partner/assignable?role=CUSTOMS_BROKER");
  await probe(results, { role: "ADMIN", family: "PartnerAssignment", context: "assignable-trucker" }, tokens.admin, "GET", "/api/partner/assignable?role=TRUCKER");
  await probe(results, { role: "ADMIN", family: "Customs", context: "cases" }, tokens.admin, "GET", "/api/customs/cases");
  await probe(results, { role: "ADMIN", family: "Customs", context: "r4-case" }, tokens.admin, "GET", `/api/customs/cases/${R4.customsCaseId}`);
  await probe(results, { role: "ADMIN", family: "DutyTaxRules", context: "rules" }, tokens.admin, "GET", "/api/customs/duty-tax/rules");
  await probe(results, { role: "ADMIN", family: "Inland", context: "queue" }, tokens.admin, "GET", "/api/inland");
  await probe(results, { role: "ADMIN", family: "Inland", context: "r4" }, tokens.admin, "GET", `/api/inland/${R4.inlandId}`);
  await probe(results, { role: "ADMIN", family: "Issues", context: "list" }, tokens.admin, "GET", "/api/issues");
  await probe(results, { role: "ADMIN", family: "Tasks", context: "list" }, tokens.admin, "GET", "/api/tasks");
  await probe(results, { role: "ADMIN", family: "RFQ", context: "queue" }, tokens.admin, "GET", "/api/admin/rfq/queue");

  // ── SUPPLIER ──
  await probe(results, { role: "SUPPLIER", family: "RFQ", context: "list" }, tokens.supplier, "GET", "/api/rfq");
  if (resources.supplierRfq[0]) {
    await probe(results, { role: "SUPPLIER", family: "RFQ", context: "detail" }, tokens.supplier, "GET", `/api/rfq/${resources.supplierRfq[0]}`);
    await probe(results, { role: "SUPPLIER", family: "RFQ", context: "quotations" }, tokens.supplier, "GET", `/api/rfq/${resources.supplierRfq[0]}/quotations`);
  }
  if (resources.supplierOrder[0]) {
    await probe(results, { role: "SUPPLIER", family: "Orders", context: "detail" }, tokens.supplier, "GET", `/api/orders/${resources.supplierOrder[0]}`);
    await probe(results, { role: "SUPPLIER", family: "Orders", context: "tasks" }, tokens.supplier, "GET", `/api/orders/${resources.supplierOrder[0]}/tasks`);
  }
  await probe(results, { role: "SUPPLIER", family: "CommodityBid", context: "list" }, tokens.supplier, "GET", "/api/commoditybid");
  await probe(results, { role: "SUPPLIER", family: "PO", context: "list" }, tokens.supplier, "GET", "/api/purchase-orders");

  // ── BROKER ──
  await probe(results, { role: "CUSTOMS_BROKER", family: "PartnerHome", context: "home" }, tokens.broker, "GET", "/api/partner/home", {
    requiredFields: ["partnerRole", "openTasks", "transactions"],
    customCheck: (j) => {
      const cases = j?.customsCases ?? [];
      const hasR4 = cases.some(
        (c) => c.customsCaseId === R4.customsCaseId || c.shipmentWorkspaceId === R4.shipmentId,
      );
      return hasR4 ? { ok: true } : { ok: false, note: "broker-missing-r4-case", severity: "P1" };
    },
  });
  await probe(results, { role: "CUSTOMS_BROKER", family: "CustomsCase", context: "detail-r4" }, tokens.broker, "GET", `/api/customs/cases/${R4.customsCaseId}`, {
    requiredFields: ["id", "status"],
  });
  await probe(results, { role: "CUSTOMS_BROKER", family: "CustomsCase", context: "readiness-r4" }, tokens.broker, "GET", `/api/customs/cases/${R4.customsCaseId}/readiness`);
  await probe(results, { role: "CUSTOMS_BROKER", family: "CustomsCase", context: "duty-tax-r4" }, tokens.broker, "GET", `/api/customs/cases/${R4.customsCaseId}/duty-tax`, { sensitiveScan: true });
  await probe(results, { role: "CUSTOMS_BROKER", family: "PartnerTx", context: "r4-shipment" }, tokens.broker, "GET", `/api/partner/transactions/${R4.shipmentId}`, { sensitiveScan: true });

  // ── TRUCKER ──
  await probe(results, { role: "TRUCKER", family: "PartnerHome", context: "home" }, tokens.trucker, "GET", "/api/partner/home", {
    requiredFields: ["partnerRole", "inlandDeliveries"],
    customCheck: (j) => {
      const deliveries = j?.inlandDeliveries ?? [];
      const hasR4 = deliveries.some((d) => d.id === R4.inlandId || d.inlandDeliveryId === R4.inlandId);
      return hasR4 || deliveries.length > 0 ? { ok: true } : { ok: false, note: "trucker-empty-deliveries", severity: "P1" };
    },
  });
  await probe(results, { role: "TRUCKER", family: "InlandDelivery", context: "partner-tx-r4" }, tokens.trucker, "GET", `/api/partner/transactions/${R4.shipmentId}`, {
    sensitiveScan: true,
    customCheck: (j) => {
      const s = JSON.stringify(j ?? {}).toLowerCase();
      const leaks = ["dutytax", "gtip", "landedcost", "buyrate", "margin", "totalLandedCost"];
      const hit = leaks.find((l) => s.includes(l));
      return hit ? { ok: false, severity: "P0", note: `trucker-leak-${hit}` } : { ok: true };
    },
  });

  // ── ORIGIN AGENT ──
  await probe(results, { role: "ORIGIN_AGENT", family: "PartnerHome", context: "home" }, tokens.originAgent, "GET", "/api/partner/home", {
    requiredFields: ["partnerRole", "transactions"],
  });
  const originWs = resources.originWs[0];
  if (originWs) {
    await probe(results, { role: "ORIGIN_AGENT", family: "PartnerTx", context: "assigned" }, tokens.originAgent, "GET", `/api/partner/transactions/${originWs}`, { sensitiveScan: true });
  }

  // ── Role × Resource denial spot checks ──
  await probe(results, { role: "SUPPLIER", family: "Denial", context: "customs" }, tokens.supplier, "GET", `/api/customs/cases/${R4.customsCaseId}`, { expectDeny: true });
  await probe(results, { role: "SUPPLIER", family: "Denial", context: "landed-cost" }, tokens.supplier, "GET", `/api/landed-cost/${R4.landedCostId}`, { expectDeny: true });
  await probe(results, { role: "SUPPLIER", family: "Denial", context: "products-master" }, tokens.supplier, "GET", `/api/products/${R4.productId}`, { expectDeny: true });
  await probe(results, { role: "CUSTOMS_BROKER", family: "Denial", context: "inland-exec" }, tokens.broker, "GET", `/api/inland/${R4.inlandId}`, { expectDeny: true });
  await probe(results, { role: "CUSTOMS_BROKER", family: "Denial", context: "landed-cost" }, tokens.broker, "GET", `/api/landed-cost/${R4.landedCostId}`, { expectDeny: true });
  await probe(results, { role: "TRUCKER", family: "Denial", context: "customs" }, tokens.trucker, "GET", `/api/customs/cases/${R4.customsCaseId}`, { expectDeny: true });
  await probe(results, { role: "TRUCKER", family: "Denial", context: "duty-tax" }, tokens.trucker, "GET", `/api/customs/cases/${R4.customsCaseId}/duty-tax`, { expectDeny: true });
  await probe(results, { role: "ORIGIN_AGENT", family: "Denial", context: "customs" }, tokens.originAgent, "GET", `/api/customs/cases/${R4.customsCaseId}`, { expectDeny: true });
  await probe(results, { role: "ORIGIN_AGENT", family: "Denial", context: "inland" }, tokens.originAgent, "GET", `/api/inland/${R4.inlandId}`, { expectDeny: true });
  // Existing route ACL includes BUYER in managersAndBroker for rule reads (documented in Phase 8 report).
  await probe(results, { role: "BUYER", family: "Denial", context: "duty-tax-rules-read-allowed-by-acl" }, tokens.buyer, "GET", "/api/customs/duty-tax/rules");
  await probe(results, { role: "BUYER", family: "Denial", context: "duty-tax-rules-mutation-deny" }, tokens.buyer, "POST", "/api/customs/duty-tax/rules", {
    expectDeny: true,
    body: { componentType: "CUSTOMS_DUTY", gtipCode: "0000.00.00", ratePercent: 1 },
  });

  // Broker unassigned / foreign case
  if (resources.betaCase[0]) {
    await probe(results, { role: "CUSTOMS_BROKER", family: "Denial", context: "foreign-case" }, tokens.broker, "GET", `/api/customs/cases/${resources.betaCase[0]}`, { expectDeny: true });
  }

  // ── International protected flow (buyer2 beta) ──
  await probe(results, { role: "BUYER", family: "International", context: "beta-rfq-list", actor: "buyer2@beta.test" }, tokens.buyerBeta, "GET", "/api/rfq");
  await probe(results, { role: "BUYER", family: "International", context: "beta-shipments", actor: "buyer2@beta.test" }, tokens.buyerBeta, "GET", "/api/portfolio/shipments");
  await probe(results, { role: "BUYER", family: "TurkeyGating", context: "beta-customs-empty-or-deny" }, tokens.buyerBeta, "GET", "/api/customs/cases", {
    customCheck: (j) => {
      const items = j?.items ?? j ?? [];
      const arr = Array.isArray(items) ? items : [];
      const turkeyOnly = arr.filter((c) => c?.organisationId === "00000000-0000-0000-0000-00000000c002");
      return turkeyOnly.length === 0 ? { ok: true } : { ok: false, severity: "P0", note: "beta-buyer-sees-acme-customs" };
    },
  });

  const healthAfter = await healthCheck();

  const fails = results.filter((r) => r.result === "FAIL");
  const p0 = fails.filter((r) => r.severity === "P0");
  const p1 = fails.filter((r) => r.severity === "P1");
  const p2 = fails.filter((r) => r.severity === "P2");
  const falseSuccess = results.filter((r) => r.emptyClass === "FALSE_SUCCESS").length;
  const suspiciousEmpty = results.filter((r) => r.emptyClass === "SUSPICIOUS_EMPTY" || r.emptyClass === "MALFORMED_EMPTY").length;
  const unexpected5xx = results.filter((r) => r.status >= 500).length;
  const sensitiveLeaks = results.filter((r) => r.sensitiveHits?.length > 0 || /leak|sensitive/.test(r.notes)).length;

  const summary = {
    phase: "PHASE_8",
    api: API,
    startedAt,
    completedAt: new Date().toISOString(),
    r4: R4,
    resources,
    healthBefore,
    healthAfter,
    totals: {
      probes: results.length,
      pass: results.filter((r) => r.result === "PASS").length,
      fail: fails.length,
      p0Open: p0.length,
      p1Open: p1.length,
      p2Open: p2.length,
      falseSuccess200: falseSuccess,
      suspiciousEmpty,
      unexpected5xx,
      externalMarginLeak: sensitiveLeaks > 0 ? "YES" : "NO",
    },
    fails,
    results,
  };

  writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ totals: summary.totals, healthBefore: healthBefore.healthz.status, healthAfter: healthAfter.healthz.status, out: OUT, fails: fails.map((f) => ({ role: f.role, family: f.family, path: f.path, notes: f.notes })) }, null, 2));
  if (p0.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
