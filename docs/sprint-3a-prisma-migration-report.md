# Sprint 3A — Prisma Migration Report

## Migration

- **Name:** `20260603120000_sprint3a_commoditybid`
- **Path:** `apps/backend/prisma/migrations/20260603120000_sprint3a_commoditybid/migration.sql`
- **Status:** Applied successfully on local PostgreSQL 15

## Tables created

| Table | Purpose |
|-------|---------|
| `commoditybid_details` | Workspace satellite (title, description, rejection metadata) |
| `commoditybid_lots` | Per-lot commodity specs (qty, uom, specs JSON) |
| `commoditybid_invitations` | Supplier invite + **anonymous `bidder_code`** |
| `commoditybid_submissions` | Sealed bids per (lot, supplier); price, lead time, MOQ, terms |
| `commoditybid_awards` | Per-lot awards (DRAFT → PUBLISHED → ACCEPTED / DECLINED / …) |

## Constraints

- `commoditybid_submissions`: unique `(lot_id, supplier_user_id)`
- `commoditybid_invitations`: unique `(workspace_id, supplier_user_id)` and `(workspace_id, bidder_code)`
- **Partial unique index** `commoditybid_awards_active_unique` on `(lot_id, supplier_user_id)` WHERE `status IN ('DRAFT','PUBLISHED','ACCEPTED')`

## Workspace reuse

Existing `workspaces` row fields used:

- `type = COMMODITYBID`
- `state` — FSM string (13 approved states)
- `currency` — immutable after `publish_bid` (enforced in app layer)
- `deadline_at`, extension counters — same as RFQ
- `spawned_from_id` — for `issue_contracts` → `ORDER` children

## RLS placeholder

Migration includes commented SQL template for Sprint 2.5 RLS on submissions (Decision #15).

## Client generation

`yarn prisma:generate` — Prisma Client v5.22.0 regenerated with new models.

## Seed

No CommodityBid seed rows added (runtime-created via API/E2E). Existing RFQ seed unchanged.
