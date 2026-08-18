# Sprint 7B — Growth Dashboard Report

## Route

`/operations/growth` — ADMIN only (sidebar: Growth)

## Widgets

| testId | Content |
|--------|---------|
| growth-commercial-funnel | Full funnel with conversion/drop-off |
| growth-conversion-metrics | RFQ→PO, quote→select, etc. |
| growth-dropoffs | Stage-to-stage leakage |
| growth-buyer-activation | Cold/Warm/Active/Power summary |
| growth-supplier-performance | Supplier classifications |
| growth-category-revenue | RFQ/order/revenue by category |
| growth-route-revenue | Lane-level FreightIQ (6B route engine) |
| growth-repeat-customers | 30/60/365d repeat rates |
| growth-lost-opportunities | Leakage items + est. lost margin |
| growth-trends | Monthly RFQ/PO/FreightIQ trends |
| growth-csv-export | Funnel CSV download |

## Backend module

`apps/backend/src/modules/growth-engine/`

## CSV exports

`/api/growth/export/{buyers|suppliers|funnel|categories|routes|lost-opportunities|repeat-customers}.csv`

## Control Tower alerts

- `growth.buyer.inactive`
- `growth.supplier.inactive`
- `growth.repeat.buyer.at_risk`
- `growth.rfq.stalled`
- `growth.pipeline.leakage`
- `growth.conversion.drop`

## Realtime (ADMIN)

- `growth.metrics.updated`
- `growth.alert.generated`
- `growth.funnel.updated`

## Status

**PASS**
