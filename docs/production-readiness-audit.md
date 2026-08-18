# DeMaxtore Production Readiness Audit

**Date:** 2026-06-03  
**Type:** Read-only audit (no code changes)  
**Evidence:** Source inspection, existing Playwright runs (44 PASS on 2026-06-03), contract tests (50 PASS), prior sprint reports.

**Forbidden in this audit:** New features, Sprint 4, FreightIQ, GPS, carrier APIs.

---

## Task 1 — Codebase Reality Audit

| Module | Classification | Basis |
|--------|----------------|-------|
| **RFQ Runtime** | **MOSTLY READY** | FSM gateway, routes, happy-path E2E 9/9. Missing RFQ SYSTEM schedulers; clarifications untested. |
| **CommodityBid Runtime** | **MOSTLY READY** | Sealed bid, RLS on submissions, scheduler unit-tested. Several FSM actions unrouted; heavy reads. |
| **Order Runtime** | **MOSTLY READY** | Full port-to-port E2E 19/19; spawn from RFQ/CB. No `notification:new` socket; dispute resolve unrouted. |
| **Shipment Runtime** | **MOSTLY READY** | E2E 9/9 core path; spawn from Order. Pickup sub-path and exception flows untested; no socket toasts. |
| **Auth** | **PRODUCTION READY** | JWT, refresh rotation, password reset, login lockout. |
| **RBAC** | **MOSTLY READY** | Layered policies + FSM roles; Order/Shipment routes rely on service layer; no org-level tenant boundary. |
| **Notifications** | **MOSTLY READY** | DB + REST all modules; realtime toast only RFQ/CB (`notification:new`). |
| **Messaging (Clarifications)** | **HIGH RISK** | RFQ-only API/UI; no e2e; not available on CB/Order/Shipment. |
| **Realtime** | **HIGH RISK** | Socket JWT OK; workspace subscribe ACL uses `canAccessRfq` for all workspace types — breaks supplier realtime on CB/Order/Shipment. |
| **Database** | **HIGH RISK** | Prisma migrations clean; **state-guard SQL not in migrate chain** — must be applied manually per Phase B docs. |
| **Scheduler (SYSTEM)** | **HIGH RISK** | CB scheduler only; no RFQ deadline / proforma SLA FSM; no order confirm SLA. |
| **Attachments** | **PRODUCTION READY** | Auth + workspace policy + MIME/size limits; local `STORAGE_DIR`. |
| **Telemetry** | **MOSTLY READY** | Authenticated ingest, fire-and-forget; no retention/archival policy in repo. |
| **Playwright** | **MOSTLY READY** | 50 tests, happy paths; ~35–40% of FSM transitions; few negative/SYSTEM paths. |
| **Infrastructure / Ops** | **NOT READY** | No in-repo backup/restore, Docker, or supervisor config; email defaults to console. |

---

## Task 2 — Business Flow Validation

| Step | Actor | Verdict | Evidence |
|------|-------|---------|----------|
| RFQ Create | Buyer | **SUPPORTED** | `02-rfq-flow` test 01; `POST /api/rfq` |
| Assign Supplier | Admin | **SUPPORTED** | `02` test 02; `assign-suppliers` |
| Submit Quotation | Supplier | **SUPPORTED** | `02` test 05; quotations API + UI |
| Compare Quotations | Buyer | **SUPPORTED** | `02` test 05; `GET /quotations` |
| Select Supplier | Buyer | **SUPPORTED** | `02` test 06 |
| Upload Proforma | Supplier | **SUPPORTED** | `02` test 08; attachments + `submit-proforma` |
| Approve Proforma | Buyer | **SUPPORTED** | `02` test 08; `approve-proforma` |
| Issue PO | Buyer | **SUPPORTED** | `02`/`05`; `issue_po` → `PO_ISSUED` |
| Order: production | Supplier | **SUPPORTED** | `05` tests 07–10 |
| Order: inspection | Buyer/Admin | **SUPPORTED** | `05` tests 11–12 |
| Proceed to freight | Buyer | **SUPPORTED** | `05` test 13; `06` bootstrap |
| Shipment: booking | Admin | **SUPPORTED** | `06` test 02 |
| Shipment: container | Admin | **SUPPORTED** | `06` test 03 |
| Shipment: transit | Admin | **SUPPORTED** | `06` tests 04–05 |
| Shipment: customs | Admin | **SUPPORTED** | `06` test 07 |
| Shipment: delivery | Buyer | **SUPPORTED** | `06` test 08 |
| Shipment: completion | Admin | **SUPPORTED** | `06` test 08 |
| Pickup / origin port (shipment) | Admin | **PARTIALLY SUPPORTED** | FSM + routes exist; E2E uses `CONTAINER_ASSIGNED` → `load_vessel` shortcut |
| RFQ clarifications | All | **PARTIALLY SUPPORTED** | Backend + UI; **no e2e** |
| RFQ/CB deadline auto-close | SYSTEM | **PARTIALLY SUPPORTED** | CB scheduler yes; **RFQ SYSTEM transitions not implemented** |
| Dispute / shipment exception | User | **PARTIALLY SUPPORTED** | Routes partial; **no e2e** |
| Self-service signup | Buyer/Supplier | **NOT SUPPORTED** | Seed/admin only (`accepted-operational-debt.md`) |

---

## Task 3 — Security Audit

See `docs/security-audit.md`. Summary:

| Area | Result |
|------|--------|
| JWT / refresh / password reset | **PASS** |
| RBAC (HTTP + FSM) | **PASS** with WARN on route-level gaps |
| Cross-tenant (workspace participant) | **PASS** |
| Org-level isolation | **WARN** |
| RLS | **WARN** (CB submissions only) |
| Attachments | **PASS** |
| Socket auth | **WARN** (handshake PASS; subscribe ACL FAIL for non-RFQ) |
| Rate limiting / CSRF | **FAIL** (login lockout only; no CSRF) |
| Audit DB tamper resistance | **WARN** (append-only SQL not in migrate deploy) |

---

## Task 4 — Database Audit

See sections in `docs/security-audit.md` and `docs/operations-audit.md`. Summary:

| Area | Result |
|------|--------|
| Prisma schema / 6 migrations | **PASS** |
| Migration drift (state-guard) | **FAIL** if deploy is migrate-only |
| FK / uniques (Prisma) | **PASS** |
| Partial uniques / CHECK (deadline) | **WARN** (only in `state-guard-trigger.sql`) |
| State guard trigger | **FAIL** unless manual `psql -f` |
| Append-only audit/timeline (DB) | **WARN** (same) |
| Idempotency | **PASS** |
| Scheduler locking | **FAIL** (multi-instance duplicate ticks) |

---

## Task 5 — Realtime Audit

| Area | Result |
|------|--------|
| Socket reconnect (client) | **WARN** — default Socket.io; no re-subscribe on reconnect |
| Duplicate emit | **PASS** — post-commit `scheduleEmit` |
| Notification fanout (RFQ/CB) | **PASS** |
| Notification fanout (Order/Shipment) | **WARN** — DB only |
| Workspace / timeline delivery | **PASS** for RFQ; **FAIL** subscribe ACL for CB/Order/Shipment suppliers |
| Role / user room isolation | **PASS** |
| Server shutdown cleanup | **WARN** — no explicit `io.close()` |
| Memory leak risk | **WARN** — in-process brute-force map |

---

## Task 6 — Operations Audit

See `docs/operations-audit.md`. Summary: **WARN** overall; backup/restore and in-repo deploy artifacts **FAIL**.

---

## Task 7 — Performance Audit

See `docs/performance-audit.md`. Summary: **WARN** — acceptable for pilot volume; N+1 in schedulers and CB `loadFull`.

---

## Task 8 — Playwright Coverage Audit

| Suite | Tests | Critical gaps |
|-------|-------|----------------|
| `01-auth.spec.ts` | 4 | No password reset, session expiry |
| `02-rfq-flow.spec.ts` | 9 | No cancel/reject/expire/clarifications |
| `03-realtime-and-isolation.spec.ts` | 2 | RFQ only; no CB/Order/Shipment isolation |
| `04-commoditybid-flow.spec.ts` | 7 | Multi-lot, no-award, reopen, deadline SYSTEM |
| `05-order-flow.spec.ts` | 19 | No dispute/cancel; parallel order-level freight vs shipment |
| `06-shipment-flow.spec.ts` | 9 | API bootstrap heavy; no exception/cancel |

**Total:** 50 tests, **50/50 PASS** (2026-06-03, workers=1).

**Coverage estimate:** ~**40%** of documented FSM transitions on happy paths; ~**5%** alternate/terminal; ~**10%** SYSTEM (CB scheduler unit only).

**Untested critical scenarios:** Password reset, RFQ clarifications, cross-buyer CB bid leakage (beyond one RFQ test), Order/Shipment socket subscribe, shipment exception, order dispute resolution, RFQ auto-deadline, email delivery to real inbox.

---

## Task 9 — Pilot Readiness

See `docs/pilot-readiness-verdict.md`.

---

## Task 10 — Production Readiness Verdict

**MOSTLY YES** — A controlled pilot with provisioned users is viable. Full production SaaS without manual DB steps and known realtime/security gaps is **not** supported.

---

## Critical Gaps

### P0 (pilot-breaking if misconfigured)

| ID | Gap |
|----|-----|
| P0-1 | `state-guard-trigger.sql` not applied by `prisma migrate deploy` — direct DB state mutation possible |
| P0-2 | Socket `workspace:subscribe` uses `canAccessRfq` — suppliers on Order/CB/Shipment workspaces likely **denied** realtime (states ∉ `SUPPLIER_VISIBLE_STATES`) |

### P1 (operational / trust risk)

| ID | Gap |
|----|-----|
| P1-1 | No RFQ quotation deadline SYSTEM transitions (unlike CommodityBid) |
| P1-2 | Order/Shipment notifications not pushed via `notification:new` |
| P1-3 | No global API rate limit; no CSRF on cookie refresh flow |
| P1-4 | Email delivery defaults to `console` — no production inbox without env |
| P1-5 | No backup/restore runbook in repository |
| P1-6 | In-process schedulers — duplicate work under multiple backend replicas |
| P1-7 | No self-registration — manual onboarding required |

### P2 (scale / completeness)

| ID | Gap |
|----|-----|
| P2-1 | Clarifications RFQ-only; no e2e |
| P2-2 | Several CB FSM actions without HTTP routes |
| P2-3 | Order `resolve_dispute_*` not routed |
| P2-4 | CB `loadFull` loads all submissions per transition |
| P2-5 | Scheduler query index `(type, state, deadline_at)` missing |
| P2-6 | Brute-force lockout in-memory only |

---

## Recommended Next Action

**Production Hardening Sprint**

Focus: apply state-guard via migration, fix socket subscribe ACL per workspace type, RFQ SYSTEM scheduler parity, Order/Shipment notification sockets, backup/runbook, email provider activation.

Do **not** start Sprint 4 or FreightIQ.

Alternative if business accepts documented risks: **Production Pilot** with seed-provisioned users and manual `psql -f state-guard-trigger.sql` on deploy.

---

## Required Question

> Can DeMaxtore safely onboard its first real importer and supplier today?

**MOSTLY YES**

Safe under: controlled pilot, admin-provisioned accounts, manual application of state-guard SQL, acceptance of email console mode and realtime gaps on Order/Shipment until hardened.

**NO** for unattended multi-tenant public SaaS without addressing P0–P1 items.

---

## Deliverables Index

| Document | Path |
|----------|------|
| This report | `docs/production-readiness-audit.md` |
| Security | `docs/security-audit.md` |
| Operations | `docs/operations-audit.md` |
| Performance | `docs/performance-audit.md` |
| Pilot verdict | `docs/pilot-readiness-verdict.md` |
