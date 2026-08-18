# Import OS — Customer #1 Capability Summary

**Date:** 2026-08-17  
**Purpose:** Commercial grounding — what DeMaxtore can truthfully operate and sell for the first paid Turkey import  
**Mode:** Read-only audit  
**Golden path reference:** `MVP-UI17-R4-20260814-R2M5` (R4)

---

## Executive answer for Customer #1

DeMaxtore **can manage Customer #1's first paid Turkey import today** as a **controlled, ops-assisted import operating system** — not as a fully self-service unattended platform.

The R4 golden path completed with **0 network 5xx**, **same-transaction lineage PASS**, and verdict **READY FOR CONTROLLED PAID PILOT**.

Customer #1 should be sold and operated on the **Turkey Importer product** (`TURKEY_IMPORTER` operating model): Freight + Customs + Import Operating System, with International sourcing capabilities still available but not primary.

---

## What works end-to-end for Customer #1 (R4-proven)

| Stage | Capability | Customer-visible | Ops role |
|-------|------------|------------------|----------|
| Product / direct PO | Create SKU, spawn PO | Yes | Buyer + admin deposit |
| Freight | Request → offer → selection → booking | Yes | Ops prepares offer |
| Shipment | Spawn from booking, container, allocation | Yes | Shared engine |
| Tracking | Link container, ETA/status panel | Yes | **Simulated/manual provider in prod** — disclose |
| Trade documents | CI, PL, BOL upload + compliance | Yes | Buyer/broker upload |
| Customs | Case, broker assign, GTIP, duty/tax, cleared | Yes | Broker execution |
| Inland | Trucker assign, schedule, pickup, delivery | Yes | Trucker + buyer handoffs |
| POD | Proof of delivery document | Yes | Trucker upload |
| Landed cost | Calculation list | Partial | Shipment panel friction — ops workaround |
| Control Tower | Attention queue, pipeline, KPIs | Yes | Buyer + ops visibility |
| Exceptions | Hub with resolve workflow | Yes | In-app alerts |

---

## What to operate manually for Customer #1

| Area | Manual / ops workaround | Blocker? |
|------|-------------------------|----------|
| Freight offer publication | Ops creates/publishes offer | No — by design |
| Deposit confirmation | Admin action | No — by design |
| Broker assignment & clearance | Broker partner workflow | No — by design |
| Trucker scheduling / ready-for-pickup | Buyer + trucker coordination (R4 FRICTION noted) | No — process friction only |
| Landed cost shipment drill-down | Use list view if panel unavailable | No — workaround exists |
| Live carrier tracking | Configure `maritime_api` or accept simulated ETA monitoring | No — disclose simulation |
| Email exception escalation | Not automated — use ops monitoring + Control Tower | No — ops process |

---

## Sales claims safe for Customer #1 conversation

**Say:**
- "One workspace for freight, customs, delivery, and documents on your import transaction."
- "Import Control Tower shows what needs attention across your active trades."
- "Structured exception management with severity and resolution."
- "Customs readiness checks required documents before broker execution."
- "POD and inland delivery are part of the same shipment lineage."

**Qualify:**
- "Tracking in default deployment uses simulated maritime updates — we monitor ETA and delays, not live GPS."
- "Some steps remain ops-assisted — this is a controlled pilot, not unattended self-service."
- "Landed cost is available; deep shipment-level drill-down may need ops support."

**Do not say:**
- "Live GPS tracking out of the box"
- "Fully automated import with zero ops touch"
- "Email alerts fire automatically for every exception"

---

## Customer #1 blocker assessment

| Question | Answer |
|----------|--------|
| Prevents managing first paid Turkey import? | **NO** |
| Prevents truthful product demonstration? | **NO** (with qualifiers above) |
| Requires ops workaround? | **YES** (expected for pilot) |

**Customer #1 transaction blocker:** **NO**  
**Customer #1 sales claim risk:** **YES** (only if unqualified "live tracking" / "fully automated" language is used)

---

## Recommended operating model for Customer #1

1. Set organisation `buyer_operating_model = TURKEY_IMPORTER` explicitly (not inferred from name/email).
2. Run transaction on shared engine: product → PO → freight → shipment → customs → inland → POD.
3. Use Import Control Tower + Exception Hub as daily ops surfaces.
4. Disclose tracking mode on shipment workspace (demo banner already present for MANUAL provider).
5. Keep Phase 12 tenant isolation regression in release checklist (69/69 PASS at audit time).

**Recommended immediate development:** **NONE** for Customer #1 go-live.  
**Development freeze:** **KEEP** — measure during pilot before expanding scope.
