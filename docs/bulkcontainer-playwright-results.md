# Sprint 13E — BulkContainer Playwright Results

## Test File

`apps/e2e/tests/38-bulkcontainer-execution-bridge.spec.ts`

## Configuration

- API: `E2E_API_URL=http://localhost:3001`
- Frontend: `http://localhost:3000`

## Results

| # | Test | Status |
|---|------|--------|
| 01 | Bootstrap container to BC_EXECUTION_READY | PASS |
| 02 | Spawn master and supplier orders | PASS |
| 03 | Buyer execution dashboard | PASS |
| 04 | FreightIQ and Shipment via existing Order runtime | PASS |
| 05 | Order linking and timeline | PASS |
| 06 | Control Tower execution alerts | PASS |

**Total: 6/6 PASS**

## Validations

- Master order ref matches `BC-EXEC-YYYY-NNNNN`
- Supplier order spawned per allocation
- `bc_order_links` populated (via execution API)
- Buyer execution page shows master order and allocation progress (no supplier codes)
- FreightIQ `create-request` on spawned order
- `spawned-shipments` after skip-inspection
- Timeline includes `orders_spawned`
- Control Tower `bulkcontainer_shipment_pending` alert

## Date

2026-06-09
