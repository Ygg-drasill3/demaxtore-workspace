#!/usr/bin/env node
/**
 * Phase 12 — live cross-tenant / IDOR validation sweep.
 * Usage: node apps/backend/scripts/phase-12-idor-sweep.mjs
 * Output: JSON lines to stdout + summary; set OUT=/path for full JSON file.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const API = (process.env.API_BASE ?? "http://127.0.0.1:3001").replace(/\/$/, "");
const PW = process.env.E2E_PASSWORD ?? "Passw0rd!";
const PG = "PGPASSWORD='DemaxtoreStrongPass123!' psql -h 127.0.0.1 -U demaxtore_user -d demaxtore -t -A -F'|'";

const ACTORS = {
  buyerA: "buyer1@acme.test",
  buyerB: "buyer2@beta.test",
  supplierA: "supplier1@acme-mfg.test",
  supplierB: "supplier1@beta-industries.test",
  brokerAssigned: "broker.smoke@demaxtore.local",
  truckerAssigned: "trucker.smoke@demaxtore.local",
  originAgent: "origin.agent.smoke@demaxtore.local",
  admin: "admin@demaxtore.local",
};

const ORG = {
  acme: "00000000-0000-0000-0000-00000000c002",
  beta: "00000000-0000-0000-0000-00000000c003",
};

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
      ...(body ? { "Idempotency-Key": crypto.randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text.slice(0, 200);
  }
  return { status: res.status, json, text: text.slice(0, 500) };
}

function hasSensitive(body, keys = ["externalRef", "poNumber", "totalLandedCost", "goodsCost", "amount", "buyRate", "margin"]) {
  if (!body || typeof body !== "object") return false;
  const s = JSON.stringify(body).toLowerCase();
  return keys.some((k) => s.includes(k.toLowerCase())) || (body.id && body.status);
}

function classify(res, { allowEmpty200 = false } = {}) {
  if (res.status >= 500) return { pass: false, severity: "P0", reason: "5xx" };
  if (res.status === 403 || res.status === 404 || res.status === 401) return { pass: true, severity: null, reason: "denied" };
  if (res.status === 400 || res.status === 409 || res.status === 422) return { pass: true, severity: null, reason: "rejected" };
  if (res.status === 200 || res.status === 201 || res.status === 204) {
    if (allowEmpty200 && (!res.json || (Array.isArray(res.json?.items) && res.json.items.length === 0))) {
      return { pass: true, severity: null, reason: "empty-200-ok" };
    }
    if (hasSensitive(res.json)) return { pass: false, severity: "P0", reason: "sensitive-200" };
    if (res.status === 201) return { pass: false, severity: "P0", reason: "mutation-201" };
    return { pass: false, severity: "P0", reason: "unexpected-200" };
  }
  return { pass: true, severity: "P2", reason: `status-${res.status}` };
}

async function testCase(results, meta, token, method, path, body, opts = {}) {
  const res = await req(token, method, path, body);
  const verdict = opts.expectAllow
    ? res.status >= 500
      ? { pass: false, severity: "P0", reason: "5xx" }
      : res.status >= 200 && res.status < 300
        ? { pass: true, severity: null, reason: "allowed" }
        : { pass: false, severity: "P0", reason: `expected-allow-got-${res.status}` }
    : classify(res, opts);
  const row = {
    ...meta,
    method,
    path,
    status: res.status,
    sensitive: verdict.reason === "sensitive-200" || verdict.reason === "unexpected-200",
    mutation: verdict.reason === "mutation-201",
    result: verdict.pass ? "PASS" : "FAIL",
    severity: verdict.severity,
    notes: verdict.reason,
  };
  results.push(row);
  return res;
}

function discoverResources() {
  const r = {};
  const q = (label, sql) => {
    const rows = psql(sql);
    r[label] = rows[0]?.split("|") ?? [];
  };

  q("product", `SELECT p.id, p.sku FROM products p JOIN users u ON u.organisation_id=p.organisation_id AND u.email='buyer1@acme.test' LIMIT 1`);
  q("po", `SELECT po.id, po.order_id FROM purchase_orders po JOIN users u ON u.id=po.buyer_id AND u.email='buyer1@acme.test' LIMIT 1`);
  q("poLine", `SELECT pol.id FROM purchase_order_lines pol JOIN purchase_orders po ON po.id=pol.purchase_order_id JOIN users u ON u.id=po.buyer_id AND u.email='buyer1@acme.test' LIMIT 1`);
  q("order", `SELECT w.id FROM workspaces w JOIN workspace_participants wp ON wp.workspace_id=w.id JOIN users u ON u.id=wp.user_id AND u.email='buyer1@acme.test' WHERE w.type='ORDER' LIMIT 1`);
  q("shipment", `SELECT w.id FROM workspaces w JOIN workspace_participants wp ON wp.workspace_id=w.id JOIN users u ON u.id=wp.user_id AND u.email='buyer1@acme.test' WHERE w.type='SHIPMENT' LIMIT 1`);
  q("rfq", `SELECT w.id FROM workspaces w JOIN workspace_participants wp ON wp.workspace_id=w.id JOIN users u ON u.id=wp.user_id AND u.email='buyer1@acme.test' WHERE w.type='RFQ' LIMIT 1`);
  q("commoditybid", `SELECT w.id FROM workspaces w JOIN workspace_participants wp ON wp.workspace_id=w.id JOIN users u ON u.id=wp.user_id AND u.email='buyer1@acme.test' WHERE w.type='COMMODITYBID' LIMIT 1`);
  q("customsCase", `SELECT cc.id FROM customs_cases cc WHERE cc.organisation_id='${ORG.acme}' LIMIT 1`);
  q("customsCaseAssigned", `SELECT cc.id FROM customs_cases cc WHERE cc.organisation_id='${ORG.acme}' AND cc.broker_user_id IS NOT NULL LIMIT 1`);
  q("inland", `SELECT id.id FROM inland_deliveries id WHERE id.organisation_id='${ORG.acme}' LIMIT 1`);
  q("inlandAssigned", `SELECT id.id FROM inland_deliveries id WHERE id.organisation_id='${ORG.acme}' AND id.trucker_user_id IS NOT NULL LIMIT 1`);
  q("landedCost", `SELECT lc.id FROM landed_cost_calculations lc WHERE lc.organisation_id='${ORG.acme}' LIMIT 1`);
  q("dutyTaxCalc", `SELECT dtc.id, dtc.customs_case_id FROM duty_tax_calculations dtc JOIN customs_cases cc ON cc.id=dtc.customs_case_id WHERE cc.organisation_id='${ORG.acme}' LIMIT 1`);
  q("freightReq", `SELECT fr.id, fr.order_id FROM freight_requests fr JOIN users u ON u.id=fr.buyer_id AND u.email='buyer1@acme.test' LIMIT 1`);
  q("freightOffer", `SELECT fo.id FROM freight_offers fo JOIN freight_requests fr ON fr.id=fo.freight_request_id JOIN users u ON u.id=fr.buyer_id AND u.email='buyer1@acme.test' LIMIT 1`);
  q("shipmentDoc", `SELECT sd.id, sd.workspace_id FROM shipment_documents sd LIMIT 1`);
  q("tradeDoc", `SELECT td.id, td.workspace_id FROM trade_documents td JOIN workspaces w ON w.id=td.workspace_id JOIN workspace_participants wp ON wp.workspace_id=w.id JOIN users u ON u.id=wp.user_id AND u.email='buyer1@acme.test' LIMIT 1`);
  q("container", `SELECT sc.id, sc.shipment_workspace_id FROM shipment_containers sc LIMIT 1`);
  q("freightBooking", `SELECT fb.id FROM freight_bookings fb LIMIT 1`);
  q("issue", `SELECT oi.id FROM operational_issues oi JOIN users u ON u.id=oi.reported_by_id AND u.email='buyer1@acme.test' LIMIT 1`);
  q("task", `SELECT ot.id FROM operational_tasks ot JOIN users u ON u.id=ot.created_by_id AND u.email='buyer1@acme.test' LIMIT 1`);
  q("buyerBRfq", `SELECT w.id FROM workspaces w JOIN workspace_participants wp ON wp.workspace_id=w.id JOIN users u ON u.id=wp.user_id AND u.email='buyer2@beta.test' WHERE w.type='RFQ' LIMIT 1`);
  q("buyerBCase", `SELECT cc.id FROM customs_cases cc WHERE cc.organisation_id='${ORG.beta}' LIMIT 1`);
  return r;
}

async function main() {
  console.error(`Phase 12 IDOR sweep → ${API}`);
  const resources = discoverResources();
  const tokens = {};
  for (const [k, email] of Object.entries(ACTORS)) {
    tokens[k] = await login(email);
    await new Promise((r) => setTimeout(r, 80));
  }

  const A = Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, v[0]]));
  const results = [];

  const denyRead = (resource, actor, actorKey, method, path, targetOwner = "Buyer A") =>
    testCase(results, { resource, action: "READ", actor, targetOwner }, tokens[actorKey], method, path);

  const denyMut = (resource, actor, actorKey, method, path, body, targetOwner = "Buyer A") =>
    testCase(results, { resource, action: "MUTATION", actor, targetOwner }, tokens[actorKey], method, path, body);

  const denyList = (resource, actor, actorKey, path, targetOwner = "Buyer A") =>
    testCase(results, { resource, action: "LIST/FILTER", actor, targetOwner }, tokens[actorKey], "GET", path, null, { allowEmpty200: true });

  // ── Buyer B → Buyer A reads ──
  if (A.product) {
    await denyRead("PRODUCT", ACTORS.buyerB, "buyerB", "GET", `/api/products/${A.product}`);
    await denyList("PRODUCT", ACTORS.buyerB, "buyerB", `/api/products?search=${resources.product[1] ?? "MTR"}`);
    await denyRead("PRODUCT", ACTORS.buyerB, "buyerB", "GET", `/api/products/${A.product}/purchase-orders`);
    await denyRead("PRODUCT", ACTORS.buyerB, "buyerB", "GET", `/api/products/${A.product}/shipments`);
    await denyMut("PRODUCT", ACTORS.buyerB, "buyerB", "PATCH", `/api/products/${A.product}`, { name: "IDOR probe" });
  }

  if (A.po) {
    await denyRead("PURCHASE ORDER", ACTORS.buyerB, "buyerB", "GET", `/api/purchase-orders/${A.po}`);
    await denyRead("PO RELATED", ACTORS.buyerB, "buyerB", "GET", `/api/purchase-orders/${A.po}/related-entities`);
    await denyMut("PO", ACTORS.buyerB, "buyerB", "PATCH", `/api/purchase-orders/${A.po}`, { notes: "idor" });
    await denyMut("PO", ACTORS.buyerB, "buyerB", "DELETE", `/api/purchase-orders/${A.po}`);
  }

  if (A.order) {
    await denyRead("ORDER", ACTORS.buyerB, "buyerB", "GET", `/api/orders/${A.order}`);
    await denyRead("ORDER TASKS", ACTORS.buyerB, "buyerB", "GET", `/api/orders/${A.order}/tasks`);
    await denyRead("ORDER ISSUES", ACTORS.buyerB, "buyerB", "GET", `/api/orders/${A.order}/issues`);
    await denyRead("ORDER INSPECTIONS", ACTORS.buyerB, "buyerB", "GET", `/api/orders/${A.order}/inspections`);
  }

  if (A.rfq) {
    await denyRead("RFQ", ACTORS.buyerB, "buyerB", "GET", `/api/rfq/${A.rfq}`);
    await denyRead("RFQ QUOTATIONS", ACTORS.buyerB, "buyerB", "GET", `/api/rfq/${A.rfq}/quotations`);
    await denyMut("RFQ", ACTORS.buyerB, "buyerB", "POST", `/api/rfq/${A.rfq}/actions/submit`, {});
  }

  if (A.commoditybid) {
    await denyRead("COMMODITYBID", ACTORS.buyerB, "buyerB", "GET", `/api/commoditybid/${A.commoditybid}`);
    await denyRead("CB BID FEED", ACTORS.buyerB, "buyerB", "GET", `/api/commoditybid/${A.commoditybid}/bid-feed`);
  }

  if (A.freightReq) {
    await denyRead("FREIGHTIQ ORDER", ACTORS.buyerB, "buyerB", "GET", `/api/freightiq/orders/${A.freightReq.split("|")[1] ?? resources.freightReq[1]}`);
  }
  if (A.freightOffer) {
    await denyRead("FREIGHT OFFER", ACTORS.buyerB, "buyerB", "GET", `/api/freight-estimates/${A.freightOffer}`);
  }

  if (A.shipment) {
    await denyRead("SHIPMENT", ACTORS.buyerB, "buyerB", "GET", `/api/shipments/${A.shipment}`);
    await denyRead("SHIPMENT RELATED", ACTORS.buyerB, "buyerB", "GET", `/api/shipments/${A.shipment}/related-entities`);
    await denyRead("SHIPMENT DOCS", ACTORS.buyerB, "buyerB", "GET", `/api/shipments/${A.shipment}/documents`);
    await denyRead("SHIPMENT TRACKING", ACTORS.buyerB, "buyerB", "GET", `/api/shipments/${A.shipment}/tracking`);
    await denyRead("SHIPMENT MILESTONES", ACTORS.buyerB, "buyerB", "GET", `/api/shipments/${A.shipment}/milestones`);
    await denyRead("SHIPMENT CONTAINERS", ACTORS.buyerB, "buyerB", "GET", `/api/shipments/${A.shipment}/containers`);
    await denyMut("SHIPMENT", ACTORS.buyerB, "buyerB", "PATCH", `/api/shipments/${A.shipment}`, { notes: "idor" });
    await denyMut("BOOKING", ACTORS.buyerB, "buyerB", "POST", `/api/shipments/${A.shipment}/booking/transition`, { action: "confirm" });
  }

  if (A.container && resources.container[1]) {
    const cid = resources.container[0];
    const sid = resources.container[1];
    await denyRead("CONTAINER RELATED", ACTORS.buyerB, "buyerB", "GET", `/api/shipments/${sid}/containers/${cid}/related-entities`);
    await denyMut("CONTAINER", ACTORS.buyerB, "buyerB", "PATCH", `/api/shipments/${sid}/containers/${cid}`, { sealNumber: "IDOR" });
  }

  if (A.poLine && A.shipment) {
    await denyMut("LINE ALLOCATION", ACTORS.buyerB, "buyerB", "POST", `/api/shipments/line-allocations`, {
      shipmentWorkspaceId: A.shipment,
      purchaseOrderLineId: A.poLine,
      quantity: 1,
    });
    await denyMut("TRADE LINK", ACTORS.buyerB, "buyerB", "POST", `/api/shipments/trade-links`, {
      shipmentWorkspaceId: A.shipment,
      purchaseOrderLineId: A.poLine,
    });
  }

  if (A.customsCase) {
    await denyRead("CUSTOMS CASE", ACTORS.buyerB, "buyerB", "GET", `/api/customs/cases/${A.customsCase}`);
    await denyRead("CUSTOMS READINESS", ACTORS.buyerB, "buyerB", "GET", `/api/customs/cases/${A.customsCase}/readiness`);
    await denyRead("CUSTOMS EVENTS", ACTORS.buyerB, "buyerB", "GET", `/api/customs/cases/${A.customsCase}/events`);
    await denyRead("DUTY TAX", ACTORS.buyerB, "buyerB", "GET", `/api/customs/cases/${A.customsCase}/duty-tax`);
    await denyMut("CUSTOMS", ACTORS.buyerB, "buyerB", "POST", `/api/customs/cases/${A.customsCase}/transition`, { action: "start_review" });
    await denyMut("DUTY TAX CALC", ACTORS.buyerB, "buyerB", "POST", `/api/customs/cases/${A.customsCase}/duty-tax/calculate`, {});
  }

  if (A.inland) {
    await denyRead("INLAND", ACTORS.buyerB, "buyerB", "GET", `/api/inland/${A.inland}`);
    await denyRead("INLAND EVENTS", ACTORS.buyerB, "buyerB", "GET", `/api/inland/${A.inland}/events`);
    await denyMut("INLAND", ACTORS.buyerB, "buyerB", "POST", `/api/inland/${A.inland}/mark-delivered`, {});
  }

  if (A.landedCost) {
    await denyRead("LANDED COST", ACTORS.buyerB, "buyerB", "GET", `/api/landed-cost/${A.landedCost}`);
    await denyMut("TRANSACTION COST", ACTORS.buyerB, "buyerB", "POST", `/api/landed-cost/transaction-costs`, {
      shipmentWorkspaceId: A.shipment,
      componentType: "OTHER",
      amount: 99,
      currency: "USD",
      description: "IDOR probe",
    });
  }

  if (A.issue) await denyRead("ISSUE", ACTORS.buyerB, "buyerB", "GET", `/api/issues/${A.issue}`);
  if (A.task) {
    await denyRead("TASK", ACTORS.buyerB, "buyerB", "GET", `/api/tasks/${A.task}`);
    await denyMut("TASK", ACTORS.buyerB, "buyerB", "POST", `/api/tasks/${A.task}/complete`, {});
  }

  if (A.shipment) {
    await denyRead("TRADE DOCS SUMMARY", ACTORS.buyerB, "buyerB", "GET", `/api/trade-documents/SHIPMENT/${A.shipment}`);
    await denyList("DOC CENTER LIST", ACTORS.buyerB, "buyerB", `/api/documents?shipmentId=${A.shipment}`);
    await denyList("INLAND BY SHIPMENT", ACTORS.buyerB, "buyerB", `/api/inland/by-shipment/${A.shipment}`);
    await denyList("LANDED BY SHIPMENT", ACTORS.buyerB, "buyerB", `/api/landed-cost/by-shipment/${A.shipment}`);
    await denyList("CUSTOMS BY SHIPMENT", ACTORS.buyerB, "buyerB", `/api/customs/shipments/${A.shipment}`);
  }

  if (A.order) {
    await denyRead("TRADE DOCS ORDER", ACTORS.buyerB, "buyerB", "GET", `/api/trade-documents/ORDER/${A.order}`);
  }

  if (resources.shipmentDoc[0] && resources.shipmentDoc[1]) {
    const docId = resources.shipmentDoc[0];
    const shipId = resources.shipmentDoc[1];
    await denyRead("SHIPMENT DOC DOWNLOAD", ACTORS.buyerB, "buyerB", "GET", `/api/shipments/${shipId}/documents/${docId}`);
  }

  if (resources.tradeDoc[0] && resources.tradeDoc[1]) {
    await denyRead("TRADE DOC DOWNLOAD", ACTORS.buyerB, "buyerB", "GET", `/api/trade-documents/SHIPMENT/${resources.tradeDoc[1]}/documents/${resources.tradeDoc[0]}/download`);
  }

  // ── List/filter leakage ──
  await denyList("PO LIST foreign org", ACTORS.buyerB, "buyerB", `/api/purchase-orders?organisationId=${ORG.acme}`);
  await denyList("SHIPMENT PORTFOLIO foreign", ACTORS.buyerB, "buyerB", `/api/shipments/portfolio?organisationId=${ORG.acme}`);

  // ── Partner: broker assigned to A, must not see B case ──
  if (A.customsCaseAssigned) {
    await testCase(
      results,
      { resource: "CUSTOMS CASE", action: "READ (assigned)", actor: ACTORS.brokerAssigned, targetOwner: "Buyer A (assigned)" },
      tokens.brokerAssigned,
      "GET",
      `/api/customs/cases/${A.customsCaseAssigned}`,
      null,
      { expectAllow: true },
    );
    await testCase(
      results,
      { resource: "DUTY TAX", action: "READ (assigned)", actor: ACTORS.brokerAssigned, targetOwner: "Buyer A (assigned scope)" },
      tokens.brokerAssigned,
      "GET",
      `/api/customs/cases/${A.customsCaseAssigned}/duty-tax`,
      null,
      { expectAllow: true },
    );
  }
  if (A.buyerBCase) {
    await denyRead("CUSTOMS CASE", ACTORS.brokerAssigned, "brokerAssigned", "GET", `/api/customs/cases/${A.buyerBCase}`, "Buyer B");
  } else {
    await denyRead("CUSTOMS CASE", ACTORS.brokerAssigned, "brokerAssigned", "GET", `/api/customs/cases/${crypto.randomUUID()}`, "Buyer B (none)");
  }

  // Broker duty-tax rules admin
  await denyMut("DUTY TAX RULE ADMIN", ACTORS.brokerAssigned, "brokerAssigned", "POST", `/api/customs/duty-tax/rules`, {
    componentType: "DUTY",
    gtipCode: "0000000000",
    ratePercent: 1,
  });

  // ── Trucker assigned to A inland, not B ──
  if (A.inlandAssigned && A.shipment) {
    await testCase(
      results,
      { resource: "PARTNER TX", action: "READ (assigned shipment)", actor: ACTORS.truckerAssigned, targetOwner: "Buyer A (assigned)" },
      tokens.truckerAssigned,
      "GET",
      `/api/partner/transactions/${A.shipment}`,
      null,
      { expectAllow: true },
    );
    const payload = await req(tokens.truckerAssigned, "GET", `/api/partner/transactions/${A.shipment}`);
    if (payload.status === 200 && payload.json) {
      const leak = JSON.stringify(payload.json).match(/dutyTax|landedCost|gtip|buyRate|margin|totalLandedCost/i);
      results.push({
        resource: "TRUCKER PAYLOAD",
        action: "DATA MINIMIZATION",
        actor: ACTORS.truckerAssigned,
        targetOwner: "Buyer A (assigned)",
        method: "GET",
        path: `/api/partner/transactions/${A.shipment}`,
        status: payload.status,
        sensitive: !!leak,
        mutation: false,
        result: leak ? "FAIL" : "PASS",
        severity: leak ? "P1" : null,
        notes: leak ? `leaked: ${leak[0]}` : "minimal payload",
      });
    }
    await denyRead("INLAND DIRECT", ACTORS.truckerAssigned, "truckerAssigned", "GET", `/api/inland/${A.inlandAssigned}`, "Buyer A (partner portal only)");
  }

  // ── Origin agent / supplier denial ──
  if (A.shipment) {
    await denyRead("SHIPMENT", ACTORS.originAgent, "originAgent", "GET", `/api/shipments/${A.shipment}`);
    await denyRead("CUSTOMS", ACTORS.originAgent, "originAgent", "GET", `/api/customs/cases/${A.customsCase ?? crypto.randomUUID()}`);
    await denyRead("LANDED COST", ACTORS.originAgent, "originAgent", "GET", `/api/landed-cost/${A.landedCost ?? crypto.randomUUID()}`);
  }
  if (A.po) {
    await denyRead("PO", ACTORS.supplierB, "supplierB", "GET", `/api/purchase-orders/${A.po}`);
  }
  if (A.commoditybid) {
    await denyRead("CB", ACTORS.supplierB, "supplierB", "GET", `/api/commoditybid/${A.commoditybid}`);
  }

  // ── Partner assignment forgery ──
  if (A.customsCase) {
    await denyMut("PARTNER ASSIGNMENT", ACTORS.buyerB, "buyerB", "POST", `/api/partner/assignments`, {
      partnerRole: "CUSTOMS_BROKER",
      workspaceId: A.customsCase,
      partnerUserId: tokens.brokerAssigned,
    });
  }

  // ── Control tower ──
  await denyList("CONTROL TOWER", ACTORS.buyerB, "buyerB", `/api/control-tower/alerts?shipmentId=${A.shipment ?? ""}`);

  // ── Existence differential (document only) ──
  const fake = crypto.randomUUID();
  const own = A.rfq ? await req(tokens.buyerB, "GET", `/api/rfq/${resources.buyerBRfq?.[0] ?? fake}`) : null;
  const foreign = A.rfq ? await req(tokens.buyerB, "GET", `/api/rfq/${A.rfq}`) : null;
  const missing = await req(tokens.buyerB, "GET", `/api/rfq/${fake}`);
  results.push({
    resource: "ERROR TAXONOMY",
    action: "403/404 differential",
    actor: ACTORS.buyerB,
    targetOwner: "RFQ",
    method: "GET",
    path: "rfq own/foreign/missing",
    status: `${own?.status}/${foreign?.status}/${missing.status}`,
    sensitive: false,
    mutation: false,
    result: missing.status >= 500 ? "FAIL" : "PASS",
    severity: missing.status >= 500 ? "P0" : "P2",
    notes: "own vs foreign vs missing codes recorded",
  });

  const fails = results.filter((r) => r.result === "FAIL");
  const p0 = fails.filter((r) => r.severity === "P0");
  const p1 = fails.filter((r) => r.severity === "P1");
  const p2 = fails.filter((r) => r.severity === "P2");
  const s5xx = results.filter((r) => String(r.status).includes("5") && Number(String(r.status).split("/")[0]) >= 500);

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.result === "PASS").length,
    fail: fails.length,
    p0Open: p0.length,
    p1Open: p1.length,
    p2Open: p2.length,
    unexpected5xx: s5xx.length,
    resources: A,
    fails,
  };

  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ summary, results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (p0.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
