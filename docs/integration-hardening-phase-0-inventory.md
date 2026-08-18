# Integration Hardening Sprint — Phase 0 Inventory

**Run by:** main agent (auto-probe)
**Mandate:** "No implementation starts before this inventory is completed."
**Output:** Truthful status table of every prerequisite. Phase A does not start until this is approved.

---

## A · Software & Code Inventory

| Asset                                       | Status      | Evidence                                                                                         |
| ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `@dmx/contracts` package                    | **READY**    | 9 modules · 22 unit tests passing · typecheck clean at `/app/docs/sprint-2-reference-code/packages/contracts/`. Zero changes needed. |
| RFQ FSM (`rfq.fsm.ts`)                       | **READY**    | 40 transitions, contract-tested. Frozen per non-negotiable rule 1.                                |
| RFQ Next Action engine                       | **READY**    | `rfq.next-actions.ts`, 12 case tests green.                                                       |
| RFQ Zod schemas                              | **READY**    | `rfq.zod.ts`.                                                                                     |
| RFQ Backend module (Express)                 | **READY**    | 6 files at `apps/backend/src/modules/rfq/` (service, controller, routes, policy, preconditions, notifications). Drop-in once server bootstrap exists. |
| RFQ Frontend (Sprint 2 + 2.5)                | **READY**    | All pages + 11 components at `apps/frontend/src/features/rfq/`. 62 unit tests passing. typecheck clean. |
| Notifications frontend hooks + UI            | **READY**    | `features/notifications/hooks.ts`, `pages/NotificationsPage.tsx`, drawer.                          |
| Auth frontend (Login + Forgot)               | **READY**    | Pages + Zustand auth store with refresh interceptor. Wired to `@dmx/contracts/auth`.              |
| App shell (Auth/App layouts, Sidebar, etc.)  | **READY**    | All Sprint 1 shell components migrated. RBAC guards in place.                                       |
| Socket-events contract                       | **READY**    | `socket-events.ts` declares 5 server→client + 2 client→server events with typed payloads.         |
| Telemetry contract                           | **READY**    | `telemetry.ts` declares 5 events + Zod input.                                                      |
| Supplier-activity contract                   | **READY**    | `supplier-activity.ts` with `SupplierActivitySummary`, `SupplierActivityRow`, `QuotationRowDTO`.   |
| Prisma schema                                | **PARTIAL**  | `schema.partial.rfq.prisma` covers RFQ, TimelineEvent, AuditLog. Missing: User, RefreshToken, PasswordResetToken, Organisation, Quotation + LineItem, WorkspaceParticipant, Attachment, Clarification + ReadReceipt, Notification, SupplierActivityLog, TelemetryEvent, IdempotencyKey. **15 additional models needed.** |
| SQL trigger (`state-guard-trigger.sql`)      | **READY**    | Defense-in-depth FSM enforcement. Carry into Prisma migrations.                                    |
| Backend `package.json` (`@dmx/backend`)      | **MISSING**  | `apps/backend/` has no `package.json`, no `tsconfig.json`, no `server.ts`. Workspace not registered. |
| Backend `server.ts` bootstrap                | **MISSING**  | Express app composing modules does not exist.                                                       |
| Auth module (Node)                           | **MISSING**  | Live FastAPI auth exists but is being retired. Node equivalent has not been written.                |
| Notifications module (Node)                  | **MISSING**  | Same — must be re-implemented in Express + Prisma.                                                  |
| Supplier-activity module (Node)              | **MISSING**  | New module. 5 endpoints.                                                                            |
| Quotations module (Node)                     | **MISSING**  | New module. 5 endpoints.                                                                            |
| Attachments module (Node)                    | **MISSING**  | New module. 3 endpoints + local disk storage.                                                       |
| Clarifications module (Node)                 | **MISSING**  | New module. 3 endpoints + read receipts.                                                            |
| Telemetry module (Node)                      | **MISSING**  | New module. 1 endpoint.                                                                              |
| Admin queue module (Node)                    | **MISSING**  | New module. 2 endpoints.                                                                              |
| Socket.io server                              | **MISSING**  | Contracts declare events; server must emit them. Auth middleware for socket handshake needed.       |
| Idempotency middleware                        | **MISSING**  | Frontend axios already sends `Idempotency-Key`. Backend must store + replay.                         |
| Seed script (`prisma/seed.ts`)                | **MISSING**  | Need: 1 admin + 2 buyers + 4 suppliers + 3 demo RFQs across states.                                  |
| Playwright E2E suite                          | **MISSING**  | No `e2e/` directory; no Playwright dependency installed.                                              |
| `README.md` at monorepo root                  | **MISSING**  | Existing `/app/README.md` describes the Emergent template; needs replacement.                          |

**Code summary:** 14 READY · 1 PARTIAL · 16 MISSING (8 backend modules, server bootstrap, Prisma extension, seed, Playwright, README).

---

## B · Runtime Environment Inventory

| Resource                              | Status          | Evidence                                                                                       |
| ------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| Node.js                               | **READY**        | `v20.20.2`                                                                                      |
| Yarn 1                                | **READY**        | `1.22.22`                                                                                       |
| PostgreSQL 15                          | **INSTALLED · NOT MANAGED** | `apt install postgresql` succeeded (15.18). `initdb` succeeded. `pg_ctl start` brings server up but **supervisor does not own it** — server dies when the agent shell closes. Cluster is `down` between calls. |
| Postgres cluster initialised           | **READY**        | `/var/lib/postgresql/15/main` initialised with trust auth, listens on `127.0.0.1:5432`.         |
| `dmx` database + role                  | **PARTIAL**      | Role `dmx` was created once; database creation failed because of psql transaction wrapping. Needs one clean run. |
| Docker                                | **NOT AVAILABLE** | `docker` command not found. No Docker daemon in this Kubernetes pod. Therefore the Sprint prompt's `docker compose up postgres` instruction must be **replaced with supervisor-managed Postgres** in this environment. |
| Supervisor — postgres entry            | **MISSING**      | `/etc/supervisor/conf.d/` has no postgres entry. Existing entries: `supervisord_code_server.conf`, `supervisord_nginx_proxy.conf`. Need a new entry running `pg_ctl` as `postgres` user. |
| Supervisor — Node backend entry        | **MISSING**      | Today only Python FastAPI is registered. Phase E will replace it.                                  |
| Supervisor — Vite frontend entry       | **MISSING**      | Today only CRA frontend is registered. Phase E will replace it.                                    |
| Live FastAPI backend                   | **RUNNING**      | Sprint 1 demo shell still serving `/api/auth/*`, `/api/notifications/*`. Will be retired in Phase E. To be archived under `/app/legacy/sprint-1-demo-shell/`. |
| Live CRA frontend                      | **RUNNING**      | Same — serves the production URL today. Replaced in Phase E.                                       |
| MongoDB                                | **RUNNING**      | Used by the demo shell. Will be left untouched but no longer read by the new stack.                |
| External preview URL                   | **READY**        | `https://demaxstore-platform.preview.emergentagent.com` currently routes to CRA `:3000` via ingress. Re-routing to Vite preview will require ops coordination. |
| Object/file storage                    | **NOT YET CONFIGURED** | Will use local disk under `STORAGE_DIR=/var/dmx/uploads` per the sprint scope; Emergent object storage deferred. |
| Email/SMTP                             | **DEFERRED**     | Sprint scope explicitly says "log reset links to console for now".                                  |

**Environment summary:** Postgres binaries are installed but the server is not yet under supervisor control. Docker is unavailable, so the sprint prompt's compose-based Postgres orchestration must be substituted with a supervisor entry.

---

## C · Critical Findings

1. **Postgres is installable** — the audit's stated "Postgres unavailable" concern is partially resolved. `psql 15.18` is on disk. What remains is making the cluster supervisor-managed so it survives shell exits.

2. **Docker is not available.** Sprint prompt §Phase B and §Risk Register both assume `docker compose`. In this Emergent pod, that assumption must be replaced with a **native supervisor entry** for postgres. Functionally identical, deployment-wise different.

3. **Backend monorepo workspace is hollow.** `apps/backend/` contains RFQ module .ts files only. No `package.json`, no `tsconfig.json`, no `server.ts`. Phase A will create all three.

4. **All 8 missing backend modules are well-specified.** Frontend hooks already call exact endpoint paths and consume DTO shapes from `@dmx/contracts`. No design work needed — only translation from spec to Express handler.

5. **Auth integration playbook call is mandatory before writing the auth module** (sprint prompt non-negotiable rule 8 + system prompt Auth Bug Fix Rules). I have not yet invoked `integration_playbook_expert_v2`. It will be the first action in Phase C.

6. **External ingress port mapping risk.** The Emergent ingress routes `/api/*` → `:8001` (today FastAPI). The new Node backend is specified to bind `:4000`. Phase E must either (a) bind Node on `:8001` and remove the FastAPI entry, OR (b) coordinate an ingress change. Recommended: **(a)** — bind Node to `:8001` in this environment, keep the contract `PORT=4000` as the default for non-Emergent VPS deployment.

7. **Frontend port.** Existing CRA runs on `:3000`. Vite default is `:5173`. Same ingress concern. Recommended: bind Vite preview to `:3000` in this environment.

---

## D · Sprint Prompt Adaptations Required for THIS Environment

The sprint prompt is environment-neutral. To run it inside this Emergent pod, three substitutions are required and one task is added. Once approved, Phase A proceeds.

| Sprint prompt assumption                       | This environment's substitution                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `docker compose up postgres`                    | Supervisor `postgres.conf` entry running `pg_ctl` as postgres user, persistent.            |
| `apps/backend` binds `:4000`                    | Same default, but in this pod bind to `:8001` (replace FastAPI). Document both.            |
| `apps/frontend` binds `:5173`                   | Same default, but in this pod bind to `:3000` (replace CRA). Document both.                |
| `STORAGE_DIR` is an env var                    | Same. Create `/var/dmx/uploads`, owned by node user.                                       |
| Email mailer                                    | Already deferred to next sprint per scope.                                                  |
| **Add:** supervisor cutover atomicity           | Phase E must stop FastAPI + start Node + verify `/api/health` returns 200 from Node **in one window**, before retiring `/app/frontend`. |

---

## E · Go / No-Go Decision Required

The inventory is complete. Before Phase A starts, please confirm:

| Item                                                                                                  | Default answer if you don't reply         |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1. Proceed with **supervisor-managed Postgres** (no Docker) inside this Emergent pod?                  | Yes                                       |
| 2. **Repo root relocation:** move the new monorepo from `/app/docs/sprint-2-reference-code/` to `/app/` (after archiving the FastAPI/CRA shell to `/app/legacy/`)? | Yes — required by sprint Phase E         |
| 3. **Port cutover:** Node binds `:8001`, Vite binds `:3000` (so external preview URL keeps working)?    | Yes                                       |
| 4. **MongoDB:** leave running (legacy) or stop?                                                        | Leave running until Phase F success, then mark deprecated |
| 5. **Sprint cadence:** execute all 8 phases sequentially in one continuous workstream, or check-in after each phase? | Check-in after each phase — context budget + risk surface both demand this |
| 6. **Auth playbook:** confirm I should invoke `integration_playbook_expert_v2` as the **first action** in Phase C (per non-negotiable rule 8). | Yes                                       |

---

## F · Phase 0 Verdict

**Inventory complete. Sprint is GO-able in this environment with the 3 documented substitutions.**

Recommended next message from user (or "OK proceed" for all defaults):

> "Approved. Proceed to Phase A. Check in after Phase A completes before Phase B."

I will not write a single line of Phase A code until that confirmation lands. This is faithful to the prompt's first rule.

—
**End of Phase 0 Inventory.**
