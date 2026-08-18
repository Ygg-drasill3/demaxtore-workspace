# Sprint 11A — Playwright Results

**Spec:** `apps/e2e/tests/29-procurement-strategy.spec.ts`  
**Environment:** `E2E_API_URL=http://127.0.0.1:3001` · `E2E_FRONTEND_URL=https://workspace.demaxtore.com`  
**Date:** 2026-06-06

## Result: **8/8 PASS**

| # | Scenario | Status |
|---|----------|--------|
| 01 | Create RFQ lands on procurement strategy selection | PASS |
| 02 | Direct RFQ path works | PASS |
| 03 | CommodityBid path spawns auction from RFQ | PASS |
| 04 | CommodityBid navigation unchanged in buyer menu | PASS |
| 05 | Dashboard shows procurement KPIs | PASS |
| 06 | Learning Center updated with strategy guides | PASS |
| 07 | Admin procurement strategy report (API) | PASS |
| 08 | Supplier cannot access procurement strategy endpoint | PASS |

## Related spec update

`02-rfq-flow.spec.ts` test 01 updated to select Direct RFQ after RFQ creation (Sprint 11A gate).

## Fixes applied during test run

1. React Query cache race — `ProcurementStrategyPage` sets query cache after strategy selection; `RfqWorkspacePage` waits for `isFetched` before redirect gate.
2. Navigation test — uses `nav-buyer-commoditybid` with desktop viewport.

## Regression note

Full serial suite `01→29` may hit auth rate limits after long runs (environmental). Isolated spec 29 is the Sprint 11A acceptance gate.
