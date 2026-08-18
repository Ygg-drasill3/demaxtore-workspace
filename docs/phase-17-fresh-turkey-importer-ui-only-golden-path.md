# PHASE 17 — FRESH TURKEY IMPORTER UI-ONLY GOLDEN PATH

**Executed:** 2026-08-14 (UTC)  
**Environment:** recovered and proven stable before Golden Path start  
**Method:** supported UI only (browser automation). No curl/REST mutation, Prisma, SQL, DB edits, or hidden endpoints used to advance business state.

This run does **not** treat prior API Golden Path evidence as Phase 17 evidence.

---

## Required summary

PHASE 17 — FRESH TURKEY IMPORTER UI-ONLY GOLDEN PATH

Fresh Transaction:
FAIL

Product → PO:
FRICTION

PO → Freight:
FRICTION

Freight Request → Offer:
PASS

Offer → Booking:
FRICTION

Booking Lifecycle:
FRICTION

Booking → Shipment:
PASS

Line Allocation:
DEAD END

Container:
FRICTION

Tracking:
FRICTION

Shipment → Customs:
FAIL

Broker Assignment:
FAIL

Broker Execution:
FAIL

Duty & Tax:
FAIL

Customs CLEARED:
FAIL

CLEARED → Inland:
FAIL

Trucker Assignment:
FAIL

Trucker Execution:
FAIL

POD:
FAIL

True Landed Cost:
FAIL

Final Buyer View:
FRICTION

Same-Transaction Lineage:
PARTIAL

DB Intervention:
NO

Direct API Intervention:
NO

Manual UUID Intervention:
NO

Unexpected 5xx:
0

P0 Open:
1

P1 Open:
6

P2 Open:
3

CONTROLLED PAID PILOT VERDICT:

NOT READY FOR CONTROLLED PAID PILOT

SELF-SERVICE VERDICT:

NOT READY FOR SELF-SERVICE

FAIL on Shipment → Customs through True Landed Cost means those Golden Path steps were **not completed on this fresh transaction** (path stopped at Line Allocation DEAD END and incomplete booking). It does **not** mean those screens were proven broken. Customs / inland buttons were visible on the shipment page and were not executed.

---

## 1. Environment recovery (Step 1)

| Check | Result |
|---|---|
| Shell | PASS |
| Repository readable | PASS (`/var/www/demaxtore/DemaxtoreSolitions-main`) |
| Backend `127.0.0.1:3001` | PASS (`/api/healthz` 200) |
| UI `https://workspace.demaxtore.com/login` | PASS (200, login page renders) |
| Public API `https://workspace.demaxtore.com/api/healthz` | PASS (200) |
| Playwright / browser MCP | PASS (`cursor-ide-browser`) |
| Chromium | PASS (installed; session stable) |
| Screenshots | PASS |
| Login page loads | PASS |

Browser smoke: login page rendered; buyer login succeeded; Control Tower loaded as **Buyer One Acme**. Golden Path started only after that.

No environment blocker. `docs/phase-17-environment-blocker.md` was **not** required.

---

## 2. Fresh transaction references

**Marker:** `MVP-UI17-20260814-K7R3`  
(Run date is 14 Aug 2026; instruction example used `20260813`.)

| Field | Value |
|---|---|
| SKU | `FLOUR-UI17-K7R3` |
| Description | `MVP-UI17-20260814-K7R3 Timeline Flour` |
| Qty / price | 100 piece @ 12.50 USD = 1,250.00 USD |
| Packaging | 25kg bags |
| Supplier | Acme Manufacturing / Supplier One Mfg (`supplier1@acme-mfg.test`) |
| Incoterm | FOB |
| Payment | T/T 30 days |
| Destination | Turkey · Istanbul |
| Buyer reference | `MVP-UI17-20260814-K7R3` |
| PO number | `PO-MSSJM8C2-9FBC9AFE` |
| PO UUID | `32053d08-2046-43bb-9ec0-b33035450296` |
| Order ref | `ORD-DIR-PO-MSSJM8C2-9FBC9AFE-9FBC9AFE` |
| Order UUID | `e8f9a4c1-bcde-4ffb-881d-d8b9b84f5e16` |
| Freight cargo | `MVP-UI17-20260814-K7R3 Timeline Flour 100 bags FOB CNSHA-Istanbul` |
| Container type (RFQ) | `40HC` |
| Cargo ready date | `2026-09-13` |
| Freight offer | Yang Ming Line / DeMaxtore Freight Desk / `YM Witness UI17-K7R3` / **1850 USD** / 26 days |
| Offer UUID | `d446f805-a63c-4d55-9007-fb458ab9f8f9` |
| Offer remarks | `MVP-UI17-20260814-K7R3 freight offer 1` |
| ETD / ETA / cut-off / valid until | 2026-08-28 / 2026-09-23 / 2026-08-26 / 2026-09-04 |
| Shipment ref | `SHP-ORD-DIR-PO-MSSJM8C2-9FBC9AFE-9FBC9AFE` |
| Shipment UUID | `2c9f6f5a-196b-428b-a415-85bc1490528c` |

All IDs above belong to this fresh transaction. No unrelated fixture IDs were mixed in.

---

## 3. Stage evidence

### BUYER LOGIN — PASS

- **Role:** Buyer (`buyer1@acme.test`)
- **Route:** `/login` → `/buyer/control-tower`
- **Expected:** Buyer can sign in and reach Control Tower
- **Actual:** Signed in as Buyer One Acme
- **Screenshot:** `docs/phase-17-evidence/00-buyer-login-control-tower.png`

### PRODUCT (standalone Product Master) — DEAD END

- **Role:** Buyer
- **Route:** `/buyer/products/new`
- **Expected:** Buyer can create a product master record
- **Actual:** **Page not found.** `ProductListPage` / `ProductDetailPage` exist in frontend source but are **not registered** in `apps/frontend/src/routes/index.tsx`. Products is **not** in buyer sidebar.
- **UI exists?** NO (unrouted)
- **Screenshot:** `docs/phase-17-evidence/01-product-master-404.png`

Product identity **can** be created inside Direct PO via “Quick-create from code”. That is a workaround, not a Product Master UI.

### DIRECT PO / Product → PO — FRICTION (PASS with friction)

- **Role:** Buyer
- **Route:** `/buyer/purchase-orders/create`
- **Expected:** Buyer creates a unique PO with unique SKU
- **Actual:** PO `PO-MSSJM8C2-9FBC9AFE` created, status SUBMITTED, order `ORDER CREATED` then supplier-confirmed later
- **Friction:** Mixed TR/EN labels (`Kaynak: Yüklenen belge`, `Yüklenen PO`) while EN is selected
- **Screenshots:** `02-direct-po-products.png`, `03-direct-po-review.png`, `04-po-created.png`

### PO → FREIGHT (buyer at ORDER_CREATED / SUPPLIER_CONFIRMED) — FRICTION

- **Role:** Buyer, then Supplier, then Admin
- **Route:** `/workspace/order/e8f9a4c1-bcde-4ffb-881d-d8b9b84f5e16`
- **Expected:** Buyer can move PO → freight on a Direct PO
- **Actual (Buyer):** Freight panel: “Order not yet ready for freight” / “Freight is not available at this order stage.” Create freight CTA absent for Buyer at `ORDER_CREATED` / `SUPPLIER_CONFIRMED`.
- **Exact reason (retested in UI, not assumed from old API 403):** FreightIQ create button is gated to `PRODUCTION_COMPLETED | INSPECTION_COMPLETED | FREIGHT_REQUESTED` for Buyer. Admin intake is allowed at any non-terminal order state.
- **Actual (Admin):** Admin sees “Create freight quote” on the same order and can open the wizard at `SUPPLIER_CONFIRMED`.
- **Screenshot:** `05-order-freight-blocked.png`

**Classification of operating model:** Ops-mediated freight intake is a **supported Admin UI**, not a hidden API. Buyer self-service at Direct-PO stage is **not** supported. That is a product gap for self-service and acceptable-with-docs only if Ops always creates the RFQ.

### Deposit gate / Start Production — FRICTION (and 409)

- **Role:** Supplier then Admin
- **Route:** same order workspace
- **Expected:** Supplier can Start Production after confirm
- **Actual:** Supplier Confirm succeeded (`SUPPLIER_CONFIRMED`). Start Production UI exists. POST `/api/orders/{id}/actions/start-production` returned **409**. Payment panel shows `DEPOSIT PAID PENDING`. Online collection disabled. Supplier has **no** “Record paid” button.
- **Toast:** 409 was not durably visible in UI (modal stayed open).
- **Admin handoff:** Admin has “Record paid” on DEPOSIT / BALANCE. Admin recorded DEPOSIT → `DEPOSIT PAID SATISFIED` (timeline `09:16 payment milestone satisfied`).
- **Screenshots:** `06-start-production-409-deposit-gate.png`, `07-payment-deposit-pending-supplier.png`, `08-admin-deposit-recorded.png`

This is a realistic Ops workaround (staff records T/T deposit). It is **not** buyer self-service. It also means the Golden Path cannot complete production as Supplier until Ops records deposit.

Production / inspection were **not** completed in this run. Freight was created by Admin instead (allowed by Admin eligibility).

### FREIGHT REQUEST — FRICTION (Buyer cannot initiate; Admin UI handoff exists)

| Question | Answer |
|---|---|
| Can Buyer initiate at Direct PO / SUPPLIER_CONFIRMED? | **NO** |
| Does Admin/Ops have supported UI handoff? | **YES** — order workspace “Create freight quote” wizard, plus `/operations/freight-intake` and `/admin/freight-ops` |
| Intentional operating model or product gap? | **Both:** Admin intake is intentional (`isFreightIntakeEligible` allows ADMIN at any non-terminal state). Buyer cannot start freight until production/inspection. For a Turkey importer golden path that starts at Direct PO, this is a **self-service gap**. |

Admin created request via UI:

- POL `CNSHA` → POD `Istanbul`, Ocean FCL, 40HC
- Unique cargo marker recorded
- Timeline: `09:17 Freight quote requested`
- Screenshot: `09-freight-request-created.png` / offer form evidence

**No API was used to create the request.**

### FREIGHT REQUEST → OFFER — PASS

- **Role:** Admin
- **Route:** same order freight panel
- **Expected:** Ops can publish a forwarder offer in UI
- **Actual:** Admin offer form exists. Required fields (carrier, forwarder, vessel, price) must be typed (placeholders do not count). Publish succeeded.
- **Visible reference:** `$1.850 · YM Witness UI17-K7R3`
- **Friction:** Missing i18n keys rendered as `order.freightiq.adminAddOffer` / `order.freightiq.adminPublishOffer` / `freightiq.intake.pickForwarder`
- **Timeline:** `09:18 Offer submitted`

### OFFER SELECTION — PASS (Buyer) / FRICTION (handoff)

- **Role:** Admin cannot select. `canSelect` is **BUYER-only** in `OrderFreightIqPanel`. Admin DOM had **no** “Select vessel” button.
- **How Buyer discovers work:** Must return to the **same order workspace**. No task queue, WhatsApp, or email was required in this test because the tester already had the order URL. In a real pilot, Ops would need to tell the buyer the order is ready (link/UUID) unless the buyer already has the order open. Classify: **ACCEPTABLE PILOT OPS** if Ops sends the order link; **not** a product dead end because the select CTA exists for Buyer.
- **Role:** Buyer
- **Actual:** “Select vessel” visible. Confirm modal: “This will notify the forwarder and lock in the sailing.” Confirmed.
- **Actual after confirm:** Freight linked to shipment workspace. Carrier Yang Ming Line. Shipment `SHP-ORD-DIR-PO-MSSJM8C2-9FBC9AFE-9FBC9AFE`.
- **Screenshot:** `10-buyer-offer-selected-shipment.png`

### OFFER → BOOKING / BOOKING LIFECYCLE — FRICTION

- **Role:** Buyer
- **Route:** `/workspace/shipment/2c9f6f5a-196b-428b-a415-85bc1490528c`
- **Expected:** Selection converts to a booked shipment with confirmed booking
- **Actual:** Shipment **was created** (`shipment.created · 14/08/2026, 09:23:35`). Banner: “Booked via FreightIQ”. Status remains **`SHIPMENT_CREATED`**. “What happens next”: **“Booking confirmation pending — carrier details will appear here.”** No buyer CTA to confirm booking was found in the primary card (only “More actions (4)”).
- **Screenshot:** `11-shipment-created-no-line-allocation.png`

Booking ETA vs maritime ETA were **not** both populated as distinct operational fields on this shipment at `SHIPMENT_CREATED`. Offer ETD/ETA existed on the freight offer (`ETD 2026-08-28` / `ETA 2026-09-23`). Shipment UI did not yet show those as booking vs maritime ETAs.

### BOOKING → SHIPMENT — PASS

Same-transaction shipment workspace opened from offer selection. Linked order and PO references match.

### LINE ALLOCATION — DEAD END

Attempted on the live shipment page (not inferred only from old API).

| Question | Answer |
|---|---|
| UI exists? | **NO** |
| Manual UUID required? | **YES** (if using the previous API workaround) |
| Direct API required? | **YES** to perform the business action |

Shipment page text search: no “line allocation” / “allocate lines”. Frontend grep: **zero** `line-allocation` / `LineAllocation` matches. Previous run used `POST /api/shipments/line-allocations`.

**This is not converted to PASS.** Downstream customs/inland/POD/landed-cost UI was inspected but **not** executed to completion.

### CONTAINER — FRICTION (not fully executed)

- Tracking panel has a **container number** textbox (`e.g. MSKU1234567`) and **Link tracking** (disabled until a number is entered).
- No shipment `containers[]` attach UI was found.
- Representations were **not** fully verified because container was not attached. At this stage there is a tracking input only, not an agreed container entity.

### TRACKING — FRICTION

- Map “Route preview” shows generic vessels (CMA Anatolia, MSC Levant, Maersk Marmara) — **not** `YM Witness UI17-K7R3`.
- Journey bar at 5% Booking.
- Link tracking disabled without container number.
- **Not marked PASS** merely because FreightIQ said booked. Tracking is not yet operationally useful for this transaction.

### SHIPMENT → CUSTOMS / BROKER / DUTY / CLEARED / INLAND / TRUCKER / POD / LANDED COST — NOT REACHED

UI **surfaces** exist on the shipment page:

- **Start Customs Clearance** (readiness `—`, broker not assigned, declaration not recorded)
- **Request Inland Delivery** (copy: pickup requires CLEARED; request can still be prepared)
- Landed cost mentioned on the order freight panel after selection

These steps were **not** executed. Stale customs readiness after CLEARED was **not** retested (no CLEARED state on this transaction).

### FINAL BUYER VIEW — FRICTION

Buyer can see Control Tower, PO, order, freight offer, and shipment. Continuity after Direct PO depends on Ops for deposit + freight request. Product Master is missing. Line allocation is missing. End-state landed cost / POD views were not reached.

---

## 4. Critical regression targets

### A. LINE ALLOCATION

UI exists? **NO**  
Manual UUID required? **YES** (to use API workaround)  
Direct API required? **YES**  
**DEAD END**

### B. FREIGHT REQUEST

Buyer initiate? **NO** at Direct PO / SUPPLIER_CONFIRMED  
Admin/Ops UI handoff? **YES**  
**FRICTION** (ops-mediated, not a total dead end)

### C. DIRECT PO → FREIGHT ELIGIBILITY

Retested in UI. Buyer blocked until production/inspection/freight-requested. Not the old 403 assumed blindly; current UI message is explicit: freight unlocks after production completes or freight is requested. Admin can request earlier.

### D. CONTAINER

Not fully executed. Tracking input exists; no `containers[]` attach UI found. Representations not proven to agree.

### E. TRACKING

Booking vs maritime ETA not shown as distinct useful fields on shipment at `SHIPMENT_CREATED`. Map is not this vessel. Not PASS.

### F. STALE CUSTOMS READINESS

**NOT REACHED** — no CLEARED CustomsCase on this transaction.

### G. BUYER CONTINUITY

| Link | Score |
|---|---|
| Product → PO | FRICTION (via Direct PO quick-create; Product Master 404) |
| PO → Freight | FRICTION (Ops must create request) |
| Freight → Offer | PASS (Ops publishes; Buyer sees offer) |
| Offer → Booking | FRICTION (select works; booking stays pending) |
| Booking → Shipment | PASS (shipment spawned) |
| Shipment → Tracking | FRICTION |
| Shipment → Customs | UI present, not executed |
| CLEARED → Inland | NOT REACHED |
| Delivered → POD | NOT REACHED |
| POD → Landed Cost | NOT REACHED |

---

## 5. Role handoffs

| Handoff | How next role discovers work | Queue/status? | UUID/link needed? | External comms? |
|---|---|---|---|---|
| Buyer → Supplier | Supplier Orders / order URL (`?from=` after login) | Order appears for supplier | Order URL helps | Not required in this test |
| Supplier → Ops/Admin | Deposit pending; Start Production 409 | Payment panel on order | Order URL | Ops must know to Record paid. **ACCEPTABLE PILOT OPS** |
| Ops → Buyer (freight offers) | Buyer reopens same order | Offer list on order | Order URL | If buyer is not watching the order: email/WhatsApp. **ACCEPTABLE PILOT OPS** |
| Buyer → Broker | Not executed | Customs UI exists | — | — |
| Broker → Buyer/Ops | Not executed | — | — | — |
| Ops → Trucker | Not executed | Inland UI exists | — | — |
| Trucker → Buyer | Not executed | — | — | — |

Admin **cannot** select the freight offer in this UI (`canSelect = BUYER` only). That is a real handoff, not a dead end.

---

## 6. No-engineering-intervention result

| Intervention | Used? | Stage if YES |
|---|---|---|
| DB intervention | **NO** | — |
| SQL | **NO** | — |
| Prisma | **NO** | — |
| Shell script | **NO** | — |
| Direct REST API | **NO** | — |
| Manual UUID handling | **NO** | UUIDs appeared in URLs after UI create; none were typed into APIs |
| Code change during transaction | **NO** | — |

Network inspection was used for evidence only (start-production **409**).

**ASSISTED CONTINUATION:** not started. Line allocation dead end was recorded and not bypassed.

---

## 7. Same-transaction lineage

| Entity | Present on this run? | ID / ref |
|---|---|---|
| Product (via PO line quick-create) | YES | SKU `FLOUR-UI17-K7R3` |
| PO Line / PO | YES | `PO-MSSJM8C2-9FBC9AFE` |
| Freight Request | YES | CNSHA → Istanbul, marker in cargo |
| Selected Freight Offer | YES | `d446f805-…` / YM Witness UI17-K7R3 |
| Booking | PARTIAL | Banner “Booked via FreightIQ”; status still SHIPMENT_CREATED |
| Shipment | YES | `2c9f6f5a-…` / `SHP-ORD-DIR-PO-MSSJM8C2-9FBC9AFE-9FBC9AFE` |
| Container | NO | — |
| CustomsCase | NO | — |
| DutyTaxCalculation | NO | — |
| InlandDelivery | NO | — |
| POD | NO | — |
| LandedCostCalculation | NO | — |

**Same-Transaction Lineage: PARTIAL**

---

## 8. Console / network / UX defects observed

| Item | Count / note |
|---|---|
| Unexpected 5xx | **0** |
| Unexpected 4xx | **1** — `POST .../actions/start-production` **409** (deposit gate) |
| Blank pages | Login/logout flashes only |
| Loading loops | None proven |
| Duplicate submissions | Freight quote requested listed twice in timeline (09:17) |
| Stale states | Conversation Hub operational snapshot showed `ORDER CREATED` after supplier confirm; later Admin snapshot showed `SUPPLIER CONFIRMED` |
| Missing i18n | Admin freight offer form keys raw |
| Mixed language | PO panel TR labels under EN |

---

## 9. Open defects

### P0 (1)

1. **Line allocation has no supported UI.** Required Golden Path step. Previous workaround is direct REST. Blocks self-service and is not a documented non-engineering Ops click-path.

### P1 (6)

1. Standalone Product Master unrouted (404).
2. Buyer cannot initiate freight on Direct PO until production/inspection; Ops must create the RFQ.
3. Start Production offered to Supplier while deposit unsatisfied → **409** with weak error surfacing.
4. Online payments disabled; only Admin/staff “Record paid” unblocks production.
5. FreightIQ selection creates shipment but booking remains “confirmation pending” at `SHIPMENT_CREATED`.
6. Tracking map is generic preview, not this booking’s vessel; booking vs maritime ETA not distinct on shipment.

### P2 (3)

1. Mixed TR/EN labels on PO workspace.
2. Raw i18n keys on Admin freight offer form.
3. Duplicate “Freight quote requested” timeline rows.

No security, customs-gate-bypass, or data-corruption defect was proven in this UI run. Financial integrity risk is limited to **manual deposit recording** by staff (intentional while online collection is off).

---

## 10. Verdict rationale

**Self-service:** core steps require Ops (deposit record, freight request) and Line Allocation has **no UI**. **NOT READY FOR SELF-SERVICE.**

**Controlled paid pilot** may pass with P1 only if P0 = 0 and workarounds are realistic without DB repair. Line Allocation is P0 and requires API. Booking confirmation is incomplete. Therefore **NOT READY FOR CONTROLLED PAID PILOT**.

Sprint 43 and new product work were **not** started.

---

## 11. Screenshots (requested filenames)

Captured via browser MCP (also stored under the Cursor screenshot cache):

- `docs/phase-17-evidence/00-buyer-login-control-tower.png`
- `docs/phase-17-evidence/01-product-master-404.png`
- `docs/phase-17-evidence/02-direct-po-products.png`
- `docs/phase-17-evidence/03-direct-po-review.png`
- `docs/phase-17-evidence/04-po-created.png`
- `docs/phase-17-evidence/05-order-freight-blocked.png`
- `docs/phase-17-evidence/06-start-production-409-deposit-gate.png`
- `docs/phase-17-evidence/07-payment-deposit-pending-supplier.png`
- `docs/phase-17-evidence/08-admin-deposit-recorded.png`
- `docs/phase-17-evidence/09-freight-request-created.png`
- `docs/phase-17-evidence/10-buyer-offer-selected-shipment.png`
- `docs/phase-17-evidence/11-shipment-created-no-line-allocation.png`
