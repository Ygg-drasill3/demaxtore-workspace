# Sprint 13E — BulkContainer FreightIQ Integration Report

## Approach

No new FreightIQ logic was built. Supplier orders spawned from BulkContainer allocations become standard Order workspaces and inherit existing FreightIQ eligibility.

## Eligibility

Orders become FreightIQ-eligible when they reach:

- `PRODUCTION_COMPLETED`
- `INSPECTION_COMPLETED`
- `FREIGHT_REQUESTED`

Same rules as RFQ/CommodityBid/SmartContainer-spawned orders (`FREIGHTIQ_ORDER_ELIGIBLE_STATES` / `isOrderEligibleForFreight()`).

## Integration Path

```
BulkContainer allocation
  → spawn Order (ORDER_CREATED)
  → supplier confirms → production → skip inspection
  → FREIGHT_REQUESTED (+ shipment spawn side effect)
  → POST /freightiq/orders/:id/actions/create-request
```

## Control Tower

- `bulkcontainer_freight_pending` — orders eligible but no freight request on linked supplier orders

## E2E Validation

Test 04 in `38-bulkcontainer-execution-bridge.spec.ts` confirms freight request creation on a BulkContainer-spawned order.

## Status

✓ Existing FreightIQ reused — no duplicate freight workflow
