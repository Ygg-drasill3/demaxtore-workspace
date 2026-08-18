# Integration Hardening Sprint
# Convert Reference Implementation Into Running Product

> Audience: Implementing engineer / engineering team
> Source of truth: `/app/docs/product-reality-audit.md`
> Mandate: Make the reference monorepo the **actual running product**. No new features.

---

## CRITICAL INSTRUCTION

This is NOT a feature sprint.

This is NOT a redesign sprint.

This is NOT a Sprint 3 / CommodityBid / Order sprint.

Architecture Freeze remains unchanged.

RFQ FSM remains unchanged.

CommodityBid FSM remains unchanged.

Order FSM remains unchanged.

Sprint 2 backend reference remains the specification.

Sprint 2.5 frontend reference remains the specification.

Do NOT redesign UI.

Do NOT modify FSM transitions.

Do NOT introduce new workflows.

Do NOT add CommodityBid / Order endpoints.

Do NOT change `@dmx/contracts` business logic.

This sprint converts existing reference code into a running monorepo. Nothing more.

---

## OBJECTIVE

Move DeMaxtore from:

"A Sprint 1 demo shell + a Sprint 2/2.5 reference codebase in /docs"

to:

"A single Node + Express + PostgreSQL + Prisma + Vite + React monorepo that boots, persists data, and supports the end-to-end RFQ workflow on the running runtime."

The reference monorepo at `/app/docs/sprint-2-reference-code/` becomes the **new ANA platform**.

The existing FastAPI + MongoDB + CRA application at `/app/backend` + `/app/frontend` is reclassified as a **temporary demo shell** and will be retired at the end of this sprint.

---

## OUT OF SCOPE (DO NOT TOUCH)

* CommodityBid workspace UI or backend
* Order workspace UI or backend
* Proforma file storage beyond what's needed for the existing FSM transitions
* FreightIQ
* Inspection
* Shipment Visibility
* New design tokens or component primitives
* New supplier-side features beyond what's already in `@dmx/contracts` and Sprint 2.5 reference
* Email provider integration (defer to next sprint — log to console for now)
* RLS for CommodityBid (Sprint 2.5+)
* Production deployment hardening (HTTPS, secrets manager, monitoring)
* Performance tuning beyond functional baseline
* Refactoring existing reference code "for cleanliness"

If a task is not on the Definition of Done in §11, it is out of scope.

---

## STRATEGIC FRAME

> The reference codebase is high quality.
> 84 unit tests pass. FSM invariants are well-modeled.
> But unit tests with mocked APIs do not equal a running product.
>
> This sprint exists to close the **single gap** between specification and reality:
> "the application can actually be started, and a real buyer + supplier + admin can complete an RFQ end-to-end."

---

## SUCCESS METRICS

| Metric                                                          | Target  |
| --------------------------------------------------------------- | ------- |
| `yarn install` at repo root succeeds                            | 100%    |
| `yarn dev` boots both backend + frontend without manual steps   | yes     |
| All 84 existing unit tests still pass                           | 100%    |
| Playwright E2E test "buyer creates RFQ → admin assigns → supplier quotes → buyer selects → supplier uploads PI → buyer approves → PO issued" passes | yes |
| Demo data seed creates 1 admin + 2 buyers + 4 suppliers          | yes     |
| Auth flow round-trip works on the new stack                      | yes     |
| Socket.io delivers 4 events: state change, timeline append, clarification posted, notification new | yes |
| Live FastAPI demo shell taken offline                            | yes     |

If any of the above is not met at the end of the sprint, the sprint is **not complete** regardless of how much code was written.

---

## IMPLEMENTATION PHASES

Phases must complete in order. Do not start Phase B before Phase A's success metric is green. Do not start Phase C before Phase B's success metric is green.

---

### PHASE A · Environment + Monorepo Lift

**Goal:** Make the reference monorepo the actual repository root and boot it.

**Tasks:**

1. **Move the monorepo from `/app/docs/sprint-2-reference-code/` to `/app/`** (or whatever the project's primary repo path becomes). Preserve `/app/docs/*.md` files in `/app/docs/` for ongoing specification work.
2. **Create `apps/backend/package.json`** declaring the `@dmx/backend` workspace. Include scripts: `dev` (tsx watch), `build` (tsc), `start` (node dist), `test` (vitest), `typecheck` (tsc --noEmit), `prisma:migrate`, `prisma:generate`, `prisma:seed`.
3. **Create `apps/backend/tsconfig.json`** with strict mode, path aliases for `@dmx/contracts`.
4. **Install runtime dependencies:** `express`, `cors`, `cookie-parser`, `helmet`, `morgan`, `jsonwebtoken`, `bcryptjs`, `zod`, `@prisma/client`, `prisma`, `socket.io`, `multer`, `pino`. Dev: `tsx`, `typescript`, `vitest`, `supertest`, `@types/*`.
5. **Install PostgreSQL** in the runtime environment (Docker-based service preferred). Confirm `psql` can connect.
6. **Provision `.env.example` and `.env`** for backend with: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_DOMAIN`, `CORS_ORIGIN`, `PORT=4000`.

**Phase A success metric:**
* `yarn install` at repo root completes without errors.
* `psql $DATABASE_URL -c 'SELECT 1'` returns 1.
* `yarn workspace @dmx/backend typecheck` passes.

---

### PHASE B · Database + Prisma

**Goal:** Full Prisma schema and migrations executed.

**Tasks:**

1. **Compose the full `apps/backend/prisma/schema.prisma`** by extending the existing `schema.partial.rfq.prisma`. Required models:
   * `User` (id, email unique, passwordHash, displayName, role enum BUYER/SUPPLIER/ADMIN, organisation, createdAt)
   * `Session` / `RefreshToken` table for JWT refresh rotation
   * `PasswordResetToken`
   * `Organisation` (suppliers carry verifiedSince, location, pastPoCount)
   * `RFQWorkspace` (already specified in the partial schema)
   * `RFQLineItem` (description, quantity, uom, targetPrice nullable, notes)
   * `Quotation` (id, workspaceId, supplierId, total, currency, unitPriceAvg, leadTimeDays, moq, incoterm, paymentTerms, sampleAvail, validUntil, status, submittedAt)
   * `QuotationLineItem`
   * `WorkspaceParticipant` (workspaceId, userId, participantRole enum OWNER/COUNTERPARTY/OPERATOR/OBSERVER, joinedAt)
   * `TimelineEvent` (id, workspaceId, eventType, actorUserId, payload Json, createdAt)
   * `Attachment` (id, workspaceId, fileName, mimeType, sizeBytes, uploadedByUserId, version, storageKey, createdAt)
   * `Clarification` (id, workspaceId, authorUserId, body, visibility enum ALL/ADMIN_ONLY, mentionedUserIds String[], createdAt)
   * `ClarificationReadReceipt` (clarificationId, userId, readAt)
   * `Notification` (id, userId, type, titleKey, title, body, link, workspaceId nullable, workspaceType, read, readAt, createdAt)
   * `SupplierActivityLog` (workspaceId, supplierId, stage enum, lastActivityAt, nudgedAt)
   * `TelemetryEvent` (id, userId nullable, event, workspaceId nullable, targetId nullable, meta Json, occurredAt, clientAt)
   * `IdempotencyKey` (key unique, userId, route, response Json, createdAt) — needed because the existing axios interceptor sends `Idempotency-Key`
2. **Carry the FSM-guard SQL trigger** from `prisma/migrations/state-guard-trigger.sql` into the Prisma migration sequence as a `migration.sql` file.
3. **Run `prisma migrate dev --name init`** and verify all tables + the FSM guard trigger exist.
4. **Create `apps/backend/prisma/seed.ts`** — seeds:
   * 1 admin (admin@demaxtore.local / `Passw0rd!`)
   * 2 buyers (buyer1@acme.test, buyer2@beta.test)
   * 4 suppliers across 2 organisations (acme-mfg, beta-industries) with `verifiedSince` and `pastPoCount` populated
   * Plain bcrypt-hashed passwords from the same constant
5. **Update `/app/memory/test_credentials.md`** with the seeded credentials.

**Phase B success metric:**
* `prisma migrate status` shows all migrations applied.
* `prisma db seed` populates 7 users + 2 organisations.
* The FSM guard trigger rejects an illegal state transition when run via a raw SQL test.

---

### PHASE C · Backend Modules + Server Bootstrap

**Goal:** Compose all modules behind one Express app. Implement every endpoint the Sprint 2 + 2.5 frontend already calls.

**Sub-phases:**

#### C.1 Server bootstrap

Create `apps/backend/src/server.ts`:
* Express app + cors + helmet + cookie-parser + morgan
* Global error handler converting thrown errors to the `ApiError` envelope from `@dmx/contracts/api`
* Idempotency middleware reading `Idempotency-Key` header and short-circuiting replays via the `IdempotencyKey` table
* JWT auth middleware (validates access token, attaches `req.user`)
* Socket.io HTTP server attached to the same port
* `GET /api/health` → `{ ok: true }`

#### C.2 Auth module (`src/modules/auth/`)

Implement endpoints matching the frontend contract in `@dmx/contracts/auth`:
* `POST /api/auth/login` → `{ user, accessToken, expiresInSec }` + httpOnly refresh cookie
* `POST /api/auth/refresh` → rotates refresh + returns new access
* `POST /api/auth/logout` → clears refresh cookie + revokes token
* `GET /api/auth/me` → current user
* `POST /api/auth/forgot-password` → logs reset link to console (no SMTP yet)
* `POST /api/auth/reset-password` → consumes token, sets new password

Use bcrypt cost 10. **CALL `integration_playbook_expert_v2` BEFORE writing the auth module** — this is mandatory under the Auth Bug Fix Rules in the agent system prompt.

#### C.3 Notifications module (`src/modules/notifications/`)

* `GET /api/notifications?unreadOnly&cursor&limit`
* `GET /api/notifications/unread-count`
* `POST /api/notifications/:id/read`
* `POST /api/notifications/read-all`
* Internal `notifyUser(userId, NotificationDTO)` helper that persists + emits `notification:new` over Socket.io to room `user:{userId}`

#### C.4 RFQ module (already specified — just connect)

The reference files at `apps/backend/src/modules/rfq/` (`rfq.service.ts`, `rfq.controller.ts`, `rfq.routes.ts`, `rfq.policy.ts`, `rfq.preconditions.ts`, `rfq.notifications.ts`) already exist. Tasks:
* Mount `rfq.routes` under `/api/rfq` in `server.ts`
* Wire `rfq.notifications.ts` to the C.3 `notifyUser` helper
* Wire `rfq.service.ts` audit emissions to Socket.io rooms `workspace:{id}` (events `rfq.state.changed`, `rfq.timeline.appended`)
* Do NOT modify FSM logic, preconditions, or policy

#### C.5 Supplier Activity module (`src/modules/supplier-activity/`)

Implement endpoints from `@dmx/contracts/supplier-activity`:
* `GET /api/rfq/:id/supplier-activity` → `SupplierActivitySummary`
* `GET /api/rfq/:id/supplier-activity/detail` → `SupplierActivityDetail`
* `POST /api/rfq/:id/supplier-activity/nudge-silent` → bulk nudge, rate-limited 1/supplier/24h
* `POST /api/rfq/:id/supplier-activity/:supplierId/nudge` → single nudge, rate-limited
* `POST /api/rfq/:id/supplier-activity/view` (internal — called when a supplier loads the workspace; deduped per supplier per day)

Stage definitions are exactly as documented in `/app/docs/sprint-2.5-ux-redesign-wireframes.md §7.2`.

#### C.6 Quotations module (`src/modules/quotations/`)

* `POST /api/rfq/:id/quotations` → supplier submits quotation (validates via Zod from `@dmx/contracts`)
* `POST /api/rfq/:id/quotations/:quotationId/revise`
* `POST /api/rfq/:id/quotations/:quotationId/withdraw`
* `GET /api/rfq/:id/quotations` → list (BUYER + ADMIN see all, SUPPLIER sees own only)
* `POST /api/rfq/:id/quotations/:quotationId/select` → routes through `rfq.service.applyTransition("select_supplier", { quotationId })`

#### C.7 Attachments module (`src/modules/attachments/`)

* `POST /api/rfq/:id/attachments` (multipart, max 50 MB, virus-scan stub OK)
* `GET /api/rfq/:id/attachments`
* `GET /api/attachments/:id/download` — emits `document.downloaded` telemetry event server-side
* Local disk storage under `/var/dmx/uploads` (`STORAGE_DIR` env). Object storage deferred.

#### C.8 Telemetry module (`src/modules/telemetry/`)

* `POST /api/telemetry` accepts `TelemetryEventInput` from `@dmx/contracts/telemetry`. Persists. Returns 202.
* No dashboard endpoint yet.

#### C.9 Admin queue module (`src/modules/admin/`)

* `GET /api/admin/queue/position/:rfqId` → `{ position }` for the WhatHappensNextCard `queuePosition` variable.
* `GET /api/admin/triage-sla` → `{ newRfqs, pendingAssignment, avgAssignmentHours, countOver24h, countOver48h }` for the TriageSlaWidget.

#### C.10 Clarifications module (`src/modules/clarifications/`)

* `GET /api/rfq/:id/clarifications`
* `POST /api/rfq/:id/clarifications` (body, optional `mentionedUserIds`, optional `visibility`, optional `attachmentIds`)
* `POST /api/rfq/:id/clarifications/:msgId/read` → write ClarificationReadReceipt
* Visibility `ADMIN_ONLY` restricts read access to admins.

**Phase C success metric:**
* `yarn workspace @dmx/backend dev` boots without errors
* `curl http://localhost:4000/api/health` → `200 { ok: true }`
* Every endpoint above returns either a real payload or a documented 4xx error envelope — no 404s for documented endpoints.
* Each module has at least one integration test (supertest) hitting a real Postgres test database. Total new integration tests: 30+.

---

### PHASE D · Socket.io Realtime

**Goal:** Deliver realtime events the existing frontend (`useRfqRealtime`, `useUnreadNotificationCount`) already listens for.

**Tasks:**

1. Mount Socket.io on the same HTTP server. Authenticate connections via the access token (passed in `auth` payload).
2. On connect, join the socket to `user:{userId}` and `role:{role}` rooms.
3. Handle `workspace:subscribe` / `workspace:unsubscribe` client→server events; join/leave `workspace:{id}` based on workspace ACL.
4. Emit:
   * `notification:new` to `user:{userId}` (already wired in C.3)
   * `rfq.state.changed`, `rfq.timeline.appended` to `workspace:{id}` (already wired in C.4)
   * `rfq.clarification.posted` to `workspace:{id}` (from C.10)
   * `rfq.participants.changed` to `workspace:{id}` when admin adds/removes
   * `workspace:update` umbrella event after supplier activity changes (from C.5)

Event names and payload shapes are **non-negotiable** — they live in `@dmx/contracts/socket-events`. Frontend already binds them.

**Phase D success metric:**
* A test using a Socket.io client connects, subscribes to `workspace:{id}`, observes `rfq.state.changed` after a state transition.
* Browser DevTools network panel shows a single Socket.io WebSocket open at all times when the workspace is mounted.

---

### PHASE E · Frontend Cutover

**Goal:** Make `apps/frontend` the production frontend served to users.

**Tasks:**

1. **Connect Vite frontend to the new backend.** Update `.env.local` (`VITE_API_URL=http://localhost:4000/api`, `VITE_SOCKET_URL=http://localhost:4000`). For preview/staging, point to the deployed Node backend.
2. **Replace the supervisor entry for the live frontend.** Stop the existing React CRA build under `/app/frontend`. Start the Vite frontend's preview build under the same external URL.
3. **Update `/app/frontend/.env`** `REACT_APP_BACKEND_URL` only if any infrastructure still depends on it — otherwise replace with the new Vite-served URL. Coordinate with deployment config.
4. **Sunset the legacy CRA prototype:** archive `/app/frontend` and `/app/backend` directories under `/app/legacy/sprint-1-demo-shell/` for historical reference. Update `README.md` to point at the new monorepo.
5. **No new components.** No design changes. The 11 Sprint 2.5 components and 9 modified Sprint 2 components ship exactly as they are.

**Phase E success metric:**
* The external preview URL serves the Vite app.
* A real browser can: load `/login`, sign in as seeded admin, navigate to `/admin/dashboard`, then `/admin/rfq`, then open any seeded RFQ workspace, and see the WhatHappensNextCard + StateBadge + Storyline rendering real data from Postgres.

---

### PHASE F · E2E Test + Demo Data + Documentation

**Goal:** Prove the workflow end-to-end. Lock the result.

**Tasks:**

1. **Install Playwright.** Add a single `e2e/rfq-happy-path.spec.ts` that walks the canonical 9-step flow:
   * Buyer logs in → creates RFQ from a fixture → submits
   * Admin logs in → reviews the new RFQ → assigns 2 seeded suppliers → publishes
   * Supplier A logs in → views the RFQ → submits a quotation
   * Supplier B logs in → submits a competing quotation
   * Buyer logs back in → opens evaluation → selects Supplier A
   * Supplier A uploads a PI (attachment) → submits proforma
   * Buyer approves proforma → issues PO
   * Workspace state lands on `PO_ISSUED`. Timeline shows 9+ story events. Money summary shows winner total.

2. **Expand `prisma/seed.ts`** to add 3 demo RFQs in states `RFQ_OPEN`, `UNDER_EVALUATION`, `PROFORMA_RECEIVED` — useful for screenshots and design QA.

3. **Update `README.md` at repo root** with:
   * Quick start (clone → `yarn install` → `docker compose up postgres` → `prisma migrate deploy` → `prisma db seed` → `yarn dev`)
   * Architecture diagram (workspace + FSM + timeline + Next Action engine + Prisma/Postgres)
   * Test credentials reference
   * Pointer to `/app/docs/*` for FSM descriptors and Sprint reports

4. **Update `/app/memory/PRD.md`**:
   * Mark Integration Hardening Sprint complete (date)
   * Add the now-valid backend endpoint list
   * Move "deferred to Sprint 2.6" items into a "Sprint 3 prerequisites" section

**Phase F success metric:**
* `yarn e2e` produces a green Playwright run on a fresh `docker compose up`.
* `README.md` is current.
* Old FastAPI/Mongo demo shell is archived; supervisor no longer starts it.

---

## DELIVERABLES (in order)

1. Updated repo root (`/app/package.json`, `/app/apps/{frontend,backend}`, `/app/packages/contracts`)
2. `apps/backend/package.json`, `tsconfig.json`, `src/server.ts`
3. Full Prisma schema + migrations + seed
4. 10 backend modules implemented (auth, notifications, rfq, supplier-activity, quotations, attachments, telemetry, admin, clarifications, sockets)
5. ≥ 30 backend integration tests (supertest + isolated test DB)
6. Socket.io server emitting the 4+ canonical events
7. Vite frontend running against the new backend, served from the production URL
8. Playwright E2E test passing
9. Updated `README.md` + `PRD.md` + `test_credentials.md`
10. Legacy `/app/frontend` + `/app/backend` archived under `/app/legacy/`

---

## DEFINITION OF DONE

The sprint is complete only if **every** item below is verifiable:

* [ ] `yarn install` from `/app` completes with no peer-dependency or workspace errors
* [ ] `docker compose up postgres` brings up the database
* [ ] `yarn workspace @dmx/backend prisma:migrate` applies all migrations
* [ ] `yarn workspace @dmx/backend prisma:seed` populates demo users + organisations + RFQs
* [ ] `yarn dev` starts backend (`:4000`) and frontend (`:5173`) concurrently
* [ ] `curl /api/health` returns 200
* [ ] All 84 existing unit tests still pass (`yarn test`)
* [ ] ≥ 30 new backend integration tests pass
* [ ] Playwright E2E test for the 9-step RFQ happy path passes
* [ ] Live preview URL serves the new Vite app
* [ ] Legacy FastAPI shell is offline and archived under `/app/legacy/`
* [ ] `/app/memory/test_credentials.md` matches the seeded credentials
* [ ] Backend integration test demonstrates the Postgres FSM guard trigger blocks an illegal transition attempted via raw SQL
* [ ] No FSM transitions, descriptors or `@dmx/contracts` business types were modified
* [ ] No new design tokens, no new UI components were introduced

---

## NON-NEGOTIABLE RULES

1. **FSM is frozen.** If implementation reveals a precondition gap, **stop and ask** rather than patching the FSM.
2. **`@dmx/contracts` is the only source of truth** for state names, transitions, action labels, event names, and DTO shapes.
3. **One Primary CTA rule** stays enforced via `WhatHappensNextCard`.
4. **Idempotency keys are mandatory** on every mutating endpoint.
5. **All API responses use the `ApiError` envelope** defined in `@dmx/contracts/api`.
6. **No new components, no UI redesign.** The Sprint 2.5 frontend is final.
7. **No CommodityBid / Order workflow code.** Their FSM descriptors are documentation only this sprint.
8. **Auth must use `integration_playbook_expert_v2`** before any code is written.
9. **Every backend module gets at least one integration test.** Unit-only tests do not satisfy DoD.
10. **The old FastAPI/Mongo shell must be archived, not silently deleted.** Keep `/app/legacy/` as a snapshot.

---

## RISK REGISTER (acknowledge, do not solve here)

| Risk                                                                 | Mitigation in this sprint                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Postgres unavailable in the Emergent supervisor environment           | Use `docker compose` + a sidecar. If impossible, document and escalate before Phase B. |
| External preview URL routing tied to `:8001` (FastAPI port)            | Phase E coordinates the port swap explicitly                  |
| Refresh-token cookie domain across dev / preview / production         | Use `COOKIE_DOMAIN` env per environment                       |
| Existing JWTs from the FastAPI shell                                  | Sunset cleanly — Phase F seeds new credentials                |
| Browser users on old preview URL during cutover                       | Phase E ends with a hard cache-bust and one-line release note |

---

## SPRINT TIMEBOX

Two weeks. If Phase C is not complete by end of week 1, stop and re-scope before continuing — do not extend the sprint by parallelising frontend cutover early.

---

## SUCCESS CRITERION (single sentence)

> At the end of this sprint, a real importer and a real supplier — with credentials from `/app/memory/test_credentials.md` — can complete an RFQ from creation to PO issuance inside the running DeMaxtore platform, without the engineer being in the room.

When that one sentence is true, Sprint 3 (CommodityBid) can begin.
Not before.

---

**End of Integration Hardening Sprint prompt.**
