# Sprint 6A — FreightIQ Commercialization Report

## Objective

Operationalize FreightIQ as DeMaxtore’s freight revenue layer without changing Factory Price positioning on product: buyers and suppliers see **display freight price** only; operations sees cost, margin, and profitability.

## Delivered

### Domain & data

- Contracts: `packages/contracts/src/freight-commercial.ts`, `freight-commercial.zod.ts`
- Prisma migration `20260614120000_sprint6a_freight_commercialization`: `freight_offers` commercial columns + `freight_revenue_ledger` table with indexes
- Socket events: `freight.commercial.updated`, `freight.margin.updated`, `freight.revenue.realized` (admin-only emissions)

### Backend

- Module `apps/backend/src/modules/freightiq/commercial/`: margin engine, policy, routes under `/api/freightiq/commercial`
- Offer intake: `internalCostUsd` + `freightiqMarginUsd` → `displayPriceUsd`; legacy `oceanFreight` maps to internal cost with zero margin
- Role sanitization on enriched freight summary; CIF block from order FOB + display freight
- Selection creates `PENDING` ledger entry; shipment `COMPLETED` realizes ledger (`REALIZED`) including order-linked entries when `shipment_id` was null at selection

### Frontend

- FreightIQ tab: admin intake cost/margin, CIF summary, admin commercial breakdown on offers tab; comparison shows display price only
- `/operations/freight-commercial` reporting page (admin)
- Control Tower operations + freight ops dashboards: FreightIQ commercial KPIs

### Quality

- E2E: `apps/e2e/tests/16-freight-commercialization.spec.ts`
- Audit: `freight.margin.set`, `freight.margin.updated`, `freight.offer.selected`, `freight.revenue.realized`

## Out of scope (unchanged)

RFQ/CB/Order/Shipment/PO FSMs, trade documents core, communication layer, maritime tracking, forwarder login, marketplace/NVOCC/booking automation.

## Formula

`display_price_usd = internal_cost_usd + freightiq_margin_usd`

Buyer-facing `price` on offers is always the display price.
