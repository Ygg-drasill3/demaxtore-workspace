# Sprint 7A — Commercial Forecast Report

## Purpose

Forward-looking FreightIQ and trade volume estimates for management planning (30 / 60 / 90 days).

## Metrics

| Metric | Method |
|--------|--------|
| Expected FreightIQ revenue | Pending ledger margin + daily realized run-rate × horizon |
| Expected container count | Active shipments + pending ledger factor, scaled by horizon |
| Expected orders | Active non-terminal orders scaled by horizon |
| Expected shipments | Active shipments scaled by horizon |
| Expected margin | Aligned with expected FreightIQ revenue |

## API

`GET /api/scale/forecast?days=30|60|90`

Executive dashboard exposes all three horizons (`exec-forecast-30d`, `exec-forecast-60d`, `exec-forecast-90d`).

## Workload dashboard

`GET /api/scale/workload` — per ADMIN operator:

- Active RFQs / orders / shipments (scoped to assigned accounts)
- Open alerts and trade documents
- `overloaded` when total load ≥ 20

## Control Tower

| alertKey | When |
|----------|------|
| `forecast.decline` | 30d forecast &lt; 80% of prior-month realized revenue |
| `operator.overloaded` | Operator total load above threshold |

## CSV exports

| Type | Path |
|------|------|
| Forecast | `/api/scale/export/forecast.csv` |
| Operations load | `/api/scale/export/operations-load.csv` |

## Audit

`forecast.generated` on each forecast computation.

## Status

**PASS** — spec 18 tests 06–08.
