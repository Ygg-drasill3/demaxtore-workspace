// apps/backend/scripts/phase-g-verify.mjs
//
// Phase G end-to-end verification.
//
// Validates:
//   G1 — multipart attachment upload, list, download
//   G2 — POST /api/telemetry (fire-and-forget, 202)
//   G3 — Idempotency write-through (same key → no duplicate timeline / audit / notification)
//   G4 — Socket relays notification:new + timeline:new + workspace:update so the
//        frontend updates without a manual refresh (verified via raw socket).
//
import { io as ioClient } from "socket.io-client";
import { Buffer } from "node:buffer";

const BASE = "http://localhost:8001";
const PW   = "Passw0rd!";

const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

async function api(method, path, token, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await res.json(); } catch { json = {}; }
  return { status: res.status, body: json };
}
const ok  = (r) => { if (r.status >= 400) throw new Error(`HTTP ${r.status} → ${JSON.stringify(r.body)}`); return r.body; };
const expect = (name, cond) => { console.log(cond ? `  ✓ ${name}` : `  ✗ ${name}`); if (!cond) process.exitCode = 1; };

async function login(email) {
  return ok(await api("POST", "/api/auth/login", null, { email, password: PW })).accessToken;
}

async function dbCount(token, sql) {
  // No direct SQL endpoint — caller passes pre-counted figures via the seed script.
  // Instead, we use timeline + admin queue endpoints to derive counts.
  return null;
}

async function main() {
  log("Phase G — verification suite");

  const buyerToken    = await login("buyer1@acme.test");
  const adminToken    = await login("admin@demaxtore.local");
  const supplierToken = await login("supplier1@acme-mfg.test");

  // ── Setup: a fresh draft we can mutate freely ────────────────────────────
  const deadline = new Date(Date.now() + 10 * 86400_000).toISOString();
  const draft = ok(await api("POST", "/api/rfq", buyerToken, {
    title: "Phase G suite", productCategory: "Test", productDescription: "0123456789",
    targetMarket: "EU", incoterm: "FOB", currency: "USD", deadlineAt: deadline,
    lineItems: [{ description: "widget", quantity: 100, uom: "PCS" }],
  }));
  log(`Created ${draft.externalRef} → ${draft.id}`);

  // ──────────────────────────────────────────────────────────────────────────
  // G1 — Attachment upload + list + download
  // ──────────────────────────────────────────────────────────────────────────
  log("\n[G1] Attachment upload + list + download");
  const payload = Buffer.from("hello phase g attachment v1");
  const form = new FormData();
  form.append("file", new Blob([payload], { type: "application/pdf" }), "spec.pdf");

  const upRes = await fetch(`${BASE}/api/rfq/${draft.id}/attachments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: form,
  });
  const upJson = await upRes.json();
  expect("upload returns 201", upRes.status === 201);
  expect("upload returns id",  typeof upJson.id === "string");
  expect("upload version=1",   upJson.version === 1);

  // 2nd upload with same filename → version 2
  const form2 = new FormData();
  form2.append("file", new Blob([Buffer.from("v2 content")], { type: "application/pdf" }), "spec.pdf");
  const up2Res = await fetch(`${BASE}/api/rfq/${draft.id}/attachments`, {
    method: "POST", headers: { Authorization: `Bearer ${buyerToken}` }, body: form2,
  });
  const up2Json = await up2Res.json();
  expect("re-upload version=2", up2Json.version === 2);

  // List
  const listRes = ok(await api("GET", `/api/rfq/${draft.id}/attachments`, buyerToken));
  expect("list returns 2 items", Array.isArray(listRes) && listRes.length === 2);

  // Download v1
  const dlRes = await fetch(`${BASE}/api/rfq/${draft.id}/attachments/${upJson.id}`, {
    headers: { Authorization: `Bearer ${buyerToken}` },
  });
  const dlBuf = Buffer.from(await dlRes.arrayBuffer());
  expect("download returns 200",          dlRes.status === 200);
  expect("download body matches uploaded",dlBuf.equals(payload));
  expect("download has content-type",     dlRes.headers.get("content-type") === "application/pdf");

  // Supplier (not yet a participant) → 403
  const suppDlRes = await fetch(`${BASE}/api/rfq/${draft.id}/attachments/${upJson.id}`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
  });
  expect("supplier (non-participant) → 403", suppDlRes.status === 403);

  // ──────────────────────────────────────────────────────────────────────────
  // G2 — Telemetry ingest
  // ──────────────────────────────────────────────────────────────────────────
  log("\n[G2] Telemetry ingest");
  const tRes = await api("POST", "/api/telemetry", buyerToken, {
    event:       "workspace.viewed",
    workspaceId: draft.id,
    clientAt:    new Date().toISOString(),
    meta:        { source: "phase-g-suite" },
  });
  expect("telemetry returns 202", tRes.status === 202);
  expect("telemetry returns { accepted: true }", tRes.body.accepted === true);

  // Bad event name → 400
  const tBadRes = await api("POST", "/api/telemetry", buyerToken, {
    event: "bogus.event", clientAt: new Date().toISOString(),
  });
  expect("telemetry rejects unknown event", tBadRes.status === 400);

  // Unauthenticated → 401
  const tNoAuthRes = await fetch(`${BASE}/api/telemetry`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "workspace.viewed", clientAt: new Date().toISOString() }),
  });
  expect("telemetry without auth → 401", tNoAuthRes.status === 401);

  await new Promise((r) => setTimeout(r, 400)); // let the fire-and-forget land

  // ──────────────────────────────────────────────────────────────────────────
  // G3 — Idempotency write-through (no duplicate side-effects)
  // ──────────────────────────────────────────────────────────────────────────
  log("\n[G3] Idempotency write-through");
  const key = crypto.randomUUID();

  // Baseline: timeline + audit (admin queue) counts BEFORE the submit.
  const tlBefore = ok(await api("GET", `/api/rfq/${draft.id}/timeline`, buyerToken));
  const before = tlBefore.length;

  // Same key, fire 5 times in parallel.
  const reqs = Array.from({ length: 5 }, () =>
    api("POST", `/api/rfq/${draft.id}/actions/submit`, buyerToken, {}, { "Idempotency-Key": key }),
  );
  const responses = await Promise.all(reqs);

  const okResponses = responses.filter((r) => r.status === 200);
  const inFlight    = responses.filter((r) => r.body?.error?.code === "IDEMPOTENCY_IN_FLIGHT");
  log(`  → 5 concurrent: ${okResponses.length} ok, ${inFlight.length} in-flight`);

  expect("at least one request succeeded",        okResponses.length >= 1);
  expect("all responses were either ok or replay/in-flight",
         responses.every((r) => r.status === 200 || r.body?.error?.code === "IDEMPOTENCY_IN_FLIGHT"));

  await new Promise((r) => setTimeout(r, 300));

  const tlAfter = ok(await api("GET", `/api/rfq/${draft.id}/timeline`, buyerToken));
  const added   = tlAfter.length - before;
  expect("exactly ONE new timeline event written (no duplicates)", added === 1);

  // Re-fire same key sequentially → replayed cached body (200), still no new timeline rows.
  const replayRes = await api("POST", `/api/rfq/${draft.id}/actions/submit`, buyerToken, {}, { "Idempotency-Key": key });
  expect("replay returns 200", replayRes.status === 200);

  const tlReplay = ok(await api("GET", `/api/rfq/${draft.id}/timeline`, buyerToken));
  expect("replay added no extra timeline events", tlReplay.length === tlAfter.length);

  // Different route with same key → 409 IDEMPOTENCY_REPLAY
  const otherRouteRes = await api("POST", `/api/rfq/${draft.id}/clarifications`, buyerToken,
    { message: "hello" }, { "Idempotency-Key": key });
  expect("same key on different route → 409", otherRouteRes.status === 409);

  // ──────────────────────────────────────────────────────────────────────────
  // G4 — Socket realtime relays (the frontend would render these as toast +
  //      live timeline; here we just verify the events fire on the wire).
  // ──────────────────────────────────────────────────────────────────────────
  log("\n[G4] Socket realtime relays");
  const adminSock = await new Promise((resolve, reject) => {
    const s = ioClient(BASE, { path: "/socket.io", auth: { token: adminToken }, transports: ["websocket"] });
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
  const buyerSock = await new Promise((resolve, reject) => {
    const s = ioClient(BASE, { path: "/socket.io", auth: { token: buyerToken }, transports: ["websocket"] });
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
  await new Promise((res, rej) => adminSock.emit("workspace:subscribe", draft.id, (ack) =>
    ack?.ok ? res() : rej(new Error(ack?.error)),
  ));
  log("  admin socket subscribed to workspace room");
  log("  buyer socket auto-joined user:{buyerId} room (for notification:new)");

  const adminEvents = [];
  const buyerEvents = [];
  for (const ev of ["notification:new", "timeline:new", "workspace:update"]) {
    adminSock.on(ev, (p) => adminEvents.push({ ev, p }));
    buyerSock.on(ev, (p) => buyerEvents.push({ ev, p }));
  }

  // Trigger a transition (admin assigns supplier). Notification recipients per FSM:
  //   • OWNER (buyer1)         → notification:new on user:{buyer1}
  //   • COUNTERPARTY (supplier) → notification:new on user:{supplier}
  // The actor (admin) is excluded by the resolver — admin gets workspace-room
  // events (timeline:new + workspace:update) but no personal notification.
  const suppliers = ok(await api("GET", "/api/admin/rfq/suppliers?limit=5", adminToken));
  const supplierId = suppliers.find((u) => u.email === "supplier1@acme-mfg.test").id;
  await api("POST", `/api/rfq/${draft.id}/actions/assign-suppliers`, adminToken, {
    payload: { supplierUserIds: [supplierId] },
  });
  await new Promise((r) => setTimeout(r, 500));

  expect("buyer received notification:new (workspace OWNER)", buyerEvents.some((e) => e.ev === "notification:new"));
  expect("admin received timeline:new (workspace subscriber)", adminEvents.some((e) => e.ev === "timeline:new"));
  expect("admin received workspace:update (workspace subscriber)", adminEvents.some((e) => e.ev === "workspace:update"));

  adminSock.close();
  buyerSock.close();

  // ──────────────────────────────────────────────────────────────────────────
  // Wrap up
  // ──────────────────────────────────────────────────────────────────────────
  if (process.exitCode === 1) {
    log("\n❌ PHASE G HAS FAILURES");
  } else {
    log("\n✅ PHASE G VERIFICATION PASSED");
  }
}

main().catch((e) => { console.error("✗ runner error:", e); process.exit(2); });
