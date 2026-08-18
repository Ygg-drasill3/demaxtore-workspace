# BulkContainer — Data Model Proposal

**Sprint:** 13A / 13A.1 — BulkContainer Architecture & Product Family Alignment  
**Date:** 2026-06-09  
**Status:** Design proposal only — **do not implement in this sprint**  
**Note:** CommodityBid fields removed in 13A.1 (`auctionEligible`, `procurementMethod`, `commodityBidWorkspaceId`).

---

## 1. Design principles

| Principle | Application |
|-----------|-------------|
| Workspace spine reuse | Lifecycle entities FK to `workspaces.id` where applicable |
| Buyer-safe vs ops-only | Catalog/offer DTOs exclude supplier fields; allocation tables ADMIN-only |
| Append-only pricing history | Offers versioned, not overwritten |
| Spawn lineage | Execution → Order via `workspaces.spawned_from_id` + `bulk_container_order_links` |
| No SmartContainer table reuse | Dedicated `bulk_container_*` tables; no FK to `catalog_products` or `container_lines` |
| Spec as JSONB | Validated against `bulk_container_spec_templates` schema |

---

## 2. Entity relationship overview

```
Workspace (type=BULK_CONTAINER)
  │
  ├── BulkContainerDetails (1:1)
  ├── BulkContainerLine[] (1:N)
  ├── BulkContainerQuote[] (1:N)        ← pricing requests
  │     └── BulkContainerOffer[] (1:N)
  │           └── BulkContainerOfferLine[] (1:N)
  ├── BulkContainerSupplierAllocation[] (1:N, ops-only)
  ├── BulkContainerProforma[] (1:N, ops-only)
  ├── BulkContainerPaymentRecord[] (1:N, ops-only)
  └── BulkMasterOrder (0:1)
        └── BulkContainerOrderLink[] → spawned Order workspaces

BulkContainerCatalogProduct (standalone)
  └── BulkContainerSpecTemplate (1:1 or 1:N by product type)

BulkContainerRequest = Workspace row (no separate request table required)
```

---

## 3. Entity definitions

### 3.1 `bulk_container_catalog_products`

**Purpose:** Buyer-facing bulk product index with unit model.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `productRef` | string unique | `BC-PROD-{seq}` — anonymized |
| `name` | string | e.g. "Industrial Wheat Flour" |
| `category` | string | Flour, Semolina, Rice, Pulses, Oil, etc. |
| `subcategory` | string? | |
| `description` | text? | |
| `standardPacking` | string | e.g. "50 kg PP woven bags" |
| `unitType` | enum | `METRIC_TON` \| `BAG` \| `PALLET` \| `LITER` |
| `kgPerBag` | decimal? | |
| `bagsPerPallet` | decimal? | |
| `kgPerPallet` | decimal? | Derived or override |
| `litersPerUnit` | decimal? | For oil |
| `minOrderUnit` | decimal | In primary unitType |
| `loadingConstraints` | JSONB | Stack rules, incompatibilities |
| `volumeCbmPerPallet` | decimal? | |
| `volatilityClass` | enum | `STABLE` \| `MODERATE` \| `HIGH` |
| `indicativeLow` | decimal? | Per unitType basis |
| `indicativeHigh` | decimal? | |
| `marketStatus` | string? | e.g. "Stable", "Rising" |
| `lastPriceUpdatedAt` | timestamp? | |
| `specTemplateId` | UUID FK | |
| `isActive` | boolean | |
| `createdAt` / `updatedAt` | timestamp | |

**Indexes:** `(category, isActive)`, `(productRef)`

---

### 3.2 `bulk_container_spec_templates`

**Purpose:** Generic + product-type specification schemas.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `productType` | string | FLOUR, SEMOLINA, RICE, PULSES, OIL, GENERIC |
| `name` | string | Display name |
| `schema` | JSONB | Parameter definitions (see pricing-spec report) |
| `version` | int | Template versioning |
| `isActive` | boolean | |
| `createdAt` / `updatedAt` | timestamp | |

**Schema parameter shape:**

```json
{
  "parameters": [
    {
      "key": "protein",
      "label": "Protein",
      "type": "range",
      "unit": "%",
      "min": 11.5,
      "max": 12.5,
      "required": true
    }
  ]
}
```

---

### 3.3 `bulk_container_details`

**Table:** 1:1 with `workspaces` where `type = BULK_CONTAINER`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Same as workspace.id |
| `containerType` | enum | `CONTAINER_20FT` \| `CONTAINER_40FT` \| `CONTAINER_40FT_HC` |
| `maxWeightKg` | int | From container type |
| `maxPalletCapacity` | decimal | |
| `maxVolumeCbm` | decimal | |
| `currentWeightKg` | decimal | Maintained sum |
| `currentPalletCount` | decimal | Fractional allowed |
| `currentVolumeCbm` | decimal | |
| `destinationMarket` | string | |
| `destinationPort` | string? | |
| `currency` | string | Set at first pricing request |
| `incoterm` | string? | |
| `targetDeliveryWindow` | daterange? | |
| `notes` | text? | |
| `activeOfferId` | UUID? FK | |
| `capacityWarnings` | JSONB | Snapshot of active warnings |
| `createdAt` / `updatedAt` | timestamp | |

---

### 3.4 `bulk_container_lines`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | |
| `catalogProductId` | UUID FK | |
| `specValues` | JSONB | Buyer-selected spec parameters |
| `quantity` | decimal | In buyer-selected unit |
| `quantityUnit` | enum | `METRIC_TON` \| `BAG` \| `PALLET` \| `LITER` |
| `normalizedKg` | decimal | Computed |
| `normalizedPallets` | decimal | Computed |
| `normalizedVolumeCbm` | decimal | Computed |
| `normalizedMetricTons` | decimal | Computed |
| `sortOrder` | int | |
| `indicativeUnitLow` | decimal? | Snapshot at add-time |
| `indicativeUnitHigh` | decimal? | |
| `liveUnitPrice` | decimal? | Set on offer |
| `livePriceBasis` | enum? | `PER_MT` \| `PER_BAG` \| `PER_PALLET` |
| `liveLineTotal` | decimal? | |
| `removedAt` | timestamp? | Soft delete |
| `createdAt` / `updatedAt` | timestamp | |

**Constraints:**
- `quantity >= catalog.minOrderUnit` (converted)
- Spec values must validate against template
- Unique active line per `(workspaceId, catalogProductId, specValues hash)` — or allow multiple lines same product with different specs

---

### 3.5 `bulk_container_requests`

> **Note:** The workspace aggregate **is** the request. This table is optional for analytics denormalization. If omitted, use `workspaces` + `bulk_container_details` only.

If used:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | = workspace.id |
| `requestNumber` | string | `BC-{YYYY}-{seq}` denormalized |
| `submittedAt` | timestamp? | First pricing request time |
| `lineCount` | int | |
| `totalMetricTons` | decimal | |

**Recommendation:** Skip separate table in V1; workspace spine sufficient (matches SmartContainer pattern).

---

### 3.6 `bulk_container_quotes`

Pricing request records (analogous to `mc_procurement_quotes` / pricing requests).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | |
| `quoteNumber` | int | Sequential per workspace |
| `status` | enum | `PENDING` \| `SPEC_REVIEW` \| `SOURCING` \| `PRICING` \| `OFFERED` \| `EXPIRED` \| `CANCELLED` |
| `requestedAt` | timestamp | |
| `slaDeadlineAt` | timestamp? | |
| `lineSnapshot` | JSONB | Immutable lines + specs at request |
| `specReviewNotes` | text? | Ops |
| `requestedById` | UUID FK | |
| `createdAt` | timestamp | |

---

### 3.7 `bulk_container_offers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | |
| `quoteId` | UUID FK | |
| `offerVersion` | int | |
| `status` | enum | `DRAFT` \| `SENT` \| `SUPERSEDED` \| `ACCEPTED` \| `EXPIRED` \| `REJECTED` |
| `validFrom` | timestamp | |
| `validUntil` | timestamp | Default +72h; per-line override in metadata |
| `currency` | string | |
| `subtotalAmount` | decimal | |
| `totalAmount` | decimal | |
| `publishedAt` | timestamp? | |
| `acceptedAt` | timestamp? | |
| `acceptedById` | UUID? FK | |
| `createdAt` | timestamp | |

---

### 3.8 `bulk_container_offer_lines`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `offerId` | UUID FK | |
| `lineId` | UUID FK → bulk_container_lines | |
| `unitPrice` | decimal | |
| `priceBasis` | enum | `PER_MT` \| `PER_BAG` \| `PER_PALLET` |
| `lineTotal` | decimal | |
| `validUntil` | timestamp? | Shorter validity for volatile lines |
| `createdAt` | timestamp | |

---

### 3.9 `bulk_container_supplier_allocations`

**Ops-only** — never exposed in buyer API.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | |
| `lineId` | UUID FK | |
| `supplierOrgId` | UUID FK | |
| `allocatedQuantity` | decimal | In line unit |
| `internalUnitPrice` | decimal | |
| `status` | enum | `PENDING` \| `CONFIRMED` \| `DECLINED` |
| `confirmedAt` | timestamp? | |
| `createdAt` / `updatedAt` | timestamp | |

---

### 3.10 `bulk_container_proformas`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | |
| `allocationId` | UUID FK | |
| `supplierOrgId` | UUID FK | |
| `proformaNumber` | string? | |
| `amount` | decimal | |
| `currency` | string | |
| `documentUrl` | string? | |
| `status` | enum | `PENDING` \| `RECEIVED` \| `VERIFIED` |
| `receivedAt` | timestamp? | |
| `createdAt` / `updatedAt` | timestamp | |

---

### 3.11 `bulk_container_payment_records`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | |
| `allocationId` | UUID FK | |
| `proformaId` | UUID? FK | |
| `amount` | decimal | |
| `currency` | string | |
| `status` | enum | `PENDING` \| `CONFIRMED` \| `DISPUTED` |
| `confirmedAt` | timestamp? | |
| `notes` | text? | |
| `createdAt` / `updatedAt` | timestamp | |

---

### 3.12 `bulk_container_order_links`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `bulkWorkspaceId` | UUID FK | BC workspace |
| `masterOrderId` | UUID FK | Bulk master order row |
| `allocationId` | UUID FK | |
| `orderWorkspaceId` | UUID FK | Spawned ORDER workspace |
| `spawnedAt` | timestamp | |
| `createdAt` | timestamp | |

**Unique:** `(allocationId)` — one order per allocation.

---

### 3.13 `bulk_master_orders` (proposed)

Analogous to `mc_master_orders`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | BC workspace |
| `masterOrderRef` | string | `BC-EXEC-{YYYY}-{NNNNN}` |
| `status` | enum | `ACTIVE` \| `COMPLETE` |
| `createdAt` / `updatedAt` | timestamp | |

---

## 4. DTO safety rules

| DTO | Include | Exclude |
|-----|---------|---------|
| Buyer catalog product | productRef, name, specs template, unit model, indicative range, market status | supplier mapping, internal cost |
| Buyer line | specValues, quantity, normalized totals, live price (post-offer) | allocationId, supplierOrgId |
| Buyer offer | offer lines, totals, validity | supplier names, internal quotes |
| Admin allocation | all fields | — |

---

## 5. Migration strategy (future sprint)

1. Add `BULK_CONTAINER` to `WorkspaceType` enum
2. Create tables in dependency order: spec_templates → catalog_products → details → lines → quotes → offers → allocation → payment → order_links
3. Register FSM in contracts package
4. Add routes and modules (no SmartContainer file edits)
5. Register Control Tower scan module

**No retroactive migration** of SmartContainer data.

---

## 6. Index summary

| Table | Index |
|-------|-------|
| `bulk_container_lines` | `(workspaceId, removedAt)` |
| `bulk_container_offers` | `(workspaceId, status)`, `(validUntil)` |
| `bulk_container_quotes` | `(workspaceId, quoteNumber)`, `(status, slaDeadlineAt)` |
| `bulk_container_supplier_allocations` | `(workspaceId, status)` |
| `bulk_container_order_links` | `(bulkWorkspaceId)`, `(orderWorkspaceId)` |
