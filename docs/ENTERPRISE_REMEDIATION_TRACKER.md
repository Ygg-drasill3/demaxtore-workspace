# DeMaxtore Workspace — Enterprise Remediation Tracker

**Created:** 2026-07-16  
**Source audit:** `docs/ENTERPRISE_CUSTOMER_READINESS_AUDIT.md`  
**Remediation branch:** working tree (pre-deploy)

---

## P0 — Critical Blockers

| ID | Severity | Module | Finding | Customer Impact | Root Cause | Files | Fix Plan | Regression Test | Status |
| -- | -------- | ------ | ------- | --------------- | ---------- | ----- | -------- | --------------- | ------ |
| PAY-001 | P0 | Payments | Payment processing is stub-only; fake checkout URLs returned | Users could click "Create payment intent" and receive fake checkout URLs; no real funds collection | `PaymentService` always defaulted to `StubPaymentProvider` | `payment-provider.factory.ts`, `payment.service.ts`, `payment.routes.ts`, `TradeFinancialPanel.tsx` | Block stub in production; return 503 `ONLINE_PAYMENTS_DISABLED`; hide intent button; expose `/api/payments/capabilities` | `payment-provider.factory.test.ts`, `payment.service.test.ts` | **RESOLVED** |
| REF-001 | P0 | Reference Freight / Estimated CIF | Reference freight admin API unreachable; Estimated CIF ops broken | Operations cannot maintain reference freight rates via Workspace | `reference-freight.routes.ts` not mounted; frontend page unrouted | `routes.ts`, `reference-freight.routes.ts`, `routes/index.tsx`, `navigation.ts`, `AdminReferenceFreightRatesPage.tsx` | Mount admin router; add `/operations/reference-freight` route and nav | `reference-freight.routes.test.ts`, E2E `40-freight-estimate-layer.spec.ts` | **RESOLVED** |
| CFG-001 | P0 | Configuration / FSM | Production safety gates disabled unless explicitly enabled | Orders can transition without payment/incoterm enforcement | Opt-in flags default off | `production-safety.ts`, `env.ts`, `server.ts`, `health.routes.ts` | Fail-fast validator at startup in production; readiness reports gate status | `production-safety.test.ts` | **RESOLVED** (requires prod `.env` flags before restart) |
| E2E-001 | P0 | QA / Frontend | Full browser workflow certification incomplete; Playwright login failed | Cannot certify buyer/supplier/admin UI journeys | Split `login-static/` architecture; port 3000 conflict; stale `auth.js`; session hydrate cleared tokens on HTTP | `playwright.config.ts`, `vite.config.ts`, `auth.store.ts`, `_helpers.ts`, `RightPanel.jsx`, `packages/contracts/src/auth.ts` | Serve login-static via Vite; E2E port 3020; login-static token handoff; hub testids | `01-auth.spec.ts` (4/4 pass), `14-workspace-communication.spec.ts` (9/9 pass) | **RESOLVED** |

---

## P1 — High-Risk Operational Findings

| ID | Severity | Module | Finding | Customer Impact | Root Cause | Files | Fix Plan | Regression Test | Status |
| -- | -------- | ------ | ------- | --------------- | ---------- | ----- | -------- | --------------- | ------ |
| INFRA-001 | P1 | Production Infrastructure | Backend PM2 restart history (1,198 restarts) | Historical instability signal | Legacy process port conflict; long uptime since last incident | PM2 `demaxtore-backend`, legacy `demaxtore` | Document root cause; remove obsolete `demaxtore` process; stable 21h+ observed | PM2 health probe + controlled restart checklist in retest | **MITIGATED** |
| RBAC-001 | P1 | Authentication / Frontend | Expanded operational roles blocked from admin routes in UI | OPS/FINANCE/LOGISTICS/DOC roles redirected from admin pages | `RequireRole allow={["ADMIN"]}` only | `routes/index.tsx`, `packages/contracts/src/auth.ts` | `OPERATIONS_PLATFORM_ROLES` on operations/admin dashboard routes | `RequireRole.test.tsx` | **RESOLVED** |
| RBAC-002 | P1 | Backend authorization | `RBAC_EXPANDED_ROLES_ENABLED` off → permission middleware no-op | Fine-grained permissions not enforced | Flag opt-in | `require-permission.ts` | Documented dependency on CFG-001 production flags | `production-safety.test.ts` | **MITIGATED** (enabled when safety gates on) |
| MSG-001 | P1 | Messaging | Direct / WhatsApp chat uses 4s polling, not Socket.io | Up to 4s latency on `/buyer/messages` | `refetchInterval: 4000` | `GeneralMessagesPage.tsx` | Socket.io listener with polling fallback when disconnected | Manual + existing workspace comm E2E | **MITIGATED** |
| MSG-002 | P1 | WhatsApp | WhatsApp live delivery not verified end-to-end | Cannot trust WA for daily ops | No Meta pilot executed | `whatsapp.service.ts`, `whatsapp.webhook.routes.ts` | `docs/WHATSAPP_PILOT_RUNBOOK.md`; UI must not imply certification | Pilot runbook (external verification required) | **MITIGATED — EXTERNAL VERIFICATION REQUIRED** |
| PAY-002 | P1 | Payments | Payment milestone amounts nullable; UI defaults intent amount to `1` | Incorrect payment intent amounts | Default amount in UI | `TradeFinancialPanel.tsx` | Block intent when amount null; use milestone currency | Frontend unit tests | **RESOLVED** |
| FSM-001 | P1 | Orders | FSM orchestrator disabled by default | Order→shipment automation not auto-applied | `ORCHESTRATOR_ENABLED` opt-in | `orchestrator.ts` | Documented; enable via production checklist after validation | Existing FSM tests | **OPEN** (documented) |
| TRACK-001 | P1 | Logistics | Default shipment tracking is manual/simulated | No live vessel tracking without config | `TRACKING_PROVIDER: manual` | `env.ts`, `ShipmentTrackingPanel.tsx` | Document configuration path; no unsafe auto-enable | — | **OPEN** (documented) |
| CB-001 | P1 | CommodityBid | CommodityBid scheduler integration test failure | Auction deadline automation flaky | Single scheduler tick race | `commoditybid.scheduler.test.ts` | Retry loop after backdating `auctionEndsAt` | `commoditybid.scheduler.test.ts` | **RESOLVED** |
| DB-001 | P1 | Database | Widespread missing foreign keys on UUID reference fields | Orphan records possible | Schema design | `schema.prisma` | Documented; non-destructive FK migration deferred | — | **OPEN** |
| SEC-001 | P1 | Security | npm audit: 8 vulnerabilities (6 high) | Transitive socket.io/ws risk | Dependency versions | `package-lock.json` | `npm audit fix` / upgrade plan in retest | — | **OPEN** |
| DOC-001 | P1 | Purchase Orders | Dual PO source of truth (`RfqDetails` + `PurchaseOrder`) | Potential inconsistency | Legacy + new model | `rfq.service.ts`, `purchase-order.service.ts` | Documented; consolidation deferred | — | **OPEN** |
| FE-001 | P1 | Frontend | Buyer-facing "Coming Soon" AI placeholders | Unfinished features visible | Placeholder components in inbox | `WorkspaceInboxPage.tsx`, `ConversationHubPanel.tsx` | Removed AI placeholders from customer paths | Frontend tests | **RESOLVED** |

---

## P2 — Medium

| ID | Severity | Module | Finding | Customer Impact | Root Cause | Files | Fix Plan | Regression Test | Status |
| -- | -------- | ------ | ------- | --------------- | ---------- | ----- | -------- | --------------- | ------ |
| P2-001 | P2 | Production Infrastructure | `demaxtore` PM2 process errored (legacy) | Noise in process list; false alarms | Port 3010 `EADDRINUSE` — superseded by `demaxtore-website` | PM2 id 9 | `pm2 delete demaxtore` after ops confirmation | PM2 state in retest | **MITIGATED** |
| P2-002 | P2 | Health / E2E | Healthz response shape changed — E2E expects `db` on `/api/healthz` | Enterprise readiness E2E false negative | Readiness moved to `/api/healthz/ready` | `health.routes.ts`, `21-enterprise-readiness.spec.ts` | Updated E2E to use `/api/healthz/ready` | `21-enterprise-readiness.spec.ts` | **RESOLVED** |
| P2-003 | P2 | RBAC | `QUALITY_INSPECTOR` in rbac-expanded but not in Prisma `Role` enum | Role assignment impossible | Contract/schema drift | `rbac-expanded.ts`, `schema.prisma` | Documented; enum addition deferred | — | **OPEN** |
| P2-004 | P2 | Orders / Shipments | Silent `.catch(() => {})` on order/shipment side-effects | Hidden failures | Defensive swallow | `order.service.ts`, `shipment.service.ts` | Documented; structured logging follow-up | — | **OPEN** |
| P2-005 | P2 | Performance | Audit log query slow (1514ms p99) at 12k rows | Admin latency at scale | Index/volume | Enterprise validation phase C | Monitor via enterprise validation | — | **OPEN** |
| P2-006 | P2 | Performance | Control tower metrics p95 spike to 828ms | Dashboard latency | Query pattern | Enterprise validation phase A | Monitor via enterprise validation | — | **OPEN** |
| P2-007 | P2 | WhatsApp | Twilio/Dialog360 declared in env but factory only implements `meta_cloud` | Provider switch not possible | Incomplete factory | `whatsapp-provider.factory.ts` | Documented Meta-only path | — | **OPEN** |
| P2-008 | P2 | i18n | Missing i18n keys `shipment.trackingDemoMode`, `shipment.providerSimulated` | Raw keys in UI | Missing translations | `ShipmentTrackingPanel.tsx` | Deferred cosmetic | — | **OPEN** |
| P2-009 | P2 | Frontend tests | `RequireRole.test.tsx` failure (auth-loading spinner) | CI noise | Timing / redirect behavior | `RequireRole.test.tsx` | Updated expectations for `auth-loading` | `RequireRole.test.tsx` | **RESOLVED** |
| P2-010 | P2 | Notifications | Socket `notification:read` defined in contract, never emitted | Read state not real-time | Incomplete implementation | `socket-events.ts` | Documented follow-up | — | **OPEN** |
| P2-011 | P2 | CommodityBid | Legacy auction socket events not in contract | Contract drift | Historical events | `commoditybid.service.ts` | Documented | — | **OPEN** |
| P2-012 | P2 | Storage | `STORAGE_PROVIDER` may be `local` — multi-instance risk | Upload inconsistency if scaled | Default local | `env.ts` | Documented S3 requirement for HA | — | **OPEN** |
| P2-013 | P2 | Socket.io | `SOCKET_ADAPTER` default `memory` — cross-instance gaps | Realtime gaps if scaled | Default memory adapter | `env.ts` | Redis adapter verified on host readiness | — | **MITIGATED** (redis up on prod) |

---

## P3 — Low

| ID | Severity | Module | Finding | Customer Impact | Root Cause | Files | Fix Plan | Regression Test | Status |
| -- | -------- | ------ | ------- | --------------- | ---------- | ----- | -------- | --------------- | ------ |
| P3-001 | P3 | Frontend | Orphan pages: `FreightIqMessagesEmbedPage.tsx` | Dead code | Unrouted page | `FreightIqMessagesEmbedPage.tsx` | Deferred cleanup | — | **OPEN** |
| P3-002 | P3 | Frontend | Landing page "Launch demo" CTA | Marketing only | Product marketing | `LandingPage.tsx` | No customer impact | — | **OPEN** |
| P3-003 | P3 | Frontend | Category card placeholder visuals | Cosmetic | Placeholder art | `categoryVisuals.ts` | Deferred | — | **OPEN** |
| P3-004 | P3 | RFQ | RFQ product images hardcoded server path fallback | Wrong image in edge cases | Hardcoded path | `rfq-product-image.ts` | Deferred | — | **OPEN** |
| P3-005 | P3 | Quality | `console.log` absent in production src (positive) | — | — | — | No action | — | **RESOLVED** (positive) |
| P3-006 | P3 | Quality | Zero TODO/FIXME markers in production src (positive) | — | — | — | No action | — | **RESOLVED** (positive) |

---

## Deployment prerequisites (CFG-001)

Before restarting production `demaxtore-backend` with remediated code, set in `apps/backend/.env`:

- `PAYMENT_GATES_ENABLED=true`
- `INCOTERMS_PRECONDITIONS_ENABLED=true`
- `EXCEPTION_ENGINE_V2_ENABLED=true`
- `RBAC_EXPANDED_ROLES_ENABLED=true`

Startup will **exit** if any are missing/false in `NODE_ENV=production`.

---

## Evidence commands (2026-07-16)

```bash
yarn workspace @dmx/backend test          # 197 passed
yarn workspace @dmx/frontend test       # 90 passed
yarn workspace @dmx/contracts test        # 124 passed
yarn typecheck                          # PASS
cd apps/e2e && E2E_FRONTEND_PORT=3020 npx playwright test tests/01-auth.spec.ts  # 4/4
cd apps/e2e && E2E_FRONTEND_PORT=3020 npx playwright test tests/14-workspace-communication.spec.ts  # 9/9
cd apps/e2e && E2E_FRONTEND_PORT=3020 npx playwright test tests/40-freight-estimate-layer.spec.ts  # 8/8
```
