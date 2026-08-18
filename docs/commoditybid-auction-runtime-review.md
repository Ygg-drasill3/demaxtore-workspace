# CommodityBid Auction Runtime Review — Sprint 9B Phase 1

**Date:** 2026-06-05  
**Goal:** Reuse before rewriting.

## Verdict

The existing CommodityBid module provides a **solid workspace shell** (FSM `applyTransition`, Prisma models, scheduler lock, sockets, order spawn) but implements a **sealed-bid + manual award** workflow. Sprint 9B replaces the state model and adds `auction-engine.ts` + `winner-engine.ts` while reusing infrastructure below.

---

## Reuse (keep / extend)

| Component | Location | Reuse |
|-----------|----------|-------|
| FSM applyTransition shell | `commoditybid.service.ts` | Audit, timeline, notifications, socket defer |
| Workspace + participants | `schema.prisma` `Workspace` | Auction container |
| Lots | `CommodityBidLot` | Multi-lot auctions |
| Invitations + bidder codes | `CommodityBidInvitation` | Extend with status tracking |
| Submissions | `CommodityBidSubmission` | Live bid store (upsert per supplier/lot) |
| Awards | `CommodityBidAward` | Winner record → order spawn |
| Scheduler lock | `commoditybid.scheduler.ts` | Extend for start/close/warnings |
| Socket bus | `socket-bus` | Add `auction.*` events |
| Order spawn | `issue_contracts` → `spawnOrderWorkspace` | Hook after buyer approval |
| Policy / RLS | `commoditybid.policy.ts`, `rls.ts` | ACL unchanged |
| Communication | `WorkspaceCommunicationPanel` | In-workspace messaging |
| Control Tower scanner | `alert-engine.ts` `scanCommodityBid` | Extend alert keys |

---

## Rewrite (auction engine)

| Area | Current | Target |
|------|---------|--------|
| FSM states | `BID_OPEN`, `UNDER_EVALUATION`, manual `draft_award_lot` | `SCHEDULED` → `LIVE` → `WINNER_IDENTIFIED` → `AWAITING_BUYER_APPROVAL` |
| Winner selection | Buyer radio-picks submission | `winner-engine.ts` auto lowest valid bid |
| Auction open | Admin `publish_bid` | SYSTEM `auction_started` at `auctionStartsAt` |
| Invitations | Admin `invite_suppliers` | SYSTEM `start_invitations` on schedule |
| Bid rules | Any price on revise | Must beat current lowest (reverse auction) |
| Buyer UI | Comparison table | Live feed, countdown, winner summary, approve/reject |
| Supplier acceptance loop | `AWARDS_PUBLISHED` + SLA | Removed — buyer approval only |

---

## Existing runtime inventory

### Scheduler (`commoditybid.scheduler.ts`)
- `processBidDeadlines()` — `BID_OPEN` + `deadlineAt` → close
- `processAwardSla()` — award acceptance SLA
- **Extend:** invitation dispatch, auction start, 5m/1m warnings, auction close, winner selection

### Routes (`commoditybid.routes.ts`)
- 12 action endpoints; **Add:** `schedule`, `approve-winner`, `reject-result`
- **Deprecate UI paths:** `draft-award`, `publish-awards`, `accept-award`, manual `publish`

### Notifications (`commoditybid.notifications.ts`)
- **Gap:** `SELECTED_SUPPLIER` target not implemented — fix in 9B

### Frontend
- `CommodityBidWorkspacePage.tsx` — monolithic; **Replace** with auction sections
- `CommodityBidCreatePage.tsx` — add auction date/time/duration/suppliers

---

## Migration strategy

SQL maps legacy states → auction states for in-flight workspaces:

| Legacy | New |
|--------|-----|
| `BID_SUBMITTED` | `SCHEDULED` |
| `SUPPLIERS_INVITED` | `INVITING_SUPPLIERS` |
| `BID_OPEN` | `LIVE` |
| `BID_CLOSED` | `CLOSED` |
| `UNDER_EVALUATION` | `WINNER_IDENTIFIED` |
| `AWARDS_PUBLISHED` | `AWAITING_BUYER_APPROVAL` |
| `ACCEPTANCE_COMPLETE` | `APPROVED` |
| `CONTRACTS_ISSUED` | `ORDERS_SPAWNED` |

---

## Sprint 9B deliverables mapped

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | This document | ✓ |
| 2 | Auction scheduling FSM + schema | In progress |
| 3 | Invitation engine | In progress |
| 4–5 | `auction-engine.ts` + sockets | In progress |
| 6–7 | `winner-engine.ts` + buyer approval | In progress |
| 8 | Order spawn on `spawn_orders` | Reuse `issue_contracts` |
| 9 | Workspace redesign | In progress |
| 10–12 | Control Tower + audit | In progress |
| 11 | Learning alignment | In progress |
| 13 | Admin analytics | In progress |
| 14–15 | Playwright + regression | Pending |
