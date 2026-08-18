# Sprint 5B — Playwright Results

**Date:** 2026-06-03  
**Suite:** `apps/e2e` — full regression  
**Result:** **78 / 78 passed** (~1.2 min)

## Sprint 5B spec (`11-freight-offer-intake.spec.ts`)

| # | Scenario | Result |
|---|----------|--------|
| 01 | Create forwarder | PASS |
| 02 | Send freight request communications | PASS |
| 03 | Manual offer intake (2 offers) | PASS |
| 04 | Compare multiple offers (vessel + lowest price) | PASS |
| 05 | Select offer (buyer) | PASS |
| 06 | Control Tower `freight_no_communication_24h` | PASS |
| 07 | Role isolation (buyer cannot create forwarder) | PASS |
| 08 | Forwarders UI page | PASS |

## Regression

All prior suites (RFQ through FreightIQ 5A) remain **PASS**.

## Contracts

Vitest: **58 passed** (includes `freight-communications.test.ts`).

## Commands

```bash
cd apps/backend && npx prisma migrate deploy
cd apps/e2e && npx playwright test
cd packages/contracts && npm run test
```
