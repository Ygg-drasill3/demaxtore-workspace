# Sprint 5D — Playwright Results

## Suite

`apps/e2e/tests/13-po-management.spec.ts`

## Scenarios

| # | Scenario | Method |
|---|----------|--------|
| 01 | Issue PO creates linked PO | API bootstrap + GET PO |
| 02 | View PO workspace | UI `/workspace/po/:id` |
| 03 | Supplier acknowledges PO | UI accept |
| 04 | Supplier requests amendment | UI |
| 05 | Buyer approves amendment | UI |
| 06 | Revision history append-only | API (≥2 revisions) |
| 07 | Control Tower alert on PO rejection | API reject + scan → `po_rejected` |
| 08 | Role isolation | Buyer cannot acknowledge (403) |
| 09 | PO dashboard widget | UI `/operations` |
| 10 | Order PO summary panel | UI order workspace |

## Regression

Run full E2E suite including RFQ, CommodityBid, Order, Shipment, FreightIQ, Trade Documents, Maritime, Control Tower, and `13-po-management`.

```bash
cd apps/e2e && npx playwright test
```

## Latest run

| Suite | Result |
|-------|--------|
| `13-po-management.spec.ts` | **10/10 PASS** |
| Full regression (96 tests) | **96/96 PASS** |

### CT alert lookup stabilisation

E2E tests now use `GET /api/control-tower/alerts?workspaceId=…&alertKey=…&resolved=false` via `findOpenAlert()` in `_helpers.ts` (not `limit=200` pagination hacks).

Full regression: `cd apps/e2e && npx playwright test` with backend and frontend running.
