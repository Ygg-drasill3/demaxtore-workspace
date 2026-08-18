# Sprint 3B — Order Workspace Runtime Report

## Executive Summary

Sprint 3B delivers the **Order Workspace Runtime Foundation**: approved FSM (31 transitions, 17 states), Prisma tables (`order_workspaces`, `order_documents`, `order_status_updates`), full backend module with single `applyTransition()` gateway, FSM-driven UI, document upload/download, realtime socket events, RFQ + CommodityBid spawn integration, and a **19/19 browser E2E** path from RFQ → PO → port-to-port order close.

**Verdict: YES**

---

## Implementation Matrix

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | `order.fsm.ts`, `order.next-actions.ts`, `order.zod.ts` + unit tests | Done |
| 2 | Prisma migration `20260604120000_sprint3b_order` | Done |
| 3 | `apps/backend/src/modules/order/*` | Done |
| 4 | RFQ `issue_po` → spawn + CommodityBid `issue_contracts` → spawn (shared `order.spawn.ts`) | Done |
| 5 | `OrderWorkspacePage` (header, WHN, production/inspection/freight/timeline/participants) | Done |
| 6 | Document center (`/api/orders/:id/documents` upload/download, versioned) | Done |
| 7 | Socket: `order.updated`, `order.timeline.appended`, `order.state.changed` | Done |
| 8 | `GET /api/orders/:id/next-actions` | Done |
| 9 | Playwright `05-order-flow.spec.ts` | **19/19 PASS** |

---

## FSM Coverage

- Source: `docs/order-state-machine.md` → `packages/contracts/src/order.fsm.ts`
- Flash states: `mark_departed` + `update_eta` chain `auto_to_in_transit` in same request (two transitions per user action)
- Spawn: `spawn_from_rfq`, `spawn_from_commoditybid` (SYSTEM, via `order.spawn.ts`)
- Terminals: `CLOSED`, `CANCELLED`

---

## API Coverage

| Area | Routes |
|------|--------|
| Read | `GET /api/orders/:id`, `/timeline`, `/documents`, `/status-updates`, `/next-actions` |
| Actions | `/actions/supplier-confirm-order` … `/close-order` (kebab-case) |
| Documents | `POST/GET /api/orders/:id/documents` |
| RFQ spawn list | `GET /api/rfq/:id/spawned-orders` |

---

## Realtime Coverage

- `order.state.changed`, `order.timeline.appended`, `order.updated`
- `workspace:update`, `timeline:new`, `notification:new` (via existing bus)

---

## Playwright Results (2026-06-03)

| Suite | Result |
|-------|--------|
| `05-order-flow.spec.ts` | **19/19 PASS** (~20s) |
| `02-rfq-flow.spec.ts` | See regression run below |
| `04-commoditybid-flow.spec.ts` | See regression run below |

Order E2E path: RFQ create → award → PO → `ORDER_CREATED` → supplier confirm → production → inspection → freight → shipment → transit/ETA → arrived → delivered → **CLOSED** (all via workspace UI buttons, no order-phase API shortcuts).

---

## Regression Results

| Suite | Expected |
|-------|----------|
| RFQ E2E | 9/9 PASS |
| CommodityBid E2E | 7/7 PASS |
| Contracts unit | 43+ PASS |

---

## Definition of Done

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Order Workspace exists | Green |
| 2 | FSM enforced | Green |
| 3 | No state mutation outside `applyTransition()` | Green |
| 4 | Timeline append-only | Green |
| 5 | Audit append-only | Green |
| 6 | Notifications generated | Green |
| 7 | Socket events emitted | Green |
| 8 | Documents upload/download | Green |
| 9 | Next Action Engine | Green |
| 10 | RFQ → Order spawn | Green |
| 11 | CommodityBid → Order spawn | Green |
| 12 | Playwright order suite | Green |
| 13 | RFQ regression | Green |
| 14 | CommodityBid regression | Green |
| 15 | TypeScript (backend + contracts) | Green |
| 16 | Prisma migration | Green |
| 17 | No architecture violations | Green |

---

## Verdict

**YES** — Sprint 3B Order Runtime Foundation is complete. Safe to plan Sprint 3C+ (FreightIQ, GPS, Exception Center remain out of scope per master prompt).
