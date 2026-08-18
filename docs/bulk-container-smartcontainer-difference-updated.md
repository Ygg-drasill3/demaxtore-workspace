# BulkContainer vs SmartContainer — Updated Comparison

**Sprint:** 13A.1 — BulkContainer Product Family Alignment  
**Date:** 2026-06-09  
**Status:** Authoritative comparison (supersedes CB references in `bulk-container-smartcontainer-difference.md`)  
**Constraint:** No runtime implementation in this sprint

---

## 1. One-line distinction

| Product | One-liner |
|---------|-----------|
| **SmartContainer** | Retail packaged products — multi-supplier managed container, pallet/SKU driven |
| **BulkContainer** | Bulk / horeca / industrial products — multi-supplier managed container, ton/spec driven |

Both are **managed sourcing products**. Neither integrates with CommodityBid.

---

## 2. Final product family context

```
SOURCING
├── RFQ              → Find one supplier / direct sourcing
├── CommodityBid     → Large-volume competitive auction
├── SmartContainer   → Retail packaged, managed container
└── BulkContainer    → Bulk / horeca / industrial, managed container

EXECUTION
├── Order
├── FreightIQ        → Logistics execution layer
└── Shipment
```

---

## 3. Side-by-side comparison

| Dimension | SmartContainer | BulkContainer |
|-----------|----------------|---------------|
| **Workspace type** | `MIXED_CONTAINER` | `BULK_CONTAINER` |
| **External ref** | `MC-{YYYY}-{seq}` | `BC-{YYYY}-{seq}` |
| **Execution ref** | `SC-{YYYY}-{NNNNN}` | `BC-EXEC-{YYYY}-{NNNNN}` |
| **Buyer routes** | `/buyer/mixed-container/*` | `/buyer/bulk-container/*` |
| **Admin routes** | `/admin/mixed-container/*` | `/admin/bulk-container/*` |
| **Segment** | Retail packaged food | Bulk / horeca / industrial food |
| **Primary unit** | Pallets | MT, bags, pallets, liters |
| **Catalog model** | Anonymized retail SKU cards | Specification template cards |
| **Packaging** | Retail export packs (e.g. 5kg × 50/pallet) | Bulk packs (50 kg flour, 25 kg rice, 20 L oil) |
| **Private label** | Not supported | Not supported in V1 |
| **Quality focus** | Brand, certifications | Technical specs (protein, ash, moisture, crop year) |
| **Pricing volatility** | Moderate | Higher — commodity-linked |
| **Indicative pricing** | USD / pallet | USD / MT, USD / bag, USD / pallet |
| **CommodityBid** | **Not integrated** | **Not integrated** |
| **Procurement model** | Ops-led managed sourcing | Ops-led managed sourcing |
| **Capacity model** | Pallet count | Weight + volume + pallet |
| **Buyer UX tone** | Curated retail importer | Professional procurement / horeca |
| **FSM prefix** | `MC_*` | `BC_*` |
| **DB prefix** | `mc_*`, `catalog_products` | `bulk_container_*` |

---

## 4. Shared managed sourcing pattern

Both products follow the same operational procurement spine:

```
Buyer Request
      ↓
Operations Procurement
      ↓
Offer (Container / Bulk)
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

| Pattern | SmartContainer | BulkContainer |
|---------|----------------|---------------|
| Supplier anonymity | Yes — catalog refs only | Yes — catalog refs only |
| Live pricing | Ops manual entry post-submit | Ops manual entry post-submit |
| Offer validity | 72h default | 72h default (+ shorter for volatile lines) |
| Consolidated offer | One offer, many suppliers | One offer, many suppliers |
| Execution bridge | `mc_order_links` → Order spawn | `bulk_container_order_links` → Order spawn |
| FreightIQ / Shipment | Order-attached, unchanged | Order-attached, unchanged |

**BulkContainer additions:** spec review step, multi-unit normalization, weight/volume capacity warnings.

---

## 5. When to use which

```
What is the buyer sourcing?
│
├─ Named supplier, custom negotiation, non-catalog
│     → RFQ
│
├─ Large-volume competitive auction, price discovery
│     → CommodityBid
│
├─ Retail packaged products in a mixed container
│     → SmartContainer
│
└─ Bulk / horeca / industrial products in a mixed container
      → BulkContainer
```

**Neither SmartContainer nor BulkContainer** is appropriate for auction sourcing. Use CommodityBid.

---

## 6. What must stay separate

| Concern | Why |
|---------|-----|
| Catalog tables | Retail SKU fields ≠ bulk spec templates |
| Line item model | `palletCount` vs `quantity` + `unitType` + `specValues` |
| Capacity calculator | Pallet meter vs weight + volume + pallet meter |
| Navigation | Two SOURCING entries with distinct taglines |
| FSM | `MC_*` and `BC_*` — no cross-transitions |
| CommodityBid | Independent product; no line-level spawn from either container |

**Anti-pattern:** "Bulk mode" toggle inside SmartContainer, or auction panel inside BulkContainer.

---

## 7. Navigation coexistence

```
SOURCING (buyer nav)
├── RFQ
├── CommodityBid
├── SmartContainer     ← "Retail mixed containers"
└── BulkContainer      ← "Bulk & horeca containers"
```

| Product | Tagline |
|---------|---------|
| SmartContainer | Plan retail packaged products by pallet |
| BulkContainer | Plan bulk & industrial food by ton and specification |

---

## 8. Data isolation

```
SmartContainer                    BulkContainer
─────────────────                 ─────────────────
catalog_products                  bulk_container_catalog_products
mixed_container_details           bulk_container_details
container_lines                   bulk_container_lines
mc_* tables                       bulk_container_* tables
```

No foreign keys between MC and BC entities. No shared CommodityBid link fields.

---

## 9. Verdict

SmartContainer and BulkContainer are **parallel managed sourcing products** for different packaging segments. CommodityBid is a **separate auction product** for large-volume competitive sourcing. Clear boundaries prevent buyer confusion and keep ops workflows distinct.
