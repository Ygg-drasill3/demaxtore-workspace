# Sprint 5A — FreightIQ Foundation Report

## Summary

Sprint 5A introduces **FreightIQ** as an operational freight coordination layer on top of the existing Order workflow. FreightIQ does **not** sell freight, run public bidding, integrate carriers, or auto-create shipments. It coordinates **request → offer → selection** with audit, timeline, notifications, Control Tower alerts, and realtime events.

No RFQ, CommodityBid, Order, or Shipment FSM files were modified.

## Delivered

| Phase | Item | Status |
|-------|------|--------|
| 1 | `packages/contracts/src/freightiq.ts` (modes, statuses, actions, DTOs) | ✓ |
| 2 | `freight_requests`, `freight_offers`, `freight_selections` + migration `20260612120000_sprint5a_freightiq` | ✓ |
| 3 | `freightiq.zod.ts`, `freightiq.test.ts` (Vitest) | ✓ |
| 4 | `apps/backend/src/modules/freightiq/*` — `applyFreightAction()` gateway | ✓ |
| 5 | Order workspace FreightIQ section (`FreightIqTab`) | ✓ |
| 6 | Offer workflow + shipment linkage (existing spawned shipment only) | ✓ |
| 7 | Comparison view (lowest price, fastest transit, expiring soon — no AI scoring) | ✓ |
| 8 | Control Tower freight alerts (`FREIGHT` category) | ✓ |
| 9 | `/operations/freight` admin ops overview | ✓ |
| 10 | Socket events (`freight.request.created`, `freight.offer.*`) | ✓ |
| 11 | Append-only audit (`freight.request.created`, `freight.offer.*`) | ✓ |
| 12 | `10-freightiq-foundation.spec.ts` | ✓ |

## Domain flow

```
Order (eligible state)
  → Freight Request (operator/buyer)
  → Freight Offers (operator/supplier)
  → Buyer comparison + selection
  → Shipment linkage (if shipment workspace already spawned)
```

## API

| Method | Path | Role |
|--------|------|------|
| GET | `/api/freightiq/orders/:orderId` | Order participants |
| POST | `/api/freightiq/orders/:orderId/actions/create-request` | BUYER, ADMIN |
| POST | `/api/freightiq/orders/:orderId/actions/submit-offer` | ADMIN, SUPPLIER |
| POST | `/api/freightiq/orders/:orderId/actions/revise-offer` | ADMIN, SUPPLIER |
| POST | `/api/freightiq/orders/:orderId/actions/withdraw-offer` | ADMIN, SUPPLIER |
| POST | `/api/freightiq/orders/:orderId/actions/select-offer` | BUYER, ADMIN |
| POST | `/api/freightiq/orders/:orderId/actions/cancel-request` | BUYER, ADMIN |
| GET | `/api/freightiq/operations/overview` | ADMIN |

## Control Tower alerts

| Key | Severity | Condition |
|-----|----------|-----------|
| `freight_no_offer_72h` | WARNING | Open request, no offers, age ≥ 72h |
| `freight_offer_expired` | WARNING | Active offer past `valid_until` |
| `freight_selected_no_shipment` | CRITICAL | Selection exists, no `shipmentWorkspaceId` |

Scanned via existing `POST /api/control-tower/scan` (`freightiq-alerts.ts` in alert engine).

## Order eligibility (no FSM change)

Freight requests may be created when the order is in:

- `PRODUCTION_COMPLETED`
- `INSPECTION_COMPLETED`
- `FREIGHT_REQUESTED`

Mapped in `FREIGHTIQ_ORDER_ELIGIBLE_STATES` (`packages/contracts/src/freightiq.ts`).

## Out of scope (honoured)

Freight marketplace, carrier APIs, booking automation, GPS/IoT, route optimization, AI pricing, customs, invoicing, automatic shipment creation.
