# CommodityBid Auction Workspace Report — Sprint 9B

**Date:** 2026-06-05

## Workspace redesign

`CommodityBidWorkspacePage.tsx` was rebuilt around auction sections:

| Section | testId | Description |
|---------|--------|-------------|
| Auction overview | `cb-auction-overview` | Title, state, reverse-auction framing |
| Countdown | `cb-countdown` | Live timer or time-until-start |
| Current lowest bid | `cb-lowest-bid` | Auto-updated lowest price |
| Supplier participation | `cb-participation` | Invited vs joined counts |
| Live bid feed | `cb-bid-feed` | Anonymous bid event stream |
| Supplier bid form | `cb-supplier-bid-form` | LIVE only; must beat lowest |
| Winner summary | `cb-winner-summary` | Auto winner — approve/reject only |
| Spawn orders | `cb-spawn-orders-panel` | After APPROVED |
| Spawned orders | `cb-spawned-orders` | Links to order workspaces |

## Removed

- `cb-comparison` radio picker (manual supplier selection)
- `cb-select-winner` button
- Supplier award acceptance panel

## Create flow

`CommodityBidCreatePage.tsx` now collects:

- Auction start datetime
- Duration (30 / 60 / 120 min)
- Supplier multi-select
- Single action: **Schedule Auction** → `SCHEDULED`

## Realtime

Socket listeners: `commoditybid.updated`, `auction.bid.submitted`, `auction.lowest.updated`, `auction.closed`, `auction.winner.selected`

## Learning alignment

`commoditybid-learning.ts` guidance and checklist map to new FSM states (`LIVE`, `AWAITING_BUYER_APPROVAL`, `ORDERS_SPAWNED`).
