# Sprint 7C — Supply Gap Engine Report

## Purpose

Identify **supplier recruitment opportunities**: categories (and associated countries) where demand is high but supplier participation, quotation activity, or conversion is low.

Example from product brief:

> **Flour → Nigeria** — Demand: High, Supplier participation: Low, Opportunity Score: 92

## Implementation

**Service:** `MarketService.getSupplyGaps()` in `market.service.ts`  
**Contract:** `SupplyGap` in `packages/contracts/src/market-intelligence.ts`  
**Endpoint:** `GET /api/market/supply-gaps` (also surfaced in `/opportunities` and insights)  
**CSV:** `GET /api/market/export/suppliers.csv`

## Algorithm

1. Build category metrics via `getCategories()` (RFQ volume, quotation volume, conversion rate).
2. Filter categories with `rfqVolume >= 2`.
3. Score each with `supplyGapScore()` in `market.analytics.ts`:
   - Up to 40 points from RFQ demand volume
   - Up to 35 points from low supplier participation (quotes vs invited proxy)
   - Up to 25 points from low conversion rate
4. Emit gaps with **score ≥ 50** only.
5. Attach top-ranked country from country demand engine as contextual `country`.
6. Set `recruitmentPriority` to `urgent` when score ≥ 80.

## Output fields

| Field | Meaning |
|-------|---------|
| `category` | Product category (Pasta, Flour, Oil, Legumes, …) |
| `country` | Highest demand country (context) |
| `demandLevel` | `high` / `medium` / `low` from RFQ volume |
| `supplierParticipation` | Quotation count proxy |
| `quotationCount` | Active quotations on category RFQs |
| `conversionRate` | Orders ÷ RFQs |
| `opportunityScore` | 0–100 recruitment priority |
| `recruitmentPriority` | `urgent` or `normal` |

## Control Tower

`market.supply.gap` alerts fire for gaps with `opportunityScore >= 80` during `scanMarketAlerts()`.

## Recommendation engine linkage

Rule-based recommendations include entries such as:

> **Recruit more {category} suppliers** — Reason: demand growth + supplier shortage (derived from supply gap + category trend).

## Tests

E2E scenario **03 — Supply gaps visible** (`20-market-intelligence.spec.ts`).

## Sprint 7C status

**CLOSED**
