# Integration Hardening — Phase C Report

**Status:** ✅ Complete
**Date:** 2026-06-02
**Backend (new):** Node.js + Express + Prisma · ESM + TypeScript · running on **port 8002** (dev only — see "Port note" below).
**Legacy stack:** Untouched — FastAPI still on 8001, React CRA still on 3000 under supervisor (per Phase 0 plan; cutover happens in Phase F).

---

## Scope delivered

| Module | Status |
|---|---|
| Express server scaffold (helmet, cors, morgan→pino, cookie-parser, JSON body) | ✅ |
| `/api` router composition (single mount point) | ✅ |
| Global error middleware → canonical `@dmx/contracts` `ApiError` envelope | ✅ |
| `/api/healthz` (DB probe + uptime) | ✅ |
| JWT auth — access (15min, `JWT_SECRET`) + refresh (7d, `JWT_REFRESH_SECRET`), HS256, rotation | ✅ |
| Refresh tokens hashed (SHA-256) at rest in `refresh_tokens`; revoked on logout / rotation / reuse | ✅ |
| `bcryptjs` password hashing (10 rounds) | ✅ |
| Auth endpoints: `login`, `logout`, `refresh`, `me`, `forgot-password`, `reset-password` | ✅ |
| Cookie config: httpOnly + sameSite=lax + path=`/api/auth` + `secure` in prod | ✅ |
| RBAC middleware: `requireAuth`, `requireRole(...roles)` | ✅ |
| Brute-force protection: 5 fails → 15 min lockout (in-memory; replace w/ Redis later) | ✅ |
| Zod validation (mounts contracts schemas verbatim) | ✅ |
| Notifications CRUD (`list`, `:id/read`, `read-all`) — DB-backed, cursor-paginated, scoped by user | ✅ |
| Socket.io scaffold — JWT handshake, `user:{id}` / `role:{R}` / `workspace:{id}` rooms, **no event emission** (Phase E wires the FSM bridge) | ✅ |
| Generic forgot-password (no enumeration); reset revokes all refresh tokens for safety | ✅ |
| Graceful shutdown (SIGINT/SIGTERM → server.close + prisma.$disconnect) | ✅ |

---

## Manual verification (20 curl checks, all green)

```
✓  GET  /api/healthz                         → 200 {status:"ok", db:"up"}
✓  POST /api/auth/login                      → 200 + Bearer + refresh cookie
✓  GET  /api/auth/me  (Bearer)               → 200 user DTO
✓  GET  /api/auth/me  (no token)             → 401 UNAUTHENTICATED
✓  POST /api/auth/login (bad pw)             → 401 INVALID_CREDENTIALS
✓  POST /api/auth/refresh (cookie)           → 200 new access + new cookie (rotation)
✓  POST /api/auth/logout                     → 200 ok; refresh cookie cleared, DB row revoked
✓  POST /api/auth/refresh (post-logout)      → 401 (no cookie)
✓  GET  /api/notifications     (buyer1)      → 200 items[2] unreadCount=2
✓  POST /api/notifications/:id/read           → 200 read:true, readAt set
✓  POST /api/notifications/read-all          → 200 {updated:1}
✓  POST /api/notifications/:id/read (other)  → 404 NOT_FOUND  ← cross-user isolation
✓  GET  /api/nope                            → 404 NOT_FOUND
✓  POST /api/auth/login (empty body)         → 400 VALIDATION_ERROR + zod issues
✓  POST /api/auth/forgot-password (real)     → 200 {ok:true} + reset link logged
✓  POST /api/auth/forgot-password (unknown)  → 200 {ok:true}   ← no enumeration
✓  5× POST /api/auth/login (bad pw)          → 5× 401
✓  6th attempt                               → 429 PRECONDITION_FAILED, 15-min lock
✓  Correct password during lock              → 429 (lock honoured)
✓  Bearer flow consistent across BUYER/SUPPLIER/ADMIN roles
```

Server log line counts confirm 200/401/400/404/429 paths all flow through the canonical error envelope.

---

## File map (Phase C — created / modified)

```
apps/backend/
├── .env                                          ✎ PORT=8002 (dev) + dotenv loader
├── tsconfig.json                                 ✎ removed strict rootDir for @dmx/contracts import
└── src/
    ├── server.ts                                 + entrypoint: HTTP + Socket.io, graceful shutdown
    ├── app.ts                                    + Express builder (helmet/cors/morgan/json/cookies/error)
    ├── routes.ts                                 + /api composition (auth + notifications + health)
    ├── config/
    │   ├── env.ts                                + zod-validated env loader, fail-fast
    │   └── logger.ts                             + pino + pino-pretty (dev only)
    ├── db/
    │   └── prisma.ts                             + singleton client (HMR-safe)
    ├── lib/
    │   └── errors.ts                             + HttpError + named helpers (Unauthorized/Forbidden/…)
    ├── middleware/
    │   ├── error.ts                              + global error → ApiError envelope; 404 handler
    │   ├── asyncHandler.ts                       + Promise → next(err) wrapper
    │   ├── validate.ts                           + validateBody / validateQuery (zod)
    │   └── auth.ts                               + requireAuth + requireRole(...roles)
    ├── modules/
    │   ├── auth/
    │   │   ├── jwt.ts                            + sign/verify access+refresh, SHA-256 hashing, jti
    │   │   ├── bruteforce.ts                     + in-memory 5-fail/15-min lockout per (ip,email)
    │   │   ├── auth.service.ts                   + login/refresh/logout/me/forgot/reset business logic
    │   │   ├── auth.controller.ts                + 6 controllers + cookie handling
    │   │   └── auth.routes.ts                    + POST login/refresh/logout/forgot/reset, GET me
    │   ├── notifications/
    │   │   ├── notifications.service.ts          + list (cursor) + markRead + markAllRead
    │   │   ├── notifications.controller.ts       + 3 controllers (all behind requireAuth)
    │   │   └── notifications.routes.ts           + GET / + POST /:id/read + POST /read-all
    │   └── health/
    │       └── health.routes.ts                  + GET / → 200/503 + db probe
    └── realtime/
        └── socket.ts                             + Socket.io init + JWT handshake + room routing (idle)

auth_testing.md                                   + testing playbook for testing agent
docs/integration-hardening-phase-c-report.md      + this file
```

Lines of code added: ~750 (TypeScript, strict mode, `tsc --noEmit` passes with **zero** errors).

---

## Port note (important for Phase F)

The new Node backend is currently bound to **port 8002** because the legacy FastAPI service (supervisor process `backend`) still occupies **8001** by Phase 0 design ("keep legacy running until verified"). Phase F (cutover) will:

1. Stop the legacy supervisor `backend` and `frontend` processes.
2. Move new Node backend to 8001 (just flip `PORT=8001` in `apps/backend/.env`).
3. Move new Vite frontend to 3000 (supervisor swap).
4. Add new supervisor configs for `dmx-backend` and `dmx-frontend`.

For Sprint Phase D testing we'll continue to use **`http://localhost:8002/api/*`** from curl/scripts, and `apps/frontend/.env` should point `VITE_API_URL=http://localhost:8002` until cutover.

---

## Dev server

Currently running as a foreground `tsx watch` process (PID 19450). For convenience:

```bash
# stop
pkill -f "tsx watch src/server.ts"

# start (foreground)
cd /app/apps/backend && yarn dev

# start (background, logs → /tmp/dmx-backend.log)
cd /app/apps/backend && (nohup npx tsx watch src/server.ts > /tmp/dmx-backend.log 2>&1 &)
```

---

## Known gaps / deferred to later phases

| Item | Phase |
|---|---|
| RFQ workspace endpoints (CRUD, FSM transitions) | D |
| Email delivery for `forgot-password` (currently logs reset link) | G |
| Real-time event emission to socket rooms (FSM → socket bridge) | E |
| Supervisor config swap (new backend on 8001, Vite on 3000) | F |
| Frontend axios interceptor for silent 401 → refresh | F |
| Idempotency-key middleware (table already exists) | D / G |
| Audit log writer middleware | D |
| Telemetry events ingest | G |

---

## Credentials (unchanged from Phase B)

All seeded users share password **`Passw0rd!`**. See `/app/memory/test_credentials.md`.

## Next phase

**Phase D — RFQ Module Integration:** plug the existing `apps/backend/src/modules/rfq/*` (controller, service, policy, preconditions, routes, notifications) into the new Express app, using `@dmx/contracts` FSM as the immutable source of truth. Audit log writer + idempotency middleware come along.
