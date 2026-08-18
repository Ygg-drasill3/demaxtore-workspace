# Sprint 3C — Runtime Report

**Date:** 2026-06-03  
**Status:** Operational

---

## Definition of Done checklist

| Item | Status |
|------|--------|
| Shipment FSM implemented | ✓ 50 contract tests (incl. 7 shipment) |
| Prisma migration clean | ✓ `20260605120000_sprint3c_shipment` |
| Backend runtime operational | ✓ `/api/shipments` mounted |
| Shipment spawn operational | ✓ Order `FREIGHT_REQUESTED` side-effect |
| Documents operational | ✓ POST/GET + download |
| Exception Center operational | ✓ `report_exception` / `resolve_exception` |
| Realtime operational | ✓ Socket events on every transition |
| Playwright shipment suite | ✓ 9/9 PASS |
| RFQ regressions | ✓ 11/11 PASS |
| CommodityBid regressions | ✓ 7/7 PASS |
| Order regressions | ✓ 19/19 PASS |

---

## Key modules

- `packages/contracts/src/shipment.*`
- `apps/backend/src/modules/shipment/`
- `apps/backend/src/modules/shipment/shipment.spawn.ts`
- `apps/frontend/src/features/shipment/`
- `apps/e2e/tests/06-shipment-flow.spec.ts`

---

## Spawn verification

When buyer calls `skip_inspection` or `proceed_to_freight`:

1. Order state → `FREIGHT_REQUESTED` (unchanged FSM)
2. `SHP-{orderRef}` workspace created with state `SHIPMENT_CREATED`
3. `GET /api/orders/:id/spawned-shipments` returns child list
4. Order freight section links to shipment workspace

---

## Exception flow

Categories: `VESSEL_DELAY`, `CUSTOMS_HOLD`, `DOCUMENT_MISSING`, `PORT_CONGESTION`, `DELIVERY_DELAY`, `OTHER`.

- `report_exception` → state `EXCEPTION`, row in `shipment_exceptions`
- `resolve_exception` → resume state (payload `resumeState` or default `IN_TRANSIT`)
