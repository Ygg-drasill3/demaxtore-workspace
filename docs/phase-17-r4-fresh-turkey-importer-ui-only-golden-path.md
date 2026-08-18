# Phase 17 R4 — Fresh Turkey Importer UI-Only Golden Path

Date: 2026-08-14  
Environment: `https://workspace.demaxtore.com`  
Fresh marker: **MVP-UI17-R4-20260814-R2M5**

## Executive Summary

After environment recovery (Playwright/browser smoke PASS; all four pilot logins PASS), a completely fresh R4 transaction was executed UI-only through **Delivered + POD + True Landed Cost + Final Buyer View** on marker **R2M5**.

No code changes were made during the run. No API/DB/UUID/engineering intervention was used for business-state mutation.

**Controlled Paid Pilot:** operationally supported with documented Ops/Buyer handoffs (freight intake, deposit, inland ready-for-pickup).  
**Self-Service:** not supported end-to-end without DeMaxtore/Buyer coordination on those handoffs.

Evidence bundle: `.r4-ui-fixtures/run/R2M5/` (screenshots + `evidence.json`).

---

## Environment / Pre-flight

| Check | Result |
|---|---|
| Shell / repo | PASS |
| Frontend / backend / `/api/ready` | PASS |
| Playwright + Chromium | PASS |
| Buyer / Admin / Broker / Trucker login | PASS |
| Browser stability smoke | PASS (`.r4-ui-fixtures/env-smoke/`) |

Prior aborted attempts (T7N4, X4J7, etc.) were **automation/script issues or user interrupt**, not product P0 — not counted as R4 product FAIL.

---

## Fresh R4 Marker & Identities

| Field | Value |
|---|---|
| Marker | MVP-UI17-R4-20260814-R2M5 |
| SKU | FLOUR-UI17R4-R2M5 |
| Buyer | buyer1@acme.test |
| Admin/Ops | admin@demaxtore.local |
| Broker | broker.smoke@demaxtore.local |
| Trucker | trucker.smoke@demaxtore.local |

---

## Entity Reference Table (R2M5)

| Entity | Reference |
|---|---|
| Product SKU | FLOUR-UI17R4-R2M5 |
| PO | PO-MST4OG0H-9BC37FAB |
| PO line | 90 PCS @ USD 18.00 |
| Order | ORD-DIR-PO-MST4OG0H-9BC37FAB-9BC37FAB |
| Freight offer (customer) | USD 2,100 |
| Booking | MSCBK-R4-R2M5 |
| Shipment | SHP-ORD-DIR-PO-MST4OG0H-9BC37FAB-9BC37FAB |
| Container | MSKU17R4R2M5 |
| Customs case | buyer customs workspace (CLEARED) |
| Inland delivery | Partner/Buyer inland execution |
| POD | Uploaded via trucker UI (pod-R2M5.pdf) |
| Landed cost | INCOMPLETE LANDED COST v3 (buyer list) |

---

## Stage Results (R2M5)

| Stage | Result | Notes |
|---|---|---|
| Product → PO | PASS | Direct PO wizard UI |
| PO → Freight | FRICTION | Admin recorded deposit; Admin created freight request |
| Freight Request → Offer | PASS | Admin published USD 2,100 offer |
| Offer → Booking | PASS | Buyer selected offer |
| Booking Lifecycle | PASS | REQUESTED → PENDING → CONFIRMED |
| Booking → Shipment | PASS | Shipment spawned from order |
| Line Allocation | PASS | 90 PCS allocated |
| Container | PASS | MSKU17R4R2M5 |
| Tracking | PASS | Panel visible |
| Shipment → Customs | PASS | Turkey customs case opened |
| Broker Assignment | PASS | broker.smoke assigned via shipment partners panel |
| Broker Case Discovery | PASS | Partner → My Customs Cases → Open Case |
| Broker Execution | PASS | Review through external declaration |
| GTİP Verification | PASS | Broker verified CANDIDATE → VERIFIED |
| Document Readiness | PASS | CI / PL / BOL uploaded via trade docs UI |
| Duty & Tax | PASS | PROVISIONAL calculation (evaluated total 0 / unsupported measures not faked) |
| Customs CLEARED | PASS | Broker marked cleared |
| CLEARED → Inland | PASS | Inland delivery requested |
| Trucker Assignment | PASS | trucker.smoke assigned |
| Trucker Delivery Discovery | PASS | Partner → My Deliveries → Open Delivery (Phase 17C regression) |
| Trucker Execution | PASS | Schedule → (Buyer ready) → confirm → gate-out → in transit |
| Delivered | PASS | Trucker marked delivered |
| POD | PASS | Trucker uploaded POD |
| True Landed Cost | PASS | Buyer `/buyer/landed-cost` → detail v3 (shipment workspace panel not mounted — discoverability friction) |
| Final Buyer View | PASS | Buyer re-entered order workspace |
| Same-Transaction Lineage | PASS | Single continuous R2M5 lineage |

---

## Reconciliation (R2M5)

| Check | Result | Detail |
|---|---|---|
| Allocation → Goods | **PASS** | 90 × USD 18 = USD 1,620 = TLC Goods (ACTUAL) |
| Freight → TLC | **PASS** | Selected offer USD 2,100 = TLC Freight (ESTIMATED) |
| DutyTax → TLC | **PASS** | Customs PROVISIONAL with no evaluated lines; TLC shows Duty/Tax **Not provided** + diagnostic `DUTY_TAX_NOT_AVAILABLE` (unknown ≠ zero) |
| Inland → TLC | **PASS** | Recorded inland USD 450 = TLC Inland (ACTUAL) |

---

## Manual Operations Register (supported UI, not engineering)

| Action | Role | Frequency risk |
|---|---|---|
| Record deposit | Admin | Per PO with deposit gate |
| Create freight request | Admin | Per order (buyer create not used) |
| Publish freight offer | Admin | Per request |
| Assign broker / trucker | Admin | Per shipment |
| Mark inland ready for pickup | Buyer | After trucker schedules pickup |
| Upload trade docs | Admin (during run) | Per customs case |

---

## No-Engineering Declaration

| Field | Value |
|---|---|
| DB Intervention | NO |
| SQL | NO |
| Prisma | NO |
| Shell Business-State Mutation | NO |
| Direct REST Mutation | NO |
| Browser Console Mutation | NO |
| Manual UUID Intervention | NO |
| Engineering Intervention | NO |
| Code Change During R4 | NO |
| Assisted Continuation After Blocker | NO |

Unexpected **5xx: 0** on R2M5 run.

---

## Verdicts

**Controlled Paid Pilot:** READY FOR CONTROLLED PAID PILOT  
(with Ops-managed freight/deposit and Buyer inland ready-for-pickup handoffs)

**Self-Service:** NOT READY FOR SELF-SERVICE

**5-Customer Operational Capacity:** YES (with Ops staffing for freight/customs/inland handoffs)  
**10-Customer Operational Capacity:** NO (manual handoff volume likely bottlenecks first cohort without additional ops capacity)
