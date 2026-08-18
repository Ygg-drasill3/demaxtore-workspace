# DeMaxtore Workspace — Enterprise Customer Readiness Retest

**Retest date:** 2026-07-16  
**Prior audit:** `docs/ENTERPRISE_CUSTOMER_READINESS_AUDIT.md` (67/100, NOT READY)  
**Remediation tracker:** `docs/ENTERPRISE_REMEDIATION_TRACKER.md`

---

## Executive decision

### **READY WITH CONDITIONS**

All four P0 blockers are **resolved in code** with automated regression evidence. Enterprise onboarding may proceed under a **controlled pilot** after:

1. Production deploy of remediated backend/frontend bundles  
2. Setting all four CFG-001 safety flags in production `.env` before backend restart  
3. Completing WhatsApp live pilot per `docs/WHATSAPP_PILOT_RUNBOOK.md` before relying on WhatsApp  
4. Ops removal of legacy PM2 process `demaxtore` (port conflict with `demaxtore-website`)  
5. Acknowledging open P1 items: manual tracking default, npm audit, DB FK gaps  

---

## Finding status

| Severity | Original | Resolved | Mitigated | Open |
| -------- | -------: | -------: | --------: | ---: |
| P0 | 4 | 4 | 0 | 0 |
| P1 | 12 | 5 | 4 | 3 |
| P2 | 13 | 2 | 2 | 9 |
| P3 | 6 | 2 | 0 | 4 |

---

## P0 evidence

### PAY-001 — Stub payment provider

| Field | Detail |
|-------|--------|
| Original issue | Fake checkout URLs from stub PSP in production |
| Code change | `payment-provider.factory.ts` blocks stub when `NODE_ENV=production`; `payment.service.ts` returns 503; `TradeFinancialPanel.tsx` hides intent UI |
| Regression test | `payment-provider.factory.test.ts`, `payment.service.test.ts` |
| Command | `yarn workspace @dmx/backend test src/modules/payments/` |
| Result | **PASS** |
| Remaining risk | Real PSP integration still required for online collection; manual milestone tracking remains valid |
| Final status | **RESOLVED** (safe blocked state in production) |

### REF-001 — Reference freight admin

| Field | Detail |
|-------|--------|
| Original issue | Admin API 404; frontend page unrouted |
| Code change | Mounted `referenceFreightAdminRouter` at `/admin/reference-freight-rates`; route `/operations/reference-freight` + nav |
| Regression test | `reference-freight.routes.test.ts`, E2E `40-freight-estimate-layer.spec.ts` |
| Command | `E2E_FRONTEND_PORT=3020 npx playwright test tests/40-freight-estimate-layer.spec.ts` |
| Result | **8/8 PASS** |
| Remaining risk | Production deploy required for live admin UI |
| Final status | **RESOLVED** |

### CFG-001 — Safety gates off by default

| Field | Detail |
|-------|--------|
| Original issue | Payment/incoterm/exception/RBAC gates opt-in |
| Code change | `production-safety.ts` fail-fast validator; readiness exposes `safetyGates` |
| Regression test | `production-safety.test.ts` |
| Command | `yarn workspace @dmx/backend test src/config/production-safety.test.ts` |
| Result | **PASS** |
| Remaining risk | Production restart **will fail** until four flags set `true` in `.env` |
| Final status | **RESOLVED** (deploy coordination required) |

### E2E-001 — Playwright login architecture

| Field | Detail |
|-------|--------|
| Original issue | Login served from `login-static/`; tests targeted wrong port/UI |
| Code change | Vite `loginStaticPlugin`; E2E port 3020; `auth.store.ts` login-static handoff; hub testids; removed stale `auth.js` |
| Regression test | `01-auth.spec.ts`, `14-workspace-communication.spec.ts` |
| Command | `E2E_FRONTEND_PORT=3020 npx playwright test tests/01-auth.spec.ts tests/14-workspace-communication.spec.ts` |
| Result | **4/4 + 9/9 PASS** |
| Remaining risk | Full 53-spec Playwright matrix not entirely re-run |
| Final status | **RESOLVED** |

---

## Messaging verdict

| Channel | Certified |
|---------|-----------|
| Workspace messaging (Conversation Hub / workspace comm API) | **Yes** |
| Direct messaging (`/buyer/messages` polling + socket fallback) | **Partial** — socket added; not full enterprise real-time certification |
| Attachments (workspace comm) | **Yes** (limits + E2E 09) |
| Tenant isolation (API) | **Yes** |
| WhatsApp | **No** — pilot runbook only; live send/receive not executed |

---

## Infrastructure verdict

| Check | Result |
|-------|--------|
| PM2 stable | **Yes** — `demaxtore-backend` online 21h+, 220MB, no errors in tail |
| Root cause of historical restarts identified | **Partial** — 1,198 counter is historical; current instance stable; empty `backend-error.log` tail |
| Legacy process resolved | **No** — `demaxtore` errored (`EADDRINUSE :3010`); recommend `pm2 delete demaxtore` |
| Backup restore tested | **Prior drill VERIFIED** (2026-06-17, `docs/go-live/restore-drill-report.md`); not re-run this session |
| Monitoring active | **Partial** — health/readiness/Sentry optional; checklist in `docs/go-live/enterprise-monitoring-checklist.md` |

---

## Validation suite results

| Suite | Total | Passed | Failed | Skipped | Result |
| ----- | ----: | -----: | -----: | ------: | ------ |
| Backend unit/integration | 197 | 197 | 0 | 0 | **PASS** |
| Frontend unit | 90 | 90 | 0 | 0 | **PASS** |
| Contracts | 124 | 124 | 0 | 0 | **PASS** |
| Typecheck (all workspaces) | — | — | 0 | — | **PASS** |
| E2E auth `01-auth.spec.ts` | 4 | 4 | 0 | 0 | **PASS** |
| E2E workspace comm `14-workspace-communication.spec.ts` | 9 | 9 | 0 | 0 | **PASS** |
| E2E freight `40-freight-estimate-layer.spec.ts` | 8 | 8 | 0 | 0 | **PASS** |
| E2E enterprise readiness `21-enterprise-readiness.spec.ts` | 9 | 9 | 0 | 0 | **PASS** |
| CommodityBid scheduler | 1 | 1 | 0 | 0 | **PASS** |
| npm audit `--omit=dev` | 8 vulns | — | — | — | **OPEN (SEC-001)** |

---

## Customer onboarding verdict

### **Safe for controlled pilot only**

Full daily operations with online payments and WhatsApp as primary channels is **not** yet supported. Workspace RFQ→PO→order flows, workspace messaging, reference freight admin, and safe payment-disabled UX are ready for pilot users after production deploy and CFG-001 flag configuration.

---

## Rollback

```bash
# Revert to prior backend build (if deploy fails CFG-001 validation)
pm2 restart demaxtore-backend --update-env

# Remove legacy errored process (non-destructive)
pm2 delete demaxtore
pm2 save
```
