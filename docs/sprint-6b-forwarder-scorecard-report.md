# Sprint 6B — Forwarder Scorecard Report

## Purpose

ADMIN-only forwarder profitability and performance metrics for revenue optimization.

## Metrics per forwarder

| Metric | Source |
|--------|--------|
| Offer count | `freight_offers` |
| Selection count | `freight_selections` |
| Win rate | selections / offers |
| Revenue generated | `freight_revenue_ledger.freightiq_margin_usd` |
| Average margin | ledger margin average |
| Average transit days | offer `transit_days` |
| Average ETA drift | planned vs declared transit |
| Delay rate | offers with drift > 2 days / offer count |

## API

`GET /api/freightiq/commercial/analytics/forwarders/scorecard` — **ADMIN only** (403 for buyer/supplier).

## UI

`/operations/freight-commercial` — section `freight-forwarder-scorecard`.

## Visibility

- Scorecard data is not exposed on buyer or supplier freight summaries.
- Commercial fields on offers remain stripped for non-admin roles (Sprint 6A policy unchanged).

## E2E

Spec 17 test 05 — scorecard returns forwarders with `offerCount >= 1`.

## Status

**PASS**
