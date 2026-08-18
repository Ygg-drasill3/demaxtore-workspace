# Sprint 11A — Procurement Strategy Implementation Report

## Summary

Sprint 11A introduces **buyer-selected procurement strategy** after RFQ creation while preserving CommodityBid as a flagship, fully visible product.

## Delivered

### Data model

- `procurementMethod` on `rfq_details` (`DIRECT_RFQ` | `COMMODITYBID_AUCTION`)
- `linkedCommoditybidId` links RFQ to spawned auction workspace
- Migration backfills existing RFQs as `DIRECT_RFQ` for continuity

### Backend

| Component | Path |
|-----------|------|
| Procurement service | `apps/backend/src/modules/rfq/rfq.service.procurement.ts` |
| Routes | `POST /rfq/:id/procurement-strategy`, `POST /rfq/:id/spawn-commoditybid` |
| DTO mapping | `rfq.service.read.ts` — `procurementMethod`, `linkedCommoditybidId` |
| Admin reporting | `GET /growth/procurement-strategy` |

### Contracts

- `PROCUREMENT_METHOD_VALUES`, `SelectProcurementStrategyInput`, `SpawnCommodityBidFromRfqInput`
- `ProcurementStrategyReport` in `packages/contracts/src/procurement-strategy.ts`

### Frontend

| Component | Purpose |
|-----------|---------|
| `ProcurementStrategyPage` | Strategy selection UI after RFQ create |
| `RfqCreatePage` | Redirect to strategy page |
| `RfqWorkspacePage` | Gate until strategy chosen |
| `buyer-command-center.ts` | Direct RFQ count, live auctions, awaiting approval KPIs |
| `KpiRow.tsx` | Updated labels and `cc-kpi-awaiting-auction-approval` |
| `LearningCenterPage` | Direct RFQ vs CommodityBid guidance |
| `GrowthPage` | Admin procurement strategy metrics panel |

### CommodityBid spawn

- RFQ line items → auction lots
- Reuses Sprint 9B `schedule_auction` transition
- Sets `spawnedFromId` on CommodityBid workspace → RFQ id

## Unchanged (by design)

- CommodityBid menu item, dashboard widgets, learning card, standalone create page
- Direct RFQ FSM — no new workflow states
- CommodityBid auction engine — no rewrite

## Strategic success criterion

DeMaxtore now supports:

- **Relationship-Based Procurement** (Direct RFQ)
- **Competitive Procurement** (CommodityBid Auction)

…with RFQ as the universal starting point and CommodityBid as an optional but promoted engine.
