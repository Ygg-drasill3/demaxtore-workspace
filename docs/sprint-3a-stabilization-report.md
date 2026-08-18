# Sprint 3A Stabilization Report

**Period:** 2026-06-03 (2–4 day scope)  
**Goal:** Raise CommodityBid from **MOSTLY YES** to **YES** — same bar as RFQ: real buyer + real supplier can complete the full runtime path without manual intervention.

## Gaps closed

### 1. SYSTEM schedulers

| FSM action | Runtime | File |
|------------|---------|------|
| `deadline_reached` | Yes | `commoditybid.scheduler.ts` → `processBidDeadlines()` |
| `deadline_reached_no_bids` | Yes | Same (zero active bids → `EXPIRED`) |
| `award_acceptance_sla_expired` | Yes | `processAwardSla()` + award `EXPIRED` side effect |

- Started from `server.ts` via `startCommodityBidScheduler()` (interval: `SLA_WORKER_INTERVAL_MS`).
- Integration tests: `commoditybid.scheduler.test.ts` (2 cases).

### 2. Award acceptance runtime

- API: `POST .../actions/accept-award`, `decline-award`; `GET .../my-awards`, `.../spawned-orders`.
- Frontend: supplier awards panel (`cb-supplier-awards`, `cb-accept-award`), buyer issue contracts (`cb-issue-contracts-panel`, `cb-issue-contracts`), spawned orders list.
- `checkAllAwardsFinalised()` runs synchronously after accept/decline/SLA (no race on `ACCEPTANCE_COMPLETE`).

### 3. Playwright E2E (full post-award path)

| # | Scenario | Result |
|---|----------|--------|
| 1–4 | Create → Invite → Publish → Bid → Compare → Award | PASS |
| 5 | Supplier accepts award via UI | PASS |
| 6 | Buyer issues contracts via UI | PASS |
| 7 | Spawned orders API lineage (`ORDER_CREATED`, `ORD-*`) | PASS |

**CommodityBid E2E:** 7/7 PASS (~5.6s)

### 4. RLS (Sprint 3A.1 — non-blocking for 3B)

- Migration `20260603140000_sprint3a1_commoditybid_rls` on `commoditybid_submissions`.
- `withRlsUser()` sets `app.current_user_id` for comparison and `my-bids` reads.
- Middleware remains primary guard; PostgreSQL adds defence-in-depth for sealed-bid anonymity.

## Sprint 3B entry gate (all green)

| Control | Status |
|---------|--------|
| RFQ Runtime | **YES** |
| CommodityBid Runtime | **YES** |
| CommodityBid E2E | **YES** (7/7) |
| Award Acceptance | **YES** (E2E #05) |
| Order Spawn | **YES** (E2E #06–07) |
| Scheduler Jobs | **YES** (runtime + 2 integration tests) |
| RFQ Regression | **PASS** (9/9 flow + 2/2 realtime = 11/11) |
| CommodityBid Regression | **PASS** (7 E2E + 3 sealed-bid + 2 scheduler + 13 FSM unit) |

## Test run summary (2026-06-03)

```
04-commoditybid-flow.spec.ts     7/7 PASS
02-rfq-flow.spec.ts              9/9 PASS
03-realtime-and-isolation.spec.ts 2/2 PASS
@dmx/contracts                   35/35 PASS
commoditybid.sealed-bid.test.ts  3/3 PASS
commoditybid.scheduler.test.ts   2/2 PASS
```

## Verdict

**CommodityBid = YES** — safe to proceed to **Sprint 3B (Order Workspace Runtime)** per product gate.

## Deferred (not 3B blockers)

- RFQ-parity UX polish (drawers, activity strip, lot admin).
- Full notification/socket assertions in E2E 05–07.
- Broader RLS on all CommodityBid tables (submissions only in 3A.1).
