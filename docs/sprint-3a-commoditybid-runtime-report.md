# Sprint 3A — CommodityBid Runtime Report

## FSM

- **Descriptor:** `packages/contracts/src/commoditybid.fsm.ts`
- **States:** 13 (approved doc §2)
- **Transitions:** 43 (approved doc §3)
- **Terminal:** `CONTRACTS_ISSUED`, `CANCELLED`, `EXPIRED`, `CLOSED_NO_AWARD`

## Backend module

`apps/backend/src/modules/commoditybid/`

| File | Role |
|------|------|
| `commoditybid.service.ts` | Sole `workspaces.state` mutator via `applyTransition()` |
| `commoditybid.service.read.ts` | Draft create, list, DTO, comparison, admin identity map |
| `commoditybid.controller.ts` | HTTP handlers + action router |
| `commoditybid.routes.ts` | REST + `/actions/*` + `/lots/:lotId/bids` |
| `commoditybid.policy.ts` | Participation + sealed-bid visibility |
| `commoditybid.preconditions.ts` | FSM symbolic preconditions |
| `commoditybid.notifications.ts` | Notify recipient resolver |
| `commoditybid.sealed-bid.test.ts` | 3 HTTP invariant tests |

## API surface (key)

| Method | Path | Actor |
|--------|------|-------|
| POST | `/api/commoditybid` | BUYER — create draft |
| POST | `/api/commoditybid/:id/actions/submit` | BUYER |
| POST | `/api/commoditybid/:id/actions/invite-suppliers` | ADMIN — assigns bidder codes |
| POST | `/api/commoditybid/:id/actions/publish` | ADMIN |
| POST | `/api/commoditybid/:id/lots/:lotId/bids` | SUPPLIER — submit/revise |
| DELETE | `/api/commoditybid/:id/lots/:lotId/bids` | SUPPLIER — withdraw |
| GET | `/api/commoditybid/:id/comparison` | BUYER/ADMIN — anonymous |
| POST | `/api/commoditybid/:id/actions/draft-award` | BUYER — select winner |
| POST | `/api/commoditybid/:id/actions/publish-awards` | BUYER — publish award |
| POST | `/api/commoditybid/:id/actions/issue-contracts` | BUYER — spawn ORDER workspaces |

## Socket events (post-commit)

- `commoditybid.updated`
- `commoditybid.timeline.appended`
- `commoditybid.bid.submitted` / `.revised` / `.withdrawn`
- `commoditybid.award.published`

## Next actions

`computeCommodityBidNextActions()` in `packages/contracts/src/commoditybid.next-actions.ts` — consumed by `GET /next-actions` and frontend workspace.

## E2E flow validated

Buyer create → Admin invite + publish → Suppliers bid/revise → Buyer close + evaluate → Compare (bidder codes) → Draft award → Publish awards.

## Known gaps (non-blocking for 3A)

- SYSTEM transitions: `deadline_reached`, `award_acceptance_sla_expired`, `all_awards_finalised` (partial: `all_awards_finalised` hook on supplier accept)
- Lot CRUD self-loop actions via dedicated endpoints (draft edit uses create payload only)
- Clarification thread UI not wired (FSM `post_clarification` ready)
