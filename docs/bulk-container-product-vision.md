# BulkContainer — Product Vision

**Sprint:** 13A / 13A.1 — BulkContainer Architecture & Product Family Alignment  
**Date:** 2026-06-09  
**Status:** Design specification (no runtime implementation)  
**Constraint:** No changes to SmartContainer, RFQ, CommodityBid, FreightIQ, Order, or Shipment FSM/runtime. BulkContainer does **not** integrate with CommodityBid (locked in 13A.1).

---

## 1. Executive summary

**BulkContainer** is the 8th first-class product inside DeMaxtore Trade OS — a dedicated procurement workspace for **bulk, horeca, and industrial food buyers** who plan container loads by **ton, bag, and specification**, not retail pallet SKUs.

BulkContainer is **not** SmartContainer (retail packaged consolidation) and **not** RFQ (relationship negotiation). It is a **specification-driven, operations-led managed sourcing workflow** — the bulk/horeca sibling of SmartContainer — where buyers compose bulk lines from a professional catalog, obtain live operations pricing after submission, and execute through the existing Order → FreightIQ → Shipment spine. It does **not** integrate with CommodityBid; auction sourcing remains a separate product.

---

## 2. Problem statement

| Segment | Pain today |
|---------|------------|
| Horeca distributors | Buy 25–50 kg bags in mixed containers; no retail MOQ tools |
| Bakeries / food manufacturers | Need flour, semolina, oil by spec — protein, ash, moisture matter |
| Industrial food buyers | Procurement is ton-based; pallet math is secondary |
| Medium importers / wholesalers | Price volatility high; need indicative ranges + live ops pricing |

These buyers use **broker spreadsheets, commodity desks, and fragmented supplier calls** to assemble bulk loads. DeMaxtore already owns SmartContainer (retail packaged), RFQ (relationship sourcing), and CommodityBid (competitive auction). BulkContainer fills the gap: **bulk catalog + specification planning + ton/bag capacity model + opaque multi-supplier allocation**.

---

## 3. Product positioning inside Trade OS

```
DeMaxtore Trade OS
├── SOURCING
│   ├── RFQ              — find one supplier / direct sourcing
│   ├── CommodityBid     — large-volume competitive auction
│   ├── SmartContainer   — retail packaged, multi-supplier managed container
│   └── BulkContainer    — bulk/horeca/industrial, multi-supplier managed container
├── EXECUTION
│   ├── Orders           — spawned from approved containers
│   └── Shipments        — spawned from orders
├── FreightIQ            — logistics execution layer
├── Trade Documents      — cross-workspace compliance
├── Control Tower        — operations intelligence (additive alerts)
└── Learning Center      — product guides
```

BulkContainer sits in **SOURCING** as the bulk/horeca managed-container product — parallel to SmartContainer (retail managed container). CommodityBid is a separate auction product; BulkContainer has **no auction, no bidding, no supplier portal**.

---

## 4. Target customer

| Persona | Characteristics | Why BulkContainer |
|---------|-----------------|-------------------|
| **Horeca distributor** | Foodservice packaging, 25–50 kg bags | Bag/ton planning, spec-driven |
| **Bakery / manufacturer** | Flour, semolina, oil, ingredients | Quality parameters affect price |
| **Industrial food buyer** | Ton-scale procurement | MT pricing, container weight limits |
| **Medium importer** | 2–20 containers/year, bulk packs | MOQ = 1 container, multi-spec lines |
| **Wholesale distributor** | Pulses, rice, pasta in bulk packs | Commodity volatility, live pricing |

**Anti-persona:** Retail chain buying branded consumer packs → **SmartContainer**. Buyer with named supplier and custom negotiation → **RFQ**. Buyer wanting large-volume competitive auction → **CommodityBid** (separate workspace — not inside BulkContainer).

---

## 5. Core principles (locked)

| # | Principle | Implication |
|---|-----------|-------------|
| 1 | Minimum order = **1 container** | Container-level MOQ; partial fill allowed but advisory |
| 2 | Buyer may purchase **multiple bulk products** | Bulk Container Builder holds many spec lines |
| 3 | Buyer may purchase from **unlimited suppliers** | Allocation is internal; buyer sees one consolidated offer |
| 4 | Products selected by **unit type** (MT, bags, pallets) | Not retail SKU quantity; unit model per product |
| 5 | **Specifications are mandatory** | Flour protein, rice broken rate, etc. — not optional enrichments |
| 6 | **Supplier identities hidden** from buyers | Catalog refs anonymized; allocation ops-only |
| 7 | **Indicative pricing pre-submit; live pricing post-submit** | Higher volatility than SmartContainer |
| 8 | **Standard supplier bulk packaging only in V1** | No custom packaging development |
| 9 | **No private label in V1** | Standard export/horeca bulk packs only |
| 10 | BulkContainer remains a **dedicated workspace** | Own FSM, routes, tables — not a SmartContainer mode |

---

## 6. What BulkContainer is NOT

| Misconception | Reality |
|---------------|---------|
| "SmartContainer for big bags" | Different unit model, spec schema, catalog, FSM, and UX |
| "RFQ with container planning" | RFQ is supplier-visible; BC is catalog + spec template driven |
| "CommodityBid for containers" | Auction is a separate product; BulkContainer is ops-led managed sourcing only |
| "E-commerce bulk catalog" | No instant checkout; structured spec cards, not Amazon-style |
| "Private label development" | V1 excludes custom packaging; standard bulk packs only |

---

## 7. Value proposition

**For buyers:** Plan a bulk food container with professional specification cards, ton/bag capacity meters, market ranges, and end-to-end execution — without managing supplier relationships or confusing retail SKUs.

**For DeMaxtore:** New sourcing funnel for horeca/industrial segment; reuses Order → FreightIQ → Shipment; additive Control Tower and Learning Center; no disruption to SmartContainer retail lane.

**For suppliers (internal):** Participate via allocation; identity protected until PO; spec compliance verified in ops workspace.

---

## 8. Product eligibility (V1)

### Allowed

| Category | Examples |
|----------|----------|
| Flour | 50 kg bags, industrial grades |
| Semolina | 25 kg bags |
| Rice | 25 kg bags, broken rate specs |
| Pulses | 25 kg bags, crop year, size |
| Oil | 20 L containers / bulk packs |
| Foodservice products | Bulk packs for horeca |
| Industrial ingredients | Standard bulk packaging |

### Not allowed

| Category | Reason |
|----------|--------|
| Retail-only SKUs | SmartContainer lane |
| Private label retail packaging | Wrong product; no custom packaging in V1 |
| Custom new packaging development | Out of V1 scope |
| Consumer unit packs (e.g. 500g retail) | SmartContainer lane |

### Private label clarification

**V1 default:** BulkContainer supports **standard supplier bulk packaging only**. No custom packaging, no buyer-branded label development. If a buyer needs private label, route to **RFQ** or future V2 scope — not BulkContainer V1.

---

## 9. Success metrics (future)

| Metric | Definition |
|--------|------------|
| Bulk request submission rate | Draft → pricing request conversion |
| Spec completion rate | Lines with full spec template filled |
| Offer acceptance rate | Live offer → approved |
| Time-to-offer | Submit → live offer SLA |
| Capacity utilization | Avg weight % and pallet % at approval |
| Execution handoff rate | Approved → Order spawned within 48h |
| Ops pricing SLA | Submit → live offer within target window |

---

## 10. Phasing (design intent, not sprint scope)

| Phase | Scope |
|-------|-------|
| **13A (this sprint)** | Architecture, data model, journey, wireframes, readiness verdict |
| **13B (future)** | Catalog + spec templates, Bulk Container Builder runtime |
| **13C (future)** | Live pricing, ops procurement, 72h offer validity |
| **13D (future)** | Allocation, proforma, payment coordination, Control Tower alerts |
| **13E (future)** | Execution bridge → Order spawn, FreightIQ, Shipment |

---

## 11. Learning Center content (design)

**Registry (future):** Add cards to `LEARNING_CARDS[]` in `packages/contracts/src/onboarding.ts`.  
**Content contracts (future):** `packages/contracts/src/bulk-container-*-learning.ts` — same pattern as `mixed-container-learning.ts`.

### Buyer articles

| Slug | Title | Summary | Topics |
|------|-------|---------|--------|
| `bulk-container-overview` | What is BulkContainer? | Bulk/horeca container planning by ton, bag, and technical specification — not retail pallets. | Product discovery via spec cards · Building a bulk container · Requesting live pricing · Approving offers · Execution handoff |
| `bulk-container-vs-smartcontainer` | SmartContainer vs BulkContainer | Two sibling products: retail packaged (pallet/SKU) vs bulk/horeca (ton/spec). | When to use SmartContainer · When to use BulkContainer · Unit model differences · No "bulk mode" inside SmartContainer |
| `bulk-container-pricing` | How bulk pricing works | Indicative market ranges pre-submit; live ops pricing post-submit; 72h offer validity. | Indicative USD/MT vs live offer · Market status badges · Volatile line shorter validity · Revision and repricing |
| `bulk-container-specifications` | How specifications affect pricing | Technical parameters (protein, ash, moisture, crop year) drive supplier matching and price. | Spec templates per product type · Required vs optional params · Ops spec review · Why specs matter for flour, rice, oil |
| `bulk-container-payments` | How payments work | Buyer pays suppliers directly per proforma; DeMaxtore coordinates only. | Allocation status (no supplier names) · Proforma collection · Payment confirmation · Execution ready gate |
| `bulk-container-execution` | How execution works | Approved bulk container spawns supplier orders, then FreightIQ and Shipment. | BC-EXEC master order · Per-line order tracking · Freight booking · Shipment spawn |

### Admin article

| Slug | Title | Summary |
|------|-------|---------|
| `bulk-container-ops-overview` | BulkContainer operations guide | Spec review → sourcing → manual pricing → offer → allocation → proforma → payment → execution spawn. |

### Onboarding integration (future)

- First-trade checklist: add `bulk-container` step after SmartContainer (optional path for horeca buyers).
- Tour routes: `/buyer/bulk-container`, `/buyer/bulk-container/catalog/flour`, builder with capacity meter highlighted.
- State-specific guidance on builder when `capacityWarnings` includes `mixed_loading` or `overweight`.

---

## 12. Non-disruption guarantee

| Product | Guarantee |
|---------|-----------|
| SmartContainer (`MIXED_CONTAINER`) | Unchanged routes, FSM, tables, alerts |
| RFQ | No shared tables; parallel workspace |
| CommodityBid | No integration — independent auction product; BC unchanged |
| Order | Spawned additively via `bulk_container_order_links` |
| FreightIQ | Attaches to spawned orders only |
| Shipment | Spawns from orders via existing side effect |
| Control Tower | Additive `bulk_container_*` / `bulkcontainer_*` alerts only |
