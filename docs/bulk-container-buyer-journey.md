# BulkContainer — Buyer Journey

**Sprint:** 13A / 13A.1 — BulkContainer Architecture & Product Family Alignment  
**Date:** 2026-06-09  
**Status:** Design specification (no runtime implementation)  
**Procurement model:** Operations-led managed sourcing — no auction, no CommodityBid integration.

---

## 1. Journey overview

```
Discover Bulk Products
      ↓
Build Bulk Container (spec + quantity + unit)
      ↓
Buyer Request (submit for live pricing)
      ↓
Operations Procurement (buyer waits — no auction)
      ↓
Bulk Offer
      ↓
Buyer Approval  ←──┐
      ↓             │
Request Revision ───┘
      ↓
Supplier Allocation (buyer-visible status only)
      ↓
Proforma
      ↓
Payment Tracking
      ↓
Execution Ready
      ↓
Order / FreightIQ / Shipment
```

**Persona:** Procurement manager at horeca distributor, bakery, food manufacturer, or medium importer.  
**Entry point:** `/buyer/bulk-container` or "New Bulk Request" from Trade Command Center.

---

## 2. Stage-by-stage design

### Stage 1 — Discover Bulk Products

**Goal:** Browse bulk/horeca catalog via structured specification cards — not retail product browse.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 1.1 | Opens BulkContainer home | Shows active requests + category discovery | — |
| 1.2 | Enters catalog by category | Filtered spec cards (flour, rice, oil, etc.) | — |
| 1.3 | Views spec card | Name, standard packing, unit options, indicative range, market status, last updated | — |
| 1.4 | Fills specification template | Validates required params (protein, moisture, etc.) | — |
| 1.5 | Sets quantity + unit | MT / bags / pallets per product eligibility | — |
| 1.6 | Clicks "Add to bulk container" | Adds to active draft or creates new draft | `BC_DRAFT` |

**Buyer sees:** Technical specs, indicative USD/MT (or bag/pallet), market status, no supplier names.  
**Buyer does not see:** Factory, supplier contact, internal refs.

**Exit criteria:** ≥1 line with complete spec template and valid quantity.

---

### Stage 2 — Build Bulk Container

**Goal:** Plan container load with multi-unit capacity awareness.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 2.1 | Opens Bulk Container Builder | Capacity meter (weight, pallets, volume), line table | `BC_DRAFT` / `BC_BUILDING` |
| 2.2 | Sets container type | 20ft / 40ft / 40ft HC → updates max constraints | `BC_BUILDING` |
| 2.3 | Sets destination + incoterm | Required for pricing request | `BC_BUILDING` |
| 2.4 | Adjusts quantities / specs | Normalized kg, pallets, MT recalculated | `BC_BUILDING` |
| 2.5 | Reviews warnings | Overweight, partial container, mixed loading (advisory) | `BC_BUILDING` |
| 2.6 | Adds/removes lines | Product breakdown updates | `BC_BUILDING` |

**Key UX rules:**
- Under-fill allowed — partial container warning is advisory
- Spec changes on a line may trigger re-validation against template
- No Amazon-style "Add to cart" — use "Add to bulk container"
- Unit selector respects product `unit_type` and conversions

**Exit criteria:** Container type selected, destination set, ≥1 complete spec line, no blocking spec validation errors.

---

### Stage 3 — Request Live Pricing

**Goal:** Submit bulk plan for operations pricing.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 3.1 | Clicks "Request Live Pricing" | Preconditions validated (specs, destination, lines) | `BC_BUILDING` |
| 3.2 | Confirms submission modal | Snapshot of lines frozen; quote record created | `BC_PRICING_REQUESTED` |
| 3.3 | Sees confirmation | SLA message (24–48h typical); timeline event | `BC_PRICING_REQUESTED` |

**Buyer sees:** Indicative totals struck through; "awaiting live pricing" status.  
**System:** Control Tower alert `bulk_container_pricing_pending`; ops inbox notified.

**Exit criteria:** Pricing request accepted; workspace in `BC_PRICING_REQUESTED`.

---

### Stage 4 — Operations Procurement (buyer passive)

**Goal:** DeMaxtore ops reviews specs, sources suppliers, enters live prices.

| Step | Buyer experience | System behaviour (internal) | Workspace state |
|------|------------------|----------------------------|-----------------|
| 4.1 | Status: "Pricing in progress" | Spec review → sourcing → manual pricing | `BC_PROCUREMENT_IN_PROGRESS` |
| 4.2 | Optional notification | Ops may flag spec clarification (future messaging) | `BC_PROCUREMENT_IN_PROGRESS` |
| 4.3 | — | Offer drafted and sent | `BC_OFFER_READY` → `BC_BUYER_REVIEW` |

**Buyer does not see:** Supplier names, internal quotes, margin.

---

### Stage 5 — Bulk Offer Review

**Goal:** Review live consolidated offer; approve, decline, or request revision.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 5.1 | Opens offer page | Line-level live prices with basis (USD/MT, etc.) | `BC_BUYER_REVIEW` |
| 5.2 | Reviews validity countdown | Default 72h; volatile lines may show shorter sub-validity | `BC_BUYER_REVIEW` |
| 5.3a | Approves | Offer locked; moves to coordination | `BC_APPROVED` |
| 5.3b | Requests revision | Revision note; returns to building/pricing cycle | `BC_REVISION_REQUESTED` |
| 5.3c | Lets expire | Offer expires; must re-request pricing | `BC_EXPIRED` |

**Buyer sees:** Spec summary per line, unit price basis, line totals, container summary.  
**Money rule:** Live offer clearly labeled — distinct from indicative pre-submit ranges.

**Exit criteria:** Offer approved → `BC_APPROVED`.

---

### Stage 6 — Allocation & Payment Coordination

**Goal:** Track post-approval coordination without exposing supplier identities.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 6.1 | Opens coordination page | Phase stepper: Allocation → Proforma → Payment | `BC_ALLOCATION_IN_PROGRESS` |
| 6.2 | Views allocation status | "3 of 3 lines allocated" (no supplier names) | `BC_ALLOCATION_IN_PROGRESS` |
| 6.3 | Views proforma status | Buyer-safe proforma summary per phase | `BC_PROFORMA_PENDING` |
| 6.4 | Confirms payments | Buyer confirms direct supplier payments | `BC_PAYMENT_TRACKING` |
| 6.5 | Sees execution ready | All coordination complete | `BC_EXECUTION_READY` |

**Strategic principle (same as SmartContainer):** Factory prices visible; buyer pays suppliers directly; DeMaxtore coordinates only.

---

### Stage 7 — Execution

**Goal:** Monitor spawned orders, freight, and shipments.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 7.1 | Opens execution dashboard | Master order ref `BC-EXEC-*`, per-line order status | `BC_EXECUTION_ACTIVE` |
| 7.2 | Tracks production milestones | Reuses Order workspace timeline | `BC_EXECUTION_ACTIVE` |
| 7.3 | Monitors FreightIQ | Freight status per supplier order (unchanged runtime) | `BC_EXECUTION_ACTIVE` |
| 7.4 | Monitors shipments | Shipment spawn from orders (unchanged runtime) | `BC_EXECUTION_ACTIVE` |
| 7.5 | Sees completion | All orders/shipment milestones complete | `BC_EXECUTION_COMPLETE` |

**Spawn trigger:** Admin confirms execution-ready → `spawn_execution_orders` (future 13E).

---

## 3. Buyer UX principles

| # | Principle |
|---|-----------|
| 1 | **Professional tone** — procurement workspace, not retail shop |
| 2 | **Specification-first** — specs before quantity; incomplete spec blocks add |
| 3 | **Unit transparency** — always show price basis (USD/MT, USD/bag, USD/pallet) |
| 4 | **Capacity honesty** — dual weight + pallet + volume meter with clear warnings |
| 5 | **Supplier opacity** — no names until Order phase (if ever on buyer surface) |
| 6 | **Indicative ≠ live** — visual distinction mandatory |
| 7 | **No private label** — no packaging customization UI in V1 |

---

## 4. State-to-screen mapping

| FSM State | Primary buyer screen |
|-----------|---------------------|
| `BC_DRAFT` / `BC_BUILDING` | Builder |
| `BC_PRICING_REQUESTED` | Builder (read-only) + status banner |
| `BC_PROCUREMENT_IN_PROGRESS` | Requests list + status |
| `BC_BUYER_REVIEW` | Offer review |
| `BC_REVISION_REQUESTED` | Builder |
| `BC_APPROVED` → `BC_PAYMENT_TRACKING` | Coordination |
| `BC_EXECUTION_READY` → `BC_EXECUTION_COMPLETE` | Execution dashboard |

---

## 5. Notifications (buyer)

| Event | Channel | Copy intent |
|-------|---------|-------------|
| Pricing request accepted | In-app + email | "Your bulk pricing request BC-xxx was submitted" |
| Live offer available | In-app + email | "Live bulk offer ready — valid 72 hours" |
| Offer expiring (24h) | In-app | "Your bulk offer expires in 24 hours" |
| Offer approved confirmation | In-app | "Bulk offer approved — coordination started" |
| Execution spawned | In-app | "Orders created for BC-xxx" |

---

## 6. Edge cases

| Case | Behaviour |
|------|-----------|
| Spec incomplete at pricing request | Block submit; highlight missing params |
| Overweight container | Warning shown; submit allowed (ops may adjust) |
| Volatile product (oil) | Shorter offer validity on that line |
| Revision after partial approval | Not allowed — must decline/revise before approval |
| Mixed BC + MC in same account | Separate workspaces; Command Center shows both |
| Buyer adds retail SKU | Catalog eligibility gate rejects at ingest; not in BC catalog |

---

## 7. Journey comparison to SmartContainer

| Stage | SmartContainer | BulkContainer |
|-------|----------------|---------------|
| Discover | Product cards, pallet MOQ | Spec cards, unit + spec MOQ |
| Build | Pallet fill meter | Weight + pallet + volume meter |
| Price | USD/pallet indicative | USD/MT/bag/pallet indicative |
| Offer | Pallet line pricing | Spec summary + unit basis pricing |
| Execute | SC-* master order | BC-EXEC-* master order |

Same coordination and execution spine; different planning vocabulary.
