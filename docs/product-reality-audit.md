# DeMaxtore — Product Reality Audit

**Date of audit:** 2026-02
**Auditor mandate:** Reality assessment only. No development, no redesign, no plans.
**Question to answer:** *Do we currently have a working product, or do we primarily have architecture, documentation and reference code?*

---

## Executive Summary

| Dimension                         | Verdict                                                  |
| --------------------------------- | -------------------------------------------------------- |
| **Overall Product Status**        | **NO** — a real importer + supplier cannot complete an RFQ today |
| **Runtime Status**                | **PARTIALLY STARTABLE** — Sprint 1 shell runs; Sprint 2/2.5 stack cannot run in this environment |
| **Sprint 3 Status**               | **NOT READY**                                            |

**One-paragraph reality check.** There are effectively **two parallel codebases** in this repository:

1. **The live application** at `/app/backend` (FastAPI + MongoDB) + `/app/frontend` (React CRA), running under supervisor, reachable at `https://demaxstore-platform.preview.emergentagent.com`. It contains Sprint 1 — auth, notifications, role-aware dashboards, and **placeholder workspace pages with mock data only**. It exposes **no RFQ endpoints**, no quotation endpoints, no supplier-activity endpoints, no FSM transitions.

2. **The Sprint 2 + Sprint 2.5 reference monorepo** at `/app/docs/sprint-2-reference-code/` (Node + Express + Postgres + Prisma + Vite + React). It contains all the FSM logic, all 11 new components, 84 passing unit tests — but it is **not integrated with the running application** and **cannot run in this environment** (no Postgres, no backend `package.json`, no server bootstrap, MongoDB instead of Postgres, no migrations executed).

The product as a user would experience it today is Sprint 1. Everything since (RFQ workspace, FSM, quotations, proforma, PO, Sprint 2.5 UX upgrades) is documentation and reference code.

---

## Task 1 — Implementation Matrix

| Feature                                | Status                  | Evidence                                                                                                                       |
| -------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Sprint 1**                           |                         |                                                                                                                                |
| Authentication (login, refresh, logout)| IMPLEMENTED             | `/app/backend/server.py` exposes `/api/auth/*` (verified 200 on `/api/health`)                                                  |
| Forgot/Reset password                  | IMPLEMENTED             | `/app/backend/server.py` `forgot-password`, `reset-password` routes; `/app/frontend/src/pages/auth/`                            |
| RBAC + role-based routes               | IMPLEMENTED             | Buyer/Supplier/Admin dashboards exist as React pages                                                                            |
| Dashboard shell (Buyer/Supplier/Admin) | IMPLEMENTED             | `/app/frontend/src/pages/dashboards/*.jsx`                                                                                       |
| Sidebar/Header navigation              | IMPLEMENTED             | Sprint 1 layout shipped in live frontend                                                                                         |
| Notification framework (UI + bell)     | IMPLEMENTED             | `/api/notifications`, `/api/notifications/:id/read`, `/api/notifications/read-all` in `server.py`; `Notifications.jsx` page    |
| Workspace placeholder routes           | IMPLEMENTED             | `/app/frontend/src/pages/Workspace.jsx` exists, badged *"Foundation · Sprint 1"*, reads from `workspaceMockMeta`                |
| **Sprint 2 — RFQ Workflow**            |                         |                                                                                                                                |
| RFQ Create page                        | REFERENCE ONLY          | `/app/docs/sprint-2-reference-code/apps/frontend/src/features/rfq/pages/RfqCreatePage.tsx`. Not loaded by live frontend.       |
| RFQ List page                          | REFERENCE ONLY          | Same path. Not loaded.                                                                                                          |
| RFQ Workspace page                     | REFERENCE ONLY          | `RfqWorkspacePage.tsx` (the new 8-zone layout). Not loaded.                                                                     |
| RFQ Detail/Timeline                    | REFERENCE ONLY          | `RfqTimeline.tsx` in /docs. Not loaded.                                                                                          |
| RFQ State Machine                      | REFERENCE ONLY          | `packages/contracts/src/rfq.fsm.ts` (40 transitions). Unit tests pass. No live backend uses it.                                  |
| RFQ Next Actions engine                | REFERENCE ONLY          | `packages/contracts/src/rfq.next-actions.ts`. Unit tests pass. Not integrated.                                                  |
| RFQ Attachments                        | REFERENCE ONLY          | `RfqDocumentsPanel.tsx` calls `/api/rfq/:id/attachments` which does NOT exist on live backend                                    |
| **Sprint 2 — Supplier Flow**           |                         |                                                                                                                                |
| Supplier Assignment                    | NOT FOUND               | No admin assignment UI in live frontend; no endpoint in live backend                                                            |
| Supplier Invitation                    | NOT FOUND               | No invitation flow                                                                                                              |
| Supplier RFQ Access                    | NOT FOUND               | No supplier-side RFQ page exists in either codebase                                                                              |
| Supplier Quotation Submission          | NOT FOUND               | Quotation submission UI not built; no quotation API in either codebase                                                          |
| **Sprint 2 — Buyer Flow**              |                         |                                                                                                                                |
| Quotation Comparison                   | REFERENCE ONLY          | `QuotationComparisonPanel.tsx` exists in /docs. No backend feeds it.                                                            |
| Supplier Selection                     | REFERENCE ONLY          | FSM transition + hook exists in /docs; no live endpoint                                                                          |
| Award Workflow                         | NOT FOUND               | No CommodityBid + Order spawning logic implemented anywhere                                                                      |
| **Sprint 2 — Order Flow**              |                         |                                                                                                                                |
| PI (Proforma) Upload                   | NOT FOUND               | No upload UI; no endpoint; not in /docs reference either                                                                          |
| PI Approval                            | REFERENCE ONLY          | FSM transitions exist (`approve_proforma`); no UI/backend                                                                        |
| Purchase Order Creation                | REFERENCE ONLY          | FSM transition (`issue_po`); no UI/backend                                                                                       |
| **Sprint 2 — Notifications**           |                         |                                                                                                                                |
| Notification Service (backend)         | PARTIALLY IMPLEMENTED   | Live backend stores notifications in MongoDB; **no integration with RFQ state changes** (no RFQ exists to trigger them)         |
| Email Notifications                    | NOT FOUND               | No mailer / SendGrid / Resend integration anywhere                                                                                |
| In-App Notifications                   | IMPLEMENTED             | UI + storage + read/read-all routes exist                                                                                         |
| **Sprint 2 — Realtime**                |                         |                                                                                                                                |
| Socket Infrastructure                  | NOT FOUND               | Live backend (FastAPI) has no Socket.IO setup. `/docs` reference assumes Node Socket.io.                                          |
| Socket Events                          | REFERENCE ONLY          | `packages/contracts/src/socket-events.ts` defines the events. No runtime emits them.                                              |
| Live Workspace Updates                 | NOT FOUND               | No real-time channel reaches the running frontend                                                                                 |
| Live Notification Updates              | NOT FOUND               | Same                                                                                                                              |
| **Sprint 2.5 — UX upgrades**           |                         |                                                                                                                                |
| WhatHappensNextCard                    | REFERENCE ONLY          | `/app/docs/sprint-2-reference-code/.../WhatHappensNextCard.tsx`                                                                  |
| WaitingStateCard                       | REFERENCE ONLY          | Same path                                                                                                                        |
| SupplierActivityStrip + Drawer         | REFERENCE ONLY          | Same path; calls `/api/rfq/:id/supplier-activity` which doesn't exist on any running backend                                      |
| QuotationComparisonPanel               | REFERENCE ONLY          | Same path                                                                                                                        |
| MoneySummaryPanel                      | REFERENCE ONLY          | Same path                                                                                                                        |
| ActionDrawer + CTA hierarchy refactor  | REFERENCE ONLY          | Same path                                                                                                                        |
| TriageSlaWidget                        | REFERENCE ONLY          | Same path                                                                                                                        |
| Workspace Telemetry capture            | REFERENCE ONLY          | `useTelemetry.ts` posts to `/api/telemetry` — endpoint does not exist                                                            |
| State Storyline (buyer-readable)       | REFERENCE ONLY          | `state-labels.ts` in /docs                                                                                                       |
| Clarifications upgrade                 | REFERENCE ONLY          | Read receipts / @mention / visibility / attachments — all in /docs only                                                          |
| Documents upgrade (drag-drop)          | REFERENCE ONLY          | Same                                                                                                                              |
| Timeline refactor (collapsed/tiered)   | REFERENCE ONLY          | Same                                                                                                                              |
| Admin Triage SLA Widget                | REFERENCE ONLY          | Same                                                                                                                              |

---

## Task 1.5 — Reference Code Detection

Every file below exists in `/app/docs/sprint-2-reference-code/` and is **not imported by the running application** (live app is React CRA at `/app/frontend`; these files are inside a separate yarn monorepo never registered with the live build).

| File                                                                       | Type                  | Referenced By Running App |
| -------------------------------------------------------------------------- | --------------------- | ------------------------- |
| `packages/contracts/src/rfq.fsm.ts`                                         | TS · FSM table         | **No**                    |
| `packages/contracts/src/rfq.next-actions.ts`                                | TS · CTA engine        | **No**                    |
| `packages/contracts/src/rfq.zod.ts`                                         | TS · DTO schemas       | **No**                    |
| `packages/contracts/src/auth.ts`                                            | TS · DTO               | **No**                    |
| `packages/contracts/src/notifications.ts`                                   | TS · DTO               | **No**                    |
| `packages/contracts/src/socket-events.ts`                                   | TS · event names       | **No**                    |
| `packages/contracts/src/api.ts`                                             | TS · error envelope    | **No**                    |
| `packages/contracts/src/telemetry.ts`                                       | TS · event names       | **No**                    |
| `packages/contracts/src/supplier-activity.ts`                               | TS · DTO               | **No**                    |
| `apps/backend/src/modules/rfq/rfq.service.ts`                               | TS · FSM application   | **No** (server entry absent) |
| `apps/backend/src/modules/rfq/rfq.controller.ts`                            | TS · HTTP handlers     | **No**                    |
| `apps/backend/src/modules/rfq/rfq.routes.ts`                                | TS · Express router    | **No**                    |
| `apps/backend/src/modules/rfq/rfq.policy.ts`                                | TS · permissions       | **No**                    |
| `apps/backend/src/modules/rfq/rfq.preconditions.ts`                         | TS · invariants        | **No**                    |
| `apps/backend/src/modules/rfq/rfq.notifications.ts`                         | TS · notify wiring     | **No**                    |
| `apps/backend/prisma/schema.partial.rfq.prisma`                              | Prisma                 | **No** (no Postgres in env) |
| `apps/backend/prisma/migrations/state-guard-trigger.sql`                     | SQL                    | **No**                    |
| `apps/frontend/src/features/rfq/components/WhatHappensNextCard.tsx`         | React component        | **No**                    |
| `apps/frontend/src/features/rfq/components/WaitingStateCard.tsx`            | React component        | **No**                    |
| `apps/frontend/src/features/rfq/components/SupplierActivityStrip.tsx`       | React component        | **No**                    |
| `apps/frontend/src/features/rfq/components/SupplierActivityDrawer.tsx`      | React component        | **No**                    |
| `apps/frontend/src/features/rfq/components/QuotationComparisonPanel.tsx`    | React component        | **No**                    |
| `apps/frontend/src/features/rfq/components/MoneySummaryPanel.tsx`           | React component        | **No**                    |
| `apps/frontend/src/features/rfq/components/ActionDrawer.tsx`                | React component        | **No**                    |
| `apps/frontend/src/features/rfq/components/Rfq{Timeline,Documents,Clarification,Progress,State,NextActions,Participants}*.tsx` | React components | **No** |
| `apps/frontend/src/features/rfq/pages/Rfq{Create,List,Workspace}Page.tsx`   | React pages            | **No**                    |
| `apps/frontend/src/features/telemetry/useTelemetry.ts`                      | React hook             | **No**                    |
| `apps/frontend/src/features/dashboard/components/TriageSlaWidget.tsx`       | React component        | **No**                    |
| `docs/sprint-1-developer-handoff.md`                                         | Markdown               | n/a (doc)                 |
| `docs/sprint-1-tdd.md`                                                       | Markdown               | n/a (doc)                 |
| `docs/rfq-state-machine.md`                                                  | Markdown               | n/a (doc)                 |
| `docs/commoditybid-state-machine.md`                                         | Markdown               | n/a (doc)                 |
| `docs/order-state-machine.md`                                                | Markdown               | n/a (doc)                 |
| `docs/sprint-2-implementation-plan.md`                                       | Markdown               | n/a (doc)                 |
| `docs/sprint-2-frontend-completion-report.md`                                | Markdown               | n/a (doc)                 |
| `docs/sprint-2-ux-review.md`                                                 | Markdown               | n/a (doc)                 |
| `docs/sprint-2.5-ux-redesign-wireframes.md`                                  | Markdown               | n/a (doc)                 |
| `docs/sprint-2.5-completion-report.md`                                       | Markdown               | n/a (doc)                 |

**Summary:** ~85 TypeScript / TSX files + 10 markdown specs live in `/app/docs/`. **Zero** of them are imported by the running application's bundle.

---

## Task 2.5 — Runtime Verification

### Live application stack (what supervisor actually runs)

| Dimension              | Reality                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Backend process        | FastAPI · `/app/backend/server.py` · 476 LOC · running (pid 48, uptime 3h+) on `:8001`                         |
| Backend exposed routes | `/api/auth/{login,refresh,logout,me,forgot-password,reset-password}` · `/api/notifications*` · `/api/health` |
| Database               | MongoDB (running pid 50) — **not** PostgreSQL                                                                  |
| Frontend process       | React CRA (`react-scripts`) at `:3000`, deployed to `https://demaxstore-platform.preview.emergentagent.com` |
| Frontend tech          | Plain React 18 + CRA + JS (`.jsx`), uses `workspaceMockMeta` from `/app/frontend/src/lib/mockData`            |
| Health check           | `curl /api/health` → 200                                                                                       |
| Auth                   | Works end-to-end (login/refresh/notifications)                                                                |
| RFQ                    | Endpoint does not exist; UI does not exist beyond a "Sprint 1 Foundation" placeholder                          |
| Realtime / Socket.io   | Not configured                                                                                                 |
| Email                  | Not configured                                                                                                 |

→ **Live app verdict: STARTABLE and RUNNING — but only the Sprint 1 surface.**

### Sprint 2 + 2.5 reference monorepo (`/app/docs/sprint-2-reference-code/`)

| Dimension                | Reality                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Monorepo declared        | `package.json` lists `workspaces: ["apps/*", "packages/*"]`                                                         |
| Workspace `@dmx/frontend`| Exists with `package.json`, Vite config, builds, 62 unit tests pass                                                |
| Workspace `@dmx/contracts`| Exists, 22 unit tests pass                                                                                         |
| Workspace `@dmx/backend` | **Missing** — `apps/backend/` has TypeScript module files but **no `package.json`, no `tsconfig.json`, no server entry (`server.ts` / `index.ts` / `app.ts`)** |
| `dev:backend` script     | Defined in root `package.json` but resolves to a non-existent workspace → would fail immediately                    |
| Postgres                 | Not installed; not running; environment doesn't ship it                                                             |
| Prisma                   | `schema.partial.rfq.prisma` is partial (one model fragment); no `prisma migrate dev` ever executed                  |
| Server bootstrap         | Not present. Only RFQ module files exist — no Express app composes the modules. No auth module, no notifications module, no telemetry endpoint, no supplier-activity endpoint, no quotations endpoint. |
| Socket.io server         | Not implemented                                                                                                     |
| Integration with live UI | None — the live React CRA never imports anything from `/app/docs/`                                                  |

→ **Reference monorepo verdict: REFERENCE ONLY.** It cannot be started in this environment without:
- installing PostgreSQL,
- writing a backend `package.json`,
- writing `server.ts` to compose the RFQ module + auth + notifications + Socket.io,
- writing 8+ missing backend modules (auth, notifications, supplier-activity, quotations, attachments, telemetry, admin-queue, mailer),
- running Prisma migrations.

---

## Task 3 — End-to-End RFQ Flow Assessment

| Step                                  | Status         | Notes                                                                                                                      |
| ------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1. Buyer → Create RFQ                  | NOT SUPPORTED  | Live frontend has no RFQ create page. Live backend has no `POST /api/rfq` endpoint. Reference monorepo can't run.          |
| 2. Admin → Assign Supplier             | NOT SUPPORTED  | No admin assignment UI in live app; no endpoint; no FSM transition reachable via running runtime.                          |
| 3. Supplier → Receive RFQ              | NOT SUPPORTED  | No supplier RFQ list/detail page in live app. No invitation mechanism.                                                     |
| 4. Supplier → Submit Quotation         | NOT SUPPORTED  | No quotation submission UI/API in either codebase.                                                                          |
| 5. Buyer → Compare Quotations          | NOT SUPPORTED  | `QuotationComparisonPanel` exists only in /docs reference; live app cannot render it.                                       |
| 6. Buyer → Select Supplier             | NOT SUPPORTED  | FSM transition defined; no endpoint reachable on running backend.                                                            |
| 7. Supplier → Upload PI (Proforma)     | NOT SUPPORTED  | No upload UI on live app. No proforma file model. No FSM-bound endpoint.                                                    |
| 8. Buyer → Approve PI                  | NOT SUPPORTED  | FSM transition defined in /docs only.                                                                                       |
| 9. Buyer → Create PO                   | NOT SUPPORTED  | FSM transition `issue_po` defined in /docs only.                                                                            |

**Number of steps SUPPORTED today: 0 of 9.**

---

## Task 4 — Critical Blockers (ranked by severity)

| Rank | Blocker                                                                                       | Severity   |
| ---- | --------------------------------------------------------------------------------------------- | ---------- |
| 1    | **Backend stack mismatch.** Live = FastAPI + MongoDB; spec/reference = Node + Express + Postgres. The two cannot interoperate — every RFQ endpoint must be **re-implemented** in the live stack, OR the live stack must be **replaced** by the reference stack. | BLOCKING |
| 2    | **Reference backend has no server bootstrap.** `apps/backend/` is missing `package.json`, `tsconfig.json`, and a server entry composing modules. Even if Postgres existed, the reference backend cannot run as-is. | BLOCKING |
| 3    | **No RFQ HTTP endpoints exist on the running backend.** `POST/GET /api/rfq`, `/api/rfq/:id`, `/api/rfq/:id/transition`, `/api/rfq/:id/quotations`, `/api/rfq/:id/supplier-activity`, `/api/rfq/:id/attachments`, `/api/telemetry` — all 404 on the running app. | BLOCKING |
| 4    | **No RFQ data model in live MongoDB.** No collections for `rfq_workspaces`, `timeline_events`, `quotations`, `attachments`. The live backend stores only users + notifications. | BLOCKING |
| 5    | **No FSM enforcement in the running runtime.** The Python live backend has no FSM table. Reference FSM exists in TypeScript only. | BLOCKING |
| 6    | **No supplier-side flow anywhere** — invitation, RFQ list for suppliers, quotation submission, proforma upload. Not in /docs reference, not in live app. | BLOCKING |
| 7    | **No Socket.io / realtime layer on the running backend.** Notification updates require polling today; FSM state changes have no transport. | HIGH |
| 8    | **No email channel.** No SMTP / SendGrid / Resend configured. Out-of-app notifications impossible. | HIGH |
| 9    | **Frontend stack mismatch.** Live = CRA (Plain React + JS); reference = Vite + TypeScript + monorepo. UI components from Sprint 2/2.5 cannot drop into the live frontend without conversion. | HIGH |
| 10   | **No attachment / file storage.** No S3, no MinIO, no Emergent object storage wired. Proformas and spec PDFs cannot move. | HIGH |
| 11   | **No quotation entity.** Neither live MongoDB nor reference Postgres has an executed schema for quotations + line items + proforma. | HIGH |
| 12   | **No PI / PO entities.** Same — the workflow's terminal artefacts have no persistence model. | HIGH |
| 13   | **No telemetry endpoint** for the events `useTelemetry()` posts to. Capture promised in Sprint 2.5, not received anywhere. | MEDIUM |
| 14   | **No admin supplier-assignment UI.** Even if endpoints existed, an admin cannot trigger an assignment from the running app. | MEDIUM |
| 15   | **No tests that exercise an HTTP round-trip.** All passing tests are unit tests against mocked APIs. No integration test reaches a backend. No E2E test exists. | MEDIUM |

---

## Task 5 — Product Readiness Assessment

> **Can a real importer and a real supplier successfully complete an RFQ process inside DeMaxtore today?**
>
> **NO.**

**Evidence:**
- The live application's `Workspace.jsx` reads from `workspaceMockMeta` (mock data file) and displays a Sprint 1 Foundation badge.
- The live backend exposes 9 routes total — all auth + notifications. No RFQ surface at all.
- Reference code in `/app/docs/sprint-2-reference-code/` is in a different language stack, calls endpoints that don't exist on the running backend, and cannot be started in this environment (no Postgres, no backend `package.json`).
- 0 of 9 E2E flow steps are supported by running runtime.
- All 84 passing tests are unit tests against mocked APIs; they prove the **shape** of the code is correct, not that the **system works**.

---

## Task 6 — Sprint 3 Readiness Gate

> **NOT READY** for Sprint 3 (CommodityBid Workspace).

**Why:** CommodityBid was specified to *spawn from* an RFQ workspace via FSM transition. With zero RFQ runtime support today, building CommodityBid on top of it would compound the gap between specification and product. The reference monorepo will accumulate more code that does not run.

### Minimum required work BEFORE Sprint 3 should begin

(This is a description of dependency, not a development proposal.)

1. **Stack decision.** Pick one of:
   - **(A)** Convert reference Node/Postgres backend into the running stack — install Postgres in the environment, write missing modules (auth, notifications, supplier-activity, quotations, attachments, telemetry, mailer, Socket.io, server bootstrap), migrate frontend to Vite, deprecate `/app/backend` Python service.
   - **(B)** Port the FSM and Sprint 2/2.5 features into the **existing live FastAPI + MongoDB + CRA stack** — translate `rfq.fsm.ts` and `rfq.service.ts` to Python with Mongo models; rewrite Sprint 2.5 components in plain React (no TS) inside `/app/frontend`; add Socket.io equivalent (or polling) for realtime.
2. **Implement the 9 E2E steps end-to-end** in whichever stack survives that decision. Until all 9 steps execute against a live backend with persisted data, Sprint 3 cannot meaningfully add CommodityBid.
3. **Add at least one HTTP integration test** per RFQ endpoint and one Playwright E2E test that walks Buyer → Admin → Supplier → PO in a single test run.
4. **Document the actual running surface** in `README.md` (today the README still references the abandoned Emergent template).

---

## Recommended Immediate Action

> **Integration Hardening.**

Choosing any other option would be misleading.

- *Continue Audit* — not warranted; the audit is conclusive.
- *Complete Missing Endpoints* — necessary, but it can only happen **after** the stack decision (A vs B in §Task 6). Implementing endpoints in the wrong stack is wasted work.
- *E2E Testing* — pointless until at least one endpoint exists in the running runtime.
- *Production Readiness Work* — premature.
- *Begin Sprint 3* — would compound the gap. NOT READY.
- **Integration Hardening = decide the stack, then bridge the reference code into the running app or vice versa.** This is the only action that increases the truthful product surface.

---

## Closing note (auditor's honesty)

The reference codebase is high quality. 84 unit tests pass, FSM invariants are well-modeled, the UX wireframes and Sprint 2.5 components are production-grade in their stated stack. But that is **not the same as a running product.** The user can log in today. The user cannot create an RFQ today. Everything else lives in `/app/docs/`.

The cleanest framing: DeMaxtore today is a **Sprint 1 application + a Sprint 2–2.5 design system / reference implementation**. Closing the gap between them is the entire job before Sprint 3 can begin.

—
**End of audit.**
