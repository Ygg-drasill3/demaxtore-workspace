# BulkContainer — Product Family Alignment

**Sprint:** 13A.1 — BulkContainer Product Family Alignment  
**Date:** 2026-06-09  
**Status:** Architecture update (documentation only — no runtime implementation)  
**Supersedes:** CommodityBid integration references in Sprint 13A BulkContainer docs

---

## 1. Final DeMaxtore product family

| Product | Role | Buyer intent |
|---------|------|--------------|
| **RFQ** | Find one supplier / direct sourcing | Named supplier, custom negotiation, relationship-based |
| **CommodityBid** | Large-volume competitive auction | Price discovery via visible competitive bidding |
| **SmartContainer** | Retail packaged products, multi-supplier managed container | Plan retail SKUs by pallet; ops-led pricing and allocation |
| **BulkContainer** | Bulk / horeca / industrial products, multi-supplier managed container | Plan bulk packs by ton/spec; ops-led pricing and allocation |
| **FreightIQ** | Logistics execution layer | Freight coordination attached to orders |

**Execution spine (shared):** Order → FreightIQ → Shipment  
**Platform services:** Trade Documents, Control Tower, Learning Center

---

## 2. Managed sourcing pair

SmartContainer and BulkContainer are **sibling managed-sourcing products**. They share the same operational procurement pattern but serve different packaging segments:

```
                    ┌─────────────────────────────────────┐
                    │     MANAGED SOURCING PRODUCTS       │
                    └─────────────────────────────────────┘
                           │                    │
              ┌────────────┴────────────┐       │
              ▼                         ▼       │
     ┌─────────────────┐      ┌─────────────────┐
     │ SmartContainer  │      │ BulkContainer   │
     │ Retail packaged │      │ Bulk / horeca   │
     │ Pallet / SKU    │      │ MT / bag / spec │
     └─────────────────┘      └─────────────────┘
              │                         │
              └────────────┬────────────┘
                           ▼
              ┌─────────────────────────┐
              │  Operations Procurement │
              │  (no auction, no bid)   │
              └─────────────────────────┘
```

Neither product integrates with CommodityBid. Neither exposes a supplier portal for bidding.

---

## 3. BulkContainer procurement model (locked)

```
Buyer Request
      ↓
Operations Procurement
      ↓
Bulk Offer
      ↓
Buyer Approval
      ↓
Supplier Allocation
      ↓
Proforma
      ↓
Payment Tracking
      ↓
Execution Ready
      ↓
Order / FreightIQ / Shipment
```

| Stage | Actor | BulkContainer-specific |
|-------|-------|------------------------|
| Buyer Request | Buyer | Spec template + multi-unit quantity |
| Operations Procurement | Admin | Spec review + supplier sourcing + manual pricing |
| Bulk Offer | Admin → Buyer | Consolidated offer; supplier identities hidden |
| Buyer Approval | Buyer | Approve / revise / expire |
| Supplier Allocation | Admin (internal) | Per-line supplier mapping |
| Proforma / Payment | Buyer + Admin | Direct supplier payment coordination |
| Execution Ready | Admin | Spawn orders per allocation |
| Order / FreightIQ / Shipment | System | Existing execution spine |

---

## 4. CommodityBid boundary (locked)

| Rule | Detail |
|------|--------|
| BulkContainer does **not** integrate with CommodityBid | No auction, no bidding, no supplier portal |
| No line-level CB spawn | Removed from 13A architecture |
| No `procurementMethod = COMMODITYBID` | Field removed from data model |
| No `auctionEligible` catalog flag | Field removed from data model |
| CommodityBid remains independent | Large-volume auction sourcing only |

**Buyer routing:**

| Intent | Product |
|--------|---------|
| One named supplier, direct negotiation | RFQ |
| Large-volume competitive auction | CommodityBid |
| Retail packaged mixed container | SmartContainer |
| Bulk / horeca / industrial mixed container | BulkContainer |

---

## 5. Documentation changes (13A.1)

| Document | Change |
|----------|--------|
| `bulk-container-product-vision.md` | Product family table; remove CB integration |
| `bulk-container-architecture.md` | Replace §9 CB section with ops procurement model |
| `bulk-container-pricing-specification-report.md` | Remove §7 CommodityBid |
| `bulk-container-data-model.md` | Remove `auctionEligible`, `procurementMethod`, `commodityBidWorkspaceId` |
| `bulk-container-smartcontainer-difference.md` | Remove CB references; clarify managed sourcing pair |
| `bulk-container-buyer-journey.md` | Align journey labels to ops-led model |
| `bulk-container-control-tower-impact.md` | Remove future `bulk_container_auction_pending` |
| `bulk-container-product-readiness-verdict.md` | Updated verdict — no CB integration |

**New documents:**

| Document | Purpose |
|----------|---------|
| `bulk-container-product-family-alignment.md` | This document |
| `bulk-container-no-auction-decision.md` | Rationale for CB exclusion |
| `bulk-container-smartcontainer-difference-updated.md` | Authoritative SC vs BC comparison |

---

## 6. Non-disruption guarantees (unchanged)

| Product | Status |
|---------|--------|
| SmartContainer | Unchanged — no CB integration |
| RFQ | Unchanged — parallel workspace |
| CommodityBid | Unchanged — no BulkContainer coupling added or removed from CB |
| Order / FreightIQ / Shipment | Unchanged — additive spawn from BC execution bridge |
| Control Tower | Additive BC alerts only |
