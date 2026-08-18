# Mixed Container — Catalog Design

**Sprint:** 12A — Mixed Container Architecture & Product Design  
**Date:** 2026-06-08  
**Status:** Design specification (no runtime implementation)

---

## 1. Purpose

The Mixed Container catalog is an **anonymized, buyer-facing product index** for container planning. It is not a supplier marketplace, not an RFQ spec template, and not tied to a single vendor.

Suppliers are mapped internally via `catalog_product_suppliers` (ops-only). Buyers interact only with `CatalogProduct` buyer-safe fields.

---

## 2. Catalog architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CATALOG LAYER (read)                         │
├─────────────────────────────────────────────────────────────────┤
│  CatalogProduct          ← buyer API                             │
│  CatalogCategory         ← taxonomy / filters                      │
│  CatalogMarketInsight    ← per-product or per-category narratives  │
│  CatalogTransactionBand← anonymized recent txn ranges            │
├─────────────────────────────────────────────────────────────────┤
│  catalog_product_suppliers  ← ADMIN only (never in buyer API)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Container Builder (ContainerLine.catalogProductId)
```

---

## 3. Product card — buyer-visible fields

Each catalog item renders as a **product card** in grid or list view.

### 3.1 Required fields

| Field | Source | Display example |
|-------|--------|-----------------|
| **Product Name** | `catalog_products.name` | "Premium Basmati Rice 5kg" |
| **Category** | `catalog_products.category` + `subcategory` | "Grains · Rice" |
| **Packaging** | `catalog_products.packagingDescription` | "50 bags × 5kg / pallet" |
| **MOQ** | `catalog_products.moqPallets` | "Min. 2 pallets" |
| **Pallet Information** | `unitsPerPallet`, `palletWeightKg`, `palletVolumeCbm` | "40 units/pallet · ~800 kg · 1.2 CBM" |
| **Sample Availability** | `sampleAvailable`, `sampleLeadDays` | Badge: "Sample available · ~5 days" or "No sample" |
| **Market Insights** | `marketInsightSummary` or linked insight | "Demand up 12% in EU retail Q1. Supply stable." |
| **Recent Transaction Range** | `recentTxnLow` – `recentTxnHigh`, `recentTxnAsOf` | "Recent trades: $1,180 – $1,340 / pallet (as of May 2026)" |

### 3.2 Optional enrichments

| Field | Purpose |
|-------|---------|
| Origin region | "Southeast Asia" — geographic signal without factory |
| Certifications | BRC, Halal, Organic badges |
| Indicative range | `indicativeLow` – `indicativeHigh` (pre-submit planning) |
| Product ref | `MC-SKU-0042` — support reference, not supplier code |

### 3.3 Explicitly excluded from buyer API

| Field | Reason |
|-------|--------|
| Supplier name | Core principle #6 |
| Factory name | Core principle #6 |
| Contact information | Core principle #6 |
| Internal supplier SKU | Ops allocation only |
| Supplier margin / cost price | Internal |
| `catalog_product_suppliers` rows | Ops only |

---

## 4. Product card layout (information hierarchy)

```
┌────────────────────────────────────────────────────────────┐
│  [Category badge]                              [Sample ✓]  │
│                                                            │
│  Premium Basmati Rice 5kg                                  │
│  MC-SKU-0042                                               │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Packaging: 50 bags × 5kg / pallet                    │  │
│  │ MOQ: 2 pallets                                       │  │
│  │ Pallet: 40 units · ~800 kg · 1.2 CBM               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Market insight                                            │
│  "EU retail demand up 12% Q1. Supply stable in origin."  │
│                                                            │
│  Recent transactions                                       │
│  $1,180 – $1,340 / pallet  ·  May 2026                   │
│                                                            │
│  Indicative range (planning only)                          │
│  $1,200 – $1,320 / pallet                                  │
│                                                            │
│  [Request Sample]              [Add to Container →]        │
└────────────────────────────────────────────────────────────┘
```

**Hierarchy rule:** Product identity → logistics (packaging/pallet) → intelligence (insights, txn range) → actions.

---

## 5. Category taxonomy

Food-focused hierarchy aligned with existing `rfqDetails.productCategory` where possible (for Market Intelligence cross-feed), but **independent table** for Mixed Container.

| Level | Examples |
|-------|----------|
| L1 Category | Grains, Oils, Canned Goods, Beverages, Snacks, Frozen, Dairy |
| L2 Subcategory | Rice, Pasta, Olive Oil, Tuna, Juice, Nuts, … |
| Filters | Category, subcategory, origin region, certifications, sample available |

**Future:** Category demand scores from Sprint 7C Market Intelligence feed catalog sort order ("Trending in your market").

---

## 6. Pricing display rules

### 6.1 Indicative Market Range (catalog / builder)

| Rule | Detail |
|------|--------|
| Source | Admin-seeded + Market Intelligence anonymized rollups |
| Label | Always prefixed: **"Indicative — not a price offer"** |
| Format | Low – high per pallet, in workspace currency |
| Update cadence | Weekly batch or on transaction rollup refresh |
| Null handling | If no data: show "Contact for range" or hide range with tooltip |

### 6.2 Recent Transaction Range

| Rule | Detail |
|------|--------|
| Source | Anonymized DeMaxtore platform transactions (same category/packaging band) |
| Minimum sample | ≥3 transactions in 90d before displaying (configurable) |
| Privacy | No buyer/supplier names in rollup |
| Staleness | Hide if `recentTxnAsOf` > 120 days |

### 6.3 Live Supplier Pricing

Not shown in catalog. Appears only in **Pricing Review** after Container RFQ submit (see buyer journey).

---

## 7. Pallet information model

Pallets are the **planning unit** for Mixed Container.

| Attribute | Field | Used for |
|-----------|-------|----------|
| Units per pallet | `unitsPerPallet` | Packaging clarity |
| Weight per pallet | `palletWeightKg` | Freight estimate (advisory) |
| Volume per pallet | `palletVolumeCbm` | Fill meter (optional weight/volume dual view) |
| MOQ pallets | `moqPallets` | Line validation |
| Max per container | Derived from container type | Fill meter cap |

**Fill calculation (design):**

```
fillPercentage = Σ(line.palletCount) / container.maxPalletCapacity × 100
```

Volume/weight sub-meters (future): warn if CBM or weight exceeds container limits even when pallet count is under capacity.

---

## 8. Sample availability

| `sampleAvailable` | Card badge | Builder action |
|-------------------|------------|----------------|
| `true` | "Sample available" + lead days | "Request Sample" enabled |
| `false` | Hidden or "No sample" | Button disabled with tooltip |

Sample requests create `SampleRequest` records — see data model. Sample approval does not auto-add product to container.

---

## 9. Market insights

### 9.1 Sources (future)

| Source | Content |
|--------|---------|
| Market Intelligence (Sprint 7C) | Category demand trends, supply gaps |
| Admin curation | Product-specific narratives |
| Transaction analytics | Price trend direction (↑ ↓ →) |

### 9.2 Display rules

- Max 2 sentences on card; full insight on product detail page
- No supplier-specific claims ("Factory X offers…")
- Timestamp or "as of" date when insight is time-sensitive
- Language: buyer benefit ("Demand rising in EU retail") not ops jargon

---

## 10. Catalog API surface (proposed, design only)

| Method | Path | Role | Returns |
|--------|------|------|---------|
| GET | `/api/mixed-container/catalog` | BUYER | Paginated product cards (buyer-safe DTO) |
| GET | `/api/mixed-container/catalog/:productRef` | BUYER | Product detail |
| GET | `/api/mixed-container/catalog/categories` | BUYER | Taxonomy tree |
| POST | `/api/mixed-container/catalog` | ADMIN | Create product |
| PATCH | `/api/mixed-container/catalog/:id` | ADMIN | Update product |
| POST | `/api/mixed-container/catalog/:id/suppliers` | ADMIN | Map supplier (internal) |

**Buyer DTO type (contracts):**

```typescript
interface CatalogProductCard {
  productRef: string;
  name: string;
  category: string;
  subcategory?: string;
  packagingDescription: string;
  moqPallets: number;
  unitsPerPallet: number;
  palletWeightKg?: number;
  palletVolumeCbm?: number;
  sampleAvailable: boolean;
  sampleLeadDays?: number;
  marketInsightSummary?: string;
  recentTxnLow?: number;
  recentTxnHigh?: number;
  recentTxnAsOf?: string;
  indicativeLow?: number;
  indicativeMid?: number;
  indicativeHigh?: number;
  indicativeCurrency?: string;
  originRegion?: string;
  certifications: string[];
}
// Explicitly NO supplierOrgId, factoryName, contact fields
```

---

## 11. Catalog ingestion (ops workflow, future)

```
Admin creates CatalogProduct (DRAFT)
  → Maps 1..N suppliers via catalog_product_suppliers
  → Sets indicative range + market insight
  → Publishes (status = ACTIVE)
  → Appears in buyer catalog
```

| Role | Capability |
|------|------------|
| ADMIN | Full CRUD, supplier mapping, publish/discontinue |
| OPERATOR | Edit insights, indicative ranges |
| BUYER | Read-only catalog + add to container |
| SUPPLIER | No direct catalog access in Phase 1 (allocated via ops) |

**Phase 2 (out of scope):** Supplier self-service SKU submission with admin approval queue.

---

## 12. Search & discovery

| Feature | Design |
|---------|--------|
| Text search | Name, category, product ref |
| Filters | Category, subcategory, origin, certifications, sample available |
| Sort | Relevance, indicative mid ASC/DESC, recently added, trending (MI score) |
| Empty state | "No products match. Try broader filters or request a category." |

---

## 13. Catalog ↔ Container Builder binding

When buyer clicks "Add to Container":

1. Resolve active draft workspace or prompt "New container"
2. Create `ContainerLine` with `catalogProductId`, default `palletCount = moqPallets`
3. Snapshot indicative prices onto line (for later delta comparison)
4. Redirect to Container Builder with line highlighted

Removing from builder soft-deletes line (`removedAt`); does not delete catalog product.

---

## 14. Anti-patterns (do not build)

| Anti-pattern | Why |
|--------------|-----|
| Supplier storefront | Violates anonymity principle |
| "Add to cart" with quantity dropdown | Wrong metaphor — pallets in planner |
| Real-time inventory stock count | Not available in Phase 1; creates false precision |
| Mixed catalog + RFQ line items | Separate domains |
| Buyer-visible supplier ratings | Leaks identity indirectly |
