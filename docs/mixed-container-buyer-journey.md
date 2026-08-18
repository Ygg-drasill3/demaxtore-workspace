# Mixed Container — Buyer Journey

**Sprint:** 12A — Mixed Container Architecture & Product Design  
**Date:** 2026-06-08  
**Status:** Design specification (no runtime implementation)

---

## 1. Journey overview

```
Discover Products
      ↓
Build Container
      ↓
Request Live Pricing
      ↓
Receive Live Offer
      ↓
Optimize Container  ←──┐
      ↓                 │
Reprice ────────────────┘
      ↓
Approve
      ↓
Execution
      ↓
FreightIQ
      ↓
Shipment
```

**Persona:** Buyer user at a SMB importer, distributor, or retail chain.  
**Entry point:** `/buyer/mixed-container` or "New Mixed Container" from Trade Command Center.

---

## 2. Stage-by-stage design

### Stage 1 — Discover Products

**Goal:** Browse anonymized food catalog; understand product, packaging, and market context without supplier exposure.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 1.1 | Opens Mixed Container home | Shows active containers + "Browse Catalog" CTA | — |
| 1.2 | Enters catalog | Paginated product cards with filters (category, origin region, certifications) | — |
| 1.3 | Views product card | Name, category, packaging, MOQ, pallet info, sample badge, market insights, recent txn range | — |
| 1.4 | Clicks "Add to Container" | Prompts pallet count (≥ MOQ); adds to active draft or creates new draft | `DRAFT` |

**Buyer sees:** Product quality signals, price **ranges** (indicative), no supplier names.  
**Buyer does not see:** Factory, contact, internal SKU-to-supplier mapping.

**Exit criteria:** ≥1 product added to a container draft.

---

### Stage 2 — Build Container

**Goal:** Plan pallet load in a dedicated workspace — not a cart.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 2.1 | Opens Container Builder | Fill meter, line table, container type selector, destination market | `DRAFT` |
| 2.2 | Sets container type | 20ft / 40ft / 40ft HC → updates max pallet capacity | `DRAFT` |
| 2.3 | Adjusts pallet counts | Fill meter updates; estimated value recalculates (indicative) | `DRAFT` |
| 2.4 | Adds/removes products | Product breakdown table updates; remaining capacity shown | `DRAFT` |
| 2.5 | Reviews summary | Sees: current pallets, remaining capacity, estimated value, product breakdown | `DRAFT` |
| 2.6 | Optionally requests samples | Parallel sample flow (does not block builder) | `DRAFT` |

**Key UX rule:** Under-fill is allowed. Fill meter is **advisory** ("You are using 18 of 24 pallet slots") — not a gate.

**Exit criteria:** Container type selected, destination set, ≥1 line with valid pallet counts.

---

### Stage 3 — Request Live Pricing

**Goal:** Submit container plan for internal supplier pricing.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 3.1 | Clicks "Request Live Pricing" | Validation: lines, container type, destination, currency | `DRAFT` |
| 3.2 | Confirms submission | Creates `ContainerPricingRequest`; locks line snapshot; sets SLA deadline | `PRICING_REQUESTED` |
| 3.3 | Waits | "What happens next" card: expected offer within SLA; no supplier activity strip | `PRICING_REQUESTED` |

**Buyer messaging:** "We're confirming availability and pricing with our supplier network. You'll receive a live offer within [SLA]."

**Internal (buyer-invisible):** Allocation engine selects suppliers per line; supplier RFQ packets sent.

**Exit criteria:** Pricing request recorded; buyer in waiting state.

---

### Stage 4 — Receive Live Offer

**Goal:** Review itemized live pricing with 72-hour validity.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 4.1 | Notified of offer | Push + email: "Your container offer is ready" | `OFFER_PENDING` |
| 4.2 | Opens Pricing Review | Itemized lines, unit prices, line totals, container total, validity countdown | `OFFER_PENDING` |
| 4.3 | Compares to indicative | Show delta vs indicative mid at build time (optional insight) | `OFFER_PENDING` |
| 4.4 | Decides | Accept, Optimize, or let expire | `OFFER_PENDING` |

**Offer contents:**
- Per-line unit price and total (no supplier name)
- Container subtotal
- Optional freight estimate (not binding — FreightIQ follows)
- Valid until timestamp (72h from publication)

**Exit criteria:** Buyer chooses accept, optimize, or offer expires.

---

### Stage 5 — Optimize Container

**Goal:** Revise pallet mix before committing — trigger repricing.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 5.1 | Clicks "Optimize Container" | Opens revision mode with current offer as baseline | `REVISION_DRAFT` |
| 5.2 | Modifies lines | Add SKU, remove SKU, change pallet counts, swap container type | `REVISION_DRAFT` |
| 5.3 | Reviews impact preview | Shows pallet delta, estimated value change (indicative until repriced) | `REVISION_DRAFT` |
| 5.4 | Submits revision | Creates `ContainerRevision`; triggers repricing | `REPRICING_REQUESTED` |

**Loop:** Stage 5 → Stage 3 (repricing) → Stage 4 (new offer). Prior offer marked superseded.

**Exit criteria:** Buyer satisfied with offer OR abandons revision.

---

### Stage 6 — Reprice

**Goal:** Obtain updated live offer reflecting revision.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 6.1 | Waits (same as 3.3) | New `ContainerPricingRequest` linked to revision | `REPRICING_REQUESTED` |
| 6.2 | Receives new offer | New `ContainerOffer` version; diff highlights vs prior offer | `OFFER_PENDING` |

**Buyer messaging:** "Your revised container has been repriced. Review your updated offer."

**Exit criteria:** New offer published; buyer returns to Stage 4 decision.

---

### Stage 7 — Approve

**Goal:** Accept live offer within validity window.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 7.1 | Clicks "Approve Container" | Confirms total, currency, incoterm | `OFFER_PENDING` |
| 7.2 | Confirms | Offer status → ACCEPTED; workspace → APPROVED | `APPROVED` |
| 7.3 | Sees confirmation | Timeline event; execution begins automatically | `APPROVED` → `EXECUTION_IN_PROGRESS` |

**Gate:** Approval blocked if `now() > validUntil`.

**Exit criteria:** Offer accepted; execution triggered.

---

### Stage 8 — Execution

**Goal:** Convert approved container into Order workspaces (one per supplier allocation).

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 8.1 | Views Container Dashboard | Progress: allocations confirmed, orders spawning | `EXECUTION_IN_PROGRESS` |
| 8.2 | Orders appear | Links to individual Order workspaces (supplier now visible per Order) | `EXECUTION_ACTIVE` |
| 8.3 | Tracks order status | Reuses existing Order workspace UI and states | `EXECUTION_ACTIVE` |
| 8.4 | All orders complete | Container workspace → COMPLETED | `COMPLETED` |

**Buyer messaging at execution:** "Your container is being fulfilled. Track individual orders below."

**Transparency shift:** Supplier identity becomes visible **at Order level** — this is intentional and should be communicated in Learning Center.

**Exit criteria:** All spawned orders reach terminal states.

---

### Stage 9 — FreightIQ

**Goal:** Coordinate freight for fulfilled orders — unchanged platform behaviour.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 9.1 | Order reaches eligible state | `PRODUCTION_COMPLETED`, `INSPECTION_COMPLETED`, or `FREIGHT_REQUESTED` | Order workspace |
| 9.2 | Creates freight request | Existing FreightIQ tab on Order workspace | Order workspace |
| 9.3 | Reviews offers | Comparison view (lowest price, fastest transit) | Order workspace |
| 9.4 | Selects offer | Freight selection recorded | Order workspace |

**No Mixed Container-specific freight logic.** Multi-order containers may have separate freight requests per order (buyer coordinates consolidation externally if needed — future enhancement).

**Exit criteria:** Freight selected per order (or buyer defers).

---

### Stage 10 — Shipment

**Goal:** Port-to-port tracking — unchanged platform behaviour.

| Step | Buyer action | System behaviour | Workspace state |
|------|--------------|------------------|-----------------|
| 10.1 | Order enters `FREIGHT_REQUESTED` | Shipment workspace spawns (existing side effect) | Shipment workspace |
| 10.2 | Tracks shipment | Existing Shipment workspace UI | Shipment workspace |
| 10.3 | Delivery complete | Shipment → COMPLETED; Order progresses | Shipment + Order |

**Container Dashboard** aggregates shipment status across spawned orders for convenience.

**Exit criteria:** All shipments delivered (or exceptions resolved).

---

## 3. Parallel journey — Sample management

Can occur at any point from Stage 1 onward.

```
Request Sample → Sample Status → Courier Tracking → Sample Approval
     │                │                  │                  │
  Catalog/        REQUESTED →       SHIPPED →           APPROVED /
  Builder           APPROVED         DELIVERED           REJECTED
```

| Stage | Buyer experience |
|-------|------------------|
| Request | Form from product card or builder line |
| Status | Timeline: requested → approved → shipped |
| Tracking | Carrier + tracking number when available |
| Approval | Buyer marks sample pass/fail; may influence future catalog eligibility |

Samples are **orthogonal** to container pricing — requesting a sample does not auto-add to container.

---

## 4. Waiting states & buyer copy

| State | Primary message | CTA |
|-------|-----------------|-----|
| `DRAFT` | "Build your container — add products by pallet." | Request Live Pricing |
| `PRICING_REQUESTED` | "We're securing live pricing. Expect your offer within [SLA]." | View container plan |
| `OFFER_PENDING` | "Your live offer is ready. Valid for [countdown]." | Approve / Optimize |
| `REPRICING_REQUESTED` | "Your revision is being repriced." | View revision diff |
| `OFFER_EXPIRED` | "Your offer expired. Request new pricing to continue." | Request Live Pricing |
| `EXECUTION_IN_PROGRESS` | "Your container is being fulfilled." | View orders |
| `EXECUTION_ACTIVE` | "Track your orders and shipments below." | Open Order / Shipment |

All copy uses **buyer language**, not FSM state names.

---

## 5. Decision points & branches

```
                    ┌─ Accept ──► Approve ──► Execution
Offer Pending ──────┤
                    ├─ Optimize ──► Reprice loop ──► Offer Pending
                    └─ Expire ──► Offer Expired ──► Re-request pricing

Draft ──► Abandon ──► Cancelled (buyer-initiated, pre-pricing only)
```

| Decision | Precondition | Outcome |
|----------|--------------|---------|
| Accept offer | `OFFER_PENDING`, within validity | → APPROVED |
| Optimize | `OFFER_PENDING`, within validity | → REVISION_DRAFT |
| Let expire | `validUntil` passed | → OFFER_EXPIRED |
| Cancel container | `DRAFT` or `OFFER_EXPIRED` | → CANCELLED |
| Re-request pricing | `OFFER_EXPIRED` | → PRICING_REQUESTED |

---

## 6. Notifications (proposed)

| Event | Channel | Recipient |
|-------|---------|-----------|
| Offer published | In-app + email | Buyer OWNER |
| Offer expiring (T-24h) | In-app + email | Buyer OWNER |
| Offer expired | In-app | Buyer OWNER |
| Revision repriced | In-app + email | Buyer OWNER |
| Order spawned | In-app | Buyer OWNER |
| Sample shipped | In-app | Buyer requester |

---

## 7. Journey vs existing workspaces

| Aspect | RFQ | CommodityBid | Mixed Container |
|--------|-----|--------------|-----------------|
| Entry | Spec upload / form | Lot definition | Catalog browse |
| Supplier visibility | Named | Named (bidders) | Hidden until Order |
| Pricing model | Quotation per supplier | Auction bids | Consolidated live offer |
| Planning unit | Line item qty | Lot | Pallet |
| Optimization | Clarifications | Re-bid | Revision + repricing loop |
| Execution | Single supplier PO | Per-lot awards | Multi-supplier Orders |

---

## 8. Success criteria per stage

| Stage | Metric |
|-------|--------|
| Discover | Catalog → add rate |
| Build | Draft → pricing request rate |
| Pricing | SLA compliance (offer within deadline) |
| Offer | Accept vs optimize ratio |
| Approve | Accept within validity rate |
| Execution | Time to all orders spawned |
| FreightIQ | Attach rate within 7d of eligibility |
| Shipment | On-time delivery rate |
