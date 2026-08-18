# Sprint 6A — Margin Engine Report

## Components

| File | Role |
|------|------|
| `freight-commercial.util.ts` | `computeDisplayPrice`, `resolveIntakeCommercial`, `displayPriceForOffer`, `commercialFromOffer` |
| `freight-commercial.policy.ts` | Admin-only commercial visibility |
| `freight-commercial.service.ts` | Margin set/update, role mapping, CIF summary, ledger, metrics/report, revenue realization |
| `freight-commercial.routes.ts` | `GET /metrics`, `GET /report`, `POST /offers/:offerId/margin` |

## Rules enforced

1. **Display price** is always `internal_cost_usd + freightiq_margin_usd` at intake and on margin API updates; `freight_offers.price` is synced to display price for comparisons.
2. **Buyers and suppliers** never receive `commercial` on offers in API responses.
3. **Admins** receive `commercial` with cost, margin, display price, and lock metadata.
4. **Margin lock** on offer selection (`margin_locked_at` / `margin_locked_by`); further margin edits return `MARGIN_LOCKED`.
5. **CIF** (`FreightCommercialSummary`): `estimatedCifUsd = fobValueUsd + displayFreightUsd` (no margin in summary).

## Integration points

- `freight-communications.service.ts` — intake commercial fields + `freight.margin.set` audit
- `freightiq.service.ts` — supplier-submitted offers default cost = price, margin = 0; selection ledger; comparison hints use display price
- `shipment.service.ts` — on transition to `COMPLETED`, `realizeRevenueForShipment`
- Realtime: admin role channel for commercial/revenue/margin events

## Revenue ledger

- Created on `freight.offer.selected` with status `PENDING`
- Realized when parent shipment workspace reaches `COMPLETED`
- Matches by `shipment_id` or pending `order_id` with null shipment (backfilled on realize)
