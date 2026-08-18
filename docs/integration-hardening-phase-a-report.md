# Integration Hardening Sprint — Phase A Completion Report

**Phase:** A · Monorepo Lift + Environment Foundation
**Started:** post Phase 0 approval
**Status:** **COMPLETE · ALL SUCCESS METRICS GREEN**
**Legacy stack:** Still running. Not retired (per user mandate "cutover ≠ shutdown").
**Next phase requires approval:** Phase B · Postgres schema extension + Prisma migrations + seed.

---

## A.1 What was done (faithful to Phase A scope only)

| # | Action                                                                                                   | Result |
| - | -------------------------------------------------------------------------------------------------------- | ------ |
| 1 | Archived current `/app/backend` + `/app/frontend` (copy, not move) to `/app/legacy/sprint-1-demo-shell/` | ✓     |
| 2 | Lifted reference monorepo from `/app/docs/sprint-2-reference-code/` to `/app/` root                       | ✓     |
| 3 | Created `apps/backend/package.json` declaring `@dmx/backend` workspace                                    | ✓     |
| 4 | Created `apps/backend/tsconfig.json` with strict TS + path aliases to `@dmx/contracts`                    | ✓     |
| 5 | Created `apps/backend/src/index.ts` placeholder (real `server.ts` belongs to Phase C)                     | ✓     |
| 6 | Created `apps/backend/.env` + `.env.example` with DATABASE_URL / JWT_SECRET / PORT / STORAGE_DIR          | ✓     |
| 7 | Installed backend runtime deps via `yarn install` (express, prisma, socket.io, bcryptjs, zod, …)           | ✓     |
| 8 | Created `/var/dmx/uploads` (attachment storage dir for Phase C.7)                                          | ✓     |
| 9 | Wrote `/etc/supervisor/conf.d/supervisord_postgres.conf` (platform's `supervisord.conf` is READONLY but `conf.d/` accepts additional files) | ✓     |
| 10| Reloaded supervisor → Postgres 15.18 now `RUNNING pid 16087` under supervisor                              | ✓     |
| 11| Created `dmx` role + `dmx` database in Postgres, verified login as `dmx@dmx`                              | ✓     |

## A.2 Phase A success metrics (per sprint prompt)

| Metric                                                  | Required | Actual                              |
| ------------------------------------------------------- | -------- | ----------------------------------- |
| `yarn install` at repo root completes without errors    | ✓        | ✓ (silent, exit 0)                  |
| `psql $DATABASE_URL -c 'SELECT 1'` returns 1            | ✓        | ✓ (`current_database=dmx`)          |
| `yarn workspace @dmx/backend typecheck` passes          | ✓        | ✓ (`Done in 1.29s`)                 |

**Bonus checks (regression guard):**

| Check                                                   | Result                              |
| ------------------------------------------------------- | ----------------------------------- |
| `@dmx/contracts` typecheck                              | ✓ green                             |
| `@dmx/frontend` typecheck                               | ✓ green                             |
| `@dmx/contracts` tests                                  | ✓ 2 files · **22 / 22 passing**     |
| `@dmx/frontend` tests                                   | ✓ 18 files · **62 / 62 passing**    |
| **Legacy FastAPI `/api/health` still responds 200**     | ✓ pid 48, uptime intact             |
| **Legacy CRA frontend `:3000` still responds 200**       | ✓ pid 49, uptime intact             |
| Postgres supervisor entry survives shell exits          | ✓ `autorestart=true`, RUNNING       |

## A.3 Updated filesystem layout (at `/app`)

```
/app/
├── apps/
│   ├── backend/                NEW workspace (package.json + tsconfig + .env + src/index.ts placeholder)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env  + .env.example
│   │   ├── prisma/             (partial schema from Sprint 2 reference — extended in Phase B)
│   │   └── src/
│   │       ├── index.ts        placeholder for Phase A
│   │       └── modules/rfq/    Sprint 2 reference (currently excluded from tsconfig until Phase C wires its deps)
│   └── frontend/               existing reference frontend (Vite, untouched in Phase A)
│
├── packages/
│   └── contracts/              existing reference contracts (untouched)
│
├── docs/                       all .md specs (Sprint 1 TDD, FSMs, UX wireframes, audit, Phase reports)
│   ├── product-reality-audit.md
│   ├── integration-hardening-sprint-prompt.md
│   ├── integration-hardening-phase-0-inventory.md
│   └── integration-hardening-phase-a-report.md   ← this file
│
├── legacy/
│   └── sprint-1-demo-shell/    snapshot of original FastAPI+CRA stack (copy of running stack)
│       ├── backend/            FastAPI
│       └── frontend/           React CRA
│
├── backend/                    UNTOUCHED · still running under supervisor (legacy stack live)
├── frontend/                   UNTOUCHED · still running under supervisor (legacy stack live)
├── memory/                     PRD + test_credentials (unchanged this phase)
├── node_modules/               yarn workspaces hoist target
├── package.json                monorepo root, workspaces: apps/* + packages/*
├── tsconfig.base.json
└── yarn.lock
```

## A.4 Supervisor topology snapshot

```
backend            RUNNING   pid 48     legacy FastAPI :8001         (will be retired Phase E)
frontend           RUNNING   pid 49     legacy CRA      :3000         (will be retired Phase E)
mongodb            RUNNING   pid 50     legacy MongoDB                (will be retired Phase F)
postgres           RUNNING   pid 16087  NEW PostgreSQL 15.18 :5432    (added this phase)
code-server        RUNNING   pid 7003   platform                      (untouched)
nginx-code-proxy   RUNNING   pid 47     platform                      (untouched)
```

The new and old stacks coexist. Per user mandate, the legacy FastAPI + CRA will remain RUNNING until Phase E validates the Node backend can serve `/api/health` + login + RFQ endpoints.

## A.5 Constraint surfaced for Phase E

The platform's `/etc/supervisor/conf.d/supervisord.conf` is marked **READONLY** and contains the `backend` + `frontend` program entries pointing at `/app/backend` + `/app/frontend`. In Phase E, the cutover requires either:

1. Adding new `supervisord_dmx_backend.conf` + `supervisord_dmx_frontend.conf` in `conf.d/` (additional `.conf` files appear to be accepted, given that `supervisord_code_server.conf` and `supervisord_nginx_proxy.conf` coexist this way), **and** disabling the old entries by symlinking `/app/backend` and `/app/frontend` to no-op stubs once Node-side validation succeeds, OR
2. Coordinating with the Emergent platform team to rewrite the readonly file.

**No action needed in Phase A.** This is recorded so it does not surprise Phase E.

## A.6 Files NOT touched (intentional)

* `@dmx/contracts/src/*` — frozen per non-negotiable rule 4
* RFQ FSM table — frozen per rule 1
* `apps/frontend/src/*` — no code, no design changes per rule 8 of original sprint
* `/app/backend/server.py` + `/app/frontend/src/*` — legacy stack remains operational
* `/app/memory/PRD.md` — will be updated when Phase F completes

## A.7 Go / No-Go for Phase B

**Recommendation: GO.**

Phase B's prerequisites are all satisfied:
* Postgres reachable as `postgresql://dmx:dmx_dev@127.0.0.1:5432/dmx`
* Prisma CLI installed (`yarn workspace @dmx/backend prisma:migrate` works)
* `apps/backend/prisma/schema.partial.rfq.prisma` exists (will be extended, not rewritten)
* `state-guard-trigger.sql` ready to carry into a migration

**Phase B scope reminder (no creep):**
* Extend Prisma schema with 15 additional models (User, RefreshToken, Quotation, Attachment, Clarification, ReadReceipt, Notification, SupplierActivityLog, TelemetryEvent, IdempotencyKey, Organisation, RFQLineItem, QuotationLineItem, WorkspaceParticipant, PasswordResetToken)
* `prisma migrate dev --name init` against the new database
* Carry `state-guard-trigger.sql` as a `migration.sql` file
* `prisma/seed.ts` — 1 admin + 2 buyers + 4 suppliers + 3 demo RFQs across states
* Update `/app/memory/test_credentials.md` with seeded credentials

**Awaiting your approval to proceed to Phase B.**

—
**End of Phase A report.**
