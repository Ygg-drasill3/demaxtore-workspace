# Learning Center Accuracy Audit

**Date:** 2026-06-05  
**Scope:** RFQ · CommodityBid · FreightIQ · Trade Documents · Workspace Communication · Shipment Tracking  
**Method:** Compare Learning Center copy, onboarding cards, product tours, and checklists against FSM descriptors, next-action engines, and live workspace UI.  
**Context:** CommodityBid legacy comparison language was corrected in Sprint 9A Revision. This audit surfaces **remaining** mismatches between education and the system as implemented today.

---

## Executive summary

| Module | PASS | MINOR | FAIL | GAP | Verdict |
|--------|------|-------|------|-----|---------|
| RFQ | 4 | 3 | 7 | 0 | **FAIL** |
| CommodityBid | 6 | 2 | 4 | 0 | **PARTIAL** |
| FreightIQ | 1 | 2 | 2 | 0 | **FAIL** |
| Shipment Tracking | 2 | 3 | 1 | 0 | **PARTIAL** |
| Trade Documents | 1 | 2 | 1 | 0 | **PARTIAL** |
| Communication | 0 | 0 | 0 | 3 | **GAP** |

**Top 5 systemic issues**

1. **Product tour is CommodityBid-only** for buyers and suppliers — RFQ users receive auction guidance instead of quotation workflow guidance.
2. **RFQ education collapses the proforma chain** — learning and checklists jump from supplier selection to PO, skipping `request_proforma` → `submit_proforma` → `approve_proforma`.
3. **CommodityBid education describes the target auction engine**, not the current FSM — admin triage, manual `publish_bid`, buyer `draft_award_lot`, and `start_evaluation` are omitted or described as automatic.
4. **FreightIQ learning misstates shipment creation** — carrier selection does not spawn shipments; `proceed_to_freight` on the Order workspace does.
5. **No Communication learning card** exists despite `WorkspaceCommunicationPanel` being live on five workspace types.

---

## Methodology

| Source (education) | Reference (system) |
|--------------------|-------------------|
| `apps/frontend/src/features/onboarding/pages/LearningCenterPage.tsx` — `LEARNING_CONTENT` | Workspace pages + guidance panels |
| `packages/contracts/src/onboarding.ts` — `LEARNING_CARDS`, tours, checklists | `rfq.fsm.ts`, `commoditybid.fsm.ts`, `order.fsm.ts`, `shipment.fsm.ts` |
| `packages/contracts/src/commoditybid-learning.ts` | `commoditybid.next-actions.ts`, `CommodityBidWorkspacePage.tsx` |
| `apps/backend/src/modules/onboarding/onboarding-workspace.ts` | Next-action engines per module |

**Severity key**

| Level | Meaning |
|-------|---------|
| **PASS** | Education matches implemented behavior |
| **MINOR** | Directionally correct; missing nuance, role, or prerequisite |
| **FAIL** | Education contradicts FSM, UI, or role matrix |
| **GAP** | No learning content where product capability exists |
| **VISION** | Education reflects product vision; runtime not yet implemented (CommodityBid auction engine) |

---

## 1. RFQ

### What aligns (PASS)

| Learning claim | System reality | Location |
|----------------|----------------|----------|
| "Submit for admin review" | Buyer `submit_rfq` → `RFQ_SUBMITTED`; notifies ADMIN | `rfq.fsm.ts` L83–87; `LearningCenterPage.tsx` L8 |
| Workspace guidance matches FSM | `rfq.scripts.ts` + `computeRfqNextActions` drive hero copy and next actions | `RfqWorkspacePage.tsx`, `onboarding-workspace.ts` |
| Quotation comparison in evaluation | `QuotationComparisonPanel` awards only in `UNDER_EVALUATION` | `QuotationComparisonPanel.tsx` |
| `issue_po` spawns Order workspace | `issue_po` from `PROFORMA_APPROVED` creates order | `rfq.fsm.ts`; `rfq.service.ts` |

### Findings

| ID | Severity | Learning claim | System reality | Location | Recommendation |
|----|----------|----------------|----------------|----------|----------------|
| RFQ-01 | **FAIL** | Buyer/supplier product tour guides RFQ workflow | `TOUR_STEPS_BY_ROLE` uses `COMMODITYBID_TOUR_BUYER` / `COMMODITYBID_TOUR_SUPPLIER` only — auction routes, no RFQ states | `onboarding.ts` L113–115; `commoditybid-learning.ts` L72–139 | Restore RFQ tour steps or split tour by procurement path |
| RFQ-02 | **FAIL** | LEARNING_CARDS: "Create, **publish**, and award sourcing requests" | `publish_rfq` is **ADMIN-only** (`SUPPLIERS_ASSIGNED` → `RFQ_OPEN`) | `onboarding.ts` L134; `rfq.fsm.ts` L131–134 | "Create, submit for review, and award after evaluation" |
| RFQ-03 | **FAIL** | "Once published, compare offers and select a supplier to award" | Buyer must `close_quotations_early` or wait `deadline_reached` → `QUOTATIONS_CLOSED`, then `start_evaluation` → `UNDER_EVALUATION`, then `select_supplier`. Award is not final until proforma + PO | `LearningCenterPage.tsx` L8; `rfq.fsm.ts` L196–299 | Document full chain: close → evaluate → select → proforma → PO |
| RFQ-04 | **FAIL** | Complete flow: RFQ → Quotation → Supplier selection → PO → Order → Shipment → Delivery | Omits `RFQ_SUBMITTED` admin triage, `QUOTATIONS_CLOSED`, `start_evaluation`, and proforma sub-flow (`PROFORMA_REQUESTED` → `PROFORMA_APPROVED`) | `LearningCenterPage.tsx` L12–14 | FSM-aligned end-to-end diagram |
| RFQ-05 | **FAIL** | Buyer checklist: `select_supplier` → `issue_po` (6 steps) | `issue_po` only from `PROFORMA_APPROVED`; buyer must `request_proforma` → supplier `submit_proforma` → `approve_proforma` between selection and PO | `onboarding.ts` L17–24, L319–320; `rfq.fsm.ts` L237–299 | Insert proforma steps; gate `issue_po` on `PROFORMA_APPROVED` |
| RFQ-06 | **FAIL** | `issue_po`: "Formalize the award with a PO" (follows `select_supplier`) | PO is the binding step **after proforma approval**, not immediately after supplier selection | `onboarding.ts` L320; `rfq.next-actions.ts` | "Issue PO after proforma is approved" |
| RFQ-07 | **FAIL** | Supplier `upload_documents`: "Submit **proforma** and required trade docs" → `/supplier/orders` | Proforma is RFQ action `submit_proforma` in `PROFORMA_REQUESTED` on **RFQ workspace** | `onboarding.ts` L326; `RfqWorkspacePage.tsx` L265–270 | Add `submit_proforma` step → `/supplier/rfq`; reserve trade docs for post-PO |
| RFQ-08 | **MINOR** | `receive_quotation`: "Compare supplier offers" | Step completes when any quotation exists, even while window is still open; comparison/award requires `start_evaluation` | `onboarding.ts` L318; `onboarding.engine.ts` | Split "Receive quotations" vs "Evaluate & compare" |
| RFQ-09 | **MINOR** | Checklist uses "Submit offer" | FSM action is `submit_quotation`; UI says "Submit Quotation" | `onboarding.ts` L324; `rfq.next-actions.ts` | Align terminology to "Submit quotation" |
| RFQ-10 | **MINOR** | Admin triage mentioned only in RFQ body line 1 | `assign_suppliers`, `reject_rfq`, `publish_rfq` absent from cards, complete flow, checklist | `rfq.fsm.ts` L95–134 | Document admin triage consistently across all RFQ education |

---

## 2. CommodityBid

Sprint 9A aligned narrative to the **scheduled reverse-auction product vision**. This module now passes on **terminology** (no comparison/manual-selection language) but has **runtime gaps** where education describes automation the current FSM does not yet provide.

### What aligns (PASS)

| Learning claim | System reality | Location |
|----------------|----------------|----------|
| Reverse-auction framing (not comparison software) | UI copy, next-actions, workspace guidance reframed | `commoditybid-learning.ts`, `CommodityBidWorkspacePage.tsx` |
| Buyer submits bid draft | `create_bid` → `submit_bid` → `BID_SUBMITTED` | `commoditybid.fsm.ts` L97–101 |
| Live bidding window | `BID_OPEN`; supplier `submit_bid_lot` / `revise_bid_lot` | `commoditybid.fsm.ts` L156–166 |
| Auto close on deadline | `deadline_reached` (SYSTEM) → `BID_CLOSED` | `commoditybid.fsm.ts` L191–194 |
| Buyer approval before orders | `issue_contracts` from `ACCEPTANCE_COMPLETE` | `commoditybid.fsm.ts`; workspace UI |
| Expanded Learning Center structure | Phase 1 sections rendered from `COMMODITYBID_LEARNING` | `LearningCenterPage.tsx` |

### Findings

| ID | Severity | Learning claim | System reality | Location | Recommendation |
|----|----------|----------------|----------------|----------|----------------|
| CB-01 | **VISION** | "The system schedules the auction window automatically" | Buyer `submit_bid`; admin `invite_suppliers`; admin `publish_bid` — same triage pattern as RFQ | `commoditybid-learning.ts` L44–45, L29; `commoditybid.fsm.ts` L109–148 | Label as target behavior OR add admin triage steps until auction engine ships |
| CB-02 | **VISION** | "Auction opens automatically" | `publish_bid` is **ADMIN-only** (`SUPPLIERS_INVITED` → `BID_OPEN`) | `commoditybid-learning.ts` L46; `commoditybid.fsm.ts` L145–148 | "Auction opens when admin publishes the live window" (interim) |
| CB-03 | **VISION** | "Lowest valid bid wins" / automatic winner determination | Buyer must `start_evaluation`, then manually `draft_award_lot` (radio picker in workspace), then `publish_awards` | `commoditybid-learning.ts` L47, L31; `CommodityBidWorkspacePage.tsx` L205–228; `commoditybid.fsm.ts` L210–247 | Keep vision copy; add footnote "today: buyer confirms system-ranked result" until winner engine ships |
| CB-04 | **FAIL** | Product tour is the only buyer/supplier tour | RFQ users on the same tour receive CommodityBid-only steps — see RFQ-01 | `onboarding.ts` L113–115 | Dual-path tour or role+context-aware tour selection |
| CB-05 | **MINOR** | "Qualified suppliers are invited" (buyer-centric) | `invite_suppliers` is **ADMIN** action from `BID_SUBMITTED` | `commoditybid-learning.ts` L45; `commoditybid.fsm.ts` L109–110 | "DeMaxtore invites qualified suppliers after buyer submission" |
| CB-06 | **MINOR** | Checklist step `auction_scheduled` completes at `BID_SUBMITTED` | No distinct "scheduled" state — submission ≠ scheduled auction engine | `commoditybid-learning.ts` L210+; `commodityBidChecklistProgress()` | Map checklist to observable FSM states or rename step to "Submitted for review" |

**CommodityBid verdict:** **PARTIAL PASS** — narrative alignment complete; runtime honesty pending Auction Engine Integration sprint.

---

## 3. FreightIQ

| ID | Severity | Learning claim | System reality | Location | Recommendation |
|----|----------|----------------|----------------|----------|----------------|
| FI-01 | **FAIL** | "Request freight quotes from forwarders **linked to your order**" | Forwarders live in platform directory; **admin** sends communications and intakes offers. Buyer creates request; does not self-serve quotes | `LearningCenterPage.tsx` L9; `FreightIqTab.tsx`; `freightiq.policy.ts` | "Admin sources quotes from the forwarder directory; buyer creates request and selects offer" |
| FI-02 | **FAIL** | "…and **spawn a shipment workspace**" (after carrier selection) | Shipment spawned by Order `proceed_to_freight` (`INSPECTION_COMPLETED` → `FREIGHT_REQUESTED`). `selectOffer` only links freight to existing shipment | `LearningCenterPage.tsx` L9; `order.fsm.ts` L151–159; `shipment.spawn.ts` | "After production/inspection, proceed to freight to spawn shipment; then select carrier to link freight" |
| FI-03 | **PASS** | "Compare offers, select a carrier" | `FreightIqTab` comparison view; `select-offer` action | `FreightIqTab.tsx`; `freightiq.service.ts` | Keep |
| FI-04 | **MINOR** | Card: "Request and select freight offers" | Omits admin-mediated quoting and order-state prerequisites (`PRODUCTION_COMPLETED`, `INSPECTION_COMPLETED`, `FREIGHT_REQUESTED`) | `onboarding.ts` L136; `freightiq.ts` | Expand card description with roles and eligible order states |
| FI-05 | **MINOR** | Implied buyer end-to-end quoting | `submit_offer` / forwarder comms are ADMIN-only; supplier has no FreightIQ tab | `freightiq.policy.ts` | Add role callouts in learning body |

---

## 4. Shipment Tracking

| ID | Severity | Learning claim | System reality | Location | Recommendation |
|----|----------|----------------|----------------|----------|----------------|
| ST-01 | **FAIL** | "Monitor **vessel position**" | Backend stores `lastPositionAt`; UI shows vessel name, carrier, ETA/ETD — **no map or coordinates** | `LearningCenterPage.tsx` L10; `ShipmentTrackingPanel.tsx` L82–91 | "Monitor vessel identity, ETA, and delay status" |
| ST-02 | **MINOR** | "ETA shifts" | Drift detected server-side; surfaced in Control Tower ETA drift table, not a dedicated shift timeline in shipment workspace | `tracking-alerts.ts`; `OperationsPage.tsx` | "Current ETA plus drift alerts in Control Tower" |
| ST-03 | **MINOR** | "Delay exceptions" | Two concepts: maritime `delayFlag` vs Shipment FSM `EXCEPTION` via `report_exception` | `shipment.fsm.ts`; `ShipmentTrackingPanel.tsx` | Distinguish tracking delays from operational shipment exceptions |
| ST-04 | **PASS** | "…from shipment workspace and Control Tower" | Both surfaces expose tracking data | `ShipmentWorkspacePage.tsx`; `OperationsPage.tsx` | Keep |
| ST-05 | **PASS** | Tracking is informational | Contracts explicitly state no FSM coupling for tracking sync | `shipment-tracking.ts` L2 | Keep |
| ST-06 | **MINOR** | (not mentioned) Link tracking prerequisite | User must `link-tracking` with container/booking before sync | `ShipmentTrackingPanel.tsx` L37–57 | Add: "Link container on shipment workspace to start tracking" |

---

## 5. Trade Documents

| ID | Severity | Learning claim | System reality | Location | Recommendation |
|----|----------|----------------|----------------|----------|----------------|
| TD-01 | **FAIL** | "Upload required documents (**proforma**, bill of lading, certificates)" | **Proforma is not a `TradeDocumentType`** — it belongs to RFQ workflow (`submit_proforma`) | `LearningCenterPage.tsx` L11; `trade-documents.ts` L5–15; RFQ FSM | Remove proforma; list `COMMERCIAL_INVOICE`, `PACKING_LIST`, `BILL_OF_LADING` (required defaults) |
| TD-02 | **MINOR** | "bill of lading, certificates" | `BILL_OF_LADING` required; certificates optional by default | `document-requirements.ts` | Clarify required vs optional types |
| TD-03 | **MINOR** | "**Operators** review and approve" | `approve_document` → ADMIN **and BUYER**; no mandatory `UNDER_REVIEW` gate in UI | `TradeDocumentsTab.tsx`; `documents.policy.ts` | "Buyers and operators review and approve" |
| TD-04 | **PASS** | Upload / review / compliance flow | `TradeDocumentsTab` on ORDER and SHIPMENT workspaces | `OrderWorkspacePage.tsx`; `ShipmentWorkspacePage.tsx` | Keep |
| TD-05 | **MINOR** | Card summary only | Omits workspace scope (ORDER + SHIPMENT) | `onboarding.ts` L138 | Mention both workspace types in body |

---

## 6. Workspace Communication

| ID | Severity | Learning claim | System reality | Location | Recommendation |
|----|----------|----------------|----------------|----------|----------------|
| COM-01 | **GAP** | (none) | No Learning Center card or `LEARNING_CONTENT` entry | `onboarding.ts` L133–140; `LearningCenterPage.tsx` | Add "How Workspace Communication Works" card |
| COM-02 | **GAP** | (none) | `WorkspaceCommunicationPanel` on RFQ, CommodityBid, ORDER, PO, SHIPMENT — messages, attachments, read receipts, sockets | `RfqWorkspacePage.tsx`; `CommodityBidWorkspacePage.tsx`; `OrderWorkspacePage.tsx`; `workspace-communication.ts` | Document workspace coverage, visibility scopes, message types |
| COM-03 | **GAP** | FreightIQ learning silent on comms | Freight forwarder email channel (`freight-communications.ts`) is **separate** from in-workspace messaging | `docs/sprint-5e-workspace-communication-report.md` | Cross-link FreightIQ forwarder outreach vs participant messaging |

---

## Cross-module findings

| ID | Severity | Issue | Recommendation |
|----|----------|-------|----------------|
| X-01 | **FAIL** | `complete-trade-flow` card merges RFQ and CommodityBid paths but both are oversimplified | Expand to two FSM-accurate diagrams; link to module-specific guides |
| X-02 | **MINOR** | All cards show "Video coming soon" placeholder | No functional mismatch; track as content backlog |
| X-03 | **PASS** | Workspace-level guidance (`onboarding-workspace.ts`, `rfq.scripts.ts`) is more accurate than Learning Center static copy | Prefer contract-sourced learning bodies (CommodityBid pattern) for other modules |

---

## Recommended remediation order

### Sprint A — High impact, low risk (copy only)

1. Fix RFQ `LEARNING_CONTENT` and `LEARNING_CARDS` description (RFQ-02, RFQ-03, RFQ-04)
2. Fix FreightIQ shipment-spawn claim (FI-02) and forwarder sourcing (FI-01)
3. Remove proforma from trade-documents learning (TD-01)
4. Fix tracking "vessel position" claim (ST-01)
5. Add Communication learning card (COM-01, COM-02)

### Sprint B — Onboarding structure (checklists + tours)

6. Restore or split product tour: RFQ path vs CommodityBid path (RFQ-01, CB-04)
7. Add RFQ proforma steps to buyer checklist; fix supplier proforma routing (RFQ-05, RFQ-06, RFQ-07)
8. Add CommodityBid runtime footnotes or interim admin-triage copy (CB-01, CB-02, CB-03)

### Sprint C — Contract-sourced learning (pattern from CommodityBid)

9. Extract `RFQ_LEARNING`, `FREIGHTIQ_LEARNING`, etc. into `packages/contracts/src/` with tests
10. Render expanded bodies in `LearningCenterPage.tsx` like `CommodityBidLearningBody`

---

## Acceptance criteria (this audit)

| Criterion | Result |
|-----------|--------|
| All six modules reviewed | **PASS** |
| Findings cite file locations | **PASS** |
| Legacy CommodityBid comparison noise excluded | **PASS** |
| Vision vs runtime distinguished for CommodityBid | **PASS** |
| Prioritized remediation list produced | **PASS** |

---

## Related documents

- [CommodityBid Learning Alignment Report](./commoditybid-learning-alignment-report.md) — Sprint 9A narrative alignment (PASS)
- [Sprint 9A Guided Onboarding Report](./sprint-9a-guided-onboarding-report.md) — original onboarding delivery
