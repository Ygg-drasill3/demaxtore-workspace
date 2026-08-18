# Import OS — Cross-System Lineage Map

**Date:** 2026-08-17  
**Mode:** Read-only forensic trace  
**Evidence:** Production API probes + `.r4-ui-fixtures/run/R2M5/evidence.json`

---

## A) R4 Turkey Golden Path — `MVP-UI17-R4-20260814-R2M5`

**Fixture account:** `buyer1@acme.test` (production UI-created, not seeded)  
**Marker:** `MVP-UI17-R4-20260814-R2M5`  
**Verdict from golden path:** `READY FOR CONTROLLED PAID PILOT` / `NOT READY FOR SELF-SERVICE`

### Entity graph

```
PRODUCT (FLOUR-UI17R4-R2M5)
  └─ DIRECT PO (PO-MST4OG0H-9BC37FAB)
       └─ ORDER WS (39b6c5d8-11dd-4c45-bb1a-70ae7308b0d4)
            ├─ DEPOSIT_PAID (admin)
            ├─ FREIGHT REQUEST (c3a98b58-53fb-4b3b-a947-f84f560f132e)
            ├─ FREIGHT OFFER → SELECTION → BOOKING (MSCBK-R4-R2M5)
            └─ SHIPMENT WS (9f1c326a-97ad-4937-a200-09e628251070)
                 ├─ CONTAINER MSKU17R4R2M5 / 90 PCS allocation
                 ├─ TRACKING (linked; provider label "freightiq" in API probe)
                 ├─ TRADE DOCS (CI, PL, BOL, POD uploaded — Document Hub verified)
                 ├─ CUSTOMS CASE (8a96c974-700e-40ba-9db0-0b331f7d4583) — CLEARED
                 ├─ INLAND DELIVERY (pickup → delivered)
                 ├─ POD (PROOF_OF_DELIVERY in Document Hub)
                 └─ LANDED COST (list present; TRUE_LANDED_COST stage FRICTION)
```

### Cross-system visibility matrix (R4)

| Domain | Visible in UI/API | Connected to same transaction | Connection type | Classification |
|--------|-------------------|------------------------------|-----------------|----------------|
| Product / SKU | Yes | Yes | PO spawn | **PRODUCTION VERIFIED** |
| PO | Yes | Yes | Order workspace | **PRODUCTION VERIFIED** |
| Freight request/offer/booking | Yes | Yes | Order→shipment spawn | **PRODUCTION VERIFIED** |
| Shipment workspace | Yes | Yes | Shared trade graph | **PRODUCTION VERIFIED** |
| Container | Yes | Yes | Line allocation | **PRODUCTION VERIFIED** |
| Tracking panel | Yes | Yes | Shipment API | **PARTIAL** (simulated/manual backend; not external GPS) |
| Trade timeline | Yes (39 events) | Yes | `timeline_events` ledger | **PRODUCTION VERIFIED** |
| Document Hub | Yes (5 docs incl. POD) | Yes | Trade doc types on shipment/order | **PRODUCTION VERIFIED** |
| Customs case | Yes (CLEARED) | Yes | Shipment eligibility + case ID | **PRODUCTION VERIFIED** |
| Broker execution | Yes | Yes | Partner assignment + case events | **PRODUCTION VERIFIED** |
| Inland delivery | Yes (14 items in buyer list) | Yes | Shipment-scoped | **PRODUCTION VERIFIED** |
| Trucker / POD | Yes | Yes | POD trade doc + inland link | **PRODUCTION VERIFIED** |
| Landed cost | Yes (13 items) | Partial | List works; shipment panel friction noted | **PARTIAL** |
| Exceptions / alerts | Yes | Partial | Alert engine + exception hub; not single store | **PARTIAL** |
| Import Control Tower | Yes (18 attention items) | Yes | Aggregates trade graph + alerts + exceptions | **PRODUCTION VERIFIED** |
| Admin Operations Tower | Yes | Partial | Platform-wide; not R4-only filter | **PRODUCTION VERIFIED** |

### Orchestration edges (R4)

| Edge | Status | Evidence |
|------|--------|----------|
| Tracking → Timeline | **CONNECTED** | Tracking sync writes `timeline_events`; R4 timeline includes `FREIGHT_*`, `SHIPMENT_*` |
| Tracking → Exceptions | **CONNECTED** | ETA shift / delay → `control_tower_alerts` → Exception Hub sync |
| Exceptions → Control Tower | **CONNECTED** | Import tower `attentionRequired` merges alerts + exceptions |
| Document readiness → Customs | **CONNECTED** | CI/PL/BOL in `evaluateReadiness()` |
| Document readiness → Exceptions | **CONNECTED** | Exception Intelligence + trade-doc alert scan |
| Customs → Control Tower | **PARTIAL** | Via alerts/issues; no dedicated customs widget in import tower |
| Customs → Timeline | **NOT CONNECTED** | Customs uses `customsCaseEvent` table, not unified trade timeline |
| Inland → Timeline | **NOT CONNECTED** | Inland uses separate event store |
| Inland → Exceptions | **CONNECTED** | `syncExceptions()` on inland transitions |
| POD → Document Hub | **CONNECTED** | `PROOF_OF_DELIVERY` uploaded; trucker role restricted |
| POD → Timeline | **PARTIAL** | Document upload events in timeline; inland POD linkage separate |
| Landed cost → Shipment view | **PARTIAL** | Golden path FRICTION on shipment panel |

**R4 same-transaction lineage verdict:** **PARTIAL** — core Turkey import chain is connected and demonstrable; timeline fragmentation for customs/inland and multi-store exceptions prevent "complete OS" classification.

---

## B) International fixture — ABC Foods Germany

**Account:** `demo.buyer@demaxtore.com` / Anna Becker / ABC Foods Germany  
**Operating model:** `INTERNATIONAL` (Sprint 43R)

### Seeded / production richness

| Domain | Present | Notes |
|--------|---------|-------|
| RFQ (open + awarded) | Yes | `DEMO-RFQ-ABC-001`, `DEMO-RFQ-ABC-002` |
| CommodityBid | Yes | Closed tomato paste auction |
| Mixed / Bulk Container | Yes | MC/BC workspaces |
| Order + Shipment | Yes | `ORD-DEMO-RFQ-ABC-002-00000000` → `SHP-ORD-DEMO-RFQ-ABC-002-00000000` (IN_TRANSIT) |
| Control Tower | Yes | 14 active trades, 6 attention, 12 risks, 1 delayed trade |
| Exceptions | Yes | 1 open exception (Manual Exception / Medium) |
| Trade timeline | Yes | 17 events on shipment trade root |
| Tracking | Partial | Not linked; provider manual; 0 events |
| Document Hub | Yes | UI route works; seed does not populate trade docs |
| Customs / Inland / POD / Landed cost | No | Germany route (DEHAM); not Turkey execution demo |

### Orchestration edges (International)

| Edge | Status |
|------|--------|
| Sourcing → PO → Shipment | **CONNECTED** (seed chain) |
| Shipment → Control Tower | **CONNECTED** |
| Shipment → Exceptions | **CONNECTED** (`SHIPMENT_ETA_EXCEEDED` alert seeded) |
| Shipment → Tracking | **NOT CONNECTED** (not linked in production DB) |
| Shipment → Documents | **PARTIAL** (hub exists; no seeded docs) |
| End-to-end import OS | **FRAGMENTED** for ABC — strong sourcing/visibility demo, not full import execution |

**International import OS lineage verdict:** **PARTIAL** — deep sourcing + trade visibility; not a full import-execution golden path like R4.

---

## C) Shared engine topology

```
                    ┌─────────────────────┐
                    │   AlertEngine       │
                    │   (15min poll)      │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ControlTowerAlert   TradeException   OperationalIssue*
              │               │               │
              └───────┬───────┘               │ (* not in Control Tower UI)
                      ▼
           Import Control Tower Aggregator
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   Trade Timeline  Tracking     Document Hub
   (timeline_events) (snapshots) (trade docs)
        │             │             │
        └─────────────┴─────────────┘
                      │
              Shipment / Order / PO workspaces
                      │
         CustomsCase ─ InlandDelivery ─ LandedCost
```

**Key fragmentation points:**
1. Three exception stores (ControlTowerAlert, TradeException, OperationalIssue + ShipmentException FSM)
2. Customs/inland events not merged into trade timeline
3. Tracking map UI decoupled from backend snapshot coordinates
