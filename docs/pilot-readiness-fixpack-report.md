# Pilot Readiness Fix Pack — Implementation Report

**Date:** 2026-06-04  
**Scope:** FIX-01, FIX-02, FIX-03 only (audit Critical findings)  
**Out of scope:** New modules, FSMs, dashboards, FreightIQ/Shipment/AI features, UX redesign

---

## Summary

| Fix | Status | Notes |
|-----|--------|-------|
| FIX-01 Orders list | Done | `GET /api/orders`, `OrdersListPage`, buyer/supplier/admin routes |
| FIX-02 RFQ → Order bridge | Done | `spawned-orders` wired in UI; WHN fallback navigates to order |
| FIX-03 Navigation cleanup | Done | Placeholder menu items removed; only working routes in sidebar |

---

## FIX-01 — Orders List Runtime

### Backend

- `GET /api/orders` with `ListOrderQuery` (`bucket`, `q`, `sort`, `cursor`, `limit`)
- Role scoping: buyer → OWNER participant; supplier → COUNTERPARTY; admin → all
- Columns: order ref, buyer, supplier, state, created, shipment count, PO ref, last activity
- Search: `externalRef`, `contractRef`, `poNumber`

**Files:** `order.routes.ts`, `order.controller.ts`, `order.service.ts`, `packages/contracts/src/order.zod.ts`

### Frontend

- `OrdersListPage` at `/buyer/orders`, `/supplier/orders`, `/admin/orders`
- Filters: Active / Completed / Cancelled / All
- Sort: Newest / Oldest / Last activity
- Row action: **Open order** → `/workspace/order/:id`

**Files:** `OrdersListPage.tsx`, `useOrderList.ts`, `order.api.ts`, `OrderStateBadge.tsx`

---

## FIX-02 — RFQ → Order Bridge

### Backend

- Existing `GET /api/rfq/:id/spawned-orders` — no change required

### Frontend

- `rfqApi.spawnedOrders()`
- `RfqSpawnedOrdersPanel` on RFQ workspace when `state === PO_ISSUED`
- `vars.orderId` fed from first spawned order for WHN template `{{orderId}}`
- `WhatHappensNextCard` fallback CTA uses `navigate()` when `fallbackPrimary.href` resolves

**Files:** `rfq.api.ts`, `RfqSpawnedOrdersPanel.tsx`, `RfqWorkspacePage.tsx`, `WhatHappensNextCard.tsx`

---

## FIX-03 — Navigation Cleanup

### Removed from sidebar (no working list/page)

| Role | Removed items |
|------|----------------|
| Buyer | Documents |
| Supplier | CommodityBid Invites, Documents |
| Admin | CommodityBids, Suppliers, Documents, Messages, Settings |

### Kept (working runtime)

| Role | Items |
|------|-------|
| Buyer | Dashboard, RFQs, Commodity Bids, Orders, Notifications |
| Supplier | Dashboard, RFQs, Orders, Notifications |
| Admin | Operations, Freight ops, Forwarders, Dashboard, RFQs, Orders, Notifications |

PO and Shipment remain workspace-only (no list API — hidden per FIX-03 rule).

---

## UX consistency pass (lightweight)

- Orders list uses same card/table/filter pattern as `RfqListPage`
- RFQ spawned-orders panel mirrors CommodityBid `cb-spawned-orders` section
- Breadcrumb label `orders` already present in `Header.tsx`
- No layout redesign on Order workspace

---

## Tests

- New E2E: `apps/e2e/tests/15-pilot-readiness.spec.ts`
- Covers: RFQ → PO → spawned orders UI → WHN link → Orders menu → search/filter → shipment link → nav dead-end scan → role isolation

**Regression:** Run full `apps/e2e` suite locally after `yarn dev:backend` + `yarn dev:frontend` and seeded DB.

---

## Definition of done checklist

- [x] Orders list exists
- [x] RFQ → Order bridge exists
- [x] Spawned orders visible on RFQ
- [x] Navigation cleaned
- [x] No placeholder routes in primary navigation
- [x] UX consistency pass (pattern alignment only)
- [ ] Playwright PASS (run locally)
- [ ] Full regression PASS (run locally)
