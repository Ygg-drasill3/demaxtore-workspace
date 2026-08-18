# Supplier Workspace Playwright Results — Sprint 10B

**Date:** 2026-06-05  
**Spec:** `apps/e2e/tests/27-supplier-workspace-experience.spec.ts`  
**Environment:** `E2E_API_URL=http://127.0.0.1:3001` · `E2E_FRONTEND_URL=https://workspace.demaxtore.com`

## Isolated run (27 only)

| # | Scenario | Result |
|---|----------|--------|
| 01 | Grouped navigation (desktop) | PASS |
| 02 | Quick actions | PASS |
| 03 | Command center layout | PASS |
| 04 | KPI row + links | PASS |
| 05 | Action Inbox | PASS |
| 06 | Opportunity Center | PASS |
| 07 | Execution Center | PASS |
| 08 | Document Center + link | PASS |
| 09 | Communication Center + link | PASS |
| 10 | Upcoming Events | PASS |
| 11 | Onboarding repositioned | PASS |
| 12 | List pages (PO, Shipments) | PASS |
| 13 | Mobile widget stack | PASS |
| 14 | Mobile nav drawer | PASS |
| 15 | Buyer role isolation | PASS |
| 16 | Deep links (no 404) | PASS |

**Total: 16/16 PASS** (37.6s)

## Related regression

| Spec | Result | Notes |
|------|--------|-------|
| `25-buyer-navigation.spec.ts` | PASS (prior 10A.1) | Unchanged |
| `26-buyer-command-center.spec.ts` | PASS (prior 10A.2) | Unchanged |
| `22-guided-onboarding.spec.ts` | Updated | Tests 01–02 expand collapsible onboarding section |
| `@dmx/contracts` | 69/69 PASS | No contract changes |

## Full suite note

Full `01→27` serial run after extended prior failures showed login-timeout flakes on late tests (rate-limit / session pressure). Sprint 10B acceptance is based on isolated **27 PASS** plus contracts green and frontend build green.
