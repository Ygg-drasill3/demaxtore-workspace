# BulkContainer vs SmartContainer — Product Difference

**Sprint:** 13A / 13A.1 — BulkContainer Architecture & Product Family Alignment  
**Date:** 2026-06-09  
**Status:** Design specification (no runtime implementation)  
**Authoritative version:** See also `bulk-container-smartcontainer-difference-updated.md` (13A.1 aligned)

---

## 1. One-line distinction

| Product | One-liner |
|---------|-----------|
| **SmartContainer** | Retail packaged products — multi-supplier managed container, pallet/SKU driven |
| **BulkContainer** | Bulk / horeca / industrial products — multi-supplier managed container, ton/spec driven |

Both are **managed sourcing products**. Neither integrates with CommodityBid.

---

## 2. Side-by-side comparison

| Dimension | SmartContainer | BulkContainer |
|-----------|----------------|---------------|
| **Workspace type** | `MIXED_CONTAINER` | `BULK_CONTAINER` (proposed) |
| **External ref** | `MC-{YYYY}-{seq}` | `BC-{YYYY}-{seq}` |
| **Execution ref** | `SC-{YYYY}-{NNNNN}` | `BC-EXEC-{YYYY}-{NNNNN}` (proposed) |
| **Buyer routes** | `/buyer/mixed-container/*` | `/buyer/bulk-container/*` |
| **Admin routes** | `/admin/mixed-container/*` | `/admin/bulk-container/*` |
| **Segment** | Retail packaged food | Bulk / horeca / industrial food |
| **Primary unit** | Pallets | Metric tons, bags, pallets (product-defined) |
| **Catalog model** | Anonymized retail SKU cards | Specification template cards |
| **Packaging** | Retail export packs (e.g. 5kg × 50/pallet) | Bulk/horeca packs (50 kg flour, 25 kg rice) |
| **Private label** | Not supported | Not supported in V1 |
| **Quality focus** | Brand, certifications, sample | Technical specs (protein, ash, moisture, etc.) |
| **Pricing volatility** | Moderate | Higher — commodity-linked |
| **Indicative pricing** | USD / pallet | USD / MT, USD / bag, USD / pallet |
| **CommodityBid** | **Not integrated** | **Not integrated** |
| **Procurement model** | Ops-led managed sourcing | Ops-led managed sourcing |
| **Capacity model** | Pallet count only | Weight + volume + pallet (dual constraint) |
| **Buyer UX tone** | Curated retail importer | Professional procurement / horeca |
| **FSM prefix** | `MC_*` | `BC_*` |
| **DB table prefix** | `mc_*`, `catalog_products` | `bulk_container_*` |
| **Alert prefix** | `mixed_container_*`, `smartcontainer_*` | `bulk_container_*`, `bulkcontainer_*` |

---

## 3. When to use which

```
Buyer intent?
│
├─ Retail packaged products, branded export labels, pallet MOQ
│     → SmartContainer
│
├─ Bulk bags (25–50 kg), industrial ingredients, ton-based planning
│     → BulkContainer
│
├─ Named supplier, custom negotiation, non-catalog spec
│     → RFQ
│
└─ Large-volume competitive auction
      → CommodityBid
```

---

## 4. Shared patterns (reuse without merging)

BulkContainer **reuses SmartContainer lessons** but does not copy blindly:

| Pattern | SmartContainer | BulkContainer adaptation |
|---------|----------------|--------------------------|
| Workspace spine | `workspaces`, participants, timeline | Same spine, new `BULK_CONTAINER` type |
| Procurement flow | Request pricing → ops → offer | Same stages, spec review added |
| Supplier anonymity | Catalog ref → internal mapping | Same; spec templates replace SKU cards |
| Offer validity | 72 hours default | 72 hours default; shorter for volatile lines |
| Coordination | Allocation → proforma → payment | Same ops pattern, new tables |
| Execution bridge | Spawn orders per allocation | Same pattern via `bulk_container_order_links` |
| FreightIQ / Shipment | Order-attached, unchanged | Identical handoff |
| CommodityBid | Not integrated | Not integrated |

---

## 5. What must stay separate

| Concern | Why separation matters |
|---------|------------------------|
| Catalog tables | Retail SKU fields ≠ bulk spec templates |
| Line item model | `palletCount` only vs `unitType` + `quantity` + specs JSON |
| Capacity calculator | Pallet fill meter vs weight + volume + pallet meter |
| Buyer navigation | Two SOURCING entries; clear labels prevent confusion |
| FSM | Independent states; no `MC_*` / `BC_*` cross-transitions |
| CommodityBid | Independent auction product; no line-level spawn from either container |
| Learning Center | Distinct articles; comparison guide required |
| Control Tower | Separate alert keys and scan module |

**Anti-pattern:** Adding a "bulk mode" toggle inside SmartContainer Builder, or an auction panel inside BulkContainer.

---

## 6. Navigation coexistence

```
SOURCING (buyer nav)
├── RFQ
├── CommodityBid
├── SmartContainer     ← "Retail mixed containers"
└── BulkContainer      ← "Bulk & horeca containers"
```

Taglines:
- SmartContainer: *Plan retail packaged products by pallet*
- BulkContainer: *Plan bulk & industrial food by ton and specification*

---

## 7. Data isolation

```
SmartContainer                          BulkContainer
─────────────────                       ─────────────────
catalog_products                        bulk_container_catalog_products
catalog_categories                      bulk_container_catalog_categories
mixed_container_details                 bulk_container_details (proposed)
container_lines                         bulk_container_lines
mc_* coordination/execution             bulk_container_* coordination/execution
```

No foreign keys between MC and BC line tables. No CommodityBid link fields.

---

## 8. Confusion risk assessment

| Risk | Mitigation |
|------|------------|
| Buyer picks wrong product | Nav labels, Learning Center comparison, eligibility gates on catalog |
| Ops treats BC as MC | Separate admin inboxes, external ref prefixes (`MC-` vs `BC-`) |
| Pricing model mismatch | Unit price basis shown explicitly (USD/MT vs USD/pallet) |
| Spec vs SKU | Spec template required before add-to-container |
| Auction vs managed container | CommodityBid is separate; neither SC nor BC has auction |

---

## 9. Verdict on coexistence

SmartContainer and BulkContainer can operate as **parallel managed sourcing products** without mutual disruption because:

1. Different target customers and packaging formats
2. Different unit and capacity models
3. Different catalog and specification schemas
4. Separate workspaces, routes, FSMs, and tables
5. Shared execution spine (Order → FreightIQ → Shipment) is additive, not invasive
6. CommodityBid remains a separate auction product — no integration with either container

**Answer:** BulkContainer complements SmartContainer; it does not replace or subsume it.
