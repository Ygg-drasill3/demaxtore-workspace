# Sprint 7C — Market Intelligence Report

## Objective

Transform operational trade data into **market intelligence** so management can answer: *Where should DeMaxtore focus next to maximize growth, RFQ volume, shipment volume, and FreightIQ revenue?*

This sprint is **rule-based only** — no AI, no CRM, no marketing automation, no forecasting replacement.

## Architecture

| Layer | Location |
|-------|----------|
| Contracts | `packages/contracts/src/market-intelligence.ts` |
| Engine | `apps/backend/src/modules/market-intelligence/` |
| Dashboard | `apps/frontend/src/features/market/pages/MarketIntelligencePage.tsx` |
| Route | `/operations/market-intelligence` (ADMIN) |
| E2E | `apps/e2e/tests/20-market-intelligence.spec.ts` |

### Backend module files

- `market.service.ts` — aggregation engines (trends, categories, countries, routes, supply gaps, buyers, forwarders, recommendations, insights)
- `market.analytics.ts` — scoring helpers (`demandScore`, `supplyGapScore`, `routeOpportunityScore`, `categoryTrend`, `classifyForwarder`)
- `market.routes.ts` — ADMIN-only HTTP API
- `market.policy.ts` — `assertMarketAccess`
- `market-alerts.ts` — Control Tower scan (`scanMarketAlerts`)
- `market-audit.ts` — audit events
- `market-csv.ts` — CSV exports

Mounted at `GET /api/market/*` in `apps/backend/src/routes.ts`.

## API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/market/trends` | Monthly RFQ/order/shipment/revenue/FreightIQ trends |
| `GET /api/market/categories` | Category opportunity metrics |
| `GET /api/market/countries` | Country demand hotspots |
| `GET /api/market/routes` | Route opportunity scores (Sprint 6B lane resolver) |
| `GET /api/market/opportunities` | Ranked top opportunities |
| `GET /api/market/recommendations` | Rule-based growth recommendations |
| `GET /api/market/insights` | Consolidated dashboard payload |
| `GET /api/market/supply-gaps` | Supplier recruitment gaps |
| `GET /api/market/buyers/opportunities` | Unserved buyer demand |
| `GET /api/market/forwarders/opportunities` | Forwarder growth scores |
| `GET /api/market/export/:reportType.csv` | CSV exports |

All routes require **ADMIN** role.

## Data sources (read-only)

- `workspace` (RFQ, ORDER, SHIPMENT counts and lineage)
- `rfqDetails` (`productCategory`, `targetMarket`)
- `quotation`, `orderWorkspace`, `freightRevenueLedger`
- `freightRequest` + `resolveFreightRoute` (6B)
- Buyer/forwarder organisations via existing user and freight tables

No FSM, Growth Engine core, or Control Tower core modifications.

## Integrations

### Control Tower (additive)

Alert keys in `packages/contracts/src/control-tower.ts`:

- `market.category.growing`
- `market.category.declining`
- `market.route.opportunity`
- `market.supply.gap`
- `market.unserved.demand`
- `market.forwarder.underutilized`

Wired via `scanMarketAlerts` in `alert-engine.ts`.

### Realtime (ADMIN)

Socket events in `packages/contracts/src/socket-events.ts`:

- `market.insight.updated`
- `market.opportunity.updated`
- `market.alert.generated`

### Audit

- `market.report.generated`
- `market.recommendation.generated`
- `market.export.generated`

## Dashboard widgets

`/operations/market-intelligence` displays:

- Category trends
- Country demand
- Supply gaps
- Route opportunities
- Forwarder opportunities
- Buyer opportunities
- Recommendations
- Top opportunities ranking

## Definition of done

| Item | Status |
|------|--------|
| Market intelligence engine | ✓ |
| Category intelligence | ✓ |
| Country demand engine | ✓ |
| Supply gap engine | ✓ |
| Route opportunity engine | ✓ |
| Buyer opportunity engine | ✓ |
| Forwarder opportunity engine | ✓ |
| Recommendation engine | ✓ |
| Market dashboard | ✓ |
| Control Tower market alerts | ✓ |
| CSV exports | ✓ |
| Audit integration | ✓ |
| Realtime integration | ✓ |

## Strategic outcome

- **Growth Engine (7B):** “What happened?”
- **Market Intelligence (7C):** “What should we do next?”

## Sprint 7C status

**CLOSED**
