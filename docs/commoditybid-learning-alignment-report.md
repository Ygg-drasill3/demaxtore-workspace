# CommodityBid Learning & Onboarding Alignment Report

**Sprint:** 9A Revision  
**Date:** 2026-06-05  
**Scope:** Content and guidance only — no FSM, database, or workflow changes.

## Verdict: **PASS**

CommodityBid user-facing learning, onboarding, tours, contextual guidance, and workspace copy now describe a **scheduled reverse-auction engine** with automatic lowest-valid-bid winner determination and buyer approval before execution.

---

## Alignment summary

| Area | Status | Notes |
|------|--------|-------|
| Learning Center | PASS | Full reverse-auction structure in expanded CommodityBid card |
| Guided onboarding | PASS | New `CommodityBidOnboardingCard` + workspace checklist panel |
| First Trade checklist | PASS | 7-step auction model on workspace |
| Product tour | PASS | Buyer/supplier tour steps updated |
| Contextual guidance | PASS | State-based auction stage messages in API + UI panel |
| Legacy comparison language | PASS | Removed/reframed in CommodityBid surfaces |

---

## Text replacements

| Location | Legacy text | Updated text | Reason |
|----------|-------------|--------------|--------|
| `packages/contracts/src/onboarding.ts` — `LEARNING_CARDS` | "Run sealed-bid auctions for commodity lots." | "Scheduled reverse-auction engine for commodity procurement." | Product vision |
| `LearningCenterPage.tsx` | "Invite suppliers, open bidding windows, and publish awards to spawn orders." | Full `COMMODITYBID_LEARNING` sections (What Is / How It Works / Roles / Automatic) | Phase 1 structure |
| `LearningCenterPage.tsx` — `complete-trade-flow` | RFQ-only linear flow | RFQ path + CommodityBid auction path | Dual procurement models |
| `commoditybid.next-actions.ts` — `publish_bid` | "Open bidding to invited suppliers" | "Open the live auction window for invited suppliers" | Live auction framing |
| `commoditybid.next-actions.ts` — `draft_award_lot` | "Select Winner" / "Draft award" | "Confirm Winner" / "Confirm the automatically identified lowest valid bid" | No manual selection narrative |
| `commoditybid.next-actions.ts` — `publish_awards` | "Publish Award" | "Publish Result" | Winner determination, not manual award |
| `commoditybid.next-actions.ts` — `start_evaluation` | "Review anonymous sealed bids" | "Auction closed — lowest valid bid is being determined" | Automatic winner |
| `commoditybid.next-actions.ts` — `accept_award_lot` | "Accept Award" | "Confirm Participation" | Post-auction confirmation |
| `commoditybid.next-actions.ts` — `issue_contracts` | "Spawn Order workspaces per winning supplier" | "After buyer approval, spawn order workspaces" | Buyer approval gate |
| `onboarding.ts` — `TOUR_STEPS_BY_ROLE` BUYER | RFQ / Orders / Shipments mixed tour | Full `COMMODITYBID_TOUR_BUYER` (5 steps: create, timer, live, winner, approval) | Phase 5 — auction-only tour |
| `onboarding.ts` — `TOUR_STEPS_BY_ROLE` SUPPLIER | RFQ quotations tour | Full `COMMODITYBID_TOUR_SUPPLIER` (invite, live bid, result, orders) | Phase 5 — auction-only tour |
| `commoditybid-learning.ts` — `whatIs` | Generic engine description | Exact: "CommodityBid is a competitive reverse-auction engine for commodity procurement." | Phase 1 spec |
| `commoditybid-learning.ts` — `COMMODITYBID_GUIDED_ACTIONS` | (new) | Create auction → Monitor participation → Watch live bidding → Review result → Approve execution | Phase 2 guided card |
| `commoditybid.next-actions.ts` — `close_without_award` | "Close — No Award" | "Close without winner" | No manual award language |
| `commoditybid-learning.ts` — `BID_CLOSED` / `UNDER_EVALUATION` | "Finalising bids before winner determination" | "Lowest valid bid identified." | Phase 3 after-auction copy |
| `onboarding-workspace.ts` | Generic "Wait for auction milestones" | `commodityBidWorkspaceGuidance(state)` per stage | Phase 3 |
| `CommodityBidWorkspacePage.tsx` | "Your sealed bid" | "Your live bid" | Live bidding |
| `CommodityBidWorkspacePage.tsx` | "Anonymous bid comparison" | "Live auction results" + auto winner note | No comparison table narrative |
| `CommodityBidWorkspacePage.tsx` | "Select Winner" button | "Confirm winning bid" | Buyer approval framing |
| `CommodityBidWorkspacePage.tsx` | "Your award(s)" / "Accept Award" | "Winning auction result" / "Confirm participation" | Auction result language |
| `CommodityBidWorkspacePage.tsx` | "Issue Contracts" | "Start order execution" | Order execution phase |
| `CommodityBidCreatePage.tsx` | (none) | Reverse-auction subtitle | Create flow education |

---

## New artifacts

| File | Purpose |
|------|---------|
| `packages/contracts/src/commoditybid-learning.ts` | Single source of truth for auction content |
| `CommodityBidOnboardingCard.tsx` | Buyer dashboard guided checklist |
| `CommodityBidChecklistPanel.tsx` | Workspace First Trade progress |
| `commoditybid-learning.test.ts` | Contract tests for content |

---

## Intentionally unchanged (out of scope)

- FSM states and transition actions (`commoditybid.fsm.ts`)
- Database schema
- Auction scheduler, invitation engine, live bidding runtime, winner engine
- RFQ onboarding checklist (remains RFQ-specific; CommodityBid has parallel content)
- Comparison API endpoint (`/comparison`) — runtime data path unchanged; UI copy reframed only

---

## Acceptance criteria

| Criterion | Result |
|-----------|--------|
| Learning Center matches reverse-auction vision | PASS |
| Guided onboarding matches auction model | PASS |
| First Trade checklist matches auction model | PASS |
| Product Tour matches auction model | PASS |
| Contextual guidance matches auction stages | PASS |
| No comparison-centric CommodityBid language | PASS |
| No manual supplier-selection CommodityBid language | PASS |
| Alignment report produced | PASS |
