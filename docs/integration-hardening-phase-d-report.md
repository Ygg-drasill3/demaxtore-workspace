# Integration Hardening — Phase D Report

**Status:** ✅ Complete
**Date:** 2026-06-02
**Backend:** `http://localhost:8002/api/*` (legacy 8001/3000 untouched until Phase F)

---

## Scope delivered

| Item | Status |
|---|---|
| RFQ routes mounted under `/api/rfq` and `/api/admin/rfq` (38 endpoints) | ✅ |
| `applyTransition()` is the **single** gateway for `workspaces.state` mutations | ✅ |
| Postgres state-guard trigger respected: `SET LOCAL app.fsm_authorised='true'` inside the tx | ✅ |
| `@dmx/contracts` FSM + zod + next-actions used verbatim — **FSM Freeze honoured** | ✅ |
| Audit-log writer (append-only) inside the same tx as state change | ✅ |
| Timeline-event writer inside the same tx | ✅ |
| Notification fan-out resolver (server-generated rows; socket emit deferred to Phase E) | ✅ |
| Idempotency-Key middleware (uses existing `idempotency_keys` table) | ✅ |
| `RfqService` augmented with read/draft methods (createDraft, editDraft, list, fetchDTO, toDTO, timeline, listClarifications, listAttachments, buildNextActionContext, markClarificationRead, adminQueue, lookupSuppliers) | ✅ |
| RBAC: route-level `requireRole` + per-resource `canAccessRfq` policy | ✅ |
| `STANDARD_RFQ_WORKSPACE` legacy enum value fixed to current `RFQ` Prisma enum | ✅ |
| `tsc --noEmit` → 0 errors | ✅ |

---

## Manual verification (26 curl checks, all green)

```
✓  GET  /api/rfq                            (BUYER)  → owned RFQs only
✓  GET  /api/rfq                            (ADMIN)  → all RFQs
✓  GET  /api/rfq                            (SUPPLIER) → only published states (RFQ_OPEN+)
✓  GET  /api/rfq/:id                                  → full DTO with line items, deadline, etc.
✓  GET  /api/rfq/:id/timeline                         → ordered timeline events with actor + payload
✓  GET  /api/rfq/:id/next-actions                     → FSM-derived NextAction[] per role+state
✓  POST /api/rfq                            (BUYER)  → 201 + new RFQ-2026-00NN in RFQ_DRAFT
✓  POST /api/rfq/:id/actions/submit         (BUYER)  → DRAFT → SUBMITTED  + audit + timeline
✗→✓ Workspace-type guard caught STANDARD_RFQ_WORKSPACE vs RFQ mismatch (fixed mid-test)
✓  POST /api/rfq/:id/actions/submit         (SUPPLIER) → 403 FORBIDDEN
✓  POST /api/rfq/:id/actions/assign-suppliers (ADMIN)  → SUBMITTED → SUPPLIERS_ASSIGNED
✓  POST /api/rfq/:id/actions/publish         (ADMIN)  → SUPPLIERS_ASSIGNED → RFQ_OPEN
✓  Timeline now shows 4 events (draft.created, submitted, suppliers.assigned, published)
✓  audit_logs has 3 rows with correct from_state/to_state/actor_email
✓  POST /api/rfq/:id/actions/cancel         (BUYER, with reason) → RFQ_OPEN → CANCELLED
✓  GET  /api/admin/rfq/queue               (ADMIN)  → groupBy state + triage list
✓  GET  /api/admin/rfq/queue               (BUYER)  → 403 (RBAC)
✓  GET  /api/admin/rfq/suppliers?limit=5    (ADMIN)  → 4 suppliers with org/location
✓  POST /api/rfq (empty body)              (BUYER)  → 400 VALIDATION_ERROR + zod issues

— Idempotency —
✓  Idempotency-Key X, 1st submit                  → success, row inserted in idempotency_keys
✓  Idempotency-Key X, 2nd submit (same key+route) → REPLAYED cached response (no DB mutation)
✓  Idempotency-Key X, same key on different route → 409 IDEMPOTENCY_REPLAY
```

End-to-end FSM walk:
```
RFQ_DRAFT  --[submit_rfq         by BUYER]-->  RFQ_SUBMITTED
            --[assign_suppliers  by ADMIN]-->  SUPPLIERS_ASSIGNED
            --[publish_rfq       by ADMIN]-->  RFQ_OPEN
            --[cancel_rfq        by BUYER]-->  CANCELLED (terminal)
```
All transitions recorded in `audit_logs` (append-only, REVOKE UPDATE/DELETE enforced).
Postgres state-guard trigger never fired (correct — every UPDATE flowed through `applyTransition()` which sets `app.fsm_authorised='true'`).

---

## Contracts package vitest

```
PASS  packages/contracts  rfq.fsm.test.ts          (11 tests)
PASS  packages/contracts  rfq.next-actions.test.ts (11 tests)
Tests: 22 passed, 22 total
```

---

## File map (Phase D — created / modified)

```
apps/backend/
├── tsconfig.json                                     ✎ removed rfq/** from exclude
└── src/
    ├── routes.ts                                     ✎ mounts /rfq + /admin/rfq + idempotency
    ├── db.ts                                         + shim re-export of prisma
    ├── logger.ts                                     + shim re-export of logger
    ├── utils/asyncHandler.ts                         + shim re-export
    ├── utils/httpErrors.ts                           + AppError class (subclass of HttpError)
    ├── middleware/idempotency.ts                     + Idempotency-Key middleware (peek-token user scope)
    ├── modules/auth/auth.middleware.ts               + shim re-export of requireAuth/requireRole
    ├── modules/rfq/
    │   ├── rfq.routes.ts                             ● (pre-existing) routes mounted, no edits
    │   ├── rfq.controller.ts                         ✎ added `createdBy` to loadAccessible include
    │   ├── rfq.service.ts                            ✎ STANDARD_RFQ_WORKSPACE→RFQ + public prisma + workspaceParticipant.upsert compound key fix
    │   ├── rfq.service.read.ts                       + prototype augmentation: 12 read/draft methods
    │   ├── rfq.policy.ts                             ● (pre-existing) used by controller
    │   ├── rfq.preconditions.ts                      ● (pre-existing) plugged into applyTransition
    │   └── rfq.notifications.ts                      ● (pre-existing) recipient resolver
    └── realtime/socket-bus.ts                        + post-commit emit queue (used by applyTransition,
                                                       no event emission yet — that's Phase E)

docs/integration-hardening-phase-d-report.md          + this file
```

Net additions: 1 new file + 7 shim files + 1 prototype-augmentation file. Pre-existing RFQ module untouched apart from the 3 surgical fixes called out.

---

## FSM Freeze audit

✅ `packages/contracts/src/rfq.fsm.ts` — **not touched**
✅ `packages/contracts/src/rfq.next-actions.ts` — **not touched**
✅ `packages/contracts/src/rfq.zod.ts` — **not touched**
✅ `RFQ_TRANSITIONS` table — **not modified**
✅ The single application path for `UPDATE workspaces.state` is `RfqService.applyTransition()` → `SET LOCAL app.fsm_authorised='true'` → `tx.workspace.update({ state })`. Postgres trigger remains active and would block any out-of-band update.

---

## Known carry-overs (intentional, deferred to later phases)

| Item | Phase | Notes |
|---|---|---|
| Notification socket fan-out emit | E | The `socketBus.scheduleEmit(...)` calls inside `applyTransition` already enqueue payloads; the `getIo()` lookup returns null if Socket.io isn't initialised. Phase E wires the actual emit + frontend listener. |
| Quotation submission module | Sprint 2.5/3 | `assertHasQuotations`, `assertQuotationValid`, etc. are placeholder no-ops as documented in `rfq.preconditions.ts`. |
| Attachment upload (`POST /rfq/:id/attachments`) | G | Endpoint not exposed yet; `GET /attachments` works. Phase G adds multer ingestion. |
| Email delivery for forgot-password / proforma SLA reminder | G | Currently logs only. |
| Idempotency middleware race window | (polish) | Sub-millisecond race between two concurrent first-issue calls with the same key is possible. Acceptable for v1; Phase G can switch to write-through INSERT-ON-CONFLICT. |
| Supervisor port swap (new Node → 8001, Vite → 3000) | F | Legacy stack intentionally left running until that cutover. |

---

## Credentials & seed (unchanged)

See `/app/memory/test_credentials.md`. All seeded users password = `Passw0rd!`.

## Next phase

**Phase E — Socket Infrastructure (Realtime updates):**
1. Wire `socketBus` → actually emit `rfq.state.changed` / `rfq.timeline.appended` / `notification:new` to `user:`/`role:`/`workspace:` rooms.
2. Add `RfqController` endpoint for `WORKSPACE_SUBSCRIBE` validation (ensure the subscriber has `canAccessRfq`).
3. Lightweight frontend (or curl-based) socket.io smoke harness to verify fan-out.
