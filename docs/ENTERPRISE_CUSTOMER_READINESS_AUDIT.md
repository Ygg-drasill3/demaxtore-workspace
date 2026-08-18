# DeMaxtore Workspace — Enterprise Customer Readiness Audit

**Audit date:** 2026-07-16  
**Auditor:** Automated evidence-based audit (code inspection, API verification, test execution, production health probes)  
**Repository:** `/var/www/demaxtore/DemaxtoreSolitions-main`  
**Production API:** `https://workspace.demaxtore.com/api` (backend `127.0.0.1:3001` via Nginx)  
**Build:** `commitSha=6c0c45354b87aeb4264b0f82f8ceb3ad29114556`, branch `snapshot/pre-pilot-20260714`

> **No code changes were made during this audit.** Findings are documented for remediation.

---

## 1. Executive Decision

### **NOT READY — CRITICAL BLOCKERS EXIST**

DeMaxtore Workspace has a mature, workspace-centric architecture with strong authorization patterns, working workspace messaging, and a broad module surface (RFQ → PO → Order → Shipment → Documents). **However, a major enterprise customer cannot safely run full daily operations today** because:

1. **Payment collection is stub-only** — there is no production payment service provider; payment intents are in-memory fakes that can mislead users (`PAY-001`).
2. **Reference freight rate administration is broken in production** — the admin API module exists but is **not mounted** in the router, and the frontend admin page has **no route** (`REF-001`). Estimated CIF depends on reference rates; ops cannot maintain them through Workspace.
3. **Critical browser journeys could not be fully verified** in this environment — Playwright UI login tests failed (login UI is served from `login-static/`, not the Vite dev app Playwright targets locally). API-level workflow tests passed, but **full end-to-end UI certification is incomplete**.
4. **Operational safety gates are disabled by default** — `PAYMENT_GATES_ENABLED`, `INCOTERMS_PRECONDITIONS_ENABLED`, `EXCEPTION_ENGINE_V2_ENABLED`, and `RBAC_EXPANDED_ROLES_ENABLED` are opt-in; without explicit production configuration, orders can advance without payment/incoterm enforcement (`CFG-001`).
5. **Process instability signal** — `demaxtore-backend` PM2 shows **1,198 restarts** (currently online 20h); legacy `demaxtore` process is **errored** (`INFRA-001`).

**Messaging (workspace-scoped)** is production-viable with evidence. **WhatsApp** is configured (`mode: live`) but inbound/outbound delivery was **not live-tested** in this audit. **Tenant isolation** for RFQ/orders/messages/documents is enforced at the API layer with passing tests.

---

## 2. Readiness Score

| Area | Score | Rationale |
|------|------:|-----------|
| Authentication and Permissions | **72** | JWT + refresh works; expanded RBAC exists but off by default; frontend `RequireRole` excludes OPS/FINANCE/DOC roles from `/admin/*` |
| Messaging | **78** | Workspace comm: persist + socket + authz verified; direct chat polls every 4s; WhatsApp configured not E2E-tested |
| RFQ and Offers | **75** | FSM + API rich; CommodityBid scheduler test failed; UI E2E not fully run |
| Purchase Orders | **70** | PO spawn from RFQ tested at API level; dual PO storage on `RfqDetails` + `PurchaseOrder` |
| Payments | **35** | Milestone tracking exists; **only stub PSP**; gates off by default |
| Orders and Execution | **72** | FSM orchestrator off by default; order comm verified |
| Logistics and Shipments | **68** | Default tracking `manual`/simulated; carrier auto-transition opt-in |
| Documents | **80** | Authz tests pass; download requires auth; MIME/size limits enforced |
| Notifications | **74** | In-app + bridge retry workers; socket `notification:read` defined but not emitted |
| Frontend Reliability | **65** | UI login E2E broken in test harness; "Coming Soon" AI placeholders on buyer inbox |
| Backend Reliability | **70** | Health/readiness OK; 1 backend test fail; high PM2 restart count |
| Database Integrity | **62** | 68 migrations applied; widespread missing FK constraints on UUID refs |
| Security | **76** | Tenant isolation verified; webhook HMAC patterns; 8 npm audit vulns |
| Production Infrastructure | **71** | HTTPS + Nginx + PM2 online; multi-service mesh; backup not drill-verified here |
| Monitoring and Recovery | **73** | Sentry optional; job reconciler; system health API; stale job history |
| Automated Tests | **68** | 186/187 backend, 88/89 frontend, 124/124 contracts; E2E UI subset 9 failures |

### **Overall readiness score: 67 / 100**

---

## 3. Critical Customer Blockers (P0)

### PAY-001 — Payment processing is stub-only

| Field | Detail |
|-------|--------|
| **Severity** | P0 — Critical Blocker |
| **Module** | Payments |
| **User impact** | Users can click "Create payment intent" and receive fake checkout URLs; no real funds collection; in-memory state lost on restart |
| **Reproduction** | `POST /api/payments/orders/:orderId/intents` → returns `pi_stub_*` checkout URL |
| **Expected** | Integration with production PSP (Stripe, bank, etc.) or feature hidden until ready |
| **Actual** | `PaymentService` always defaults to `StubPaymentProvider` |
| **Root cause** | No alternate provider implementation registered |
| **Files** | `apps/backend/src/modules/payments/payment.service.ts`, `apps/backend/src/modules/payments/providers/stub.provider.ts`, `apps/frontend/src/features/trade/components/TradeFinancialPanel.tsx` |
| **Endpoint** | `POST /api/payments/orders/:orderId/intents` |
| **Model** | `PaymentPlan`, `PaymentMilestone`, `PaymentEvent` |
| **Recommended fix** | Implement real PSP or gate UI/API behind `PAYMENTS_ENABLED` env; remove stub from production builds |
| **Regression test** | E2E payment webhook + intent lifecycle with real/mock PSP contract tests |

### REF-001 — Reference freight admin API unreachable; Estimated CIF ops broken

| Field | Detail |
|-------|--------|
| **Severity** | P0 — Critical Blocker |
| **Module** | Reference Freight / Estimated CIF |
| **User impact** | Operations cannot create, import, or deactivate monthly reference freight rates via Workspace; Estimated CIF panel may show MISSING for lanes without seed data |
| **Reproduction** | `GET /api/admin/reference-freight` → 404 (router not mounted). Frontend page exists but no route. |
| **Expected** | Admin CRUD at `/api/admin/reference-freight/*` and UI at `/operations/reference-freight` or similar |
| **Actual** | `reference-freight.routes.ts` not imported in `routes.ts`; `AdminReferenceFreightRatesPage.tsx` orphan |
| **Root cause** | Incomplete integration — service used by `freight-estimate.service.ts` but admin routes never registered |
| **Files** | `apps/backend/src/modules/reference-freight/reference-freight.routes.ts`, `apps/backend/src/routes.ts`, `apps/frontend/src/features/reference-freight/pages/AdminReferenceFreightRatesPage.tsx`, `apps/frontend/src/routes/index.tsx` |
| **Endpoint** | Intended: `GET/POST/PATCH /api/admin/reference-freight/*` (unreachable) |
| **Model** | `ReferenceFreightRate`, `ReferenceFreightRateAudit`, `FreightEstimate` |
| **Recommended fix** | Register router in `routes.ts`; add frontend route; verify CIF refresh after rate import |
| **Regression test** | `reference-freight.service.test.ts` + E2E `40-freight-estimate-layer.spec.ts` |

### CFG-001 — Production safety gates disabled unless explicitly enabled

| Field | Detail |
|-------|--------|
| **Severity** | P0 — Critical Blocker (for unattended enterprise ops) |
| **Module** | Configuration / FSM |
| **User impact** | Orders can transition without payment milestone enforcement; shipments can book without incoterm document preconditions; exceptions may not sync to Exception Hub |
| **Reproduction** | Check env: `PAYMENT_GATES_ENABLED`, `INCOTERMS_PRECONDITIONS_ENABLED`, `EXCEPTION_ENGINE_V2_ENABLED` not set to `true` |
| **Expected** | Production env documents and enables all safety gates before customer onboarding |
| **Actual** | All default to disabled/no-op when unset (`env.ts`, `payment-milestone.service.ts`, `incoterms-gate.ts`, `exception-engine.service.ts`) |
| **Root cause** | Gradual rollout flags left opt-in |
| **Files** | `apps/backend/src/config/env.ts`, `apps/backend/src/modules/payments/payment-milestone.service.ts`, `apps/backend/src/config/incoterms-gate.ts`, `apps/backend/src/modules/exception-engine/exception-engine.service.ts` |
| **Recommended fix** | Production checklist: set all gates `true`; add startup warning if production + gates off |
| **Regression test** | `payment-milestone.service.test.ts`, `incoterms-gate.test.ts`, `exception-engine.test.ts` |

### E2E-001 — Full browser workflow certification incomplete

| Field | Detail |
|-------|--------|
| **Severity** | P0 — Critical Blocker (verification gap, not necessarily product bug) |
| **Module** | QA / Frontend |
| **User impact** | Cannot certify buyer/supplier/admin UI journeys without manual QA |
| **Reproduction** | `npx playwright test tests/01-auth.spec.ts` → fails: `login-email` testid not found (login served from `login-static/`) |
| **Expected** | Playwright targets production-like login + workspace frontend |
| **Actual** | Local Playwright uses `http://127.0.0.1:3010` without `login-static` proxy unless CI webServer |
| **Root cause** | Split login app architecture; Playwright config `webServer` only in CI |
| **Files** | `apps/e2e/playwright.config.ts`, `apps/e2e/tests/_helpers.ts`, `/etc/nginx/sites-enabled/workspace.demaxtore.com` (login-static) |
| **Recommended fix** | Point `E2E_FRONTEND_URL` to `https://workspace.demaxtore.com` or add login-static to test webServer |
| **Regression test** | Full `apps/e2e/tests/*.spec.ts` suite green against staging |

---

## 4. High-Risk Findings (P1)

### INFRA-001 — Backend PM2 restart history (1,198 restarts)

- **Module:** Production Infrastructure  
- **Evidence:** `pm2 show demaxtore-backend` → `restarts: 1198`, currently online 20h, heap 90.78%  
- **Impact:** Historical instability; risk of memory pressure under load  
- **Files:** PM2 process `demaxtore-backend`, logs `/var/log/demaxtore/backend-error.log` (empty tail at audit time)  
- **Fix:** Root-cause analysis of restart history; enable heap monitoring alerts; confirm `max_memory_restart` policy

### RBAC-001 — Expanded operational roles blocked from admin routes in UI

- **Module:** Authentication / Frontend  
- **Impact:** `OPS_MANAGER`, `FINANCE_OPERATOR`, `LOGISTICS_OPERATOR`, `DOCUMENT_CONTROLLER` see admin nav links but `RequireRole allow={["ADMIN"]}` redirects them away  
- **Files:** `apps/frontend/src/routes/index.tsx`, `packages/contracts/src/auth.ts`, `packages/contracts/src/rbac-expanded.ts`  
- **Fix:** Include expanded roles in `RequireRole` or map all to `ADMIN` dashboard routes consistently

### RBAC-002 — `RBAC_EXPANDED_ROLES_ENABLED` off → permission middleware no-op

- **Module:** Backend authorization  
- **Files:** `apps/backend/src/middleware/require-permission.ts`  
- **Impact:** Fine-grained permissions (`payment:manage`, `document:approve`) not enforced unless flag enabled

### MSG-001 — Direct / WhatsApp chat uses 4s polling, not Socket.io

- **Module:** Messaging (`GeneralMessagesPage`)  
- **Files:** `apps/frontend/src/features/chat/pages/GeneralMessagesPage.tsx` (`refetchInterval: 4000`)  
- **Impact:** Up to 4s latency for direct messages; no reconnect-tested real-time for `/buyer/messages`  
- **Note:** Workspace-scoped comm **does** use `SocketEvents.COMMUNICATION_*` via `WorkspaceCommunicationPanel.tsx`

### MSG-002 — WhatsApp live delivery not verified end-to-end

- **Module:** WhatsApp integration  
- **Evidence:** `GET /api/chat/status` → `mode: "live"`, all credentials configured, webhook `https://workspace.demaxtore.com/api/webhooks/whatsapp`  
- **Gap:** No inbound/outbound message test executed (would require Meta test number + customer opt-in)  
- **Files:** `apps/backend/src/modules/chat/whatsapp.service.ts`, `apps/backend/src/modules/chat/whatsapp.webhook.routes.ts`

### PAY-002 — Payment milestone amounts nullable; UI defaults intent amount to `1`

- **Files:** `apps/frontend/src/features/trade/components/TradeFinancialPanel.tsx:77`  
- **Impact:** Incorrect payment intent amounts if milestone `amount` is null

### FSM-001 — FSM orchestrator disabled by default

- **Files:** `apps/backend/src/config/orchestrator.ts`  
- **Impact:** Order→shipment automation recommendations not auto-applied unless enabled

### TRACK-001 — Default shipment tracking is manual/simulated

- **Files:** `apps/backend/src/config/env.ts` (`TRACKING_PROVIDER: manual`), `ShipmentTrackingPanel.tsx`  
- **Impact:** Live vessel tracking requires `maritime_api` or `mock_live` configuration

### CB-001 — CommodityBid scheduler integration test failure

- **Test:** `commoditybid.scheduler.test.ts` — auction did not reach expected LIVE→CLOSED transition  
- **Impact:** Auction deadline automation may be flaky under load or timing

### DB-001 — Widespread missing foreign keys on UUID reference fields

- **Impact:** Orphan records possible; no DB-level referential integrity for `supplierUserId`, `orderId`, etc.  
- **Files:** `apps/backend/prisma/schema.prisma` (122 models, few User/Workspace FKs)

### SEC-001 — npm audit: 8 vulnerabilities (6 high)

- **Packages:** `ws`, `engine.io`, `nodemailer` (transitive)  
- **Command:** `npm audit --omit=dev`  
- **Fix:** `npm audit fix` / dependency upgrades

### DOC-001 — Dual PO source of truth

- **Models:** `RfqDetails.poNumber/poFileUrl` and `PurchaseOrder` table  
- **Impact:** Potential inconsistency between RFQ workspace and PO workspace

### FE-001 — Buyer-facing "Coming Soon" AI placeholders

- **Files:** `InboxAiPlaceholder.tsx`, `AiMemoryPlaceholder.tsx`  
- **Impact:** Enterprise users see unfinished features in inbox/conversation hub

---

## 5. Medium and Low-Risk Findings (P2 / P3)

### P2 — Medium

| ID | Title | Location |
|----|-------|----------|
| P2-001 | `demaxtore` PM2 process errored (legacy) | PM2 id 9 |
| P2-002 | Healthz response shape changed — E2E expects `db` field on `/api/healthz` | `health.routes.ts`, `21-enterprise-readiness.spec.ts` |
| P2-003 | `QUALITY_INSPECTOR` in rbac-expanded but not in Prisma `Role` enum | `packages/contracts/src/rbac-expanded.ts` |
| P2-004 | Silent `.catch(() => {})` on order/shipment side-effects | `order.service.ts`, `shipment.service.ts` |
| P2-005 | Audit log query slow (1514ms p99) at 12k rows | Enterprise validation phase C |
| P2-006 | Control tower metrics p95 spike to 828ms at low RFQ count | Enterprise validation phase A |
| P2-007 | Twilio/Dialog360 declared in env but factory only implements `meta_cloud` | `whatsapp-provider.factory.ts` |
| P2-008 | Missing i18n keys `shipment.trackingDemoMode`, `shipment.providerSimulated` | `ShipmentTrackingPanel.tsx` |
| P2-009 | Frontend `RequireRole.test.tsx` failure (auth-loading spinner) | Test harness timing |
| P2-010 | Socket `notification:read` defined in contract, never emitted | `packages/contracts/src/socket-events.ts` |
| P2-011 | Legacy auction socket events (`auction.*`) not in contract | `commoditybid.service.ts` |
| P2-012 | `STORAGE_PROVIDER` may be `local` — multi-instance upload inconsistency risk | `env.ts` |
| P2-013 | `SOCKET_ADAPTER` default `memory` — cross-instance realtime gaps if scaled horizontally | `env.ts`, readiness shows `up` (redis configured on this host) |

### P3 — Low

| ID | Title | Location |
|----|-------|----------|
| P3-001 | Orphan pages: `FreightIqMessagesEmbedPage.tsx` | `apps/frontend/src/features/freightiq/pages/` |
| P3-002 | Landing page "Launch demo" CTA | `LandingPage.tsx` |
| P3-003 | Category card placeholder visuals | `categoryVisuals.ts` |
| P3-004 | RFQ product images hardcoded server path fallback | `rfq-product-image.ts` |
| P3-005 | `console.log` absent in production src (positive) | — |
| P3-006 | Zero TODO/FIXME markers in production src (positive) | — |

---

## 6. Messaging Readiness Report

| Question | Verdict | Evidence |
|----------|---------|----------|
| Does internal messaging work end-to-end? | **Yes (workspace-scoped)** | API test 2026-07-16: create message 200, persisted; E2E tests 01,03-07,09 passed |
| Are messages persistent? | **Yes** | `WorkspaceMessage` in PostgreSQL; reload via `GET /api/workspace-communication/:type/:id` |
| Is real-time delivery reliable? | **Partial** | Workspace comm: `SocketEvents.COMMUNICATION_*` emitted + subscribed. Direct chat: 4s poll only. |
| Are unread states accurate? | **Yes (workspace comm)** | Read receipt E2E test 05 passed; `WorkspaceReadReceipt` model |
| Are attachments safe? | **Yes (within limits)** | MIME allowlist + 25MB max in `communication.service.ts`; attachment E2E 09 passed |
| Is tenant isolation correct? | **Yes** | Cross-tenant `GET` comm → 403 (live API test); supplier cannot create `ADMIN_ONLY` notes (E2E 07) |
| Does WhatsApp work? | **Configured, not E2E-verified** | Status API: `mode: live`, credentials present, webhook URL set, signature verification fail-closed |
| Can messaging be trusted for the major customer? | **Workspace comm: yes. WhatsApp: conditional pilot only.** | Use workspace communication for RFQ/order threads; validate WhatsApp with controlled pilot before relying on it |

### WhatsApp integration assessment

| Aspect | State |
|--------|-------|
| Implementation level | **Partially implemented, production-configured** |
| Webhook verification | Implemented (`verifySubscription`, HMAC `verifyWebhookSignature`) |
| Inbound processing | `parseInboundWebhook` + DB persistence in chat service |
| Outbound | `sendTextMessage` via Meta Cloud API |
| Demo mode fallback | When credentials missing → logs demo send (not active in prod — credentials set) |
| Retry | `whatsapp_bridge_retry` scheduler every 60s |
| Idempotency | `ProcessedEvent` pattern on webhooks |
| **Production trust** | **Do not trust for major customer until live send/receive test with Meta webhook delivery confirmed** |

---

## 7. Missing or Incomplete Features

| Feature | Current State | Customer Impact | Required Before Onboarding |
|---------|---------------|-----------------|---------------------------|
| Production payment provider | Stub only | Cannot collect payments | **Yes** (if online collection needed) |
| Reference freight admin UI/API | Backend routes unmounted; page unrouted | Cannot maintain Estimated CIF rates | **Yes** |
| AI Procurement Memory / contextual intelligence | "Coming Soon" placeholders | Confusing enterprise UX | No (hide instead) |
| Real-time direct messages page | 4s polling | Delayed general inbox updates | Recommended |
| Maritime live tracking | Default manual | No live vessel data | If logistics SLA promised |
| Twilio/Dialog360 WhatsApp | Env enum only | Cannot switch providers | No (if Meta works) |
| FSM auto-orchestrator | Off by default | Manual order→shipment steps | Depends on SLA |
| Expanded RBAC in frontend routes | Partial | Ops roles blocked from admin pages | **Yes** (if those roles onboarded) |
| Quality inspector role | Code only, not in DB enum | Role assignment impossible | If QA role needed |

---

## 8. End-to-End Workflow Results

| Workflow | Result | Failure Point | Evidence |
|----------|--------|---------------|----------|
| Buyer login (UI) | **FAIL** | Playwright cannot find `login-email` | `01-auth.spec.ts` — login-static split |
| Buyer login (API) | **PASS** | — | Live `POST /api/auth/login` for `buyer1@acme.test` |
| RFQ create → submit (API) | **PASS** | — | E2E `02-rfq-flow` API portions; backend FSM tests |
| RFQ create (UI) | **FAIL** | UI login | `02-rfq-flow.spec.ts:40` |
| Supplier offer + quotation | **PASS** | — | E2E helpers + contracts `rfq.fsm.test.ts` |
| Offer approval → PO | **PASS** | — | E2E `14-workspace-communication` bootstrap chain |
| Workspace messaging buyer↔supplier | **PASS** | UI reply test failed (login) | API E2E 01,05,07; live API persistence test |
| Admin internal note privacy | **PASS** | — | E2E test 03 |
| Payment intent creation | **PASS (stub)** | Not real money | `payment.service.ts` → stub provider |
| Payment milestone gating | **NOT ENFORCED** | Gates off | `PAYMENT_GATES_ENABLED` unset |
| Order execution transitions | **PARTIAL** | Orchestrator off | `order.fsm.test.ts`; flash-transition tests |
| Shipment creation/tracking | **PARTIAL** | Manual tracking default | `06-shipment-flow.spec.ts` not run (UI login) |
| Document upload/download authz | **PASS** | — | `documents.idor.test.ts`, `documents.write-authz.test.ts` |
| Cross-tenant RFQ access | **PASS** | — | E2E `03-realtime-and-isolation`; API 403 on comm |
| Cross-tenant documents | **PASS** | — | `documents.idor.test.ts` |
| Notifications real-time toast | **FAIL (UI)** | UI login | `03-realtime-and-isolation.spec.ts` |
| Estimated CIF calculation | **PASS (formula)** | Admin rate mgmt broken | `freight-estimate.service.ts:524` `fob + freight` |
| Reference freight admin | **FAIL** | Routes not mounted | `routes.ts` grep negative |
| CommodityBid auction close | **FAIL (test)** | Scheduler timing | `commoditybid.scheduler.test.ts` |
| WhatsApp message round-trip | **UNTESTED** | No live test | Status API only |
| Admin system health | **PASS** | — | E2E `21-enterprise-readiness` tests 01-09 (except healthz shape) |
| Mixed/Bulk container flows | **NOT RUN** | Time/login constraints | E2E specs 30-38 exist |

---

## 9. Security Findings

### Authorization and tenant isolation (prominent)

| Test | Result | Evidence |
|------|--------|----------|
| Cross-tenant order communication | **BLOCKED (403)** | Live API 2026-07-16 |
| Cross-tenant trade documents read | **BLOCKED (403)** | `documents.idor.test.ts` |
| Cross-tenant trade documents write | **BLOCKED (403)** | `documents.write-authz.test.ts` |
| Supplier creating admin-only internal note | **BLOCKED (403)** | E2E workspace-comm test 07 |
| Passwordless access scope | **Tested** | `passwordless-access.*.test.ts` |
| Webhook HMAC | **Tested** | `webhook-signature.test.ts`, `payment.webhook.routes.test.ts` |
| WhatsApp webhook unsigned | **Rejected** | `whatsapp.service.ts` fail-closed without `WHATSAPP_APP_SECRET` |
| Direct API IDOR (RFQ) | **Not fully tested live** | buyer1 had no RFQs in list; isolation E2E uses dedicated RFQ |

### Other security notes

- **Helmet** middleware in Express stack  
- **JWT** access 15min + refresh 7d  
- **Rate limiting / brute-force** via Redis (`auth/bruteforce.ts`)  
- **CORS** configured via env (value redacted)  
- **No secrets exposed** in this report  
- **Log redaction** tested: `log-redaction.test.ts`  
- **Dependency vulns:** 8 (6 high) in `ws`/socket.io chain  

---

## 10. Production and Infrastructure Findings

### Directly verified

| Check | Result |
|-------|--------|
| `GET https://workspace.demaxtore.com/api/healthz` | **200** |
| `GET http://127.0.0.1:3001/api/healthz/ready` | **ready: true** (db, redis, storage, email, socketAdapter up) |
| PM2 `demaxtore-backend` | **online**, production NODE_ENV |
| Nginx `workspace.demaxtore.com` | Proxies `/api/` → `:3001`, WebSocket path configured, `login-static` for `/login` |
| Prisma migrations | **68 applied, up to date** |
| Enterprise validation quick run | **2 PASS, 7 PASS WITH RISK, 0 FAIL** |
| Multi-instance scheduler locks | **PASS** (53 SKIPPED lock_held rows) |
| HTTPS | **Active** on workspace domain |

### Not verified (access/credentials required)

| Check | Why |
|-------|-----|
| Database backup restore drill | Requires ops runbook execution |
| 24h soak test | `EV_SOAK_MS` not run |
| 10k–50k RFQ load test | Seed scale not executed (`EV_QUICK=1`) |
| SSL certificate expiry | Not checked |
| S3 storage (if used) | `STORAGE_PROVIDER` value redacted |
| Email deliverability to customer domains | Requires send test |
| FreightIQ / CommodityBid external SSO | External services running (PM2 online) but not integration-tested here |

### PM2 services observed

`demaxtore-backend`, `freightiq`, `freightiq-api`, `commoditybid-api`, `documentcenter-api`, `estimated-cif-api`, `freightbooking-api`, `inspection-api`, `bulkcontainer-api`, `demaxtore-crm`, `demaxtore-panel`, `demaxtore-website` — **14 processes online**; legacy `demaxtore` **errored**.

---

## 11. Test Results

### Commands executed

```bash
# Backend unit/integration tests
yarn workspace @dmx/backend test
# Result: 56 files, 186 passed, 1 failed (commoditybid.scheduler.test.ts)

# Contracts tests
yarn workspace @dmx/contracts test
# Result: 21 files, 124 passed, 0 failed

# Frontend tests
yarn workspace @dmx/frontend test
# Result: 27 files, 88 passed, 1 failed (RequireRole.test.tsx)

# Typecheck
yarn typecheck
# Result: PASS (backend, frontend, contracts)

# Enterprise validation (quick)
EV_API_URL=http://127.0.0.1:3001 yarn validate:enterprise
# Result: 2 PASS, 7 PASS WITH RISK, 0 FAIL (~81s)

# Prisma migration status
yarn workspace @dmx/backend prisma migrate status
# Result: 68 migrations, database up to date

# E2E critical subset
npx playwright test tests/01-auth tests/03-realtime tests/14-workspace-communication tests/02-rfq-flow tests/05-order-flow tests/21-enterprise-readiness
# Result: 11 passed, 9 failed, 33 did not run

# E2E workspace comm API tests only
npx playwright test tests/14-workspace-communication.spec.ts --grep "01|03|04|05|06|07|09"
# Result: 7 passed, 0 failed

# Dependency audit
npm audit --omit=dev
# Result: 8 vulnerabilities (2 moderate, 6 high)

# Live API smoke (custom node script)
# login, chat status, message create/persist, cross-tenant 403
```

### Test group summary

| Test Group | Total | Passed | Failed | Skipped | Coverage Gap |
|------------|------:|-------:|-------:|--------:|--------------|
| Backend unit/integration | 187 | 186 | 1 | 0 | Full RFQ→shipment UI chain |
| Contracts / FSM | 124 | 124 | 0 | 0 | — |
| Frontend unit | 89 | 88 | 1 | 0 | Workspace pages integration |
| E2E Playwright (critical subset) | 53 run | 11 | 9 | 33 | UI login blocks most flows |
| E2E workspace comm API | 7 | 7 | 0 | 0 | UI supplier reply |
| Enterprise validation | 9 phases | 2 | 0 | 0 | 7 PASS WITH RISK |
| Live API smoke | 5 | 5 | 0 | 0 | WhatsApp round-trip |

### Critical flows without automated test

- WhatsApp inbound/outbound live delivery  
- Production payment provider lifecycle  
- Reference freight admin CRUD (broken)  
- Full UI buyer journey with `login-static`  
- Multi-tab socket deduplication  
- Server restart message persistence (not executed — would disturb prod)  
- Mobile viewport full regression  

---

## 12. Untested Areas

| Area | Why not tested | Access required | Business risk | Manual verification |
|------|----------------|-----------------|---------------|---------------------|
| WhatsApp live send/receive | No Meta test harness in audit | WA test numbers, webhook logs | High if WA is primary channel | Send WA to configured business number; verify thread in `/buyer/messages` |
| Payment PSP integration | Stub only exists | PSP credentials | Critical for online payments | N/A until provider built |
| Server restart persistence | Avoid prod disruption | Maintenance window | Medium | Restart backend; verify messages/orders persist |
| Socket reconnect after disconnect | No chaos test run | Browser + network tools | Medium | Disable network 30s; verify workspace comm catches up |
| 50k RFQ load | `EV_QUICK=1` | Staging + `seed:scale9b` | High at scale | Run `validate:enterprise:full` on staging |
| Backup restore | Not in scope | DBA + backup artifacts | Critical for data loss | Execute `docs/go-live/restore-drill-report.md` procedure |
| Google OAuth | Optional feature | Google OAuth app | Low | Login with Google on staging |
| FreightIQ embed SSO | External iframe | Panel URLs + secrets | Medium | Open `/buyer/freightiq` as buyer |
| CommodityBid sealed-bid under load | Excluded from unit test run | Staging auction | Medium | Run excluded tests explicitly |
| Horizontal scale (2+ backend) | Single instance probed | Second PM2 instance | Medium | Run multi-instance validation with 2 processes |

---

## 13. Customer Onboarding Recommendation

### **Onboard only after listed P0 items**

Specifically:

1. Fix or disable stub payment UI/API (`PAY-001`)  
2. Mount reference freight admin routes + frontend route (`REF-001`)  
3. Enable and verify production safety gates (`CFG-001`)  
4. Complete UI E2E certification against `workspace.demaxtore.com` (`E2E-001`)  
5. Conduct controlled WhatsApp pilot if WA is in scope (`MSG-002`)

**Controlled pilot** (RFQ → PO → Order → workspace messaging, **without** online payment collection) may begin earlier with dedicated support and daily ops review.

---

## 14. Required Fix Order

### Before customer login

1. `REF-001` — Mount reference freight routes + admin UI route  
2. `PAY-001` — Remove or gate stub payment intents  
3. `CFG-001` — Set `PAYMENT_GATES_ENABLED`, `INCOTERMS_PRECONDITIONS_ENABLED`, `EXCEPTION_ENGINE_V2_ENABLED`, `RBAC_EXPANDED_ROLES_ENABLED` in production `.env`  
4. `RBAC-001` — Fix frontend role gates for operational roles  
5. `E2E-001` — Fix Playwright to test against production-like URL  

### Before customer performs real operations

6. `INFRA-001` — Investigate PM2 restart history; stabilize memory  
7. `MSG-002` — WhatsApp live pilot with webhook log monitoring  
8. `TRACK-001` — Configure real tracking provider if promised  
9. `SEC-001` — Patch npm vulnerabilities  
10. `CB-001` — Fix CommodityBid scheduler test / verify auction closes  

### After initial onboarding

11. `MSG-001` — Socket.io for direct messages page  
12. `FE-001` — Remove/hide AI "Coming Soon" placeholders  
13. `DB-001` — Add FK constraints incrementally  
14. `P2-*` — Performance indexes, i18n gaps, silent catch logging  

---

## 15. Final Go-Live Checklist

- [ ] Authentication verified (API yes; UI manual on workspace.demaxtore.com)
- [x] Tenant isolation verified (API + unit tests)
- [x] Workspace messaging verified (API + 7 E2E tests)
- [ ] WhatsApp verified (configured only)
- [ ] RFQ flow verified end-to-end in browser
- [x] Offer approval verified (API bootstrap chain)
- [x] PO generation verified (API bootstrap chain)
- [ ] Payment tracking verified with gates enabled
- [ ] Payment collection verified (blocked — stub only)
- [x] Order creation verified (spawned from RFQ in tests)
- [ ] Shipment flow verified in browser
- [x] Documents authz verified
- [ ] Notifications verified in browser (toast test failed)
- [ ] Reference freight admin verified
- [ ] Production backups verified
- [x] Monitoring API verified (`/api/system/health`)
- [ ] No P0 defects open
- [ ] Customer test account validated on production URL

---

## Appendix A — System Inventory (Phase 1)

### Scale

| Category | Count |
|----------|------:|
| Prisma models | 122 |
| Prisma enums | 7 |
| Backend route modules | 58 |
| Frontend feature modules | 36 |
| Frontend routed paths | ~95 |
| Socket.io event names (contract) | 70+ |
| In-process schedulers | 7 |
| Webhook endpoints | 4 |
| E2E spec files | 54 |
| Backend test files | 56 |

### User roles (`Role` enum)

`BUYER`, `SUPPLIER`, `ADMIN`, `SALES_CONTROL`, `SUPER_ADMIN`, `OPS_MANAGER`, `LOGISTICS_OPERATOR`, `FINANCE_OPERATOR`, `DOCUMENT_CONTROLLER`, `FORWARDER`

### Permissions (expanded RBAC — code only)

`order:read`, `order:transition`, `order:logistics`, `shipment:read`, `shipment:milestone`, `shipment:forwarder_submit`, `payment:read`, `payment:manage`, `document:approve`, `exception:manage`, `control_tower:admin`

### Notification types (`NotificationType` enum)

`INFO`, `SUCCESS`, `WARNING`, `ERROR` (+ domain-specific `eventType` strings in notification engine)

### Schedulers (in-process)

| Job | Interval | Lock ID |
|-----|----------|---------|
| `proforma_sla_email` | 15 min | 903901 |
| `rfq_deadline_scheduler` | 15 min | 903905 |
| `commoditybid_auction_engine` | 15 min | 903902 |
| `control_tower_alert_scan` | 15 min | 903903 |
| `maritime_tracking_sync` | 60 min | 903904 |
| `whatsapp_bridge_retry` | 60s | 903906 |
| `email_bridge_retry` | 60s | 903907 |

### Health endpoints

- `GET /api/healthz` — liveness  
- `GET /api/healthz/ready`, `GET /api/ready` — readiness  
- `GET /api/version` — build metadata  
- `GET /api/system/health` — admin detailed snapshot  

### Environment variables (categories — values redacted)

Auth: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_*`  
Messaging: `OUTBOUND_MESSAGING_ENABLED`, `EMAIL_PROVIDER`, `WHATSAPP_*`, `EMAIL_BRIDGE_*`  
Storage: `STORAGE_PROVIDER`, `S3_*`  
Realtime: `SOCKET_ADAPTER`, `REDIS_URL`  
Safety flags: `PAYMENT_GATES_ENABLED`, `INCOTERMS_PRECONDITIONS_ENABLED`, `EXCEPTION_ENGINE_V2_ENABLED`, `RBAC_EXPANDED_ROLES_ENABLED`, `FSM_ORCHESTRATOR_*`  
Webhooks: `PAYMENT_WEBHOOK_SECRET`, `CARRIER_WEBHOOK_SECRET`  

---

## Appendix B — Module Matrix

| Module | Frontend | Backend | Database | Permissions | Tests | Production Ready |
|--------|----------|---------|----------|-------------|-------|------------------|
| Auth / Login | `login-static` + `auth` | `/api/auth/*` | `User`, `RefreshToken` | `requireAuth` | Partial E2E | **Conditional** |
| Workspace Inbox | `/buyer/inbox` | `/api/workspace-inbox` | `Workspace`, notifications | Buyer | Unit | **Yes** |
| RFQ | `/workspace/rfq/:id` | `/api/rfq/*` | `RfqDetails`, `Quotation`, etc. | `rfq.policy.ts` | FSM + partial E2E | **Conditional** |
| CommodityBid | embed + workspace | `/api/commoditybid/*` | `CommodityBid*` models | `commoditybid.policy.ts` | FSM; scheduler fail | **Conditional** |
| Purchase Orders | `/workspace/po/:id` | `/api/purchase-orders/*` | `PurchaseOrder*` | Participant + role | E2E partial | **Yes** |
| Orders / Execution | `/workspace/order/:id` | `/api/orders/*` | `OrderWorkspace` | `order.policy.ts` | FSM + comm E2E | **Conditional** |
| Payments | `TradeFinancialPanel` | `/api/payments/*` | `PaymentPlan`, `PaymentMilestone` | `payment.policy.ts` | Unit; **stub PSP** | **No** |
| Shipments | `/workspace/shipment/:id` | `/api/shipments/*` | `ShipmentWorkspace` | `shipment.policy.ts` | FSM tests | **Conditional** |
| FreightIQ | embed pages | `/api/freightiq/*` | `FreightRequest`, `FreightOffer` | Role-based | Partial E2E | **Conditional** |
| Estimated CIF | `EstimatedCifPanel` | `/api/freight-estimates/*` | `FreightEstimate`, `ReferenceFreightRate` | `freight-estimate.policy.ts` | Unit | **No** (admin broken) |
| Reference Freight | **Missing route** | **Not mounted** | `ReferenceFreightRate` | Admin roles defined | Unit only | **No** |
| Workspace Communication | `WorkspaceCommunicationPanel` | `/api/workspace-communication/*` | `WorkspaceMessage` | `communication.policy.ts` | **7/7 E2E** | **Yes** |
| Conversation Hub | `ConversationHubPanel` | `/api/workspaces/.../conversation` | Same + hub DTOs | Visibility rules | Unit | **Yes** |
| Direct / WhatsApp Chat | `/buyer/messages` | `/api/conversations/*`, webhooks | `DirectConversation`, `DirectMessage` | `chat.service.ts` | Unit; WA not E2E | **Conditional** |
| Document Center | `/documents` | `/api/documents/*` | `TradeDocument` | `documents.policy.ts` | IDOR tests | **Yes** |
| Trade Documents | workspace tabs | `/api/trade-documents/*` | `TradeDocumentVersion` | Participant | Authz tests | **Yes** |
| Exception Hub | `/exceptions` | `/api/exceptions/*` | `TradeException` | Admin/owner | E2E exists | **Conditional** |
| Notifications | `/notifications` | `/api/notifications/*` | `Notification` | Per-user | Partial | **Yes** |
| Control Tower | dashboards | `/api/control-tower/*` | `ControlTowerAlert` | Admin | E2E exists | **Yes** |
| Mixed Container | buyer + admin routes | `/api/mixed-containers/*` | `MixedContainer*` (18 models) | `mixed-container.policy.ts` | E2E 30-38 | **Pilot** |
| Bulk Container | buyer + admin routes | `/api/bulk-containers/*` | `BulkContainer*` (15 models) | `bulk-container.policy.ts` | E2E 34-38 | **Pilot** |
| Admin / System Ops | `/operations/system` | `/api/system/*` | `JobExecution` | Admin | E2E 21 | **Yes** |

**Missing connections flagged:**
- `reference-freight.routes.ts` ↔ `routes.ts` (not imported)
- `AdminReferenceFreightRatesPage.tsx` ↔ `routes/index.tsx` (no route)
- `TradeFinancialPanel` ↔ real PSP (stub only)
- `GeneralMessagesPage` ↔ Socket.io (polling only)

---

## Appendix C — Status Transition Table (Key FSMs)

States enforced in `@dmx/contracts` + SQL state guard (`hardening/state-guard.test.ts`).

### RFQ (abbreviated)

`RFQ_DRAFT` → `RFQ_SUBMITTED` → `RFQ_PUBLISHED` → `QUOTATIONS_OPEN` → `QUOTATIONS_CLOSED` → `UNDER_EVALUATION` → `SUPPLIER_SELECTED` → `PROFORMA_*` → `PO_ISSUED` → terminal states

### Order (abbreviated)

`ORDER_CREATED` → `SUPPLIER_CONFIRMED` → `PAYMENT_TRACKING` → `EXECUTION_READY` → `EXECUTION_ACTIVE` → production/shipment phases → `ORDER_COMPLETED`

**Gating notes:** `PAYMENT_GATES_ENABLED` controls `PAYMENT_GATED_ORDER_ACTIONS`. `INCOTERMS_PRECONDITIONS_ENABLED` blocks `book_shipment`, `mark_delivered`, `start_production` without required docs.

### Shipment (abbreviated)

`SHIPMENT_CREATED` → booking/milestone states → `DELIVERED` / exceptions

### Estimated CIF formula (verified in code)

```
estimatedCifValue = fobValue + estimatedFreight
estimatedFreight = valid ReferenceFreightRate.referenceFreight for lane/month
```

**File:** `apps/backend/src/modules/freight-estimate/freight-estimate.service.ts:524-546`  
**Enforcement:** Backend on create/refresh; frontend displays via `EstimatedCifPanel.tsx`. **Admin rate entry path broken (REF-001).**

---

## Appendix D — Finding Counts

| Severity | Count |
|----------|------:|
| P0 — Critical Blocker | 4 |
| P1 — High Risk | 12 |
| P2 — Medium Risk | 13 |
| P3 — Low Risk | 6 |

### Five most dangerous risks

1. **Stub payment provider** — fake payment intents in production UI  
2. **Reference freight admin unreachable** — Estimated CIF operations cannot be maintained  
3. **Safety gates disabled by default** — orders/shipments may skip payment and document preconditions  
4. **PM2 1,198 backend restarts** — operational stability concern  
5. **Incomplete UI journey certification** — browser E2E cannot validate login-dependent flows in current test setup  

---

## Appendix E — Access Required for Remaining Verification

| Item | Required access |
|------|-----------------|
| Production `.env` full review | Ops (values redacted in this report) |
| WhatsApp live test | Meta Business Manager + test handset |
| Staging full enterprise validation | `EV_SOAK_MS=86400000`, `seed:scale9b` |
| Payment PSP | Provider API keys + webhook endpoint |
| Backup restore drill | DBA + backup storage |
| Customer UAT accounts | Buyer + supplier orgs on production subdomain |
| Sentry/error monitoring | `SENTRY_DSN` dashboard access |

---

*End of audit report.*
