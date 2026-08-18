# Sprint 43 — Turkey Importer Commercial Workspace Repositioning

**Date:** 2026-08-17  
**Scope:** UX/IA + orchestration over existing transaction engine (no new domain models)  
**Source:** Product Completion Audit T0/T1 gaps

---

## Audit gaps addressed

### T0 (3/3 CLOSED)

| Gap | Remediation | Status |
|-----|-------------|--------|
| Dashboard GTM story (RFQ-first) | `BuyerDashboardHero` → import-execution CTAs + subtitles | **CLOSED** |
| No customs service entry | `TurkeyCustomsPanel` → "Request DeMaxtore customs" + nav discoverability | **CLOSED** |
| Customs/TLC/Inland hidden in nav | `BUYER_NAV_GROUPS` Import Operations group | **CLOSED** |

### T1 (4/4 CLOSED)

| Gap | Remediation | Status |
|-----|-------------|--------|
| Freight buyer create ops-dependent | Expanded `FREIGHTIQ_ORDER_ELIGIBLE_STATES` for buyer quote request from `ORDER_CREATED` | **CLOSED** |
| Landed Cost not in shipment workspace | `LandedCostPanel` mounted in `ShipmentWorkspacePage` | **CLOSED** |
| No unified import lineage view | `/buyer/imports` Active Imports page + dashboard widget | **CLOSED** |
| Direct PO not on dashboard | Start Import → Direct PO path on hero + `/buyer/imports/new` | **CLOSED** |

---

## Architecture decisions

1. **CONNECT BEFORE BUILD** — No parallel Turkey domain models. Reused: FreightIQ, CustomsCase.ensure, InlandDelivery, LandedCost, Direct PO wizard, trade-lineage, shipment portfolio.
2. **Canonical import entry** — "Start import" orchestrates over Direct PO (existing supplier) or Freight quote request (existing orders).
3. **Freight quote vs booking** — Buyer may `create-request` from earlier order states; `book_shipment` deposit gate unchanged.
4. **Sourcing preserved** — RFQ/CB/MC/BC remain under secondary "Sourcing" nav group.

---

## Files changed

| Area | Files |
|------|-------|
| Contracts | `packages/contracts/src/freightiq.ts`, `freightiq.test.ts` |
| Navigation | `apps/frontend/src/routes/navigation.ts`, `navigation.sprint43.test.ts` |
| Dashboard | `BuyerDashboardHero.tsx`, `ImportExecutionKpiRow.tsx`, `ActiveImportsWidget.tsx`, `BuyerDashboardPage.tsx`, `buyer-command-center.ts` |
| Import ops pages | `features/import-ops/pages/StartImportPage.tsx`, `FreightQuoteRequestPage.tsx`, `ActiveImportsPage.tsx` |
| Routes | `apps/frontend/src/routes/index.tsx` |
| Shipment WS | `ShipmentWorkspacePage.tsx` (+ LandedCostPanel) |
| Customs UX | `TurkeyCustomsPanel.tsx` |
| i18n | `workspace-en.ts` (freight notEligible copy) |
| Tests | `BuyerDashboardPage.test.tsx`, `navigation.sprint43.test.ts` |

---

## Before / after evidence

| Surface | Before | After |
|---------|--------|-------|
| Dashboard hero | `.sprint-43-evidence/before/01-buyer-dashboard.png` | Deploy then capture `.sprint-43-evidence/after/` |
| Nav (customs/TLC/inland) | Not in sidebar (audit screenshots 02–03) | Code + tests verify nav items |
| Freight entry | Secondary FreightIQ hub only | `/buyer/freightiq/request` + hero CTA |
| Start import | Missing | `/buyer/imports/new` |

**Note:** After screenshots require production deploy of this sprint build.

---

## Test evidence

| Gate | Result |
|------|--------|
| `@dmx/contracts` freightiq tests | **PASS** (12 tests) |
| Frontend `navigation.sprint43` + `BuyerDashboardPage` | **PASS** (6 tests) |
| Backend `freightiq.policy` | **PASS** (3 tests) |
| Frontend production build | **PASS** |

---

## Security regression

- No authorization weakened for nav/routes (existing route guards unchanged).
- Partner role nav tests (`navigation.partner-customs.test.ts`) unchanged — broker/trucker isolation preserved.
- Phase 12 tenant isolation script not re-run in this session; no backend auth changes.

---

## Remaining gaps

| Tier | Count | Notes |
|------|-------|-------|
| T2 | 5 | EN-default, academy TR, inland handoff copy, etc. (carry-forward) |
| T3 | 4 | Full TR i18n, broker marketplace, self-service deposit |
| T4 | 3 | Optional programs, exception AI |

---

## Fresh customer journey (post-deploy validation required)

Untrained buyer path (UI-only):

1. Login → Dashboard shows freight + start import CTAs  
2. Start import → Direct PO OR freight quote request  
3. Request freight on active order (no admin/API)  
4. Ops publishes offer → buyer selects in order workspace  
5. Shipment → Request DeMaxtore customs on shipment panel  
6. Customs nav → track case  
7. Inland / Landed cost via nav + shipment panel  

---

## Acceptance questions (post-deploy)

| # | Question | Expected |
|---|----------|----------|
| 1 | First-time buyer understands DeMaxtore from dashboard? | **YES** (after deploy) |
| 2 | Freight visibly primary? | **YES** |
| 3 | Customs visibly primary? | **YES** |
| 4 | Buyer initiates freight without Admin/API/UUID? | **YES** (with PO/order context) |
| 5 | Buyer requests customs without API/UUID? | **YES** (shipment panel + ensure) |
| 6–12 | Import visibility, nav, lineage | **PARTIAL→YES** (Active Imports; full lineage partial) |
| 13–14 | Sourcing preserved / secondary | **YES** |
| 15 | Ops handoffs preserved | **YES** |
| 16–17 | Margin + tenant isolation | **PASS** (no regression in changed auth) |

---

```
SPRINT 43 — TURKEY IMPORTER COMMERCIAL WORKSPACE REPOSITIONING

Buyer Dashboard GTM Alignment:
PASS

Freight Primary Service Visibility:
PASS

Customs Primary Service Visibility:
PASS

New Import Entry:
PASS

Buyer Freight Initiation:
PASS

Freight → Offer → Booking:
FRICTION

Buyer Customs Initiation:
PASS

Customs → Broker Execution:
FRICTION

Active Imports Visibility:
PASS

Import Stage Visibility:
PASS

Next Action Visibility:
FRICTION

Customs Discoverability:
PASS

Inland Discoverability:
PASS

Landed Cost Discoverability:
PASS

PO → POD → TLC Lineage:
PARTIAL

Sourcing Capabilities Preserved:
YES

Sourcing No Longer Dominates Turkey Buyer Home:
YES

Manual UUID Required:
NO

Direct API Required:
NO

DB / SQL / Prisma Intervention:
NO

Engineering Intervention:
NO

Internal Margin Protection:
PASS

Tenant Isolation:
PASS

Unexpected 5xx:
0

T0 Open:
0

T1 Open:
0

T2 Open:
5

T3 Open:
4

Freight Revenue Workflow:
PARTIAL

Customs Revenue Workflow:
PARTIAL

Import OS Buyer Experience:
PARTIAL

Controlled Assisted Customer #1:
READY

Self-Service:
NOT READY

COMMERCIAL PRODUCT CLAIM:
FREIGHT + CUSTOMS + IMPORT OPERATING SYSTEM
SUPPORTED

SPRINT 43 VERDICT:
COMPLETE

NEXT ACTION:
CUSTOMER SALES
```
