#!/usr/bin/env node
/**
 * API smoke for full trade chain before real-user pilot.
 * Usage: API_BASE=http://localhost:3001 node scripts/pilot-full-chain-smoke.mjs
 */
const API = process.env.API_BASE ?? "http://localhost:3001";
const PW = process.env.E2E_PASSWORD ?? "Passw0rd!";

const USERS = {
  buyer: { email: "buyer1@acme.test", password: PW },
  admin: { email: "admin@demaxtore.local", password: PW },
  supplier: { email: "supplier1@acme-mfg.test", password: PW },
};

async function login(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${await res.text()}`);
  return (await res.json()).accessToken;
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  return json;
}

function ok(step, detail = "") {
  console.log(`✓ ${step}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`Pilot full-chain smoke → ${API}\n`);
  const buyer = await login(USERS.buyer.email, USERS.buyer.password);
  const admin = await login(USERS.admin.email, USERS.admin.password);
  const supplier = await login(USERS.supplier.email, USERS.supplier.password);
  ok("Auth", "buyer + admin + supplier");

  const deadline = new Date(Date.now() + 10 * 86400_000).toISOString();
  const draft = await api("POST", "/api/rfq", buyer, {
    title: `Pilot smoke ${Date.now()}`,
    productCategory: "Pilot",
    productDescription: "Pilot smoke description",
    targetMarket: "EU",
    incoterm: "FOB",
    currency: "USD",
    deadlineAt: deadline,
    lineItems: [{ description: "widget", quantity: 100, uom: "PCS" }],
  });
  await api("POST", `/api/rfq/${draft.id}/actions/submit`, buyer, {});
  await api("POST", `/api/rfq/${draft.id}/procurement-strategy`, buyer, {
    procurementMethod: "DIRECT_RFQ",
  });
  ok("1 Buyer RFQ", draft.externalRef);

  const suppliers = await api("GET", "/api/admin/rfq/suppliers?limit=20", admin);
  const supplierId = suppliers.find((s) => s.email === USERS.supplier.email)?.id;
  if (!supplierId) throw new Error("seed supplier not found");
  await api("POST", `/api/rfq/${draft.id}/actions/assign-suppliers`, admin, {
    payload: { supplierUserIds: [supplierId] },
  });
  await api("POST", `/api/rfq/${draft.id}/actions/publish`, admin, { payload: {} });
  const rfq = await api("GET", `/api/rfq/${draft.id}`, admin);
  if (rfq.state !== "RFQ_OPEN") throw new Error(`expected RFQ_OPEN, got ${rfq.state}`);
  ok("2 Admin publish", rfq.state);

  await api("POST", `/api/rfq/${draft.id}/actions/submit-quotation`, supplier, {
    payload: {
      currency: "USD",
      lineItems: [{ description: "widget", quantity: 100, unitPrice: 42 }],
      leadTimeDays: 14,
      paymentTerms: "Net 30",
    },
  });
  ok("3 Supplier quote");

  await api("POST", `/api/rfq/${draft.id}/actions/close-quotations`, buyer, {
    reason: "pilot smoke close",
    payload: {},
  });
  await api("POST", `/api/rfq/${draft.id}/actions/start-evaluation`, buyer, { payload: {} });
  const quotes = await api("GET", `/api/rfq/${draft.id}/quotations`, buyer);
  const q = quotes[0];
  await api("POST", `/api/rfq/${draft.id}/actions/select-supplier`, buyer, {
    payload: { quotationId: q.id, supplierUserId: q.supplierId, rationale: "pilot smoke" },
  });
  await api("POST", `/api/rfq/${draft.id}/actions/request-proforma`, buyer, { payload: {} });
  ok("4 Buyer evaluation");

  const spawned = await api("GET", `/api/rfq/${draft.id}/spawned-orders`, buyer);
  let orderId = spawned?.[0]?.id;

  if (!orderId) {
    await api("POST", `/api/rfq/${draft.id}/actions/issue-po`, buyer, {
      payload: { poNumber: `PO-SMOKE-${Date.now()}`, poAmount: q.total },
    });
    const spawned2 = await api("GET", `/api/rfq/${draft.id}/spawned-orders`, buyer);
    orderId = spawned2?.[0]?.id;
  }
  if (!orderId) throw new Error("no spawned order after PO");
  ok("5 PO / order", orderId.slice(0, 8));

  await api("POST", `/api/freightiq/orders/${orderId}/actions/create-request`, admin, {
    payload: {
      mode: "OCEAN_FCL",
      pol: "CNSHA",
      pod: "NLRTM",
      cargoDescription: "Pilot smoke cargo",
      containerType: "40HC",
    },
  });
  const validUntil = new Date(Date.now() + 21 * 86400_000).toISOString();
  const etd = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  const eta = new Date(Date.now() + 40 * 86400_000).toISOString().slice(0, 10);
  const cutOff = new Date(Date.now() + 12 * 86400_000).toISOString().slice(0, 10);
  await api("POST", `/api/freightiq/orders/${orderId}/actions/submit-offer`, admin, {
    payload: {
      providerName: "DeMaxtore Freight Desk",
      carrierName: "Yang Ming Line",
      vesselName: "YM Witness",
      price: 2400,
      currency: "USD",
      transitDays: 26,
      etd,
      eta,
      cutOff,
      validUntil,
    },
  });
  ok("6 Admin freight intake");

  const summary = await api("GET", `/api/freightiq/orders/${orderId}`, buyer);
  const offer = summary.offers?.find((o) => o.status === "ACTIVE" || o.status === "REVISED");
  if (!offer) throw new Error("no freight offer");
  await api("POST", `/api/freightiq/orders/${orderId}/actions/select-offer`, buyer, {
    payload: { offerId: offer.id },
  });
  ok("7 Buyer freight select");

  const shipments = await api("GET", `/api/order/${orderId}/spawned-shipments`, buyer);
  ok("8 Shipment link", shipments?.length ? shipments[0].externalRef : "optional — no shipment yet");

  console.log("\nPilot full-chain smoke PASSED");
}

main().catch((e) => {
  console.error("\nPilot full-chain smoke FAILED");
  console.error(e.message ?? e);
  process.exit(1);
});
