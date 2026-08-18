# Sprint 6A — Playwright Full Regression

**Executed:** 2026-06-04 (closure gate re-run, post Release Blocker Fix Pack)  
**Prerequisite:** Backend restarted; frontend `http://localhost:3000`; Chromium installed.

## Command

```bash
cd apps/e2e
E2E_REPO_ROOT=<repo-root> npx playwright test --reporter=line
```

## Result

| Metric | Value |
|--------|------:|
| Tests | 125 |
| **Passed** | **125** |
| Failed | 0 |
| Skipped | 0 |
| Duration | ~1.6 min |

## Gate: **PASS**

---

## Required suites (all green)

| File | Status |
|------|--------|
| 01-auth.spec.ts | PASS |
| 02-rfq-flow.spec.ts | PASS |
| 03-realtime-and-isolation.spec.ts | PASS |
| 04-commoditybid-flow.spec.ts | PASS |
| 05-order-flow.spec.ts | PASS |
| 06-shipment-flow.spec.ts | PASS |
| 07-hardening.spec.ts | PASS |
| 08-control-tower.spec.ts | PASS |
| 09-maritime-tracking.spec.ts | PASS |
| 10-freightiq-foundation.spec.ts | PASS |
| 11-freight-offer-intake.spec.ts | PASS |
| 12-trade-documents.spec.ts | PASS |
| 13-po-management.spec.ts | PASS |
| 14-workspace-communication.spec.ts | PASS |
| 15-pilot-readiness.spec.ts | PASS |
| **16-freight-commercialization.spec.ts** | **PASS (7/7)** |

---

## Sprint 6A suite (`16-freight-commercialization.spec.ts`)

| # | Scenario | Result |
|---|----------|--------|
| 01 | Admin sees cost, margin, display price | PASS |
| 02 | Buyer cannot see cost or margin | PASS |
| 03 | Supplier cannot see cost or margin | PASS |
| 04 | CIF uses display freight | PASS |
| 05 | PENDING ledger on selection | PASS |
| 06 | Revenue realized on shipment COMPLETED | PASS |
| 07 | Commercial KPIs API (admin) | PASS |

---

## How to reproduce

```bash
# 1. Postgres + backend
cd apps/backend && yarn dev:backend   # or tsx watch src/server.ts

# 2. Frontend
cd apps/frontend && yarn dev:frontend

# 3. E2E
cd apps/e2e && npx playwright install chromium
E2E_REPO_ROOT=.. npx playwright test
```

Ensure `STORAGE_DIR=./.data/uploads` in `apps/backend/.env` (Release Blocker Fix Pack).
