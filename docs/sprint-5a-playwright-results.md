# Sprint 5A — Playwright Results

**Date:** 2026-06-03  
**Suite:** `apps/e2e` — full regression  
**Result:** **70 / 70 passed** (~1.3 min)

## FreightIQ spec (`10-freightiq-foundation.spec.ts`)

| # | Scenario | Result |
|---|----------|--------|
| 01 | Create freight request (API, ADMIN) | PASS |
| 02 | Submit and revise offers | PASS |
| 03 | Compare offers and select (BUYER) | PASS |
| 04 | Control Tower — `freight_selected_no_shipment` CRITICAL | PASS |
| 05 | FreightIQ tab on order workspace (UI) | PASS |
| 06 | Role isolation — buyer denied `/freightiq/operations/overview` | PASS |

## Regression suites (unchanged)

| Spec | Tests | Result |
|------|-------|--------|
| `01-auth` … `07-hardening` | 54 | PASS |
| `08-control-tower` | 5 | PASS |
| `09-maritime-tracking` | 6 | PASS |
| `10-freightiq-foundation` | 6 | PASS |

## Contracts unit tests

`packages/contracts` Vitest: **55 passed** (includes `freightiq.test.ts` × 5).

## Commands

```bash
cd apps/backend && npx prisma migrate deploy
cd apps/e2e && npx playwright test
cd packages/contracts && npm run test
```
