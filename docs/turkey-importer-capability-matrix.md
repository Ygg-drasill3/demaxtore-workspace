# Turkey Importer — Capability Completion Matrix

**Audit date:** 2026-08-17  
**Classification legend:** 1=CUSTOMER-READY · 2=IMPLEMENTED BUT NOT DISCOVERABLE · 3=IMPLEMENTED BUT OPS-DEPENDENT · 4=PARTIALLY IMPLEMENTED · 5=BACKEND EXISTS / BUYER UX MISSING · 6=PLANNED BUT NOT IMPLEMENTED · 7=LEGACY / WRONG GTM PRIORITY · 8=OBSOLETE · 9=NO EVIDENCE

**GTM category:** A=Freight revenue · B=Customs revenue · C=Import OS core · D=Sourcing · E=Secondary · F=Internal/Ops · G=Dead/Legacy

---

## Import initiation

| Capability | Class | GTM | Evidence |
|------------|-------|-----|----------|
| New Import (unified entry) | **6** | C | No single “New Import” surface; fragmented RFQ/PO/FreightIQ |
| Freight quote request | **3** | A | `FreightIQPage`; buyer create blocked by deposit gate (`freightiq.policy`) |
| Existing supplier import | **4** | C | Direct PO wizard exists; not dashboard-promoted |
| Direct PO | **2** | C | Route `/buyer/purchase-orders/create`; nav under PO only |
| Product Master | **1** | C | `/buyer/products` in nav; R4 PASS |
| Incoterm | **1** | C | PO wizard + shipment fields |
| Origin / destination | **1** | C | PO, freight, shipment forms |
| Cargo readiness | **4** | A | Shipment readiness fields; not unified import wizard |
| FCL/LCL / container selection | **4** | A | MC/BC programs + shipment types; freight mode in FreightIQ |

---

## Freight

| Capability | Class | GTM | Evidence |
|------------|-------|-----|----------|
| Freight request | **3** | A | Buyer create requires deposit; R4 used admin create |
| Freight quote | **3** | A | Ops/partner quote flow; buyer sees offers in FreightIQ |
| Offer | **1** | A | Offer cards in FreightIQ workspace |
| Offer comparison / selection | **4** | A | Multiple offers possible; comparison UX basic |
| Booking | **3** | A | Buyer can accept with ops; deposit friction |
| Carrier / forwarder execution | **3** | A | Ops/partner execution; buyer tracking |
| Shipment creation | **1** | C | From PO/booking; R4 PASS |
| Container | **4** | A | MC/BC + shipment container refs |
| Tracking | **1** | C | Shipment workspace timeline + maritime |
| ETA | **1** | C | Shipment workspace |
| Freight financial lineage | **4** | A | Cost lines exist; margin hidden from buyer (correct) |

---

## Customs

| Capability | Class | GTM | Evidence |
|------------|-------|-----|----------|
| Customs initiation | **5** | B | Backend case creation; no buyer “request customs” CTA |
| Broker assignment | **3** | B | Partner workspace; ops assigns (`seedTurkeyCustomsDemo`) |
| Broker discovery | **5** | B | No buyer-facing broker marketplace |
| Broker execution | **1** | B | Broker portal; R4 PASS |
| GTİP / HS | **4** | B | Product Master + customs case; buyer prep partial |
| Document readiness | **4** | B | Trade docs + customs checklist; scattered surfaces |
| Duty / tax visibility | **4** | B | Duty engine V1 estimate; “Not provided” when unknown |
| Customs status | **2** | B | `TurkeyCustomsPanel` in shipment workspace only |
| CLEARED | **2** | B | Status visible in shipment customs panel; not on dashboard |

---

## Inland

| Capability | Class | GTM | Evidence |
|------------|-------|-----|----------|
| Inland initiation | **5** | A | Post-CLEARED backend trigger; no buyer CTA |
| Trucker assignment | **3** | A | Partner/ops assignment |
| Trucker discovery | **5** | A | No buyer trucker marketplace |
| Trucker execution | **1** | A | Trucker portal; R4 PASS |
| Ready for pickup | **3** | A | R4: ops sets; buyer notified |
| Delivered | **1** | A | Trucker POD flow |
| POD | **1** | A | Inland delivery completion |

---

## Financial visibility

| Capability | Class | GTM | Evidence |
|------------|-------|-----|----------|
| Goods value | **1** | C | PO / order lines |
| Freight | **4** | A | Shipment costs; partial in TLC |
| Insurance | **4** | C | Field exists; often “Not provided” |
| Duty | **4** | B | Estimate engine; not official |
| Tax | **4** | B | Same as duty |
| Inland | **4** | A | Inland cost lines |
| Landed cost | **2** | C | `/buyer/landed-cost` route; **not in nav**; panel not in shipment WS |
| Unknown ≠ zero | **1** | C | Phase 16 PASS — “Not provided” |
| Reconciliation | **3** | F | Ops/finance tools |
| Customer-facing TLC | **2** | C | Route works; discoverability friction |

---

## Operational visibility

| Capability | Class | GTM | Evidence |
|------------|-------|-----|----------|
| Active imports | **4** | C | Dashboard cards + Control Tower; no unified “my imports” |
| Action required | **4** | C | Exceptions hub; not import-centric home |
| Shipment timeline | **1** | C | Shipment workspace |
| Exceptions | **1** | C | `/buyer/exceptions` in nav |
| Documents | **1** | C | Trade Documents in nav |
| Messages | **1** | C | `/buyer/messages` |
| Notifications | **1** | C | `/buyer/notifications` |
| Control tower | **1** | C | `/buyer/control-tower` in nav |

---

## User experience

| Capability | Class | GTM | Evidence |
|------------|-------|-----|----------|
| Importer home | **7** | D | Dashboard = sourcing hero “RFQ → award → PO → shipment” |
| “Start new import” | **6** | C | Missing unified CTA |
| “Get freight quote” | **3** | A | FreightIQ in nav; deposit/ops friction |
| “Customs” | **2** | B | Route exists; not in nav |
| “My imports” | **4** | C | Shipments list; fragmented lineage |
| Next action | **4** | C | Some dashboard widgets; not GTM-aligned |
| Completion | **4** | C | TLC exists but hard to find |
| Onboarding / guidance | **4** | E | Academy exists; TR not fully wired |

---

## Summary counts (minimum list)

| Class | Count |
|-------|-------|
| 1 — CUSTOMER-READY | 22 |
| 2 — NOT DISCOVERABLE | 8 |
| 3 — OPS-DEPENDENT | 11 |
| 4 — PARTIAL | 18 |
| 5 — BACKEND / NO BUYER UX | 5 |
| 6 — PLANNED NOT IMPLEMENTED | 2 |
| 7 — LEGACY / WRONG GTM | 1 |
| 8 — OBSOLETE | 0 |
| 9 — NO EVIDENCE | 0 |

**Interpretation:** Backend transaction engine largely built (Sprints 35–42). Buyer-facing **discoverability and GTM-aligned initiation** are the dominant gaps—not missing domain modules.

---

## Post–Sprint 43 reclassification (2026-08-17)

**Preserved above:** Original audit matrix (pre-remediation).  
**Sprint 43 changes:** UX/IA + freight eligibility expansion only.

| Capability | Pre-S43 | Post-S43 | Evidence |
|------------|---------|----------|----------|
| New Import (unified entry) | 6 | **1** | `/buyer/imports/new` |
| Freight quote request (buyer initiate) | 3 | **1** | Expanded `FREIGHTIQ_ORDER_ELIGIBLE_STATES` + `/buyer/freightiq/request` |
| Direct PO discoverability | 2/4 | **1** | Hero + Start Import |
| Customs nav discoverability | 2 | **1** | Nav + `/buyer/customs` |
| Landed Cost discoverability | 2 | **1** | Nav + shipment `LandedCostPanel` |
| Inland discoverability | 2 | **1** | Nav `/buyer/inland` |
| Customs service initiation | 5 | **1** | `Request DeMaxtore customs` on shipment panel |
| Importer home GTM | 7 | **1** | Import-execution hero |
| Unified import lineage UX | 4 | **4** | `/buyer/imports` partial (no new aggregate) |
| Self-service end-to-end | 3/4 | **3** | Ops offer/broker handoffs preserved |

See `docs/sprint-43-turkey-importer-commercial-workspace-repositioning.md` for full verdict.
