# Mixed Container — Architecture

**Sprint:** 12A — Mixed Container Architecture & Product Design  
**Date:** 2026-06-08  
**Status:** Design specification (no runtime implementation)  
**Constraint:** No changes to RFQ, CommodityBid, FreightIQ, or Shipment FSM/runtime in this sprint.

---

## 1. Objective

Define how **Mixed Container** becomes a first-class workspace inside DeMaxtore Trade OS — parallel to RFQ and CommodityBid — with its own lifecycle, catalog layer, pricing engine, and execution handoff to existing Order → FreightIQ → Shipment runtimes.

---

## 2. Platform context (existing baseline)

| Layer | Current state |
|-------|---------------|
| `WorkspaceType` | `RFQ` \| `COMMODITYBID` \| `ORDER` \| `SHIPMENT` |
| Workspace spine | `workspaces`, `workspace_participants`, `timeline_events`, `spawned_from_id` |
| Execution path | RFQ/CB → Order spawn → FreightIQ (Order-attached) → Shipment spawn |
| Control Tower | Additive alert engine; references `workspaces` by type |
| Market intelligence | Read-only aggregations from RFQ/Order/Shipment (Sprint 7C) |

Mixed Container adds **`MIXED_CONTAINER`** to `WorkspaceType` in a future sprint — same spine, new detail tables, new FSM.

---

## 3. Product architecture map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MIXED CONTAINER WORKSPACE                             │
│  (buyer-facing lifecycle: draft → pricing → offer → approve → execute) │
└─────────────────────────────────────────────────────────────────────────┘
         │              │              │              │              │
         ▼              ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Catalog    │ │  Container   │ │  Container   │ │  Container   │ │   Supplier   │
│   (read)     │ │   Builder    │ │     RFQ      │ │ Optimization │ │  Allocation  │
│              │ │  (planning)  │ │  (pricing)   │ │   (revise)   │ │  (internal)  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
                                                                    │
                                                                    ▼
                                                          ┌──────────────┐
                                                          │  Container   │
                                                          │  Execution   │
                                                          │ → Order spawn│
                                                          └──────────────┘
                                                                    │
                    ┌───────────────────────────────────────────────┘
                    ▼
         ┌──────────────────┐     ┌──────────────────┐
         │  FreightIQ       │ ──► │  Shipment        │
         │  (Order-attached)│     │  (spawned)       │
         └──────────────────┘     └──────────────────┘
```

---

## 4. Component definitions

### 4.1 Mixed Container Workspace

The **root aggregate** — one workspace per container plan.

| Attribute | Design |
|-----------|--------|
| Type | `WorkspaceType.MIXED_CONTAINER` |
| External ref | `MC-{YYYY}-{seq}` e.g. `MC-2026-00042` |
| Owner | Buyer org (OWNER participant) |
| Counterparties | DeMaxtore OPERATOR only on buyer surface; suppliers never in buyer participant list |
| State | Own FSM (see §5) |
| Spawn | On approval → `ContainerExecution` → one or more Order workspaces |

**Reuse from platform:** `timeline_events`, `audit_logs`, `notifications`, `workspace_participants`, socket bus, Control Tower alert FK.

---

### 4.2 Container Builder

A **planning workspace**, not a shopping cart.

| Capability | Behaviour |
|------------|-----------|
| Add product | Select catalog SKU → specify pallet count |
| Fill meter | Visual % of container pallet capacity used |
| Remaining capacity | Pallets left (advisory, not blocking) |
| Estimated value | Sum of indicative mid-prices × pallets (pre-submit only) |
| Product breakdown | Table: SKU, category, pallets, packaging, indicative range |
| Container type | 20ft / 40ft / 40ft HC — sets max pallet capacity |
| Persistence | Auto-save draft on every line change |

**Explicit non-goals:** No "checkout", no supplier selection UI, no payment, no instant price lock.

---

### 4.3 Container RFQ

The **pricing request** submitted when buyer asks for live supplier pricing.

| Trigger | Buyer action: "Request Live Pricing" |
|---------|--------------------------------------|
| Preconditions | ≥1 line item; container type selected; destination market set |
| Output | `ContainerPricingRequest` record; workspace state → `PRICING_REQUESTED` |
| Internal | Ops/allocation engine notified; supplier RFQ packets generated per line |
| Buyer sees | Submission confirmation + expected offer SLA (e.g. 24–48h) |

Container RFQ is **not** the RFQ workspace — it is an internal pricing orchestration concept named for buyer language ("request pricing for my container").

---

### 4.4 Container Optimization

Post-offer **revision loop** before approval.

| Input | Current `ContainerOffer` + fill meter |
|-------|--------------------------------------|
| Actions | Add/remove pallets, swap SKU, change container type |
| Constraints | Pallet capacity; SKU MOQ per line |
| Output | New `ContainerRevision` → triggers repricing |
| Buyer UX | Side-by-side: current offer vs proposed revision impact |

Optimization does not mutate an accepted offer in place — each revision creates a new pricing cycle (see §6).

---

### 4.5 Supplier Allocation (internal)

**Buyer-invisible** engine that maps catalog lines to supplier organisations.

```
ContainerLine (catalog SKU + pallets)
    → Supplier Selection (rules: availability, margin, geography, past performance)
    → Allocation (supplier org + allocated pallets + internal unit price)
    → Execution (PO per supplier allocation → Order spawn)
```

| Rule | Detail |
|------|--------|
| Anonymity | Catalog `productRef` maps to N supplier candidates internally; buyer never sees mapping |
| Multi-supplier | One container may allocate to unlimited suppliers |
| Consolidation | Buyer receives **one** `ContainerOffer`; line prices are blended or itemized without supplier names |
| Ops visibility | Control Tower + ops console show allocation status per line |

Allocation runs **after** pricing request, **before** offer publication to buyer.

---

### 4.6 Container Execution

Handoff from approved container to existing execution runtimes.

| Step | Action |
|------|--------|
| 1 | Buyer approves `ContainerOffer` within validity window |
| 2 | `ContainerExecution` record created; workspace → `EXECUTION_IN_PROGRESS` |
| 3 | Per `SupplierAllocation`: spawn Order workspace (`spawned_from_id` → MC workspace) |
| 4 | Buyer sees consolidated execution dashboard; individual orders accessible via existing Order workspace |
| 5 | FreightIQ attaches to each Order when eligible (unchanged `FREIGHTIQ_ORDER_ELIGIBLE_STATES`) |
| 6 | Shipment spawns from Order on `FREIGHT_REQUESTED` (unchanged side effect) |

**Coexistence:** Order FSM, FreightIQ module, Shipment spawn — **no edits**; Mixed Container only adds spawn source type.

---

## 5. Workspace FSM (proposed)

States validated in `@dmx/contracts` at app layer (same pattern as RFQ/Shipment).

```
DRAFT
  → submit_pricing_request → PRICING_REQUESTED
PRICING_REQUESTED
  → publish_offer → OFFER_PENDING
  → cancel → CANCELLED
OFFER_PENDING
  → accept_offer → APPROVED
  → request_revision → REVISION_DRAFT
  → offer_expired → OFFER_EXPIRED
REVISION_DRAFT
  → submit_revision → REPRICING_REQUESTED
REPRICING_REQUESTED
  → publish_offer → OFFER_PENDING
  → cancel → CANCELLED
OFFER_EXPIRED
  → submit_pricing_request → PRICING_REQUESTED  (full repricing)
  → cancel → CANCELLED
APPROVED
  → begin_execution → EXECUTION_IN_PROGRESS
EXECUTION_IN_PROGRESS
  → all_orders_spawned → EXECUTION_ACTIVE
EXECUTION_ACTIVE
  → all_orders_closed → COMPLETED
  → cancel → CANCELLED
COMPLETED | CANCELLED  (terminal)
```

**Count:** 11 states. Mutations via single gateway: `MixedContainerService.applyTransition()`.

---

## 6. Pricing architecture

### 6.1 Two-tier pricing model

| Tier | When | Source | Buyer visibility |
|------|------|--------|------------------|
| **Indicative Market Range** | During build (DRAFT) | Market intelligence + recent transaction bands | Low / mid / high per pallet |
| **Live Supplier Pricing** | After Container RFQ submit | Supplier quotes via allocation engine | Itemized offer, 72h validity |

### 6.2 72-hour validity model

| Field | Semantics |
|-------|-----------|
| `validFrom` | Offer publication timestamp |
| `validUntil` | `validFrom + 72h` |
| Expiry behaviour | State → `OFFER_EXPIRED`; buyer may re-request pricing |
| Control Tower | Alert at T-24h and on expiry |

### 6.3 Repricing workflow

```
Build (DRAFT)
  ↓ Request Live Pricing
Price (PRICING_REQUESTED → OFFER_PENDING)
  ↓ Review offer
Optimize (REVISION_DRAFT — change lines)
  ↓ Submit revision
Reprice (REPRICING_REQUESTED → OFFER_PENDING)
  ↓ Accept within 72h
Approve (APPROVED)
  ↓
Execution
```

Each repricing cycle creates a new `ContainerOffer` version linked via `ContainerRevision`. Prior offers marked superseded, not deleted.

---

## 7. Sample management (future module)

Orthogonal to pricing; attachable from catalog or Container Builder.

| Stage | Buyer sees | Ops sees |
|-------|------------|----------|
| Request Sample | Form: SKU, quantity, delivery address | Sample request queue |
| Sample Status | Requested → Approved → Shipped → Delivered | Supplier assignment |
| Courier Tracking | Tracking number + carrier | Full supplier + factory |
| Sample Approval | Pass / Fail / Request alternate | Links to catalog eligibility |

Samples do **not** block container pricing but may gate certain SKUs (configurable per catalog item).

---

## 8. Layer map (future implementation)

| Layer | Artifacts |
|-------|-----------|
| **Contracts** | `mixed-container.fsm.ts`, `mixed-container.zod.ts`, `mixed-container-catalog.ts`, `mixed-container.next-actions.ts` |
| **Database** | `mixed_container_details`, `container_lines`, `container_pricing_requests`, `container_offers`, `container_revisions`, `supplier_allocations`, `sample_requests`, `container_executions`; `WorkspaceType.MIXED_CONTAINER` |
| **Backend** | `apps/backend/src/modules/mixed-container/*`, `/api/mixed-containers` |
| **Catalog** | `apps/backend/src/modules/mixed-container-catalog/*` (read API, admin ingest) |
| **Allocation** | `apps/backend/src/modules/mixed-container-allocation/*` (ADMIN/OPERATOR only) |
| **Frontend** | `/buyer/mixed-container/*`, `/workspace/mixed-container/:id` |
| **Realtime** | `mixedcontainer.updated`, `mixedcontainer.offer.published`, `mixedcontainer.state.changed` |
| **Control Tower** | Additive scan rules (see control-tower-impact doc) |

---

## 9. Integration boundaries

| System | Integration | Touch RFQ/CB FSM? |
|--------|-------------|-------------------|
| RFQ | None — parallel workspace | **No** |
| CommodityBid | None — parallel workspace | **No** |
| Order | Spawn on approval via `container-execution.spawn.ts` | **No** (side effect only) |
| FreightIQ | Existing Order attachment | **No** |
| Shipment | Existing Order spawn side effect | **No** |
| Trade Documents | Order-attached docs flow through | **No** |
| Control Tower | Additive alerts + metrics | **No** |
| Market Intelligence | Feed indicative ranges for catalog | **No** (read-only consumer) |

---

## 10. Security & anonymity model

| Surface | Supplier identity | Factory | Contact |
|---------|-------------------|---------|---------|
| Buyer catalog | Hidden | Hidden | Hidden |
| Buyer offer | Hidden (line prices only) | Hidden | Hidden |
| Buyer workspace | Hidden | Hidden | Hidden |
| Ops / Control Tower | Visible | Visible | Visible |
| Order workspace (post-approval) | Visible to participants | Via existing Order model | Via existing Order model |

RLS: Buyer queries never join `supplier_allocations`. Catalog API returns buyer-safe DTO only.

---

## 11. Readiness verdict

### Can Mixed Container become a first-class workspace without disrupting RFQ, CommodityBid, and FreightIQ?

**Yes — with high confidence**, subject to the constraints below.

#### Why yes

| Factor | Evidence |
|--------|----------|
| **Workspace spine is proven** | Shipment (Sprint 3C) and FreightIQ (Sprint 5A) added new capabilities without editing RFQ/CB/Order FSM files |
| **Spawn graph exists** | `spawned_from_id` supports MC → Order lineage; Order → Shipment already idempotent |
| **FreightIQ is Order-attached** | Mixed Container execution ends at Order spawn; FreightIQ eligibility unchanged |
| **Control Tower is additive** | Sprint 4A pattern: new alert keys + scan module, no core engine rewrite |
| **Distinct buyer intent** | No overlap with RFQ (named supplier) or CommodityBid (auction); navigation adds a third SOURCING entry |
| **Catalog is new domain** | No collision with `rfq_line_items` or `commodity_bid_lots` schemas |

#### Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Multi-supplier Order spawn complexity | Medium | One Order per `SupplierAllocation`; buyer dashboard aggregates; do not merge suppliers into single Order |
| Catalog + allocation data model is greenfield | Medium | Dedicated tables; no reuse of RFQ line item schema |
| Indicative pricing depends on sparse transaction history early on | Low | Fall back to admin-seeded ranges; label clearly as "indicative" |
| Buyer confusion vs RFQ | Medium | Navigation IA: "Mixed Container" under SOURCING with distinct icon/copy; Learning Center article |
| 72h offer expiry + optimization loop UX complexity | Medium | Wireframes (Sprint 12A) define revision diff UX before runtime |
| Supplier anonymity leak via Order workspace | High | Order spawn delayed until buyer approval; post-approval supplier visibility is **by design** (execution phase) |

#### Prerequisites before runtime (post-12A)

1. Catalog ingestion pipeline (admin + supplier onboarding)
2. Allocation rules engine (ops tooling)
3. `WorkspaceType.MIXED_CONTAINER` migration + FSM contracts
4. Buyer navigation update (`/buyer/mixed-container`)
5. Control Tower scan module registration
6. Learning Center content (MC vs RFQ vs CB decision tree)

#### Verdict summary

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Architectural fit | **Strong** | Follows established workspace + spawn + additive integration pattern |
| RFQ disruption risk | **None** | Parallel workspace; no shared FSM or tables |
| CommodityBid disruption risk | **None** | Parallel workspace; no auction overlap |
| FreightIQ disruption risk | **None** | Consumes existing Order attachment; no API changes |
| Shipment disruption risk | **None** | Unchanged spawn from Order |
| Implementation complexity | **High** | Catalog + allocation + multi-order spawn are new; execution handoff is reuse |
| Recommended path | **Proceed to 12B** | Implement catalog + builder first; pricing/allocation in 12C |

**Conclusion:** Mixed Container is architecturally ready to be a first-class workspace. The platform's workspace spine, spawn protocol, and additive Control Tower/FreightIQ patterns explicitly support a fourth sourcing workspace without modifying existing FSM contracts. The primary investment is **new domain logic** (catalog, allocation, pricing loop), not **platform restructuring**.
