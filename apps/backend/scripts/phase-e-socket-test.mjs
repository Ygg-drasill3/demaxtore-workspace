// apps/backend/scripts/phase-e-socket-test.mjs
// Phase E end-to-end socket verification.
//
// Scenario:
//   1. Buyer logs in, creates an RFQ_DRAFT, submits → RFQ_SUBMITTED.
//   2. Supplier + Admin connect via Socket.io, subscribe to the workspace.
//   3. Admin assigns the supplier (SUBMITTED → SUPPLIERS_ASSIGNED).
//   4. Admin publishes (SUPPLIERS_ASSIGNED → RFQ_OPEN).
//   5. Verify the supplier receives notification:new + timeline:new + workspace:update.
//
// Run:  node apps/backend/scripts/phase-e-socket-test.mjs
import { io as ioClient } from "socket.io-client";

const BASE = "http://localhost:8001";
const PW   = "Passw0rd!";

const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function login(email) {
  const j = await api("POST", "/api/auth/login", null, { email, password: PW });
  return j.accessToken;
}

function connect(label, token) {
  return new Promise((resolve, reject) => {
    const s = ioClient(BASE, { path: "/socket.io", auth: { token }, transports: ["websocket"] });
    s.on("connect", () => { log(`${label} socket connected sid=${s.id}`); resolve(s); });
    s.on("connect_error", (e) => reject(new Error(`${label} connect_error: ${e.message}`)));
  });
}

function subscribe(socket, label, wsId) {
  return new Promise((resolve, reject) => {
    socket.emit("workspace:subscribe", wsId, (ack) => {
      log(`${label} subscribe ack:`, ack);
      ack?.ok ? resolve() : reject(new Error(`${label} subscribe failed: ${ack?.error}`));
    });
  });
}

function record(socket, label) {
  const events = [];
  for (const ev of ["notification:new", "timeline:new", "workspace:update", "rfq.state.changed", "rfq.timeline.appended"]) {
    socket.on(ev, (payload) => {
      events.push({ ev, payload });
      log(`${label} ⬅ ${ev}`,
          ev === "notification:new" ? payload.notification?.title :
          ev === "workspace:update" ? `state=${payload.state} action=${payload.action}` :
          ev === "timeline:new"     ? `eventType=${payload.event?.eventType}` : "");
    });
  }
  return events;
}

async function main() {
  // ── 1) Logins ──────────────────────────────────────────────────────────────
  const buyerToken    = await login("buyer1@acme.test");
  const adminToken    = await login("admin@demaxtore.local");
  const supplierToken = await login("supplier1@acme-mfg.test");

  // ── 2) Buyer creates a draft + submits ─────────────────────────────────────
  const deadline = new Date(Date.now() + 10 * 86400_000).toISOString();
  const draft = await api("POST", "/api/rfq", buyerToken, {
    title: "Phase E live test", productCategory: "Test", productDescription: "0123456789",
    targetMarket: "EU", incoterm: "FOB", currency: "USD", deadlineAt: deadline,
    lineItems: [{ description: "widget", quantity: 100, uom: "PCS" }],
  });
  log("Created", draft.externalRef, "id =", draft.id);
  await api("POST", `/api/rfq/${draft.id}/actions/submit`, buyerToken, {});
  log("Submitted →", "RFQ_SUBMITTED");

  // ── 3) Supplier + Admin connect & subscribe ───────────────────────────────
  const supplierSock = await connect("[SUP]", supplierToken);
  const adminSock    = await connect("[ADM]", adminToken);

  const supplierEvents = record(supplierSock, "[SUP]");
  const adminEvents    = record(adminSock,    "[ADM]");

  // Supplier MUST be allowed to subscribe (they're a participant by virtue of
  // the assignment we're about to do — so we'll subscribe AFTER assignment).
  // Admin subscribes immediately.
  await subscribe(adminSock, "[ADM]", draft.id);

  // ── 4) Admin assigns the supplier → supplier becomes a participant ────────
  log("Admin assigning supplier…");
  await api("POST", `/api/rfq/${draft.id}/actions/assign-suppliers`, adminToken, {
    payload: { supplierUserIds: ["__SUPPLIER_ID__"] },
  }).catch(async (e) => {
    // Lookup supplier id then retry once.
    const list = await api("GET", "/api/admin/rfq/suppliers?limit=10", adminToken);
    const sup = list.find((u) => u.email === "supplier1@acme-mfg.test");
    if (!sup) throw e;
    await api("POST", `/api/rfq/${draft.id}/actions/assign-suppliers`, adminToken, {
      payload: { supplierUserIds: [sup.id] },
    });
  });

  // Now subscribe the supplier (post-assignment so canAccessRfq() allows it).
  // Their role visibility is still gated by state — assignment alone doesn't
  // grant SUPPLIER access until the RFQ enters a SUPPLIER_VISIBLE_STATES bucket.
  // For now, attempt — if forbidden, we wait until after publish_rfq.
  let subscribed = false;
  try {
    await subscribe(supplierSock, "[SUP]", draft.id);
    subscribed = true;
  } catch (e) {
    log("[SUP] subscribe expected-deny (pre-publish):", e.message);
  }

  // ── 5) Admin publishes → RFQ_OPEN (suppliers' canonical visibility state) ─
  log("Admin publishing…");
  await api("POST", `/api/rfq/${draft.id}/actions/publish`, adminToken, { payload: {} });

  if (!subscribed) {
    await subscribe(supplierSock, "[SUP]", draft.id);
    subscribed = true;
  }

  // ── 6) Now-subscribed supplier should receive future events. Trigger ──────
  //      one: buyer extends the deadline.
  await new Promise((r) => setTimeout(r, 200));
  const newDeadline = new Date(Date.now() + 12 * 86400_000).toISOString();
  log("Buyer extending deadline → triggers a 2nd transition with supplier subscribed");
  await api("POST", `/api/rfq/${draft.id}/actions/extend-deadline`, buyerToken, {
    payload: { newDeadline },
  });

  // ── 7) Wait for events to flush ────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, 800));

  // ── 7) Assertions ─────────────────────────────────────────────────────────
  log("---------------- RESULTS ----------------");
  log("Supplier events:", supplierEvents.map((e) => e.ev));
  log("Admin    events:", adminEvents   .map((e) => e.ev));

  const supplierGotNotification = supplierEvents.some((e) => e.ev === "notification:new");
  const supplierGotTimeline     = supplierEvents.some((e) => e.ev === "timeline:new");
  const supplierGotWorkspaceUpd = supplierEvents.some((e) => e.ev === "workspace:update");
  const adminGotTimeline        = adminEvents   .some((e) => e.ev === "timeline:new");

  const allGreen =
    supplierGotNotification &&
    supplierGotTimeline &&
    supplierGotWorkspaceUpd &&
    adminGotTimeline;

  log("supplier.notification:new   =", supplierGotNotification);
  log("supplier.timeline:new       =", supplierGotTimeline);
  log("supplier.workspace:update   =", supplierGotWorkspaceUpd);
  log("admin.timeline:new          =", adminGotTimeline);
  log(allGreen ? "✅ PHASE E SOCKET SCENARIO PASSED" : "❌ PHASE E SOCKET SCENARIO FAILED");

  supplierSock.close();
  adminSock.close();
  process.exit(allGreen ? 0 : 1);
}

main().catch((e) => { console.error("✗", e); process.exit(2); });
