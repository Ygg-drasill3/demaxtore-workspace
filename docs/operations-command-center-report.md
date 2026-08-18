# Operations Command Center Report — Sprint 10C

**Date:** 2026-06-05  
**Sprint:** 10C — Operations Command Center

## Summary

Replaced mock admin dashboard with a live **Operations Command Center** aggregating Control Tower, Scale, FreightIQ, and workspace list APIs.

## Delivered widgets

| Phase | Widget | testId |
|-------|--------|--------|
| 3 | KPI row (8 metrics) | `oc-kpi-*` |
| 4 | Action Inbox | `oc-action-inbox` |
| 5 | Trade Operations Board | `oc-trade-board` |
| 6 | Live Auction Monitor | `oc-auction-monitor` |
| 7 | FreightIQ Operations Panel | `oc-freight-panel` |
| 8 | Shipment Command Center | `oc-shipments` |
| 9 | Document Control Center | `oc-documents` |
| 10 | Communication Monitor | `oc-communications` |
| 11 | Control Tower integration | `oc-control-tower` |
| 12 | Revenue Visibility | `oc-revenue` |
| 13 | Upcoming Events | `oc-upcoming-events` |
| 14 | Team Workload | `oc-workload` |

## Performance strategy

| Layer | Approach |
|-------|----------|
| Primary fetch | 10 parallel API calls (bounded) |
| Control Tower | Dashboard BFF + alerts (limit 50) |
| Workload | `GET /scale/workload` (Sprint 7A) |
| Revenue | `GET /freightiq/commercial/analytics/insight` |
| Trade lists | RFQ/Order/CommodityBid list (limit 20) |
| Cache | TanStack Query `staleTime: 3min`, `refetchInterval: 60s` |
| No new backend | Zero FSM/runtime/DB changes |

## Data sources

```
GET /control-tower/dashboard
GET /control-tower/alerts?resolved=false&limit=50
GET /control-tower/shipment-tracking
GET /scale/workload
GET /scale/pipeline/health
GET /freightiq/operations/overview
GET /freightiq/commercial/analytics/insight
GET /rfq?limit=20
GET /orders?bucket=active&limit=20
GET /commoditybid?limit=20
```

## Constraints honoured

- Operations UX + visibility only
- Existing reporting APIs reused
- Control Tower core unchanged — summary embedded, full page at `/operations`
- Growth/Market/System pages linked, not duplicated

## Playwright

`28-operations-command-center.spec.ts` — see `docs/operations-command-center-playwright-results.md`
