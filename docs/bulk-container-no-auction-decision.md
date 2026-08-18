# BulkContainer — No Auction Decision

**Sprint:** 13A.1 — BulkContainer Product Family Alignment  
**Date:** 2026-06-09  
**Status:** Locked product decision (documentation only)

---

## 1. Decision

**BulkContainer will not integrate with CommodityBid.**

This is a permanent product-family boundary, not a deferred V2 feature.

| Excluded from BulkContainer | Rationale |
|----------------------------|-----------|
| Auction mechanics | Reserved for CommodityBid |
| Bidding / supplier portal | BulkContainer is buyer + ops only |
| Line-level CommodityBid spawn | Would blur product boundaries |
| `procurementMethod = COMMODITYBID` | Removed from data model |
| `auctionEligible` catalog flag | Removed from data model |
| `commodityBidWorkspaceId` link field | Removed from data model |
| `bulk_container_auction_pending` alert | Never implemented |

---

## 2. Why this decision

### 2.1 Product clarity

DeMaxtore now has four distinct sourcing modes:

| Mode | Product | Mechanism |
|------|---------|-----------|
| Direct / relationship | RFQ | Named supplier negotiation |
| Competitive auction | CommodityBid | Visible bidding on lots |
| Managed retail container | SmartContainer | Ops-led multi-supplier allocation |
| Managed bulk container | BulkContainer | Ops-led multi-supplier allocation |

Mixing auction into BulkContainer would create a fifth hybrid mode that confuses buyers and ops.

### 2.2 Operational model

BulkContainer follows the **SmartContainer playbook**:

1. Buyer builds container plan (spec + quantity)
2. Buyer submits for live pricing
3. Operations sources suppliers and enters prices manually
4. Buyer receives one consolidated offer
5. Post-approval allocation is internal

Auction introduces a parallel timeline (bid windows, lot states, bidder visibility) incompatible with the container offer validity model (72h consolidated offer).

### 2.3 Buyer segment

BulkContainer buyers (horeca distributors, bakeries, manufacturers) need:

- Specification compliance (protein, moisture, crop year)
- Multi-product container planning (flour + rice + oil)
- Opaque multi-supplier coordination

They do **not** need visible competitive bidding inside a container workspace. Buyers who want auction price discovery use **CommodityBid** as a separate product.

### 2.4 What Sprint 13A got wrong

Sprint 13A documented optional future CommodityBid integration:

- `procurementMethod: DIRECT_BULK_PRICING | COMMODITYBID_AUCTION`
- `auctionEligible` on catalog products
- Option A/B/C CB spawn designs
- Phase 13F for line-level auction

**13A.1 retracts all of the above.** BulkContainer is operations-led managed sourcing only.

---

## 3. Buyer routing when auction is needed

```
Does the buyer need competitive auction price discovery?
│
├─ YES → CommodityBid
│         Large-volume lot, visible bidding, auction FSM
│
└─ NO → Is it container-based managed sourcing?
          │
          ├─ Retail packaged (pallet/SKU) → SmartContainer
          │
          └─ Bulk / horeca / industrial (ton/spec) → BulkContainer
```

A buyer may use **both** CommodityBid and BulkContainer in the same account — as **separate workspaces** — but never merged into one container line.

---

## 4. Architecture impact

### Removed from data model

```diff
- bulk_container_catalog_products.auctionEligible
- bulk_container_lines.procurementMethod
- bulk_container_lines.commodityBidWorkspaceId
- bulk_container_quotes.auctionLinesCount
```

### Removed from FSM / modules

- No CB spawn from `bulk-container-execution.service.ts`
- No CB states in `BC_*` FSM
- No CB panel embed in bulk ops workspace

### Removed from Control Tower

- `bulk_container_auction_pending` (was future-only; now cancelled)

### Unchanged

- CommodityBid product, FSM, routes, supplier portal — **no modifications**
- SmartContainer — already had no CB integration; unchanged
- RFQ — unchanged

---

## 5. Procurement model (authoritative)

```
Buyer Request
      ↓
Operations Procurement        ← manual sourcing + manual pricing
      ↓
Bulk Offer                    ← consolidated, 72h validity
      ↓
Buyer Approval
      ↓
Supplier Allocation           ← internal, buyer-opaque
      ↓
Proforma
      ↓
Payment Tracking
      ↓
Execution Ready
      ↓
Order / FreightIQ / Shipment
```

Pricing is **always** operations-entered after buyer submission. No automated auction price feed.

---

## 6. Future scope guardrails

If product team revisits auction for bulk commodities, the correct path is:

1. Buyer uses **CommodityBid** to establish a market price on a lot
2. Buyer separately builds a **BulkContainer** with ops-entered pricing informed by market knowledge

**Not acceptable:** Embedding CB auction inside BulkContainer workspace or line items.

---

## 7. Verdict

BulkContainer operates as a **managed sourcing product** — same class as SmartContainer, different unit/spec model. CommodityBid remains reserved for **large-volume competitive auction sourcing** only.
