# Supplier Command Center Report — Sprint 10B

**Date:** 2026-06-05  
**Sprint:** 10B — Supplier Workspace Experience

## Summary

Replaced RFQ-only supplier dashboard with a **Supplier Command Center** powered by existing APIs and bounded client-side aggregation — mirroring buyer 10A.2 patterns.

## Delivered widgets

| Phase | Widget | testId |
|-------|--------|--------|
| 5 | KPI row | `sc-kpi-*` |
| 6 | Action Inbox | `sc-action-inbox` |
| 7 | Opportunity Center | `sc-opportunity-center` |
| 8 | Execution Center | `sc-execution-center` |
| 9 | Document Center | `sc-documents` |
| 10 | Communication Center | `sc-messages` |
| 11 | Upcoming Events | `sc-upcoming-events` |
| 12 | Onboarding (repositioned) | `sc-onboarding-section` |

## KPI metrics

| KPI | Source | Link |
|-----|--------|------|
| Pending RFQ Invitations | RFQs in `SUPPLIERS_ASSIGNED` / `RFQ_OPEN` | `/supplier/rfq` |
| Live Auctions | CommodityBid `LIVE` | `/supplier/commoditybid` |
| Pending POs | POs with `pendingAcknowledgement` | `/supplier/purchase-orders` |
| Active Orders | Orders bucket `active` | `/supplier/orders` |
| Shipments In Progress | Non-terminal shipments in transit | `/supplier/shipments` |
| Unread Messages | Sum of workspace unread counts | `/supplier/messages` |

## Action Inbox kinds

| Kind | Trigger |
|------|---------|
| `submit_rfq_response` | Open RFQ invitation |
| `join_auction` | CommodityBid invitation or live auction |
| `acknowledge_po` | PO pending acknowledgement |
| `upload_document` | Missing required documents |
| `respond_buyer` | Unread workspace messages |
| `confirm_order` | Order in `ORDER_CREATED` |
| `review_shipment` | Shipment in `EXCEPTION` |

## Performance strategy

| Layer | Approach |
|-------|----------|
| Primary fetch | 7 parallel calls: RFQ list, Orders, CommodityBid, PO portfolio, Shipment portfolio, Doc portfolio, Message portfolio |
| Detail cap | Portfolio fetchers cap at 20 orders / 10 message workspaces |
| Cache | TanStack Query `staleTime: STALE.workspace`, `refetchInterval: 60s` |
| No new backend | Zero FSM/runtime/DB changes |

## Data sources

```
GET /rfq?limit=15
GET /orders?bucket=active&limit=15
GET /commoditybid?limit=15
GET /orders?bucket=all&limit=20 (PO + shipment portfolio)
GET /orders/:id/purchase-order (per order with PO)
GET /orders/:id/spawned-shipments (per order with shipments)
GET /trade-documents/ORDER/:id (active orders)
GET /workspace-communication/:type/:id (RFQ + order + auction targets)
GET /onboarding/progress (personalization)
```

## Constraints honoured

- UX + workspace only — no workflow/FSM changes
- Existing runtime APIs only
- Trade Documents and Communication runtimes reused without logic changes
- Onboarding preserved but demoted

## Playwright

`27-supplier-workspace-experience.spec.ts` — see `docs/supplier-workspace-playwright-results.md`
