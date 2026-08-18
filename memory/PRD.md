# DeMaxtore — PRD (Integration Hardening Sprint)

## Original Problem Statement
Convert the existing reference implementation (Node.js/Express/Postgres/React/Vite) into the actual running product, replacing the legacy Sprint 1 demo shell (FastAPI/MongoDB/React CRA).

## Architecture (post-Phase F)
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL (port **8001**, supervisor `dmx-backend`)
- **Frontend**: React + Vite + TypeScript + Tailwind + Zustand + react-query (port **3000**, supervisor `dmx-frontend`)
- **Realtime**: Socket.io with JWT handshake, `user:`/`role:`/`workspace:` rooms + ACL
- **Contracts**: `packages/contracts` — FSM, zod schemas, socket-events (FROZEN; single source of truth)
- **Legacy (retired, not deleted)**: FastAPI under `/app/backend` + CRA under `/app/frontend` + archived `/app/legacy/sprint-1-demo-shell/`. Supervisor entries stopped.

## Roles
- **BUYER**: creates and drives RFQ workflows
- **SUPPLIER**: receives invitations, submits quotations, proforma
- **ADMIN**: triages RFQs, assigns suppliers, publishes, observes everything

## What's been implemented (chronological)
- **Phase 0 (audit)**: Inventory + gap analysis between reference code & running prototype.
- **Phase A (2026-06-02)**: Monorepo lift; Postgres under supervisor; legacy archived.
- **Phase B (2026-06-02)**: Prisma schema (20 models, 7 enums), state-guard SQL triggers, idempotent seed (7 users, 3 RFQs).
- **Phase C (2026-06-02)**: Auth (login/logout/refresh/me/forgot/reset), RBAC, brute-force lock, notifications CRUD, health, Socket.io scaffold. **Testing agent: 29/29 green.**
- **Phase D (2026-06-02)**: 38 RFQ endpoints, `applyTransition()` single gateway, audit logs, idempotency middleware, 12 new service methods. 26 curl + 22 vitest green.
- **Phase E (2026-06-02)**: Socket emit lit up — `notification:new`, `timeline:new`, `workspace:update`, `rfq.state.changed`, `rfq.timeline.appended` to user/role/workspace rooms. Workspace subscribe ACL. Live test passed.
- **Phase F (2026-06-02)**: **Cutover.** Legacy stopped, new Node backend on 8001, Vite on 3000, supervisor configs for `dmx-backend` + `dmx-frontend`. All smoke tests green; Phase E live socket scenario re-run on 8001 → PASSED.

## Backlog
### P0 — remaining
- (none for Integration Hardening; Phases A–F complete)

### P1 — polish
- **Phase G**: Attachment upload (multer), email delivery (forgot-password + proforma SLA), telemetry ingest, idempotency write-through INSERT-ON-CONFLICT.
- **Phase H**: Playwright e2e (Buyer → Supplier → Admin full flow).

### P2 — future
- Sprint 3: CommodityBid workspace implementation.
- Sprint 4: Order workspace + FreightIQ + Inspection + Shipment Visibility.

## Test credentials
See `/app/memory/test_credentials.md`. All seeded users: password `Passw0rd!`.

## Key files
- `/app/apps/backend/src/server.ts` — entrypoint
- `/app/apps/backend/src/modules/rfq/rfq.service.ts` — `applyTransition()` (FROZEN gateway)
- `/app/apps/backend/src/realtime/socket.ts` — handshake + subscribe ACL
- `/app/apps/backend/prisma/schema.prisma` — DB schema
- `/app/packages/contracts/` — FSM + zod + socket-events (FROZEN)
- `/app/apps/frontend/src/lib/api.ts` — axios + silent refresh interceptor
- `/app/apps/frontend/src/lib/socket.ts` — useWorkspaceSocket hook

## Reports
- `/app/docs/integration-hardening-phase-{0,a,b,c,d,e,f}-report.md`
- `/app/test_reports/iteration_2.json` — Phase C testing agent (29/29)
