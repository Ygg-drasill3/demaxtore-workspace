# Buyer Dashboard Audit — Sprint 10A.2

**Date:** 2026-06-05

## Pre-10A.2 state

| Widget | Data source | Issue |
|--------|-------------|-------|
| GuidedOnboardingCard | Live API | Dominant placement — onboarding-first |
| CommodityBidOnboardingCard | Static content | Above operational widgets |
| StatCard × 4 | **MOCK** hardcoded | Misleading counts |
| Recent activity | **MOCK** | Fake events |
| Next steps suggestions | **MOCK** static text | Not actionable |

### Unused / redundant

- Mock `MOCK.recent` and `MOCK` stats — replaced by live aggregator
- "Pending Quotations" KPI — no live API mapping; removed
- "Sprint 3" hint on orders stat — dev placeholder removed

### Hidden capabilities (pre-navigation 10A.1)

PO, Shipments, Documents, Messages were workspace-only. After 10A.1 nav exposure, dashboard still did not surface them.

## Post-10A.2 state

| Widget | Priority | Data |
|--------|----------|------|
| KPI Row (6) | 1 | Live `fetchBuyerCommandCenter` |
| Required Actions Inbox | 1 | Derived from auctions, PO, docs, messages, freight |
| My Active Trades | 2 | Unified RFQ/CB/PO/Order/Shipment timeline |
| Live Auctions | 2 | CommodityBid list API |
| Shipment Command Center | 3 | Spawned shipments + tracking (bounded) |
| Document Status | 3 | Trade docs summary (bounded) |
| Communication Center | 3 | Workspace conversations (bounded) |
| Upcoming Events | 4 | Deadlines, auction times, ETAs |
| Onboarding (collapsed) | 7 | Repositioned below operations |

## Files

- `apps/frontend/src/features/dashboard/pages/BuyerDashboardPage.tsx`
- `apps/frontend/src/features/dashboard/lib/buyer-command-center.ts`
- `apps/frontend/src/features/dashboard/hooks/useBuyerCommandCenter.ts`
- `apps/frontend/src/features/dashboard/components/command-center/*`
