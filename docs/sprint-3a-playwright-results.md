# Sprint 3A — Playwright Results

**Run date:** 2026-06-03 (post-stabilization)  
**Environment:** localhost:3000 (frontend), localhost:8001 (backend), PostgreSQL 15 local

## CommodityBid E2E (`04-commoditybid-flow.spec.ts`)

| # | Test | Result |
|---|------|--------|
| 1 | Buyer creates CommodityBid via UI | PASS |
| 2 | Admin assigns suppliers and publishes | PASS |
| 3 | Suppliers submit and revise sealed bids | PASS |
| 4 | Buyer compares, selects winner, publishes award | PASS |
| 5 | Winning supplier accepts award via UI | PASS |
| 6 | Buyer issues contracts via UI | PASS |
| 7 | Order workspace spawned with correct lineage | PASS |

**Total:** 7/7 passed (~5.6s)

### Assertions covered

- State transitions through `CONTRACTS_ISSUED`
- Timeline: `bid.submitted`, `bid.awards.published`, `bid.lot.award_accepted`
- Anonymous comparison (bidder codes only)
- Supplier isolation (comparison 403, `my-bids`)
- Award accept API response + UI state `ACCEPTANCE_COMPLETE`
- Spawned orders visible in UI and API (`ORDER_CREATED`, `ORD-*` ref)

## RFQ regression

| Suite | Result |
|-------|--------|
| `02-rfq-flow.spec.ts` | 9/9 PASS |
| `03-realtime-and-isolation.spec.ts` | 2/2 PASS |

**RFQ total:** 11/11 PASS

## Contracts unit tests

35/35 PASS (`rfq.fsm`, `rfq.next-actions`, `commoditybid.fsm`)

## Backend HTTP tests

| File | Result |
|------|--------|
| `commoditybid.sealed-bid.test.ts` | 3/3 PASS |
| `commoditybid.scheduler.test.ts` | 2/2 PASS |
