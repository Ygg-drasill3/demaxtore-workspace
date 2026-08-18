# Sprint 7C — Country Demand Engine Report

## Purpose

Surface **buyer demand by destination country** so management can prioritize markets (e.g. UAE, Saudi Arabia, Nigeria, UK, USA) using platform data rather than intuition.

## Implementation

**Service:** `MarketService.getCountries()` in `market.service.ts`  
**Contract:** `DemandHotspot` in `packages/contracts/src/market-intelligence.ts`  
**Endpoint:** `GET /api/market/countries`  
**CSV:** `GET /api/market/export/countries.csv`

## Input

- `rfqDetails.targetMarket` normalized via `normalizeCountry()` (ISO-like codes and common aliases)
- RFQ workspace `createdAt` for 90-day vs prior-90-day growth windows

## Metrics per country

| Metric | Source |
|--------|--------|
| RFQ count | RFQs grouped by `targetMarket` |
| Order count | Orders spawned from those RFQs |
| Shipment count | Shipments spawned from those orders |
| Revenue USD | `orderWorkspace.totalValue` aggregate |
| FreightIQ revenue USD | `freightRevenueLedger.freightiqMarginUsd` |
| Growth % | `growthPercent(recentRfqs, priorRfqs)` |

## Demand Score (0–100)

Computed in `market.analytics.ts` → `demandScore()`:

- RFQ volume (up to 50 points)
- Order volume (up to 50 points combined with RFQs)
- Positive growth % (up to 30 points)
- Bonus when orders exist (+20)

Countries are sorted by **demandScore descending** for dashboard and opportunity ranking.

## Example interpretation

| Country | RFQs | Orders | Demand Score | Action |
|---------|------|--------|--------------|--------|
| UAE | High | Medium | 85+ | Expand supplier coverage for top categories |
| Nigeria | High | Low | 70+ | Supply gap + recruitment focus |
| UK | Stable | High | 60+ | Maintain; optimize routes |

## Control Tower linkage

High unserved demand in a country can contribute to `market.unserved.demand` alerts when buyer opportunity scans detect repeated RFQs without conversion.

## Tests

E2E scenario **02 — Country demand visible** validates API shape and ADMIN access (`20-market-intelligence.spec.ts`).

## Sprint 7C status

**CLOSED**
