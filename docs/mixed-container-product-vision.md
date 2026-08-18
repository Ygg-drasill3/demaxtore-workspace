# Mixed Container — Product Vision

**Sprint:** 12A — Mixed Container Architecture & Product Design  
**Date:** 2026-06-08  
**Status:** Design specification (no runtime implementation)

---

## 1. Executive summary

**Mixed Container** is a dedicated procurement workspace inside DeMaxtore Trade OS for importers who want **multiple food products in a single container** without committing to a full container of one SKU.

It is **not** RFQ, **not** CommodityBid, and **not** e-commerce. It is a **container-based planning and procurement workflow** where buyers compose pallets from an anonymized catalog, obtain live supplier pricing after submission, optimize fill and cost, then execute through the existing Order → FreightIQ → Shipment spine.

---

## 2. Problem statement

| Segment | Pain today |
|---------|------------|
| Small / mid importers | Cannot afford or store a full container of one SKU |
| Distributors | Need assortment breadth, not single-commodity bulk |
| Retail chains | Want curated multi-SKU inbound without managing many supplier relationships |

These buyers currently use **WhatsApp, Excel, and fragmented broker networks** to assemble mixed loads. DeMaxtore already owns RFQ (relationship sourcing) and CommodityBid (competitive auction). Mixed Container fills the gap: **curated catalog + container planning + opaque multi-supplier allocation**.

---

## 3. Product positioning inside Trade OS

```
DeMaxtore Trade OS
├── RFQ Workspace              — relationship-based, buyer-specified specs, named suppliers
├── CommodityBid Workspace     — competitive auction, lot-based, named bidders
├── Mixed Container Workspace  — catalog-based, pallet-planned, supplier-anonymous  ← NEW
├── FreightIQ Workspace        — freight coordination (Order-attached)
├── Orders                     — execution spine (spawned from approved containers)
├── Shipments                  — port-to-port execution
├── Trade Documents            — compliance across workspaces
└── Control Tower              — operations intelligence (additive alerts)
```

Mixed Container sits in **SOURCING** alongside RFQ and CommodityBid. It does **not** replace either; it serves a distinct buyer intent.

---

## 4. Target customer

| Persona | Characteristics | Why Mixed Container |
|---------|-----------------|---------------------|
| **SMB importer** | 1–5 containers/year, limited warehouse | MOQ = 1 container, multi-SKU acceptable |
| **Regional distributor** | Assortment-led, margin-sensitive | Pallet granularity, optimization loop |
| **Retail chain procurement** | Private-label + branded mix | Samples, market insights, no supplier exposure |

**Anti-persona:** Buyers who know their supplier, have fixed specs, and want direct negotiation → **RFQ**. Buyers who want price discovery via auction → **CommodityBid**.

---

## 5. Core principles (locked)

| # | Principle | Implication |
|---|-----------|-------------|
| 1 | Minimum order = **1 container** | No partial-container checkout; under-fill is allowed but MOQ is container-level |
| 2 | Buyer may purchase **multiple products** | Container Builder holds many line items |
| 3 | Buyer may purchase from **unlimited suppliers** | Allocation is internal; buyer sees one consolidated offer |
| 4 | Products selected by **pallet count** | Not cart quantity, not weight-only — pallets are the planning unit |
| 5 | Buyers **not required** to fill container | Fill meter is advisory; pricing reflects actual pallet load |
| 6 | **Supplier identities hidden** from buyers | Catalog SKUs are anonymized; allocation is ops-only |
| 7 | Buyers see **products, packaging, pallets, market insights** | Transparency on product, opacity on source |
| 8 | **Final supplier pricing** obtained after submission | Indicative range pre-submit; live offer post-submit |
| 9 | Mixed Container remains a **dedicated workspace** | Own FSM, own routes, own UI — not a mode inside RFQ |

---

## 6. What Mixed Container is NOT

| Misconception | Reality |
|---------------|---------|
| "RFQ with multiple line items" | RFQ is spec-driven and supplier-visible; MC is catalog-driven and supplier-anonymous |
| "CommodityBid for containers" | No auction, no lot bidding, no supplier competition visible to buyer |
| "E-commerce / marketplace cart" | No instant checkout, no supplier storefront, no cart metaphor |
| "Freight marketplace" | FreightIQ attaches **after** order execution, unchanged |

---

## 7. Value proposition

**For buyers:** Plan a mixed food container like a spreadsheet, but with market intelligence, live pricing, and end-to-end execution inside one OS — without managing supplier relationships.

**For DeMaxtore:** New sourcing funnel for assortment-led importers; internal allocation engine monetizes supplier network; reuses Order → FreightIQ → Shipment without duplicating execution runtimes.

**For suppliers (internal):** Participate via allocation invitations; identity protected until PO issuance; no public catalog exposure required in Phase 1.

---

## 8. Success metrics (future)

| Metric | Definition |
|--------|------------|
| Container submission rate | Draft → pricing request conversion |
| Offer acceptance rate | Live offer → approved |
| Optimization loop depth | Avg repricing cycles before approval |
| Time-to-offer | Submit → live offer SLA |
| Execution handoff rate | Approved → Order spawned within 48h |
| Freight attach rate | Order → FreightIQ request within 7d |

---

## 9. Phasing (design intent, not sprint scope)

| Phase | Scope |
|-------|-------|
| **12A (this sprint)** | Architecture, data model, journey, wireframes |
| **12B (future)** | Catalog ingestion, Container Builder runtime, indicative pricing |
| **12C (future)** | Live pricing, allocation engine, 72h offer validity |
| **12D (future)** | Optimization loop, sample module, Control Tower alerts |
| **12E (future)** | Order spawn, FreightIQ handoff, buyer dashboard KPIs |

---

## 10. Strategic frame

> DeMaxtore's competitor for Mixed Container is not Alibaba.
> It is **Excel container planners + broker WhatsApp groups**.

Mixed Container wins when it reduces **planning uncertainty** (fill, cost, availability) and **execution friction** (one OS from plan to shipment) — without exposing the messy multi-supplier reality to the buyer.
