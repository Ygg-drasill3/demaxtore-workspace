# Sprint 3A — Architecture Delta Report

## Scope

Sprint 3A adds a **CommodityBid Runtime** parallel to the existing RFQ runtime. No RFQ FSM, routes, or UI were modified. Shared platform services are reused unchanged.

## Delta summary

| Layer | Before | After |
|-------|--------|-------|
| Contracts | RFQ FSM only | + `commoditybid.fsm.ts` (43 transitions), `commoditybid.next-actions.ts`, `commoditybid.zod.ts`, socket event names |
| Prisma | `WorkspaceType.COMMODITYBID` enum only | + 5 tables: details, lots, invitations (bidder codes), submissions, awards |
| Backend | `modules/rfq/*` | + `modules/commoditybid/*` mounted at `/api/commoditybid` |
| Frontend | Placeholder routes | + create + workspace pages, FSM-driven next actions |
| E2E | RFQ flows only | + `04-commoditybid-flow.spec.ts` |

## Integration points (reused, not forked)

- **Auth / RBAC** — existing `requireAuth`, `requireRole`
- **Timeline** — `timeline_events` append-only on every transition
- **Audit** — `audit_logs` in same transaction as FSM
- **Notifications** — `notifications` + `notification:new` socket fan-out
- **Realtime** — `socketBus` workspace rooms; CommodityBid-specific event names added to `socket-events.ts`
- **Idempotency** — global `idempotency` middleware on `/api`
- **State guard** — Postgres trigger via `SET LOCAL app.fsm_authorised = 'true'` in `applyTransition()`

## Anonymous bidding architecture

- **Bidder code** stored on `commoditybid_invitations` at invite time (`BIDDER-{A-Z}{2 digits}`)
- **Buyer comparison** (`GET /comparison`) joins submissions → invitations; returns `bidderCode` only
- **Supplier** — `GET /my-bids` (own rows only); comparison endpoint returns 403
- **Admin** — `GET /admin/identity-map` resolves code ↔ supplier (ADMIN only)

## Sealed bid

- No cross-supplier bid reads before award publication
- No ranking, scoring, or leaderboard fields in schema or APIs

## Out of scope (deferred)

- Award acceptance SLA worker (`award_acceptance_sla_expired` SYSTEM job)
- `deadline_reached` SYSTEM scheduler
- Full Order workspace UI after `issue_contracts`
- PostgreSQL RLS on `commoditybid_submissions` (Sprint 2.5 template in migration comments)

## Source of truth

Approved FSM: `docs/commoditybid-state-machine.md` → `packages/contracts/src/commoditybid.fsm.ts`
