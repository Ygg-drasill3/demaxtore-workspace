# Sprint 6B — Margin Policy Engine Report

## Scope

Margin policies govern suggested FreightIQ margins at offer intake without auto-repricing after save.

## Data model

- Table: `freight_margin_policies`
- Migration: `20260618120000_sprint6b_freight_analytics`

## Matching rules (priority)

1. Active policy with `route_pattern` equal to resolved lane (e.g. `Turkey → UAE`)
2. Active policy with matching `country_from` + `country_to`
3. Default margin `0` when no policy matches

## API (ADMIN)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/freightiq/commercial/analytics/margin/policies` | List policies |
| POST | `/api/freightiq/commercial/analytics/margin/policies` | Create policy |
| PATCH | `/api/freightiq/commercial/analytics/margin/policies/:id` | Update policy |
| GET | `/api/freightiq/commercial/analytics/margin/suggest?pol=&pod=` | Suggested margin |

## Intake behavior

- `FreightCommunicationsService.intakeOffer` applies suggested margin when `freightiqMarginUsd` is omitted.
- Operations may override; override is audited as `margin_override.used`.
- Display price is set once at intake; no automatic repricing after save.

## Audit events

- `margin_policy.created`
- `margin_policy.updated`
- `margin_override.used`

## E2E

`apps/e2e/tests/17-freight-revenue-optimization.spec.ts` — tests 01–03.

## Status

**PASS** — policy CRUD, suggestion, intake auto-fill, and manual override verified.
