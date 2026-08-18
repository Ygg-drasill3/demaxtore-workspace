# Sprint 11A — Procurement Strategy Review (Phase 1)

## Strategic objective

Preserve **CommodityBid** as a flagship DeMaxtore product while making it an **optional procurement strategy** after RFQ creation. RFQ remains the universal entry point.

## Pre-11A state (audit)

### Current flow

| Path | Entry | Flow |
|------|-------|------|
| Direct RFQ | `/buyer/rfq/new` | Create → Submit → Admin assign/publish → Quotations → Select → PO → Order |
| CommodityBid | `/buyer/commoditybid/new` | Create draft → `schedule_auction` → Live auction → Approval → Order |

RFQ and CommodityBid were **parallel, independent** workspaces. No link between them.

### Assumptions (pre-11A)

1. Buyers could start sourcing via CommodityBid without an RFQ.
2. No `procurementMethod` field on RFQ.
3. `workspaces.spawned_from_id` existed but was unused for RFQ→CommodityBid.
4. Buyer dashboard aggregated all open RFQs and live auctions without strategy distinction.

### Routing (pre-11A)

- RFQ create → `/workspace/rfq/:id` (immediate workspace)
- CommodityBid create → `/workspace/commoditybid/:id` (immediate workspace)
- Nav, dashboard, learning, and landing pages promoted CommodityBid as a peer product.

## Post-11A target flow

```
Create RFQ
    ↓
Choose Procurement Strategy
    ├── DIRECT_RFQ → existing quotation FSM
    └── COMMODITYBID_AUCTION → spawn CommodityBid (Sprint 9B runtime)
```

### Business rules enforced

- Every sourcing process **starts with RFQ**.
- Buyer **must choose** strategy (`procurementMethod`); no auto-selection, category forcing, or admin override.
- CommodityBid visibility **unchanged** in menu, dashboard, learning, reports.

## Schema changes

- `rfq_details.procurement_method`: `DIRECT_RFQ` | `COMMODITYBID_AUCTION` | null (pending choice)
- `rfq_details.linked_commoditybid_id`: UUID when auction path chosen
- `workspaces.spawned_from_id` on CommodityBid → source RFQ id

## API additions

- `POST /api/rfq/:id/procurement-strategy` — set `DIRECT_RFQ`
- `POST /api/rfq/:id/spawn-commoditybid` — set `COMMODITYBID_AUCTION`, create linked auction
- `GET /api/growth/procurement-strategy` — admin reporting

## UX additions

- `/workspace/rfq/:id/procurement-strategy` — strategy selection page
- RFQ create/submit redirects to strategy page when `procurementMethod` is null
- RFQ workspace gates redirect until strategy is chosen
