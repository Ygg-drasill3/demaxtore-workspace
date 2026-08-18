# Buyer Command Center Report — Sprint 10A.2

**Date:** 2026-06-05  
**Sprint:** 10A.2 — Buyer Command Center Dashboard

## Summary

Replaced mock onboarding-first dashboard with a **Trade Command Center** powered by existing APIs and bounded client-side aggregation.

## Delivered widgets

| Phase | Widget | testId |
|-------|--------|--------|
| 3 | Executive KPI row | `cc-kpi-*` |
| 4 | Required Actions Inbox | `cc-action-inbox` |
| 5 | My Active Trades | `cc-active-trades` |
| 6 | Live Auctions | `cc-live-auctions` |
| 7 | Shipment Command Center | `cc-shipments` |
| 8 | Document Status | `cc-documents` |
| 9 | Communication Center | `cc-messages` |
| 10 | Upcoming Events | `cc-upcoming-events` |
| 11 | Onboarding (repositioned) | `cc-onboarding-section` |

## Performance strategy

| Layer | Approach |
|-------|----------|
| Primary fetch | 3 parallel list calls: RFQ, Orders, CommodityBid |
| Detail cap | Max 8 PO / shipment / doc / message detail fetches |
| Tracking | Only in-transit shipments fetch `/tracking` |
| Cache | TanStack Query `staleTime: 25s`, `refetchInterval: 60s` |
| No new backend | Zero FSM/runtime/DB changes |

## Data sources

```
GET /rfq?limit=15
GET /orders?bucket=active&limit=15
GET /commoditybid?limit=15
GET /orders/:id/purchase-order (≤8)
GET /orders/:id/spawned-shipments (≤8 orders)
GET /trade-documents/ORDER/:id (≤8)
GET /workspace-communication/:type/:id (≤13)
GET /shipments/:id/tracking (in-transit only)
GET /onboarding/progress (personalization)
```

## Constraints honoured

- Dashboard-only — no workflow/FSM changes
- Existing runtime APIs only
- Onboarding preserved but demoted

## Playwright

`26-buyer-command-center.spec.ts` — **12/12 PASS**
