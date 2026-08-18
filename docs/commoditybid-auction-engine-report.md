# CommodityBid Auction Engine Report — Sprint 9B

**Date:** 2026-06-05

## Summary

CommodityBid runtime was transformed from sealed-bid + manual award into a **scheduled reverse-auction engine** with automatic lowest-bid winner selection and buyer-only approve/reject.

## Delivered components

| Component | Path | Status |
|-----------|------|--------|
| Auction FSM | `packages/contracts/src/commoditybid.fsm.ts` | ✓ |
| Auction engine | `apps/backend/src/modules/commoditybid/auction-engine.ts` | ✓ |
| Winner engine | `apps/backend/src/modules/commoditybid/winner-engine.ts` | ✓ |
| Scheduler | `apps/backend/src/modules/commoditybid/commoditybid.scheduler.ts` | ✓ |
| DB migration | `prisma/migrations/20260605180000_sprint9b_auction_engine/` | ✓ (apply on deploy) |
| Socket events | `auction.started`, `auction.bid.submitted`, `auction.lowest.updated`, `auction.closed`, `auction.winner.selected`, `auction.approval.required` | ✓ |
| Admin analytics | `GET /api/admin/commoditybid/analytics` | ✓ |
| Scheduler tick (test) | `POST /api/admin/commoditybid/run-scheduler-tick` | ✓ |

## FSM flow

```
BID_DRAFT → schedule_auction → SCHEDULED
  → start_invitations → INVITING_SUPPLIERS
  → invitations_complete → READY_TO_START
  → auction_started → LIVE
  → auction_closed → CLOSED
  → winner_selected → WINNER_IDENTIFIED
  → require_buyer_approval → AWAITING_BUYER_APPROVAL
  → approve_winner → APPROVED
  → spawn_orders → ORDERS_SPAWNED
```

## Bid rules (reverse auction)

- Only invited suppliers may bid in `LIVE`
- Each bid/revise must be **strictly lower** than the current lowest on the lot
- Bid events recorded in `commoditybid_bid_events`

## Removed legacy paths

- Manual `draft_award_lot` / comparison radio UI
- Admin `publish_bid` / `invite_suppliers` manual triage for auction open
- Supplier award acceptance SLA loop (buyer approval replaces it)

## Verification

| Check | Result |
|-------|--------|
| Contracts tests (69) | PASS |
| Backend typecheck | PASS |
| Frontend build | PASS |
| DB migration applied | Pending deploy (`prisma migrate deploy`) |
| Playwright 24 | Spec written — run after migration |
