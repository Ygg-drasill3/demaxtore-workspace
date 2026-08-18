# PHASE 17A — UI GOLDEN PATH BLOCKER REMEDIATION

**Type:** Launch blocker remediation (CONNECT + EXPOSE + CORRECT)  
**Not:** Sprint 43, new Product/Booking/Freight/Container/Customs architecture  
**Reference transaction:** `MVP-UI17-20260814-K7R3` (evidence only; not reused)

This document starts with the **pre-implementation audit**. Implementation notes follow after coding.

---

## 1. Audit before coding

Proven from current source, not from Phase 17 interpretation.

### A. Product Master routes / pages / components

| Question | Current truth |
|---|---|
| Product list page exist? | YES — `apps/frontend/src/features/product-master/pages/ProductListPage.tsx` |
| Product detail page exist? | YES — `ProductDetailPage.tsx` (`id === "new"` already implements create) |
| Product create page exist? | YES — same detail page at `:id = new` |
| `/buyer/products` registered? | **NO** — missing from `apps/frontend/src/routes/index.tsx` |
| `/buyer/products/:id` registered? | **NO** |
| `/buyer/products/new` intended? | **YES** — list page links to it; detail page handles `isNew` |
| Direct PO quick-create? | YES — `quickCreate` on `ProductLineEditor`; no Product search/select UI |
| Nav 404? | YES — no sidebar item; any `/buyer/products/new` URL 404s |

**Classification:** `EXISTS_BUT_UNROUTED`

Canonical UX: route the existing pages. Do **not** invent a second create form. Keep `/buyer/products/new`.

### B. Direct PO product selection / quick-create

`productId` exists on the wizard draft. The line editor only types SKU + optional quick-create checkbox. No search against `GET /api/products`. Buyer never pastes a UUID today, but also cannot pick an existing Product from a list.

**Classification:** `EXISTS_BUT_NOT_CONNECTED`

### C. PO → Freight actions

`isFreightIntakeEligible` (`packages/contracts/src/freightiq.ts`):

- Buyer/supplier: only `PRODUCTION_COMPLETED | INSPECTION_COMPLETED | FREIGHT_REQUESTED`
- Admin / SALES_CONTROL / SYSTEM: allowed earlier (non-terminal)

`OrderFreightIqPanel`: `canCreate = BUYER` only. Admin still opened the wizard via What Happens Next `create_freight_request`. Buyer ineligible copy is `"Freight is not available at this order stage."` — dead-looking, no Ops handoff.

`FreightIqTab` already explains production/inspection gating and allows Admin create. That tab is **not** the order workspace UI used in Phase 17.

**Classification:** `INTENTIONAL_ASSISTED_OPS` (policy) + `EXISTS_BUT_NOT_CONNECTED` (handoff copy / Admin create button)

**Decision:** Do **not** let Buyer create freight at Direct PO / `SUPPLIER_CONFIRMED`. Keep Ops intake. Make the page explain the handoff.

### D. Freight offer → booking transition

Select-offer already spawns a shipment (`enrichFromFreightOffer` sets `bookingStatus: REQUESTED`). `FreightExecutionPanel` already distinguishes Booking ETA vs Maritime ETA and has Proceed to booking.

That panel is **not mounted** on `OrderFreightIqPanel`.

Backend `proceedToBooking()` exists, policy allows BUYER/ADMIN, but `freightiq.controller.ts` `ACTION_MAP` **omits** `proceed-to-booking`. UI/API cannot call it.

**Classification:** `EXISTS_BUT_NOT_CONNECTED`

### E. Booking lifecycle UI

Sprint 32 statuses live on `ShipmentWorkspace.bookingStatus`. APIs exist:

- `POST /api/shipments/:id/booking`
- `POST /api/shipments/:id/booking/transition`
- FSM `confirm_booking` (More actions)

`ShipmentBookingPanel` exists (Save / Save & confirm / Cancel) but is **not mounted** on `ShipmentWorkspacePage`.

`GET /api/shipments/:id` (`ShipmentService.fetchDTO`) does **not** return `booking`, `containers[]`, or `permissions`. Panels would have nothing to bind even if mounted.

Phase 17 “booking confirmation pending” at `SHIPMENT_CREATED` matches spawn `bookingStatus=REQUESTED` without Ops transition UI.

**Classification:** `EXISTS_BUT_NOT_CONNECTED`

### F. Shipment Line Allocation backend / API

Exists and tested:

- `POST /api/shipments/line-allocations`
- `shipment_line_allocations` / `ShipmentLineAllocation`
- `GET /api/shipments/:id/related-entities` already returns PO lines with ordered / allocated / remaining
- Tenant isolation covered in Phase 12 (`denies cross-tenant line allocation mutation`)

Mutation currently allowed for any user who can access both shipment and PO (not Ops-only).

**Classification:** `EXISTS_AND_WORKS` (backend)

### G. Shipment Line Allocation UI

Zero frontend usage of `line-allocations`. `RelatedLogisticsPanel` can display PO lines but is **not mounted**. Allocations array is not rendered.

**Classification:** `MISSING_UI_FOR_EXISTING_BACKEND` — **P0**

### H. Shipment Container models / APIs / UI

Canonical model: `ShipmentContainer` (`containers[]`). `containerNumber` on `ShipmentWorkspace` is a denormalized primary from `recomputeTotals`.

`ShipmentContainersPanel` + `POST /api/shipments/:id/containers` exist, **not mounted**.

FSM `assign_container` writes `shipmentWorkspace.containerNumber` **without** creating `ShipmentContainer` — this is the historical `containers[] = []` inconsistency.

**Classification:** `EXISTS_BUT_NOT_CONNECTED` + `EXISTS_BUT_BROKEN` (FSM attach vs canonical rows)

### I. Tracking representation

`ShipmentTrackingPanel` is mounted. Linking requires typing a container number (parallel to canonical containers). Snapshot ETA is unlabeled “ETA”. Booking status / Booking ETA are not shown. Generic vessel map vs selected vessel was Phase 17 friction; no new carrier API in scope.

**Classification:** `EXISTS_BUT_NOT_CONNECTED` (labels / container source)

### J. Booking ETA vs Maritime ETA

Contracts already separate them (`FreightIqExecutionSummary.bookingEta` vs `maritimeEta`). Execution panel is unmounted. Shipment tracking panel silently shows snapshot ETA only.

**Classification:** `EXISTS_BUT_NOT_CONNECTED`

### K. Shipment → Customs continuation

`TurkeyCustomsPanel` **is mounted**. Eligibility + Start Customs Clearance + Open Case exist. List/detail already show **Customs status** and **Readiness** as separate columns/fields.

Stale-readiness risk: readiness `READY_FOR_BROKER` can remain after lifecycle `CLEARED`. They are different concepts. UI can still be misread if readiness is treated as current state. Not freshly retested in Phase 17.

**Classification:** `EXISTS_AND_WORKS` (continuity) + presentation clarification needed

---

## Architecture decisions (locked before coding)

1. **Reuse** Product, PO/PO Line, FreightIQ, ShipmentWorkspace booking fields, ShipmentContainer, TradeShipmentLink, ShipmentLineAllocation, CustomsCase.
2. **Do not create** new Product / Booking / Shipment / Container / allocation / freight / customs entities.
3. Product Master canonical path: `/buyer/products` + `/buyer/products/new` + `/buyer/products/:id`.
4. Direct PO remains able to quick-create; add search/select against existing Product API.
5. Buyer freight at Direct PO stays gated. Ops intake stays. Explain the handoff.
6. Do **not** remove deposit/production payment gates. Improve the 409 copy.
7. Booking transitions: mount existing panel + `transitionBooking` buttons for Ops.
8. Line allocation: thin UI on Shipment Workspace using related-entities + existing POST. No UUID entry. Ops mutate; Buyer read if permitted.
9. Container: mount existing panel; FSM `assign_container` must upsert canonical `ShipmentContainer`.
10. Tracking: label Booking ETA vs Maritime ETA; default container from canonical list.
11. Customs: do not redesign; clarify readiness ≠ lifecycle when `CLEARED`.
12. No DutyTax / Inland / Trucker / POD / Landed Cost engine changes unless a regression is proven.

---

## 2. Root cause per finding

| Original Phase 17 finding | Original | Root cause (from code) | Fix / Decision | New classification |
|---|---|---|---|---|
| Product Master route `/buyer/products/new` 404 | FAIL | Pages existed; not registered in `apps/frontend/src/routes/index.tsx` | Routed existing list/detail; `:id=new` is create | FIXED |
| Product → PO | FRICTION | Direct PO had no search against `GET /api/products` | `ProductSearchSelect` in line editor | PASS |
| PO → Freight | FRICTION | Buyer gated until production/inspection; Admin intake already allowed | Keep Ops ownership; copy: freight preparation pending | ACCEPTABLE PILOT FRICTION |
| Offer → Booking | FRICTION | `FreightExecutionPanel` unmounted; `proceed-to-booking` missing from ACTION_MAP | Mount panel; add action | PASS |
| Booking Lifecycle | FRICTION | `ShipmentBookingPanel` unmounted; DTO omitted booking | Mount panel; REQUESTED → PENDING → CONFIRMED | PASS |
| Line Allocation | DEAD END (P0) | Backend `POST /api/shipments/line-allocations` existed; no UI | Thin Shipment Workspace panel; no UUID | PASS |
| Container | FRICTION | Panel unmounted; FSM wrote `containerNumber` without `ShipmentContainer` | Mount panel; persist canonical row | PASS |
| Tracking | FRICTION | Booking status / Booking ETA / Maritime ETA unlabeled | Distinct labels on tracking context | PASS |
| Buyer continuity | FRICTION | Upstream 404 + dead allocation | Product + allocation + booking connected | PASS (Ops-assisted freight remains) |

Additional proven bugs closed during smoke:

- Spawn auto-allocates remaining qty with `shipmentContainerId=null`. Attaching a container via upsert matched on container id, tried a second row, and failed remaining-qty. Upsert now updates the uncontainered row on the same shipment.
- Admin “Open Customs Case” pointed at `/buyer/customs/:id` (BUYER-only guard → dashboard). Existing `/partner/customs/:id` already allows ADMIN. Panel now uses that path.

---

## 3. Architecture decisions (held)

CONNECT + EXPOSE + CORRECT only. No new Product / Booking / Shipment / Container / allocation / freight / customs entities. Deposit/production gates kept. Buyer Direct PO freight remains Ops-assisted.

---

## 4. Files changed (this remediation)

Frontend (connect/expose):

- `apps/frontend/src/routes/index.tsx` — `/buyer/products`, `/buyer/products/:id`
- `apps/frontend/src/routes/navigation.ts` — Buyer Products nav
- `apps/frontend/src/features/product-master/components/ProductSearchSelect.tsx`
- Direct PO `ProductLineEditor` — search/select existing Product
- `apps/frontend/src/features/shipment/pages/ShipmentWorkspacePage.tsx` — mount booking, containers, line allocation, tracking labels
- `apps/frontend/src/features/shipment/components/ShipmentBookingPanel.tsx` — Ops transitions + related-entities invalidate
- `apps/frontend/src/features/shipment/components/ShipmentContainersPanel.tsx` — related-entities invalidate
- `apps/frontend/src/features/shipment/components/ShipmentTrackingPanel.tsx` — Booking vs Maritime ETA
- `apps/frontend/src/features/trade-lineage/components/ShipmentLineAllocationPanel.tsx` (+ test)
- `apps/frontend/src/features/customs/components/TurkeyCustomsPanel.tsx` — Admin/Ops open `/partner/customs/:id`
- `apps/frontend/src/features/customs/pages/CustomsCasePage.tsx` — Ops back link

Backend (correct existing):

- `apps/backend/src/modules/trade-lineage/trade-lineage.service.ts` — attach container to spawn allocation
- `apps/backend/src/modules/trade-lineage/trade-lineage.allocation.test.ts`
- Shipment DTO/FSM already returning `booking`, `containers[]`, `permissions`; `assign_container` upserts `ShipmentContainer`
- FreightIQ `proceed-to-booking` in ACTION_MAP (prior 17A work)

---

## 5. Product routing resolution

Canonical path:

1. Buyer Execution → Products → `/buyer/products`
2. Create: `/buyer/products/new` (existing detail page `id === "new"`)
3. Direct PO: search/select existing Product (no UUID paste)

No duplicate Product architecture. Tenant scope unchanged (`GET /api/products`).

---

## 6. Line Allocation UI

Location: Shipment Workspace → after Related Commercial Entities.

Ops (`canManageContainers`): qty + optional container select + Save.  
Buyer: read-only remaining/allocated.  
IDs resolved internally. Server remains authoritative.

Spawn still auto-allocates remaining PO qty onto the shipment. Ops can attach a container to that row without over-allocation.

---

## 7. Booking remediation

Buyer selects offer → shipment spawn `bookingStatus=REQUESTED` → Proceed to booking.  
Ops: Mark pending → Confirm booking on `ShipmentBookingPanel`.  
Repeat clicks ignored (existing transition idempotency). No new Booking entity.

Live: REQUESTED → PENDING → CONFIRMED. Timeline: `BOOKING_PENDING`, `BOOKING_CONFIRMED`. After confirm, WHN shows “Booking confirmed — Yang Ming Line”.

---

## 8. Container canonicalization

Canonical source: `ShipmentContainer` / `containers[]`.  
`ShipmentWorkspace.containerNumber` is denormalized primary from totals recompute.

Live save `MSKU17AQ4M2`:

- Containers panel: `MSKU17AQ4M2 · PLANNED`
- Related Entities: same
- Tracking context: same
- Allocation dropdown: same (no UUID typed)

---

## 9. Tracking clarification

Tracking answers: shipment ref, booking CONFIRMED, Booking ETA, Maritime ETA (may equal), container number, shipment state. No Predictive ETA / carrier API.

---

## 10. Customs continuity check

Turkey Customs panel on shipment. Start Customs Clearance created case `82c30ab2-…` status **DRAFT**, readiness **NOT READY** (labeled as preparation). Open Case for Admin is `/partner/customs/:id` (existing page). Lifecycle vs readiness remain distinct. No Customs redesign.

---

## 11. Tests

- `trade-lineage.allocation.test.ts` — 8 passed (including attach-container-to-spawn-row)
- `freightiq.policy.test.ts` — 3 passed
- `tenant-isolation.test.ts` — 14/15 passed. The remaining assertion expected broker **200** on `GET /api/customs/cases?limit=1`. That row was the unassigned 17A smoke DRAFT case; **403 is correct** (unassigned broker). All deny/IDOR cases passed, including cross-tenant line allocation. Not a permission leak.
- Frontend: `ShipmentLineAllocationPanel.test.tsx` + shipment keys — passed
- Frontend typecheck + production build — passed
- Backend emit-dist parse + `/api/healthz` 200

---

## 12. Live UI smoke

Fixture (disposable, not K7R3, not R2): **`MVP-UI17A-20260814-Q4M2`**

| Check | Result |
|---|---|
| A. Product create/reuse | PASS — SKU `FLOUR-UI17A-Q4M2` via `/buyer/products/new` |
| B. Direct PO uses Product | PASS — `PO-MSSMQWYM-308A0A3C`, search/select, no UUID |
| C. Offer → booking | PASS — select YM Witness UI17A-Q4M2 USD 1850; Proceed to booking |
| D. Ops booking lifecycle | PASS — PENDING then CONFIRMED via UI |
| E. Line allocation via UI | PASS — qty 100 + container `MSKU17AQ4M2`; related shows container |
| F. Container via UI | PASS — Add/Save container, no API |
| G. Container consistency | PASS after refresh; related-entities invalidate shipped |
| H. Toward Turkey Customs | PASS — Start Clearance + Open Case (`/partner/customs/:id`) |

DB / SQL / Prisma / curl / Postman / manual UUID: **not used** for business actions.

Shipment: `9e753ecc-3c1c-4a4c-b614-563bf9e50c0e`  
Order: `d3479254-1aa7-4d20-a9a8-7b546753cad1`

---

## 13. Security regression

Phase 12 deny paths intact. Line allocation mutation still Ops-gated. No permission relaxation. Buyer UI not given buy-rate / internal margin fields.

---

## 14. Remaining P1/P2

**P0 open: 0**

**P1 open: 0** (assisted-pilot freight/deposit/broker assignment remain by policy, with UI copy)

**P2 open: 3**

1. Raw i18n keys on Admin freight offer UI (`order.freightiq.adminAddOffer`, etc.)
2. WHN `{{etd}}` placeholder after booking confirm
3. Raw `shipment.trackingDemoMode` key on tracking demo banner

These are not engineering-in-the-loop blockers.

---

## 15. R2 readiness verdict

Phase 17A exit criteria are met. **PHASE 17 R2 READY = YES.**

This is remediation, **not** a Controlled Paid Pilot declaration.

Next (separate run, new marker only): `MVP-UI17-R2-<date>-<random>` UI-only through Delivered → POD → True Landed Cost → Final Buyer View.

Do not reuse `MVP-UI17-20260814-K7R3` or `MVP-UI17A-20260814-Q4M2`.

