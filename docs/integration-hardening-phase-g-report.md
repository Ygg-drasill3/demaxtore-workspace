# Integration Hardening — Phase G Report

**Status:** ✅ Complete
**Date:** 2026-06-02
**Approved scope:** G1 (attachments) · G2 (telemetry) · G3 (idempotency write-through) · G4 (frontend realtime polish)
**Out of scope (deferred):** ❌ Email delivery — moved to a future "Messaging & Delivery Sprint".

---

## Verification suite — `apps/backend/scripts/phase-g-verify.mjs`

```
[G1] Attachment upload + list + download
  ✓ upload returns 201
  ✓ upload returns id
  ✓ upload version=1
  ✓ re-upload (same filename) version=2
  ✓ list returns 2 items
  ✓ download returns 200
  ✓ download body matches uploaded bytes
  ✓ download has correct content-type
  ✓ supplier (non-participant) → 403

[G2] Telemetry ingest
  ✓ telemetry returns 202
  ✓ telemetry returns { accepted: true }
  ✓ telemetry rejects unknown event (400)
  ✓ telemetry without auth → 401

[G3] Idempotency write-through
  → 5 concurrent submits with the same Idempotency-Key: 1 ok, 4 in-flight
  ✓ at least one request succeeded
  ✓ all responses were either ok or in-flight (never duplicate-success)
  ✓ exactly ONE new timeline event written (no duplicates)
  ✓ replay returns 200 with cached body
  ✓ replay added no extra timeline events
  ✓ same key on different route → 409 IDEMPOTENCY_REPLAY

[G4] Socket realtime relays
  ✓ buyer (OWNER) received notification:new
  ✓ admin (workspace subscriber) received timeline:new
  ✓ admin (workspace subscriber) received workspace:update

✅ PHASE G VERIFICATION PASSED  (22/22 assertions)
```

---

## DB side-effects confirmed

```
telemetry_events     → 2 rows (workspace.viewed + meta:{source:"phase-g-suite"})
rfq_attachments      → 2 rows, version 1 + version 2 (same filename)
/var/dmx/uploads/    → physical files on disk (4 from the suite)
audit_logs           → exactly 2 rows for RFQ-2026-0011 (draft.created + submit_rfq)
                       ↳ 5 concurrent submits, ZERO duplicates
idempotency_keys     → cached responses for replay
```

---

## G1 — Attachment Upload

Endpoints (mounted at `/api/rfq/:id/attachments`):

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| `POST` | `/` | required | participant via `canAccessRfq` | multipart, field name `file`, 25 MB cap, mime whitelist |
| `GET` | `/` (in rfq.routes.ts) | required | participant | returns list (existing) |
| `GET` | `/:attId` | required | participant via `canAccessRfq` | streams binary with proper `Content-Type` + `Content-Disposition` |

Implementation:
- **Multer in-memory storage** → write the buffer to `STORAGE_DIR=/var/dmx/uploads` under a UUID filename
- **Versioning**: if a row with same `(workspace_id, file_name)` exists, increment `version` automatically
- **MIME whitelist**: PDF, PNG/JPG/WEBP, XLSX/DOCX/XLS/DOC, CSV, TXT
- **ACL**: `canAccessRfq(prisma, actor, workspaceId)` — same policy as REST workspace reads (SUPPLIER state-gated, BUYER must be participant, ADMIN unrestricted)

## G2 — Telemetry Ingest

- `POST /api/telemetry` — `requireAuth` + zod-validated `TelemetryEventInput` (`@dmx/contracts/telemetry`)
- **Fire-and-forget**: replies with `202 { accepted: true }` immediately; insert into `telemetry_events` happens asynchronously
- Records `userId`, `event`, `workspaceId`, `targetId`, `meta`, `clientAt`, plus a server-side `occurredAt`
- Failed inserts are logged at WARN level; never bubble to the client

The frontend already calls this hook (`apps/frontend/src/features/telemetry/useTelemetry.ts`) and uses `navigator.sendBeacon` for unload-safe transmission when available — so workspace view counts, document downloads, etc. now persist.

## G3 — Idempotency Write-Through

New algorithm (`apps/backend/src/middleware/idempotency.ts`):

```
1. INSERT placeholder row { key, userId, route, statusCode: 0, response: {} }
   ↳ This is the "lock". DB unique constraint on `key` arbitrates.

2. If P2002 (unique violation):
     a. existing.userId ≠ this user  OR  existing.route ≠ this route → 409 IDEMPOTENCY_REPLAY
     b. existing.statusCode == 0                                       → 409 IDEMPOTENCY_IN_FLIGHT
     c. existing.statusCode > 0                                        → REPLAY existing.response

3. Otherwise we claimed it. Wrap `res.json()` so that when the handler emits its
   response, we UPDATE the placeholder with the real { statusCode, response }.

4. 30s safety net: if neither res.json nor anything else completes, evict the
   stuck placeholder so future calls aren't permanently locked out.
```

Why this is correct:
- **Postgres unique index** on `idempotency_keys.key` is the single arbiter — race-free under any concurrency level.
- **Only one** request reaches the handler per key; the rest see either IN_FLIGHT (still running) or the cached response (done).
- **No duplicate side-effects** because the FSM transition only runs once. Timeline + audit log + notification rows are written inside that single transaction.

Verified live: 5 simultaneous identical requests → 1 reached the handler, 4 returned IN_FLIGHT, exactly **1** new timeline event + **1** audit row.

## G4 — Frontend Realtime Polish

Frontend was 95% ready from Phase E groundwork. Phase G adds:

- `apps/frontend/src/features/rfq/hooks/index.ts` → `useRfqRealtime` now also listens to **`timeline:new`** and **`workspace:update`** (in addition to the older `rfq.timeline.appended` and `rfq.state.changed`). React-query cache invalidation fires on either alias, so the workspace screen refreshes without a manual reload.
- **Notification toast** was already wired in `useUnreadNotificationCount` (mounted globally via `NotificationBell` in `AppLayout`):
  ```ts
  sock.on("notification:new", (p) => {
    qc.setQueryData(KEY_COUNT, (old) => ({ count: (old?.count ?? 0) + 1 }));
    qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    useToast.getState().push({ type: p.notification.type, title: p.notification.title, body: p.notification.body });
  });
  ```
  This means: any seeded or generated notification (e.g. `rfq.published`, `rfq.deadline.extended`) lands as a toast for any logged-in user whose bell is mounted.

To exercise from a real browser:
1. Open `http://localhost:3000` in two tabs, login as `buyer1@acme.test` in one and `admin@demaxtore.local` in the other.
2. Admin assigns / publishes / extends an RFQ from their dashboard.
3. Buyer's tab pops the toast (`rfq.suppliers.assigned.buyer`) **without** a page refresh; the workspace timeline gains a new row in real time.

---

## File map (Phase G — created / modified)

```
apps/backend/
└── src/
    ├── routes.ts                                              ✎ mounts /rfq/:id/attachments + /telemetry
    ├── middleware/idempotency.ts                              ✎ rewritten — write-through pattern
    ├── modules/
    │   ├── attachments/
    │   │   ├── attachments.service.ts                         + multer-fed service (upload + getForDownload)
    │   │   └── attachments.routes.ts                          + POST / + GET /:attId  (mounted with :id param)
    │   └── telemetry/
    │       └── telemetry.routes.ts                            + POST /api/telemetry (202 + fire-and-forget)
    └── scripts/phase-g-verify.mjs                             + 22-assertion verification suite

apps/frontend/
└── src/features/rfq/hooks/index.ts                            ✎ + timeline:new + workspace:update handlers

docs/integration-hardening-phase-g-report.md                   + this file
```

Lines added: ~330 across 5 new files + 3 edits. `tsc --noEmit` 0 errors. Contracts vitest 22/22 still green.

---

## End-of-Phase scenario (your acceptance criteria)

| Requirement | Status |
|---|---|
| Attachment yüklenebiliyor | ✅ multipart upload + version bump + on-disk persistence |
| Timeline canlı güncelleniyor | ✅ `timeline:new` + `rfq.timeline.appended` invalidate the timeline query |
| Notification toast geliyor | ✅ Owner/counterparty receive on `user:{id}` room; toast hook lives globally |
| Telemetry kaydı oluşuyor | ✅ `workspace.viewed` rows confirmed in `telemetry_events` |
| Duplicate request sistemi bozamıyor | ✅ 5×concurrent → 1 transition, 0 duplicates |

The "Buyer→Admin→Supplier→Buyer→Buyer→Supplier" RFQ flow runs end-to-end on the live stack today. The "Supplier → Quote" step is the only piece without a REST endpoint (quotation submission lives outside the FSM — the Quotation model is fully provisioned but `POST /api/rfq/:id/quotations` is **not** part of Phase G scope per your explicit instruction "no new features beyond G1-G4"). The existing seed data + admin selection still let us walk past select_supplier → request_proforma → submit_proforma using the proforma attachment URL produced by G1.

---

## Out of scope (per your call) — defer to "Messaging & Delivery Sprint"

- Resend / SendGrid / SMTP integration
- Forgot-password email (currently logs the reset link to the server console; the link is correct, just not e-mailed)
- Proforma SLA reminder cron + email
- Domain validation, SPF, DKIM, etc.

Backend code is structured to plug an email provider in trivially when that sprint runs: just wire `sendEmail()` calls into `auth.service.forgotPassword` and a new `proforma-sla.worker.ts`.

---

## Ready for Phase H

Phase H — Playwright e2e (Buyer → Supplier → Admin full flow in a real browser) — can begin when approved. All Phase G plumbing is exercised by the verification suite already, so Phase H will mostly be UI-driven coverage on top of a solid backend.
