# Operations Command Center Playwright Results — Sprint 10C

**Date:** 2026-06-05  
**Spec:** `apps/e2e/tests/28-operations-command-center.spec.ts`  
**Environment:** `E2E_API_URL=http://127.0.0.1:3001` · `E2E_FRONTEND_URL=https://workspace.demaxtore.com`

## Results

| # | Scenario | Result |
|---|----------|--------|
| 01 | Dashboard layout | PASS |
| 02 | KPI row (8 metrics) | PASS |
| 03 | Action Inbox | PASS |
| 04 | Trade Operations Board | PASS |
| 05 | Auction Monitor + link | PASS |
| 06 | FreightIQ panel + link | PASS |
| 07 | Shipment Command Center | PASS |
| 08 | Document Control Center | PASS |
| 09 | Communication Monitor | PASS |
| 10 | Control Tower integration + link | PASS |
| 11 | Revenue widgets + link | PASS |
| 12 | Team Workload | PASS |
| 13 | Upcoming Events | PASS |
| 14 | Admin quick actions | PASS |
| 15 | Mobile layout | PASS |
| 16 | Buyer role isolation | PASS |
| 17 | Deep links (no 404) | PASS |
| 18 | Grouped navigation (Home + Command Center) | PASS |

**Total: 18/18 PASS** (40.7s)

## Related

| Spec | Notes |
|------|-------|
| `01-auth.spec.ts` | Updated admin assertion → `operations-command-center` |
| `@dmx/contracts` | 69/69 PASS |
| Frontend build | PASS |

## Note

Login-rate-limit flakes may occur when running immediately after large serial suites. Isolated `28` run is the acceptance gate.
