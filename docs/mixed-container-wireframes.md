# Mixed Container — UI Wireframes

**Sprint:** 12A — Mixed Container Architecture & Product Design  
**Date:** 2026-06-08  
**Status:** Design specification (no production UI in this sprint)  
**Fidelity:** Figma-equivalent ASCII wireframes (same convention as `sprint-2.5-ux-redesign-wireframes.md`)

---

## 0. Design principles (Mixed Container)

1. **Container Builder is a planner, not a cart.** No checkout metaphor, no quantity steppers styled as e-commerce.
2. **One primary CTA per screen.** Build → Price → Approve hierarchy.
3. **Money with context.** Indicative ranges labeled distinctly from live offers.
4. **Supplier opacity.** No supplier names, factory refs, or contact on any buyer screen until Order execution.
5. **Fill meter is advisory.** Under-fill allowed; never block with "complete your container" gates.
6. **72h urgency without panic.** Countdown on offers; calm copy on expiry.

**Grid:** Reuse platform baseline — Sidebar 244px, content max 1196px, 12-col grid, gutter 20 (see Sprint 2.5 wireframes).

**Routes (proposed):**

| Screen | Route |
|--------|-------|
| Mixed Container Home | `/buyer/mixed-container` |
| Catalog | `/buyer/mixed-container/catalog` |
| Container Builder | `/workspace/mixed-container/:id` |
| Pricing Review | `/workspace/mixed-container/:id/pricing` |
| Optimization | `/workspace/mixed-container/:id/optimize` |
| Container Dashboard | `/buyer/mixed-container/:id/dashboard` |

---

## 1. Mixed Container Home

**Purpose:** Entry point — active containers, quick start, catalog discovery.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Mixed Container                                              [+ New Container]│
│ Plan multi-product containers by pallet — one MOQ, many SKUs.                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ 2           │  │ 1           │  │ 1           │  │ 3           │      │
│  │ In draft    │  │ Awaiting    │  │ Live offer  │  │ In execution│      │
│  │             │  │ pricing     │  │             │  │             │      │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                                             │
│  YOUR CONTAINERS                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ MC-2026-00042  ·  40ft  ·  18/24 pallets  ·  DRAFT                  │  │
│  │ 6 products  ·  Est. $42,800 (indicative)          [Continue building →]│  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │ MC-2026-00038  ·  40ft HC  ·  OFFER PENDING  ·  ⏱ 47h 12m left     │  │
│  │ $51,200 live offer  ·  8 products              [Review offer →]      │  │
│  ├─────────────────────────────────────────────────────────────────────┤  │
│  │ MC-2026-00031  ·  EXECUTION  ·  3 of 4 orders active                │  │
│  │                                              [Open dashboard →]      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  DISCOVER PRODUCTS                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ [img]    │  │ [img]    │  │ [img]    │  │ [img]    │                   │
│  │ Basmati  │  │ Olive Oil│  │ Tuna     │  │ Almonds  │                   │
│  │ $1.2–1.3k│  │ $890–980 │  │ ...      │  │ ...      │                   │
│  │ [Add →]  │  │ [Add →]  │  │ [Add →]  │  │ [Add →]  │                   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                   │
│                                          [Browse full catalog →]            │
│                                                                             │
│  HOW IT WORKS (collapsed accordion)                                         │
│  1. Browse catalog  2. Build by pallet  3. Get live offer  4. Execute      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Primary CTA:** `+ New Container` or `Continue building` on most recent draft.  
**Data binding:** `GET /api/mixed-containers` (buyer list), catalog teaser from `GET /api/mixed-container/catalog?limit=4`.

---

## 2. Catalog

**Purpose:** Browse and filter anonymized products; add to container.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Mixed Container          Catalog                                          │
├──────────────────┬──────────────────────────────────────────────────────────┤
│ FILTERS          │  Search products...                          [Grid|List] │
│                  │                                                          │
│ Category         │  ┌────────────────┐  ┌────────────────┐                 │
│ ☑ Grains         │  │ Grains · Rice  │  │ Oils           │                 │
│ ☐ Oils           │  │                │  │                │                 │
│ ☐ Canned         │  │ Premium        │  │ Extra Virgin   │                 │
│ ☐ Beverages      │  │ Basmati 5kg    │  │ Olive Oil 1L   │                 │
│                  │  │                │  │                │                 │
│ Origin           │  │ 50×5kg/pallet  │  │ 60×1L/pallet   │                 │
│ ☐ EU             │  │ MOQ: 2 pallets │  │ MOQ: 1 pallet  │                 │
│ ☐ Asia           │  │ Sample ✓       │  │ Sample ✓       │                 │
│ ☐ Americas       │  │                │  │                │                 │
│                  │  │ Recent:        │  │ Recent:        │                 │
│ Certifications   │  │ $1,180–1,340   │  │ $890–980       │                 │
│ ☐ Halal          │  │                │  │                │                 │
│ ☐ Organic        │  │ [Sample] [Add →]│  │ [Sample] [Add →]│                 │
│                  │  └────────────────┘  └────────────────┘                 │
│ Sample available │                                                          │
│ ☐ Only           │  ┌────────────────┐  ┌────────────────┐                 │
│                  │  │ ...            │  │ ...            │                 │
│ [Clear filters]  │  └────────────────┘  └────────────────┘                 │
│                  │                          Page 1 of 12  [< 1 2 3 ... >]   │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

**Add flow:** Click `[Add →]` → modal:

```
┌──────────────────────────────────────┐
│ Add to container                     │
│ Premium Basmati Rice 5kg             │
│                                      │
│ Pallets:  [ 2 ▼]  (min. 2)          │
│                                      │
│ Container: ○ MC-2026-00042 (draft)  │
│            ○ New container           │
│                                      │
│ Indicative: ~$2,500 (2 × $1,250 mid) │
│ Not a price offer.                   │
│                                      │
│        [Cancel]  [Add to container]  │
└──────────────────────────────────────┘
```

**Primary CTA:** `[Add →]` on card. Secondary: `[Sample]`.

---

## 3. Container Builder

**Purpose:** Planning workspace — fill meter, lines, breakdown. NOT a cart.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MC-2026-00042  ·  Mixed Container  ·  DRAFT                    [Save draft] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ● Build  ○ Price  ○ Review  ○ Execute                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHAT TO DO NOW                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Add products by pallet, then request live pricing.                  │    │
│  │ Indicative totals are for planning — final pricing comes after submit.│    │
│  │                                    [Request Live Pricing]  PRIMARY  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├────────────────────────────────────────────┬────────────────────────────────┤
│ CONTAINER PLAN (cols 1-8)                  │ CONTAINER SUMMARY (cols 9-12)  │
│                                            │                                │
│ Container type: [40ft Standard ▼]          │  FILL METER                    │
│ Destination:    [Germany (DE) ▼]           │  ████████████████░░░░  75%     │
│ Currency:       [USD ▼]                    │  18 of 24 pallet slots used    │
│                                            │  6 slots remaining (optional)  │
│ PRODUCT BREAKDOWN                          │                                │
│ ┌────────────────────────────────────────┐ │  ESTIMATED VALUE               │
│ │ Product          │Pallets│Indic/pallet│ │  $42,800                       │
│ ├──────────────────┼───────┼────────────┤ │  Indicative — not an offer     │
│ │ Basmati 5kg      │  4    │ $1,200–1,32│ │                                │
│ │ Olive Oil 1L     │  6    │ $890–980   │ │  BY CATEGORY                   │
│ │ Canned Tuna      │  4    │ $720–810   │ │  Grains      42%               │
│ │ Roasted Almonds  │  4    │ $1,100–1,20│ │  Oils        28%               │
│ │ ...              │       │            │ │  Canned      18%               │
│ └────────────────────────────────────────┘ │  Snacks      12%               │
│                                            │                                │
│ [+ Add from catalog]                       │  [View fill details]           │
│                                            │                                │
│ Per-line: pallet stepper [−] 4 [+]  [Remove]│                               │
└────────────────────────────────────────────┴────────────────────────────────┘
```

**Key behaviours:**
- Pallet stepper per line (not e-commerce qty)
- Fill meter updates live; no block at <100%
- `[Request Live Pricing]` disabled until ≥1 line + container type + destination
- No supplier column anywhere

**Mobile:** Summary collapses above line table; sticky bottom bar with primary CTA.

---

## 4. Pricing Review

**Purpose:** Review live offer with 72h validity; accept or optimize.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MC-2026-00038  ·  Mixed Container  ·  OFFER READY                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ ● Build  ● Price  ○ Review  ○ Execute                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ⏱ OFFER VALID FOR 47 HOURS 12 MINUTES                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Your live container offer is ready. Prices confirmed with our        │    │
│  │ supplier network. Approve before expiry or optimize your mix.        │    │
│  │  [Approve Container]  PRIMARY     [Optimize Container]  secondary   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├────────────────────────────────────────────┬────────────────────────────────┤
│ LIVE OFFER DETAIL                          │ OFFER SUMMARY                  │
│                                            │                                │
│ ┌────────────────────────────────────────┐ │  Container: 40ft HC            │
│ │ Product       │Pallets│Unit   │Total   │ │  22 pallets · 8 products       │
│ ├───────────────┼───────┼───────┼────────┤ │                                │
│ │ Basmati 5kg   │  4    │$1,265 │ $5,060 │ │  SUBTOTAL        $48,920       │
│ │ Olive Oil 1L  │  6    │ $945  │ $5,670 │ │  Freight est.    $2,800        │
│ │ Canned Tuna   │  4    │ $785  │ $3,140 │ │  (estimate only)               │
│ │ ...           │       │       │        │ │  ─────────────────────────     │
│ └────────────────────────────────────────┘ │  TOTAL           $51,720       │
│                                            │  USD · Valid until 10 Jun 18:00│
│ vs indicative at build: +2.1%              │                                │
│                                            │  vs indicative: +$1,060          │
│                                            │                                │
│                                            │  ⚠ Freight finalized in        │
│                                            │    FreightIQ after approval    │
└────────────────────────────────────────────┴────────────────────────────────┘
```

**Waiting state (PRICING_REQUESTED):**

```
┌─────────────────────────────────────────────────────────────────────┐
│ SECURING LIVE PRICING                                               │
│ We are confirming availability and pricing. Expect your offer       │
│ within 24–48 hours.                                                 │
│ Submitted: 8 Jun 2026, 09:14                                        │
│                                              [View container plan]  │
└─────────────────────────────────────────────────────────────────────┘
```

**Expired state:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ OFFER EXPIRED                                                       │
│ Your live offer expired on 10 Jun 2026. Request new pricing.        │
│                              [Request Live Pricing]  PRIMARY        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Optimization Screen

**Purpose:** Revise pallet mix against current offer; preview impact before repricing.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MC-2026-00038  ·  Optimize Container                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Comparing against Offer v2 (published 8 Jun) · Valid 47h remaining          │
├────────────────────────────────────────────┬────────────────────────────────┤
│ CURRENT OFFER (read-only baseline)         │ PROPOSED REVISION              │
│                                            │                                │
│ Basmati 5kg      4 pallets  $5,060         │ Basmati 5kg      6 [+2] $7,590│
│ Olive Oil 1L     6 pallets  $5,670         │ Olive Oil 1L     4 [-2] $3,780│
│ Canned Tuna      4 pallets  $3,140         │ Canned Tuna      — REMOVED    │
│ Roasted Almonds  4 pallets  $4,480         │ Roasted Almonds  4      $4,480│
│ Green Tea        —          —              │ Green Tea        4 NEW  [add] │
│                                            │                                │
│ Total: $51,720 · 22 pallets                │ Est. 22 pallets (fill: 92%)   │
│                                            │ Repricing required for new $  │
├────────────────────────────────────────────┴────────────────────────────────┤
│ CHANGE SUMMARY                                                              │
│  + Basmati: +2 pallets  ·  − Olive Oil: −2 pallets  ·  − Tuna: removed     │
│  + Green Tea: +4 pallets (new)                                              │
│                                                                             │
│  Pallet delta: 0  ·  Category mix changed  ·  Live total TBD after reprice  │
│                                                                             │
│              [Discard revision]              [Submit for Repricing] PRIMARY │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Rules:**
- Baseline column frozen (current accepted offer snapshot)
- Proposed column editable
- No live prices on new/changed lines until repricing completes
- Submit → `REPRICING_REQUESTED` → return to Pricing Review waiting state

---

## 6. Container Dashboard

**Purpose:** Post-approval execution view — orders, freight, shipments aggregated.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MC-2026-00031  ·  Container Dashboard  ·  EXECUTION ACTIVE                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ● Build  ● Price  ● Approved  ● Execute                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXECUTION PROGRESS                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ████████████████████░░░░  3 of 4 orders active · 1 shipment in transit│  │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  APPROVED OFFER (Offer v1 · $51,720 · Accepted 1 Jun)                      │
│  8 products · 22 pallets · 40ft HC · Destination: Germany                   │
│                                                                             │
│  ORDERS (spawned from this container)                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ORD-MC-2026-00031-1  ·  Supplier A  ·  PRODUCTION_IN_PROGRESS      │    │
│  │ 3 products · $18,400                              [Open order →]    │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ORD-MC-2026-00031-2  ·  Supplier B  ·  FREIGHT_REQUESTED           │    │
│  │ 2 products · $12,100  ·  FreightIQ: 2 offers     [Open order →]    │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ORD-MC-2026-00031-3  ·  Supplier C  ·  IN_TRANSIT (via Shipment)   │    │
│  │ 2 products · $14,220                               [Open shipment →]│    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ORD-MC-2026-00031-4  ·  Supplier D  ·  ORDER_CREATED               │    │
│  │ 1 product · $7,000                                 [Open order →]    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  TIMELINE (collapsed — last 5 events)                          [Expand]    │
│  · 3 Jun — Order ORD-...-3 shipment departed                               │
│  · 2 Jun — FreightIQ offer selected for ORD-...-2                          │
│  · 1 Jun — Container approved · 4 orders spawned                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Note:** Supplier names appear here at **Order level** post-approval — intentional transparency shift. Learning Center should set expectation.

**Primary CTA:** `[Open order →]` on row needing action (contextual next-action from Order FSM).

---

## 7. Component inventory (future build)

| Component | Used in |
|-----------|---------|
| `McWorkspaceHeader` | Builder, Pricing, Dashboard |
| `McProgressStepper` | All workspace screens |
| `McWhatHappensNext` | Builder, Pricing (waiting), Dashboard |
| `McFillMeter` | Builder, Optimization |
| `McContainerSummary` | Builder sidebar |
| `McProductBreakdownTable` | Builder, Pricing Review |
| `McOfferValidityBanner` | Pricing Review |
| `McOptimizationDiff` | Optimization |
| `McExecutionProgress` | Dashboard |
| `McOrderSpawnTable` | Dashboard |
| `CatalogProductCard` | Home, Catalog |
| `CatalogFilterPanel` | Catalog |
| `AddToContainerModal` | Catalog |

---

## 8. Navigation placement

Update buyer IA (future sprint):

```
SOURCING
  RFQs
  Commodity Bids
  Mixed Container     ← NEW
```

Quick action on Trade Command Center: `New Mixed Container` → `/buyer/mixed-container/new`.

---

## 9. Accessibility & responsive notes

| Requirement | Implementation |
|-------------|----------------|
| Fill meter | Progressbar role + aria-valuenow |
| Offer countdown | Live region updates; text fallback beyond countdown |
| Pallet steppers | Keyboard accessible; announce MOQ violations |
| Mobile | Single column; sticky primary CTA bottom bar |
| Color | Indicative = muted/ dashed border; Live offer = solid primary border |
