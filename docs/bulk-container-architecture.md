# BulkContainer — Architecture

**Sprint:** 13A / 13A.1 — BulkContainer Architecture & Product Family Alignment  
**Date:** 2026-06-09  
**Status:** Design specification (no runtime implementation)  
**Constraint:** No changes to SmartContainer, RFQ, CommodityBid, FreightIQ, Order, or Shipment FSM/runtime. BulkContainer does **not** integrate with CommodityBid (locked in 13A.1).

---

## 1. Objective

Define how **BulkContainer** becomes a first-class **managed sourcing product** inside DeMaxtore Trade OS — the bulk/horeca sibling of SmartContainer — with its own lifecycle, bulk catalog layer, specification model, multi-unit capacity engine, operations-led pricing, and execution handoff to existing Order → FreightIQ → Shipment runtimes. No CommodityBid integration.

---

## 2. Platform context (existing baseline)

| Layer | Current state |
|-------|---------------|
| `WorkspaceType` | `RFQ` \| `COMMODITYBID` \| `MIXED_CONTAINER` \| `ORDER` \| `SHIPMENT` |
| SmartContainer | `mixed-container` module, `MC_*` FSM, `/buyer/mixed-container/*` |
| Workspace spine | `workspaces`, `workspace_participants`, `timeline_events`, `spawned_from_id` |
| Execution path | Approved container → Order spawn → FreightIQ → Shipment |
| Control Tower | Additive alert engine per product |

BulkContainer adds **`BULK_CONTAINER`** to `WorkspaceType` in a future sprint — same spine, new detail tables, new FSM, **zero edits** to SmartContainer module.

---

## 3. Product architecture map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BULKCONTAINER WORKSPACE                               │
│  (buyer lifecycle: discover → build → price → approve → execute)       │
└─────────────────────────────────────────────────────────────────────────┘
         │              │              │              │              │
         ▼              ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Bulk Catalog │ │ Bulk Container│ │  Bulk Pricing│ │  Bulk Offer  │ │   Supplier   │
│ + Spec Cards │ │   Builder     │ │  Request     │ │  + Approval  │ │  Allocation  │
│              │ │ (MT/bag/pal)  │ │  (ops)       │ │              │ │  (internal)  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
         │              │                                    │
         │              ▼                                    ▼
         │       ┌──────────────┐                   ┌──────────────┐
         │       │  Capacity &  │                   │  Proforma &  │
         │       │ Weight Meter │                   │  Payment     │
         │       └──────────────┘                   └──────────────┘
         │                                                    │
         └────────────────────────────────────────────────────┘
                                    ▼
                          ┌──────────────┐
                          │  Execution   │
                          │  Bridge      │
                          │ → Order spawn│
                          └──────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
         ┌──────────────────┐             ┌──────────────────┐
         │  FreightIQ       │ ──────────► │  Shipment        │
         │  (Order-attached)│             │  (spawned)       │
         └──────────────────┘             └──────────────────┘
```

---

## 4. Workspace routes

### 4.1 Buyer routes (proposed)

| Route | Page | Purpose |
|-------|------|---------|
| `/buyer/bulk-container` | `BulkContainerHomePage` | Hub, active requests, discover |
| `/buyer/bulk-container/catalog` | `BulkCatalogCategoriesPage` | Category browse |
| `/buyer/bulk-container/catalog/:slug` | `BulkCatalogProductsPage` | Spec card browse |
| `/buyer/bulk-container/requests` | `BulkContainerRequestsPage` | Request list |
| `/buyer/bulk-container/requests/:id` | `BulkContainerBuilderPage` | Builder + capacity meter |
| `/buyer/bulk-container/offers/:id` | `BulkContainerOfferPage` | Offer review / approve |
| `/buyer/bulk-container/coordination/:id` | `BulkContainerCoordinationPage` | Allocation / proforma / payment |
| `/buyer/bulk-container/execution/:id` | `BulkContainerExecutionPage` | Execution dashboard |

### 4.2 Admin routes (proposed)

| Route | Purpose |
|-------|---------|
| `/admin/bulk-container` | Incoming bulk request inbox |
| `/admin/bulk-container/:id` | Operations procurement workspace |
| `/admin/bulk-container/allocations` | Allocation inbox |
| `/admin/bulk-container/allocations/:id` | Allocation detail |
| `/admin/bulk-container/catalog` | Bulk catalog + spec template admin |

### 4.3 API mounts (proposed)

| Mount | Module |
|-------|--------|
| `/api/bulk-containers` | `bulk-container.routes.ts` |
| `/api/admin/bulk-containers` | `bulk-container-admin.routes.ts` |
| `/api/admin/bulk-containers/allocations` | `bulk-container-allocation-admin.routes.ts` |
| `/api/bulk-container/catalog` | `bulk-container-catalog.routes.ts` |
| `/api/admin/bulk-container/catalog` | `bulk-container-catalog-admin.routes.ts` |

---

## 5. Component definitions

### 5.1 BulkContainer Workspace

| Attribute | Design |
|-----------|--------|
| Type | `WorkspaceType.BULK_CONTAINER` |
| External ref | `BC-{YYYY}-{seq}` e.g. `BC-2026-00015` |
| Owner | Buyer org (OWNER participant) |
| Counterparties | DeMaxtore OPERATOR on buyer surface; suppliers never in buyer participant list |
| State | Own FSM (see §6) |
| Spawn | On execution-ready → Order workspaces per supplier allocation |

**Reuse:** `timeline_events`, `audit_logs`, `notifications`, `workspace_participants`, socket bus, Control Tower FK.

---

### 5.2 Bulk Catalog + Specification Cards

Professional catalog — **not** Amazon-style retail browse.

| Capability | Behaviour |
|------------|-----------|
| Category taxonomy | Flour, semolina, rice, pulses, oil, ingredients, foodservice |
| Spec template | Per-product-type parameter schema (see pricing-spec report) |
| Product card | Name, category, standard packing, unit options, indicative range, market status |
| Eligibility gate | Reject retail-only SKUs at catalog ingest |
| Supplier mapping | Internal only; buyer sees `BC-PROD-{seq}` refs |

---

### 5.3 Bulk Container Builder

Planning workspace with **multi-unit** quantity entry.

| Capability | Behaviour |
|------------|-----------|
| Add line | Select product → fill spec template → quantity + unit |
| Unit conversion | System derives MT, bags, pallets from product unit model |
| Capacity meter | Weight %, pallet %, volume %, warnings (see §7) |
| Container type | 20ft / 40ft / 40ft HC |
| Persistence | Auto-save on line/spec change |
| Mixed loading | Warn when weight-heavy + volume-light lines conflict |

**Non-goals:** No checkout, no supplier UI, no instant price lock, no private label config.

---

### 5.4 Bulk Pricing Request

| Trigger | Buyer: "Request Live Pricing" |
|---------|-------------------------------|
| Preconditions | ≥1 line; specs complete; container type; destination |
| Output | `bulk_container_quotes` record; state → `BC_PRICING_REQUESTED` |
| Internal | Ops inbox; spec review; supplier sourcing; manual price entry |
| Buyer sees | Confirmation + SLA expectation |

---

### 5.5 Operations Procurement Workspace

Admin workflow mirroring SmartContainer ops patterns:

```
Incoming Bulk Request
  → Specification Review
  → Supplier Sourcing
  → Manual Pricing Entry
  → Bulk Offer Creation
  → Send Offer
  → (post-approval) Supplier Allocation
  → Proforma Collection
  → Payment Tracking
  → Execution Ready
```

Spec review is **BulkContainer-specific** — ops validates parameter compliance before sourcing.

---

### 5.6 Supplier Allocation (internal)

```
BulkContainerLine (product + specs + quantity + unit)
  → Supplier Selection (availability, spec match, geography, margin)
  → Allocation (supplier org + allocated quantity + internal unit price)
  → Execution (PO per allocation → Order spawn)
```

Buyer receives **one** consolidated `BulkContainerOffer` without supplier names.

---

### 5.7 Execution Bridge

Mirrors SmartContainer execution bridge pattern:

```
BC_EXECUTION_READY
  → spawn_execution_orders (ADMIN/SYSTEM)
  → BC_EXECUTION_ACTIVE
    → BulkMasterOrder (BC-EXEC-{YYYY}-{NNNNN})
    → Per allocation: spawnOrderWorkspace() + bulk_container_order_links
  → FreightIQ on each supplier order (unchanged runtime)
  → Shipment spawn (unchanged runtime)
  → BC_EXECUTION_COMPLETE
```

**Service (future):** `bulk-container-execution.service.ts` — additive module only.

---

## 6. FSM design

**Contract (future):** `packages/contracts/src/bulk-container.fsm.ts`

```
BC_DRAFT → BC_BUILDING → BC_PRICING_REQUESTED
  → BC_PROCUREMENT_IN_PROGRESS → BC_OFFER_READY → BC_BUYER_REVIEW
  → BC_APPROVED → BC_ALLOCATION_IN_PROGRESS → BC_PROFORMA_PENDING
  → BC_PAYMENT_TRACKING → BC_EXECUTION_READY
  → BC_EXECUTION_ACTIVE → BC_EXECUTION_COMPLETE

Branches: BC_REVISION_REQUESTED, BC_EXPIRED, BC_CANCELLED (terminal)
```

| Phase | States | Actor |
|-------|--------|-------|
| Discover / Build | `BC_DRAFT`, `BC_BUILDING` | BUYER |
| Pricing request | `BC_PRICING_REQUESTED` | BUYER |
| Procurement / Offer | `BC_PROCUREMENT_IN_PROGRESS` → `BC_BUYER_REVIEW` | ADMIN |
| Buyer decision | `BC_APPROVED` / `BC_REVISION_REQUESTED` / `BC_EXPIRED` | BUYER/ADMIN |
| Coordination | `BC_ALLOCATION_IN_PROGRESS` → `BC_PAYMENT_TRACKING` | ADMIN |
| Execution | `BC_EXECUTION_READY` → `BC_EXECUTION_COMPLETE` | ADMIN/SYSTEM |

Offer validity: **72 hours** default (`BC_OFFER_VALIDITY_HOURS`); configurable per offer for volatile commodities.

**No cross-FSM transitions** to `MC_*`, `RFQ_*`, or `CB_*` states.

---

## 7. Unit model

Each `bulk_container_catalog_products` row defines:

| Field | Purpose |
|-------|---------|
| `unit_type` | Primary order unit: `METRIC_TON`, `BAG`, `PALLET`, `LITER` |
| `kg_per_bag` | e.g. 50 for flour, 25 for rice |
| `bags_per_pallet` | Stacking factor |
| `kg_per_pallet` | Derived or override |
| `liters_per_unit` | For oil (20 L) |
| `min_order_unit` | Minimum quantity in primary unit |
| `loading_constraints` | JSON: max stack height, incompatible with, temperature |

### Line quantity normalization

```
Input: buyer quantity + selected unit
  → normalize to kg, bags, pallets, MT, liters
  → contribute to container capacity totals
```

| Buyer selects | System computes |
|---------------|-----------------|
| 40 MT flour | bags = 40,000 / kg_per_bag; pallets = bags / bags_per_pallet |
| 800 bags rice | MT = (800 × kg_per_bag) / 1000; pallets = 800 / bags_per_pallet |
| 12 pallets oil | bags/units from bags_per_pallet; weight from kg_per_pallet |

---

## 8. Container capacity model

### 8.1 Container type constants

| Type | Max weight (kg) | Max pallets | Max volume (CBM) |
|------|-----------------|-------------|------------------|
| `CONTAINER_20FT` | 21,000 | 11 | 33 |
| `CONTAINER_40FT` | 26,500 | 24 | 67 |
| `CONTAINER_40FT_HC` | 26,000 | 26 | 76 |

*Design values — ops may tune per lane; stored on `bulk_container_details`.*

### 8.2 Calculated fields

| Metric | Formula |
|--------|---------|
| `totalWeightKg` | Σ line normalized kg |
| `totalPallets` | Σ line normalized pallets (fractional allowed) |
| `totalVolumeCbm` | Σ line volume from product density/pack dims |
| `remainingWeightKg` | `maxWeightKg - totalWeightKg` |
| `remainingPallets` | `maxPallets - totalPallets` |
| `remainingVolumeCbm` | `maxVolumeCbm - totalVolumeCbm` |

### 8.3 Warnings (advisory, not blocking)

| Warning key | Condition |
|-------------|-----------|
| `overweight` | `totalWeightKg > maxWeightKg` |
| `partial_container` | `totalPallets < 0.5 × maxPallets` OR `totalWeightKg < 0.5 × maxWeightKg` |
| `mixed_loading` | Lines with incompatible `loading_constraints` |
| `volume_underutilized` | Weight near max but volume < 40% (dead freight risk) |
| `pallet_over_capacity` | `totalPallets > maxPallets` |

---

## 9. Operations-led procurement model (locked)

BulkContainer is **operations-led managed sourcing** — same class as SmartContainer, no auction, no bidding, no supplier portal, no CommodityBid integration.

```
Buyer Request
      ↓
Operations Procurement        (spec review → supplier sourcing → manual pricing)
      ↓
Bulk Offer                    (consolidated, 72h validity)
      ↓
Buyer Approval
      ↓
Supplier Allocation           (internal, buyer-opaque)
      ↓
Proforma
      ↓
Payment Tracking
      ↓
Execution Ready
      ↓
Order / FreightIQ / Shipment
```

| Rule | Detail |
|------|--------|
| Pricing source | Ops manual entry after buyer submission |
| Supplier visibility | Hidden from buyer until execution |
| Auction | **Excluded** — use CommodityBid as separate product |
| CB spawn | **None** — no line-level CommodityBid workspace link |

See `bulk-container-no-auction-decision.md` for rationale.

---

## 10. Module structure (future)

```
apps/backend/src/modules/
├── bulk-container/
│   ├── bulk-container.service.ts
│   ├── bulk-container-procurement.service.ts
│   ├── bulk-container-allocation.service.ts
│   ├── bulk-container-execution.service.ts
│   ├── bulk-container-capacity.service.ts
│   └── bulk-container-alerts.ts
└── bulk-container-catalog/

apps/frontend/src/features/bulk-container/
├── pages/
├── components/  (SpecCard, CapacityMeter, AddBulkLineModal)
└── lib/bulk-container.api.ts

packages/contracts/src/
├── bulk-container.fsm.ts
├── bulk-container.zod.ts
├── bulk-container-catalog.ts
└── bulk-container-*-learning.ts
```

---

## 11. UI wireframes

Full ASCII wireframes for all buyer and admin screens are in **`bulk-container-wireframes.md`**.

| Screen | Route |
|--------|-------|
| BulkContainer Home | `/buyer/bulk-container` |
| Product / Specification Selection | `/buyer/bulk-container/catalog/:slug` |
| Bulk Container Builder | `/buyer/bulk-container/requests/:id` |
| Capacity & Weight Meter | Embedded in builder |
| Live Pricing Request | Modal on builder |
| Operations Procurement Workspace | `/admin/bulk-container/:id` |
| Buyer Offer Review | `/buyer/bulk-container/offers/:id` |
| Allocation & Payment Coordination | `/buyer/bulk-container/coordination/:id` |
| Execution Dashboard | `/buyer/bulk-container/execution/:id` |

**Design tone:** Professional procurement — spec-first layout, no Amazon-style catalog.

---

## 12. Non-disruption guarantees

| System | Guarantee |
|--------|-----------|
| SmartContainer | No route, FSM, table, or alert modifications |
| RFQ | Parallel workspace; no shared line tables |
| CommodityBid | No integration — independent product; BC unchanged |
| Order FSM | Spawned additively from BC execution bridge |
| FreightIQ | Attaches to spawned orders via existing rules |
| Shipment | Spawns from orders via existing `spawnShipmentFromOrder()` |
| Control Tower | Additive `bulk-container-alerts.ts` scan module only |
