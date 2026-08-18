# Sprint 7C — Recommendation Engine Report

## Purpose

Generate **actionable, rule-based growth recommendations** for management — no AI, no automated outreach.

Examples from product brief:

1. **Recruit more pasta suppliers** — demand growth + supplier shortage  
2. **Focus on Turkey → UAE** — high volume + high FreightIQ margin  
3. **Re-engage Buyer X** — repeated RFQs but no conversion  

## Implementation

**Service:** `MarketService.getRecommendations()` in `market.service.ts`  
**Contract:** `GrowthRecommendation` in `packages/contracts/src/market-intelligence.ts`  
**Endpoint:** `GET /api/market/recommendations`  
**CSV:** `GET /api/market/export/recommendations.csv`  
**Audit:** `market.recommendation.generated` on each fetch

## Rule set (deterministic)

| Rule | Trigger | Action type |
|------|---------|-------------|
| Supplier recruitment | Supply gap score ≥ 70 | `recruit_suppliers` |
| Route focus | Route opportunity score ≥ 85 | `prioritize_route` |
| Category growth | Category trend = `growing` and RFQ volume ≥ 3 | `expand_category` |
| Buyer re-engagement | Buyer opportunity with ≥ 2 RFQs, 0 orders | `reengage_buyer` |
| Forwarder activation | Forwarder classified `Underutilized` with offers > 0 | `activate_forwarder` |
| Country focus | Country demand score ≥ 75 | `focus_country` |

Each recommendation includes:

- `id`, `priority` (`high` / `medium` / `low`)
- `title`, `reason` (human-readable explanation)
- `entityType`, `entityId` or label
- `estimatedImpact` (potential revenue / FreightIQ / shipments where applicable)

## Consolidated insights

`GET /api/market/insights` bundles trends, top categories, countries, routes, supply gaps, buyer/forwarder opportunities, recommendations, and ranked `topOpportunities` for the dashboard. Emits `market.insight.updated` via socket bus.

## Top opportunities ranking

`GET /api/market/opportunities` merges category, route, supply gap, and buyer signals into a single sorted list with unified `OpportunityScore` labels (`critical` / `high` / `medium` / `low`).

## Tests

E2E scenarios **07 — Recommendations visible** and **08 — Top opportunities ranking visible**.

## Sprint 7C status

**CLOSED**
