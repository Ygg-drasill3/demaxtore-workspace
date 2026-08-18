# Pilot Readiness — Playwright Results

**Date:** 2026-06-04  
**Spec:** `apps/e2e/tests/15-pilot-readiness.spec.ts`  
**Environment:** `localhost:3000` (frontend), `localhost:8001` (backend)

---

## Status

| Suite | Status | Notes |
|-------|--------|-------|
| `15-pilot-readiness.spec.ts` | **Pending local run** | Implemented; not executed in CI agent environment (no Node/yarn in sandbox) |

---

## Scenarios (13 tests, serial)

| # | Scenario | Assertion |
|---|----------|-----------|
| 01 | Buyer creates RFQ | Workspace URL |
| 02 | Admin assign + publish | — |
| 03 | Supplier quotation | SUBMITTED badge |
| 04 | Buyer select + PO issue | `rfq-state-badge-PO_ISSUED` |
| 05 | Spawned orders on RFQ | `rfq-spawned-orders` visible |
| 06 | Open order via WHN fallback | `/workspace/order/:id` |
| 07 | Orders menu → list → open | `orders-list-page`, row link |
| 08 | Search + bucket filter | empty / active rows |
| 09 | Shipment from order | `shipment-workspace` |
| 10–12 | Nav dead ends | no `placeholder-page` per role |
| 13 | Role isolation | buyer2 does not see buyer1 order row |

---

## How to run

```bash
# Terminal 1 — backend (port 8001 per apps/backend/.env)
yarn dev:backend

# Terminal 2 — frontend
yarn dev:frontend

# Terminal 3 — E2E (after DB migrate + seed)
cd apps/e2e && npx playwright test tests/15-pilot-readiness.spec.ts

# Full regression
cd apps/e2e && npx playwright test
```

---

## Expected full regression suites

Per fix-pack definition: RFQ, CommodityBid, Order, Shipment, FreightIQ, Trade Documents, PO Management, Workspace Communication, Control Tower, Maritime Tracking, Pilot Readiness — all specs under `apps/e2e/tests/`.
