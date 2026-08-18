# CommodityBid Auction Playwright Results — Sprint 9B Closure

**Date:** 2026-06-05  
**Spec:** `apps/e2e/tests/24-commoditybid-auction-engine.spec.ts`  
**Environment:** `E2E_API_URL=http://127.0.0.1:3001` · `E2E_FRONTEND_URL=https://workspace.demaxtore.com`

## Status: **PASS** (6/6)

| # | Scenario | Result | Duration |
|---|----------|--------|----------|
| 01 | Buyer creates scheduled auction via UI | PASS | 2.7s |
| 02 | Scheduler invites suppliers and opens LIVE | PASS | 36.8s |
| 03 | Suppliers submit improving bids; lowest = 385 | PASS | 142ms |
| 04 | Auction auto-closes; winner identified | PASS | 1.0m |
| 05 | Buyer approves + spawns order; no comparison UI | PASS | 2.1s |
| 06 | Learning Center auction copy | PASS | 1.2s |

**Total runtime:** 1.8m (serial)

## Closure gate fixes applied

| Issue | Resolution |
|-------|------------|
| Buyer could not load suppliers (403 on admin endpoint) | Added `GET /api/commoditybid/suppliers` (BUYER role) |
| Form validation blocked submit (`supplierUserIds` empty in RHF) | Sync `selected` → `setValue("supplierUserIds")` |
| E2E timing (auction start / test timeouts) | Start +45s; test 02 timeout 120s; test 04 timeout 180s |
| Learning card strict-mode selector | Scoped to `Scheduled reverse-auction` text |

## Prerequisites verified

- Backend restarted; `GET /api/healthz` → `{"status":"ok","db":"up"}`
- CommodityBid auction scheduler started on boot
- DB migration `20260605180000_sprint9b_auction_engine` applied
- Frontend dist rebuilt and nginx reloaded

## Helper

Admin endpoint `POST /api/admin/commoditybid/run-scheduler-tick` advances auction phases in tests without waiting for the 15-minute production interval.

## Legacy spec

`04-commoditybid-flow.spec.ts` — **deprecated** (`test.describe.skip`). Canonical coverage is test 24. Sealed-bid / manual award path removed.

## Command

```bash
cd apps/e2e
E2E_API_URL=http://127.0.0.1:3001 E2E_FRONTEND_URL=https://workspace.demaxtore.com \
  yarn test tests/24-commoditybid-auction-engine.spec.ts
```
