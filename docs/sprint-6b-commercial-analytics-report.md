# Sprint 6B — Commercial Analytics Report

## Route intelligence

`freight-route.util.ts` resolves POL/POD to:

- Origin / destination country
- Lane (e.g. `Turkey → UAE`)
- Route key (e.g. `TRIST→AEJEA`)

Revenue and margin aggregate by route from `freight_revenue_ledger` joined to freight requests.

## Commercial insight API

`GET /api/freightiq/commercial/analytics/insight` returns `FreightCommercialInsight`:

- Revenue this month / last month
- Pending and realized revenue
- Average margin and revenue per container
- Top / bottom routes
- Top forwarders
- Margin distribution buckets
- Revenue by route, forwarder, country, month
- Margin by route / forwarder
- Container count by route

## Snapshots

`freight_commercial_snapshots` stores periodic aggregates (period, route, forwarder) on insight generation.

## Commercial reports (CSV)

`GET /api/freightiq/commercial/analytics/export/:reportType.csv`

| reportType | Content |
|------------|---------|
| revenue-by-route | Route, lane, revenue, margin, shipments |
| revenue-by-forwarder | Forwarder revenue and margin |
| revenue-by-country | Country aggregates |
| revenue-by-month | Monthly trends |
| margin-by-route | Route margin stats |
| margin-by-forwarder | Forwarder margin stats |
| containers-by-route | Shipment counts per route |

CSV only — no PDF.

## Dashboard

Extended `/operations/freight-commercial` with KPIs, top/bottom routes, scorecard, margin distribution, and CSV export link.

## Loss detection & alerts

`freight-commercial-alerts.ts` integrated into `scanFreightAlerts`:

| alertKey | Condition |
|----------|-----------|
| freight.margin.missing | No internal cost and zero margin |
| freight.margin.low | Margin below policy min (or 50 USD default) |
| freight.margin.negative | Margin < 0 |
| freight.margin.override | Margin above policy max |
| freight.route.underperforming | Route avg margin < 35% of network avg (≥2 shipments) |

Audit: `commercial_alert.generated`

## Realtime (ADMIN)

- `freight.commercial.metric.updated`
- `freight.margin.alert`
- `freight.route.updated`

## Status

**PASS** — analytics API, CSV export, dashboard widgets, and alert keys verified.
