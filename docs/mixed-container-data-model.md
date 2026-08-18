# Mixed Container — Data Model Proposal

**Sprint:** 12A — Mixed Container Architecture & Product Design  
**Date:** 2026-06-08  
**Status:** Design proposal only — **do not implement in this sprint**

---

## 1. Design principles

| Principle | Application |
|-----------|-------------|
| Workspace spine reuse | All lifecycle entities FK to `workspaces.id` where applicable |
| Buyer-safe vs ops-only | Catalog and offer DTOs exclude supplier fields; allocation tables are ADMIN/OPERATOR only |
| Append-only pricing history | Offers and revisions are versioned, not overwritten |
| Spawn lineage | `ContainerExecution` → Order via `workspaces.spawned_from_id` |
| No RFQ/CB table reuse | Dedicated tables; no polymorphic line items on `rfq_line_items` |

---

## 2. Entity relationship overview

```
Workspace (type=MIXED_CONTAINER)
  │
  ├── MixedContainerDetails (1:1)
  ├── ContainerLine[] (1:N)
  ├── ContainerPricingRequest[] (1:N)
  │     └── ContainerOffer[] (1:N per request)
  │           └── ContainerRevision[] (0:N)
  ├── SupplierAllocation[] (1:N, ops-only)
  ├── SampleRequest[] (0:N)
  └── ContainerExecution (0:1)
        └── spawned Order workspaces (via workspaces.spawned_from_id)

CatalogProduct (standalone, no workspace FK)
  └── referenced by ContainerLine.catalogProductId
```

---

## 3. Entity definitions

### 3.1 MixedContainerRequest

> **Note:** The workspace row itself is the request aggregate. `MixedContainerDetails` holds type-specific fields (same pattern as `RfqDetails`, `ShipmentWorkspace`).

**Table:** `mixed_container_details`  
**Relation:** 1:1 with `workspaces` where `type = MIXED_CONTAINER`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Same as `workspace.id` |
| `containerType` | enum | `CONTAINER_20FT` \| `CONTAINER_40FT` \| `CONTAINER_40FT_HC` |
| `maxPalletCapacity` | int | Derived from container type; denormalized for queries |
| `currentPalletCount` | int | Sum of active line pallets (computed or maintained) |
| `destinationMarket` | string | ISO country or region code |
| `destinationPort` | string? | Optional port preference |
| `currency` | string | ISO 4217 — set at first pricing request, immutable after |
| `incoterm` | string? | e.g. FOB, CIF — buyer selection |
| `targetDeliveryWindow` | daterange? | Optional ETA preference |
| `notes` | text? | Buyer free text |
| `activeOfferId` | UUID? FK | Current published offer |
| `createdAt` / `updatedAt` | timestamp | Standard |

**Indexes:** `(destinationMarket)`, `(containerType, currentPalletCount)`

---

### 3.2 ContainerLine

**Table:** `container_lines`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK → workspaces | Parent MC workspace |
| `catalogProductId` | UUID FK → catalog_products | Anonymized SKU reference |
| `palletCount` | int | Planning unit; ≥ catalog MOQ |
| `sortOrder` | int | Display order in builder |
| `indicativeUnitLow` | decimal? | Snapshot at add-time (buyer-safe) |
| `indicativeUnitMid` | decimal? | Snapshot at add-time |
| `indicativeUnitHigh` | decimal? | Snapshot at add-time |
| `liveUnitPrice` | decimal? | Set when offer published; null before |
| `liveLineTotal` | decimal? | `liveUnitPrice × palletCount` |
| `revisionId` | UUID? FK | Links line to revision that introduced it |
| `removedAt` | timestamp? | Soft delete for revision diff |
| `createdAt` / `updatedAt` | timestamp | |

**Constraints:**
- `palletCount >= catalog_products.moqPallets`
- Unique active line per `(workspaceId, catalogProductId)` where `removedAt IS NULL`

**Indexes:** `(workspaceId, removedAt)`, `(catalogProductId)`

---

### 3.3 ContainerPricingRequest

**Table:** `container_pricing_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | |
| `requestNumber` | int | Sequential per workspace (1, 2, 3…) |
| `revisionId` | UUID? FK | Null for initial; set for repricing after revision |
| `status` | enum | `PENDING` \| `IN_PROGRESS` \| `OFFERED` \| `EXPIRED` \| `CANCELLED` |
| `requestedAt` | timestamp | Buyer submit time |
| `slaDeadlineAt` | timestamp? | Ops SLA target |
| `lineSnapshot` | JSONB | Immutable copy of lines at request time |
| `requestedById` | UUID FK → users | |
| `createdAt` | timestamp | |

**Indexes:** `(workspaceId, requestNumber)`, `(status, slaDeadlineAt)`

---

### 3.4 ContainerOffer

**Table:** `container_offers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | |
| `pricingRequestId` | UUID FK | |
| `offerVersion` | int | Sequential per workspace |
| `status` | enum | `DRAFT` \| `PUBLISHED` \| `SUPERSEDED` \| `ACCEPTED` \| `EXPIRED` \| `REJECTED` |
| `validFrom` | timestamp | Publication time |
| `validUntil` | timestamp | `validFrom + 72h` |
| `currency` | string | Must match workspace currency |
| `subtotalAmount` | decimal | Sum of line totals |
| `freightEstimateAmount` | decimal? | Optional pre-FreightIQ estimate |
| `totalAmount` | decimal | Buyer-facing total |
| `linePricing` | JSONB | `[{ lineId, unitPrice, lineTotal }]` — no supplier refs |
| `publishedAt` | timestamp? | |
| `acceptedAt` | timestamp? | |
| `acceptedById` | UUID? FK | |
| `createdAt` | timestamp | |

**Indexes:** `(workspaceId, status)`, `(validUntil)` where status = PUBLISHED

---

### 3.5 ContainerRevision

**Table:** `container_revisions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | |
| `baseOfferId` | UUID FK → container_offers | Offer being revised from |
| `revisionNumber` | int | Sequential per workspace |
| `status` | enum | `DRAFT` \| `SUBMITTED` \| `REPRICING` \| `RESOLVED` \| `ABANDONED` |
| `changeSummary` | JSONB | `{ added: [], removed: [], modified: [] }` |
| `proposedLines` | JSONB | Snapshot of proposed line state |
| `impactEstimate` | JSONB? | `{ palletDelta, valueDelta }` pre-reprice |
| `submittedAt` | timestamp? | |
| `submittedById` | UUID? FK | |
| `resolvedOfferId` | UUID? FK | New offer after repricing |
| `createdAt` | timestamp | |

**Indexes:** `(workspaceId, revisionNumber)`, `(baseOfferId)`

---

### 3.6 SupplierAllocation

**Table:** `supplier_allocations`  
**Access:** ADMIN / OPERATOR only — **never exposed to buyer API**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | MC workspace |
| `containerLineId` | UUID FK | |
| `catalogProductId` | UUID FK | Denormalized |
| `supplierOrgId` | UUID FK → organisations | **Internal only** |
| `factoryRef` | string? | Internal factory identifier |
| `allocatedPallets` | int | May split one line across suppliers |
| `supplierUnitPrice` | decimal | Internal cost price |
| `supplierCurrency` | string | |
| `status` | enum | `PENDING` \| `CONFIRMED` \| `DECLINED` \| `EXECUTING` \| `COMPLETED` |
| `pricingRequestId` | UUID FK | Which pricing cycle |
| `confirmedAt` | timestamp? | |
| `declinedReason` | text? | |
| `spawnedOrderId` | UUID? FK → workspaces | Order workspace after execution |
| `createdAt` / `updatedAt` | timestamp | |

**Indexes:** `(workspaceId, status)`, `(supplierOrgId, status)`, `(containerLineId)`

---

### 3.7 SampleRequest

**Table:** `sample_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID? FK | Optional link to MC workspace |
| `buyerOrgId` | UUID FK | |
| `requestedById` | UUID FK → users | |
| `catalogProductId` | UUID FK | |
| `quantity` | decimal | Sample quantity (units, not pallets) |
| `deliveryAddress` | JSONB | |
| `status` | enum | `REQUESTED` \| `APPROVED` \| `REJECTED` \| `SHIPPED` \| `DELIVERED` \| `EVALUATED` |
| `courierCarrier` | string? | Buyer-visible after ship |
| `trackingNumber` | string? | Buyer-visible after ship |
| `shippedAt` | timestamp? | |
| `deliveredAt` | timestamp? | |
| `evaluationResult` | enum? | `APPROVED` \| `REJECTED` \| `PENDING` |
| `supplierOrgId` | UUID? FK | **Ops only** |
| `notes` | text? | |
| `createdAt` / `updatedAt` | timestamp | |

**Indexes:** `(buyerOrgId, status)`, `(catalogProductId)`, `(workspaceId)`

---

### 3.8 ContainerExecution

**Table:** `container_executions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workspaceId` | UUID FK | MC workspace — unique |
| `acceptedOfferId` | UUID FK | Offer that triggered execution |
| `status` | enum | `PENDING` \| `ALLOCATING` \| `SPAWNING_ORDERS` \| `ACTIVE` \| `COMPLETED` \| `FAILED` |
| `orderCount` | int | Number of Orders to spawn |
| `ordersSpawned` | int | Progress counter |
| `startedAt` | timestamp | |
| `completedAt` | timestamp? | All orders spawned |
| `failureReason` | text? | |
| `createdAt` / `updatedAt` | timestamp | |

**Spawn protocol:** For each confirmed `SupplierAllocation`, create Order workspace with `spawned_from_id = MC workspace.id`. External ref: `ORD-MC-{mcExternalRef}-{seq}`.

---

### 3.9 CatalogProduct (supporting entity)

**Table:** `catalog_products`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `productRef` | string unique | Buyer-facing SKU e.g. `MC-SKU-0042` |
| `name` | string | |
| `category` | string | Food category taxonomy |
| `subcategory` | string? | |
| `packagingDescription` | string | e.g. "12 × 400g cartons / pallet" |
| `unitsPerPallet` | int | |
| `moqPallets` | int | Minimum pallets per line |
| `palletWeightKg` | decimal? | For freight estimation |
| `palletVolumeCbm` | decimal? | For fill calculation |
| `sampleAvailable` | boolean | |
| `sampleLeadDays` | int? | |
| `status` | enum | `DRAFT` \| `ACTIVE` \| `DISCONTINUED` |
| `indicativeLow` | decimal? | Admin-maintained or MI-fed |
| `indicativeMid` | decimal? | |
| `indicativeHigh` | decimal? | |
| `indicativeCurrency` | string? | |
| `recentTxnLow` | decimal? | From anonymized transaction rollup |
| `recentTxnHigh` | decimal? | |
| `recentTxnAsOf` | timestamp? | |
| `marketInsightSummary` | text? | Buyer-safe narrative |
| `originRegion` | string? | e.g. "Southeast Asia" — not factory |
| `certifications` | string[] | e.g. BRC, Halal |
| `createdAt` / `updatedAt` | timestamp | |

**Not stored (by design):** `supplierOrgId`, `factoryName`, `contactEmail`, `contactPhone`

**Internal mapping table (ops only):** `catalog_product_suppliers`

| Column | Type |
|--------|------|
| `catalogProductId` | UUID FK |
| `supplierOrgId` | UUID FK |
| `priority` | int |
| `isActive` | boolean |

---

## 4. WorkspaceType extension (future migration)

```prisma
enum WorkspaceType {
  RFQ
  COMMODITYBID
  ORDER
  SHIPMENT
  MIXED_CONTAINER   // ← additive
}
```

No changes to existing enum values or existing workspace rows.

---

## 5. Computed / derived fields

| Field | Source | Refresh |
|-------|--------|---------|
| Fill percentage | `currentPalletCount / maxPalletCapacity` | On line change |
| Remaining pallets | `maxPalletCapacity - currentPalletCount` | On line change |
| Estimated container value | Σ `(indicativeUnitMid × palletCount)` | On line change (DRAFT only) |
| Offer expiry countdown | `validUntil - now()` | Realtime / polling |

---

## 6. Audit & timeline events (proposed)

| Event type | Trigger |
|------------|---------|
| `mixedcontainer.created` | Workspace created |
| `mixedcontainer.line.added` | ContainerLine created |
| `mixedcontainer.line.updated` | Pallet count changed |
| `mixedcontainer.line.removed` | Line soft-deleted |
| `mixedcontainer.pricing.requested` | ContainerPricingRequest submitted |
| `mixedcontainer.offer.published` | ContainerOffer published |
| `mixedcontainer.offer.expired` | Validity elapsed |
| `mixedcontainer.revision.submitted` | ContainerRevision submitted |
| `mixedcontainer.offer.accepted` | Buyer approval |
| `mixedcontainer.execution.started` | ContainerExecution begins |
| `mixedcontainer.order.spawned` | Order workspace created |
| `mixedcontainer.execution.completed` | All orders spawned |
| `mixedcontainer.sample.requested` | SampleRequest created |

---

## 7. What we explicitly do NOT model in 12A

- Payment / invoicing tables
- Inventory reservation
- Real-time supplier inventory feeds
- Freight rate tables (FreightIQ owns post-Order freight)
- Buyer-visible supplier ratings

---

## 8. Migration sequencing (future recommendation)

| Migration | Contents |
|-----------|----------|
| `sprint12b_mixed_container_foundation` | `WorkspaceType` enum + `mixed_container_details` + `container_lines` + `catalog_products` |
| `sprint12c_mixed_container_pricing` | `container_pricing_requests` + `container_offers` + `container_revisions` |
| `sprint12c_supplier_allocation` | `supplier_allocations` + `catalog_product_suppliers` |
| `sprint12d_mixed_container_execution` | `container_executions` + spawn side effects |
| `sprint12d_sample_requests` | `sample_requests` |

Each migration is additive. No ALTER on RFQ, CommodityBid, Order, or Shipment tables.
