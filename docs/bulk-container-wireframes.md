# BulkContainer — UI Wireframes

**Sprint:** 13A — BulkContainer Architecture & Product Design  
**Date:** 2026-06-09  
**Status:** Design specification (no production UI in this sprint)  
**Fidelity:** Figma-equivalent ASCII wireframes (same convention as `mixed-container-wireframes.md`)

---

## 0. Design principles (BulkContainer)

1. **Bulk Container Builder is a procurement planner, not a cart.** No checkout metaphor, no retail quantity steppers.
2. **Specification-first.** Spec template must be complete before quantity entry; no Amazon-style product cards.
3. **Professional tone.** Technical parameters, unit basis, market status — not consumer imagery emphasis.
4. **One primary CTA per screen.** Build → Request Pricing → Approve hierarchy.
5. **Money with context.** Indicative USD/MT ranges labeled distinctly from live offers.
6. **Supplier opacity.** No supplier names, factory refs, or contact on any buyer screen.
7. **Capacity is advisory.** Weight, pallet, and volume meters warn but do not block submission.
8. **72h urgency without panic.** Countdown on offers; shorter sub-validity for volatile lines (oil).

**Grid:** Reuse platform baseline — Sidebar 244px, content max 1196px, 12-col grid, gutter 20.

**Routes (proposed):**

| Screen | Route |
|--------|-------|
| BulkContainer Home | `/buyer/bulk-container` |
| Catalog categories | `/buyer/bulk-container/catalog` |
| Product / spec selection | `/buyer/bulk-container/catalog/:slug` |
| Bulk Container Builder | `/buyer/bulk-container/requests/:id` |
| Live pricing request | Modal on builder |
| Buyer offer review | `/buyer/bulk-container/offers/:id` |
| Allocation & payment | `/buyer/bulk-container/coordination/:id` |
| Execution dashboard | `/buyer/bulk-container/execution/:id` |
| Ops procurement | `/admin/bulk-container/:id` |

---

## 1. BulkContainer Home

**Purpose:** Entry point — active bulk requests, category discovery, professional procurement hub.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ BulkContainer                                              [+ New Request]  │
│ Plan bulk & horeca food containers by ton, bag, and specification.          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ 1 In draft  │  │ 2 Awaiting  │  │ 1 Live offer│  │ 1 Execution │        │
│  │             │  │ pricing     │  │ ⏱ 58h left  │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  YOUR BULK REQUESTS                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ BC-2026-00015 · 40ft · 22.4 MT · 19 pallets · BUILDING               │  │
│  │ Flour 12MT · Rice 8MT · Oil 2.4MT (indicative)    [Continue →]       │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │ BC-2026-00012 · OFFER PENDING · Valid 47h                          │  │
│  │ $186,400 live · 4 spec lines                       [Review offer →]  │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │ BC-2026-00008 · EXECUTION · 2 of 3 orders active                     │  │
│  │                                              [Open dashboard →]      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  BROWSE BY CATEGORY                                                         │
│  [Flour] [Semolina] [Rice] [Pulses] [Oil] [Ingredients] [Foodservice]     │
│                                          [Browse full catalog →]            │
│                                                                             │
│  HOW IT WORKS (collapsed accordion)                                         │
│  1. Select product & spec  2. Build by ton/bag  3. Live pricing  4. Execute │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Primary CTA:** `+ New Request` or `Continue` on most recent draft.  
**Data binding:** `GET /api/bulk-containers` (buyer list), category teaser from `GET /api/bulk-container/catalog/categories`.

---

## 2. Product / Specification Selection

**Purpose:** Structured spec-card browse — not retail catalog. Buyer fills technical parameters before adding line.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← BulkContainer    Catalog · Flour                                          │
├──────────────────┬──────────────────────────────────────────────────────────┤
│ FILTERS          │  Search bulk products...                                 │
│ Category: Flour  │                                                          │
│ Origin           │  ┌────────────────────────────────────────────────────┐  │
│ Packing: 50 kg   │  │ FLOUR · Industrial Grade · BC-PROD-0012          │  │
│                  │  │ Standard pack: 50 kg bags · 40 bags/pallet         │  │
│ Market status    │  │ Indicative: $420–$480 / MT · Updated 2d ago      │  │
│ ○ Stable         │  │ Status: [Stable]                                   │  │
│ ○ Volatile       │  │ ── SPECIFICATION TEMPLATE ──                       │  │
│                  │  │ Protein:    [ 11.5 – 12.5 ] %        * required  │  │
│ Min order: 5 MT  │  │ Ash:        [ max 0.55 ] %           * required  │  │
│                  │  │ Moisture:   [ max 14.5 ] %                         │  │
│                  │  │ Wet gluten: [ 26 – 30 ] %                          │  │
│                  │  │ Packing:    [ 50 kg PP woven ▼ ]                   │  │
│                  │  │ ── QUANTITY ──                                     │  │
│                  │  │ Quantity:   [ 12 ] [ MT ▼ ]  (min 5 MT)          │  │
│                  │  │ ≈ 240 bags · ~9.6 pallets · ~12,000 kg           │  │
│                  │  │                      [Add to bulk container →]     │  │
│                  │  └────────────────────────────────────────────────────┘  │
│                  │  ┌────────────────────────────────────────────────────┐  │
│                  │  │ FLOUR · Bakery Grade · BC-PROD-0018  ...          │  │
│                  │  └────────────────────────────────────────────────────┘  │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

**Primary CTA:** `Add to bulk container` (disabled until required specs filled).  
**Data binding:** `GET /api/bulk-container/catalog/:slug`, spec template from `bulk_container_spec_templates`.

---

## 3. Bulk Container Builder

**Purpose:** Plan multi-spec container load with container type, destination, and line table.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ BC-2026-00015 · Bulk Container Builder                    [Request Pricing]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Container: [40ft ▼]   Destination: [EU ▼]   Incoterm: [CIF ▼]              │
│ Delivery window: [Q3 2026 ▼]   Notes: [optional]                             │
│                                                                             │
│ LINES                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Flour · 12 MT · Pr 12%, Ash 0.55% · 50kg bags · ~9.6 pal · $5,040–5,760│ │
│ │ Rice  ·  8 MT · Broken <5%  · 25kg bags · ~6.4 pal · $3,200–3,520    │ │
│ │ Oil   ·  2.4 MT · 20L units · ~3.2 pal · $2,880–3,120                │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ [+ Add product]                                                             │
│                                                                             │
│ Indicative total: $11,120 – $12,400 (not binding)                          │
│                                                                             │
│ ⚠ 1 warning — see capacity meter below                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Primary CTA:** `Request Pricing` (enabled when specs complete, destination set).  
**Data binding:** `GET/PATCH /api/bulk-containers/:id`, lines via `POST/DELETE /api/bulk-containers/:id/lines`.

---

## 4. Capacity & Weight Meter

**Purpose:** Dual-constraint advisory meter — weight, pallets, volume. Embedded in builder (sticky sidebar or panel).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CAPACITY & WEIGHT                                              40ft container │
├─────────────────────────────────────────────────────────────────────────────┤
│ Weight   ████████████████████░░░░  22,400 / 26,500 kg  (84%)               │
│ Pallets  ████████████████░░░░░░░░  19.2 / 24           (80%)               │
│ Volume   ██████████░░░░░░░░░░░░░░  38 / 67 CBM         (57%)               │
│                                                                             │
│ Remaining: 4,100 kg · 4.8 pallets · 29 CBM                                  │
│                                                                             │
│ WARNINGS (advisory)                                                         │
│ ⚠ mixed_loading    Flour (dense) + Oil (volume) — review stack plan         │
│ ○ overweight       —                                                          │
│ ○ partial_container —                                                          │
│ ○ pallet_over      —                                                          │
│ ○ volume_under     —                                                          │
│                                                                             │
│ ℹ Under-fill allowed. Operations may adjust quantities at offer stage.      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Computed fields:** `totalWeightKg`, `totalPallets`, `totalVolumeCbm`, `remaining*`, `capacityWarnings[]`.  
**Service (future):** `bulk-container-capacity.service.ts`.

---

## 5. Live Pricing Request

**Purpose:** Confirmation modal before freezing line snapshot and submitting to ops.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Request Live Pricing                                                    [×] │
├─────────────────────────────────────────────────────────────────────────────┤
│ You are submitting BC-2026-00015 for operations pricing.                    │
│                                                                             │
│ CHECKLIST                                                                   │
│ ✓ 3 lines · all specifications complete                                     │
│ ✓ 22.4 MT total · 40ft container · EU destination                           │
│ ✓ Container within weight limit (84% utilized)                                │
│ ⚠ Mixed loading warning acknowledged                                          │
│                                                                             │
│ What happens next                                                           │
│ • DeMaxtore operations reviews specifications                               │
│ • Suppliers are sourced for each line                                       │
│ • Live offer typically within 24–48 hours                                   │
│ • Offer valid 72 hours (shorter for volatile lines)                         │
│                                                                             │
│ Indicative total $11,120–$12,400 will be replaced by live pricing.        │
│                                                                             │
│                              [Cancel]  [Submit pricing request]             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**On submit:** `POST /api/bulk-containers/:id/request-pricing` → state `BC_PRICING_REQUESTED`.  
**Alert:** `bulk_container_pricing_pending`.

---

## 6. Operations Procurement Workspace

**Purpose:** Admin inbox for spec review, supplier sourcing, manual pricing, offer creation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Admin · BulkContainer · BC-2026-00015          PROCUREMENT_IN_PROGRESS      │
│ Buyer: Acme Horeca Ltd · 40ft · EU · 22.4 MT · 3 lines                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Spec Review] [Sourcing] [Pricing] [Offer] [Timeline]                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ SPEC REVIEW          │ SUPPLIER SOURCING      │ PRICING ENTRY              │
│ ✓ Flour — approved   │ Flour: 2 candidates    │ L1 Flour: $445/MT (Sup A) │
│ ✓ Rice — approved    │ Rice:  3 candidates    │ L2 Rice:  $410/MT (Sup C) │
│ ⚠ Oil — origin TBD   │ Oil:   1 candidate     │ L3 Oil:   pending         │
├─────────────────────────────────────────────────────────────────────────────┤
│ INTERNAL QUOTES (ops-only)                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Line  Supplier  EXW/MT   Margin   Notes                                 │ │
│ │ L1    Sup A     $420     5.6%    Protein 12% match                      │ │
│ │ L2    Sup C     $385     6.1%    Broken 3%                              │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ OFFER DRAFT v1                                                              │
│ Validity: [72h ▼]   Oil override: [48h]   Currency: USD                     │
│                                                                             │
│ [Save draft]  [Send to Buyer]  [Request buyer clarification]                │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Primary CTA:** `Send to Buyer` when all lines priced.  
**Data binding:** `GET/PATCH /api/admin/bulk-containers/:id`, quotes, offer publish.

---

## 7. Buyer Offer Review

**Purpose:** Review live consolidated offer; approve, decline, or request revision.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Live Bulk Offer · BC-2026-00015                        ⏱ Valid: 47h 22m    │
│ BC-2026-00015 · 40ft · EU · 22.4 MT                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Line      Spec summary              Qty     Basis       Unit price  Total   │
│ Flour     Pr 12%, Ash ≤0.55%       12 MT   USD/MT      $445        $5,340  │
│ Rice      Broken <5%, Basmati       8 MT   USD/MT      $410        $3,280  │
│ Oil       20L tin, Refined          2.4 MT  USD/MT      $1,250      $3,000  │
│                                                          Subtotal: $11,620  │
│                                                                             │
│ ⚠ Oil line valid 23h only (volatile commodity)                              │
│                                                                             │
│ Container summary: 22.4 MT · 19.2 pallets · 84% weight                      │
│                                                                             │
│ [Request revision]              [Decline]              [Approve offer]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Primary CTA:** `Approve offer` → `BC_APPROVED`.  
**Data binding:** `GET /api/bulk-containers/offers/:id`, `POST .../approve` | `.../revision`.

---

## 8. Allocation & Payment Coordination

**Purpose:** Post-approval buyer coordination — allocation, proforma, payment status without supplier names.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Coordination · BC-2026-00015 · APPROVED                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ● Allocation ─── ● Proforma ─── ○ Payment ─── ○ Execution                  │
│                                                                             │
│ ALLOCATION STATUS                                                           │
│ ✓ 3 of 3 lines allocated                                                    │
│                                                                             │
│ PROFORMA STATUS                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Line 1 Flour   ✓ Received · $5,340 · Verified                          │ │
│ │ Line 2 Rice    ✓ Received · $3,280 · Verified                          │ │
│ │ Line 3 Oil     ○ Pending · expected within 48h                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ PAYMENT STATUS                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Line 1 Flour   ✓ Payment confirmed                                     │ │
│ │ Line 2 Rice    ✓ Payment confirmed                                     │ │
│ │ Line 3 Oil     ○ Awaiting payment confirmation                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ℹ Pay suppliers directly per proforma. DeMaxtore coordinates execution.       │
│                                                                             │
│                                              [Confirm payment — Oil]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**State progression:** `BC_ALLOCATION_IN_PROGRESS` → `BC_PROFORMA_PENDING` → `BC_PAYMENT_TRACKING` → `BC_EXECUTION_READY`.

---

## 9. Execution Dashboard

**Purpose:** Monitor spawned orders, FreightIQ, and shipments from approved bulk container.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Execution · BC-2026-00015 · BC-EXEC-2026-00003                              │
│ Master order · 3 supplier orders · 22.4 MT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ OVERALL  ●──●──○──○  Production → Freight → Shipment → Complete             │
│                                                                             │
│ SUPPLIER ORDERS                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ORD-2026-00421  Flour  12 MT                                            │ │
│ │ Production  ●──○──○   Freight: Requested    Shipment: —                │ │
│ │                                                    [Open order →]       │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ ORD-2026-00422  Rice   8 MT                                             │ │
│ │ Production  ●──●──○   Freight: Booked       Shipment: —                │ │
│ │                                                    [Open order →]       │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ ORD-2026-00423  Oil    2.4 MT                                           │ │
│ │ Production  ●──○──○   Freight: —              Shipment: —                │ │
│ │                                                    [Open order →]       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ FREIGHT SUMMARY: 1 of 3 booked · SHIPMENTS: 0 of 3 spawned                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Spawn trigger:** Admin `POST /api/admin/bulk-containers/:id/spawn-execution` from `BC_EXECUTION_READY`.  
**Links:** `bulk_container_order_links` → spawned Order workspaces.

---

## 10. Component inventory (future)

| Component | Used in |
|-----------|---------|
| `SpecCard` | Catalog, add-line modal |
| `SpecTemplateForm` | Catalog product page |
| `CapacityMeter` | Builder (weight/pallet/volume bars) |
| `CapacityWarnings` | Builder advisory panel |
| `UnitSelector` | Spec card, line edit |
| `BulkLineTable` | Builder |
| `LiveOfferTable` | Offer review |
| `CoordinationStepper` | Coordination page |
| `ExecutionOrderCard` | Execution dashboard |
| `MarketStatusBadge` | Catalog (Stable / Rising / Volatile) |
| `PriceBasisLabel` | Catalog, offer (USD/MT, USD/bag, USD/pallet) |

---

## 11. Admin catalog wireframe (bonus)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Admin · BulkContainer Catalog                              [+ Add product]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Products] [Spec Templates] [Categories]                                    │
│                                                                             │
│ Ref          Name              Category  Unit   Volatility  Active  Actions │
│ BC-PROD-0012 Industrial Flour  Flour     MT     Moderate    ✓      [Edit]  │
│ BC-PROD-0018 Bakery Flour      Flour     MT     Stable      ✓      [Edit]  │
│ BC-PROD-0024 Basmati Rice      Rice      MT     Moderate    ✓      [Edit]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Route:** `/admin/bulk-container/catalog`
