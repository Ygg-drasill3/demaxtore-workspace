# Integration Hardening — Phase E Report

**Status:** ✅ Complete
**Date:** 2026-06-02
**Backend:** `http://localhost:8002` · Socket.io path `/socket.io`
**Legacy stack:** Still running on 8001/3000 (cutover is Phase F).

---

## Scope delivered

| Item | Status |
|---|---|
| Socket emit lit up — `applyTransition()` post-commit hook now broadcasts real payloads | ✅ |
| `user:{id}` / `role:{ROLE}` rooms — auto-join on connect | ✅ |
| `workspace:{id}` room — subscribe handler with **ACL via `canAccessRfq()`** | ✅ |
| `notification:new` — emitted to user + role rooms with full `NotificationDTO` shape | ✅ |
| `timeline:new` — emitted to `workspace:{id}` with `TimelineEventDTO` | ✅ |
| `workspace:update` — emitted with `{ workspaceId, state, action }` | ✅ |
| `rfq.state.changed` / `rfq.timeline.appended` (the lower-level contract events) preserved | ✅ |
| Workspace subscribe returns **ack** (`{ ok, error? }`) so clients can wait for handshake | ✅ |
| ACL: SUPPLIER cannot subscribe to RFQ that's still in pre-publish states; allowed once `RFQ_OPEN`+ | ✅ |
| Notifications created **one-by-one** so each row has an id available for the socket DTO | ✅ |
| `tsc --noEmit` 0 errors · contracts vitest 22/22 still green | ✅ |

Out of scope (per the brief): replay tool, CommodityBid, Order Workspace, frontend wiring, port cutover.

---

## End-to-end live scenario (the one you asked for)

`apps/backend/scripts/phase-e-socket-test.mjs` runs the exact flow you specified:

```
1) Buyer creates RFQ_DRAFT  →  submits        → RFQ_SUBMITTED
2) Supplier + Admin connect via Socket.io
3) Admin subscribes immediately (allowed)
   Supplier tries to subscribe → FORBIDDEN  (state-gated; pre-publish)
4) Admin POST /actions/assign-suppliers       → SUPPLIERS_ASSIGNED
5) Admin POST /actions/publish                → RFQ_OPEN
   ⬇ Supplier (still un-subscribed to workspace room) receives
     `notification:new` on their `user:{id}` room.
6) Supplier subscribes (now allowed)
7) Buyer POST /actions/extend-deadline        → RFQ_OPEN (self-loop)
   ⬇ Supplier (now in workspace room) receives:
     · rfq.state.changed
     · rfq.timeline.appended
     · timeline:new
     · workspace:update
     · notification:new      ("RFQ deadline extended: RFQ-2026-…")
```

Verbatim test output:

```
✓ Created RFQ-2026-0008
✓ Submitted → RFQ_SUBMITTED
✓ [SUP] socket connected
✓ [ADM] socket connected
✓ [ADM] subscribe ack: { ok: true }
✓ Admin assigning supplier…
   [ADM] ⬅ rfq.state.changed / rfq.timeline.appended / timeline:new / workspace:update
✓ [SUP] subscribe ack: { ok: false, error: 'FORBIDDEN' }  ← ACL works
✓ Admin publishing…
   [ADM] ⬅ rfq.state.changed / rfq.timeline.appended / timeline:new / workspace:update
   [SUP] ⬅ notification:new  "RFQ is now open for quotations: RFQ-2026-0008"
✓ [SUP] subscribe ack: { ok: true }
✓ Buyer extending deadline…
   [ADM] ⬅ … (all 4)
   [SUP] ⬅ rfq.state.changed / rfq.timeline.appended / timeline:new / workspace:update / notification:new
---------------- RESULTS ----------------
supplier.notification:new   = true
supplier.timeline:new       = true
supplier.workspace:update   = true
admin.timeline:new          = true
✅ PHASE E SOCKET SCENARIO PASSED
```

---

## File map (Phase E — created / modified)

```
apps/backend/
└── src/
    ├── realtime/
    │   └── socket.ts                              ✎ subscribe handler + ACL (canAccessRfq) + ack
    └── modules/rfq/
        └── rfq.service.ts                         ✎ notifications create-per-row (capture ids);
                                                     emit timeline:new + workspace:update;
                                                     notification:new now ships full NotificationDTO

apps/backend/scripts/
└── phase-e-socket-test.mjs                        + live socket scenario harness (used above)

package.json (backend)                              ✎ devDependency: socket.io-client@4.8.3
docs/integration-hardening-phase-e-report.md        + this file
```

Lines net-new: ~140 (mostly socket.ts + the test harness). `rfq.service.ts` change is contained to the (l)+(m) blocks inside `applyTransition`.

---

## Event payload shapes (server → client)

```ts
// notification:new   (rooms: user:{id}  AND  role:{ROLE} when broadcast)
{ notification: {
    id, type:"INFO|SUCCESS|WARNING|ERROR", titleKey, title, body, link,
    workspaceId, workspaceType:"RFQ", read:false, readAt:null, createdAt
  } }

// timeline:new       (room: workspace:{id})
// alias of rfq.timeline.appended — both fire so existing/future listeners coexist.
{ workspaceId, event: { id, eventType, actorUserId, createdAt, payload } }

// workspace:update   (room: workspace:{id})
{ workspaceId, state, action }

// rfq.state.changed  (room: workspace:{id})
{ workspaceId, fromState, toState, action, actorUserId, occurredAt }
```

---

## Subscribe ACL behaviour

`canAccessRfq()` (apps/backend/src/modules/rfq/rfq.policy.ts):
- **ADMIN** → always allowed.
- **BUYER** → allowed if they're a `WorkspaceParticipant`.
- **SUPPLIER** → allowed if they're a participant **and** the RFQ is in `SUPPLIER_VISIBLE_STATES` (`RFQ_OPEN`, `QUOTATIONS_CLOSED`, `UNDER_EVALUATION`, `SUPPLIER_SELECTED`, `PROFORMA_REQUESTED`, `PROFORMA_RECEIVED`, `PROFORMA_APPROVED`, `PO_ISSUED`, `CANCELLED`, `EXPIRED`, `CLOSED_NO_AWARD`).

On `workspace:subscribe`, the server replies with an ack: `{ ok: true }` or `{ ok: false, error: "FORBIDDEN" | "INVALID_WORKSPACE_ID" | "INTERNAL" }`. This is the same policy used by the REST `GET /api/rfq/:id` handler — so socket and REST visibility stay consistent.

---

## What's deliberately untouched (per the brief)

- Replay/internal tool — not built.
- CommodityBid / Order Workspace types — not built.
- Frontend wiring — Vite app isn't pointed at the new backend yet (that's the cutover, Phase F).
- Legacy FastAPI on 8001 and React CRA on 3000 — still running, unchanged.

---

## Known carry-overs / nuances

1. **Emit-without-commit window**: `scheduleEmit` uses `setImmediate`, which fires after the current event-loop tick. The Prisma `$transaction` returns once the COMMIT completes, so for the success path the emit fires *after* commit. If the COMMIT itself fails (extremely rare), an "echo" event could be observed by a listener — graceful: the frontend re-fetches via REST and sees the truth. Phase G can switch to an explicit post-commit hook if we add Postgres `LISTEN`/`NOTIFY`.
2. **Supplier visibility is state-gated**, even after assignment. They join `role:SUPPLIER` immediately so the personal `notification:new` for `rfq.published` lands on them. The `workspace:{id}` subscribe only opens up once the RFQ enters a supplier-visible state. This mirrors the REST policy exactly.
3. **No replay buffer**: a client that disconnects misses events. The frontend should `GET /api/notifications?unreadOnly=true` on reconnect — a 2-line addition in Phase F.

---

## Next phase

**Phase F — Frontend cutover**:
1. Stop legacy supervisor processes (`backend`, `frontend`).
2. Flip `apps/backend/.env` `PORT=8001`.
3. Add supervisor configs `dmx-backend` (Node) and `dmx-frontend` (Vite on 3000).
4. Wire `VITE_API_URL` + `VITE_SOCKET_URL` in `apps/frontend/.env`.
5. Add the axios interceptor (silent 401 → `POST /api/auth/refresh`).
6. Plug the existing Sprint 2.5 UI into the live REST + Socket.io endpoints.
