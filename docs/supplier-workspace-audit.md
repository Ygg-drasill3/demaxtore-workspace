# Supplier Workspace Audit — Sprint 10B

**Date:** 2026-06-05  
**Scope:** UX + workspace experience only (no FSM/runtime changes)

## Previous state (pre-10B)

| Item | Route | In sidebar? | Notes |
|------|-------|-------------|-------|
| Dashboard | `/supplier/dashboard` | Yes | RFQ-only onboarding widgets |
| RFQs | `/supplier/rfq` | Yes | List + workspace |
| Commodity Bids | `/supplier/commoditybid` | Yes | Embed + workspace |
| Orders | `/supplier/orders` | Yes | List only |
| Learning | `/learning` | Yes | Flat label |
| Notifications | `/notifications` | Yes | Shared route |
| Purchase Orders | `/workspace/po/:id` | **No** | Only via order workspace |
| Shipments | `/workspace/shipment/:id` | **No** | Only via order workspace |
| Trade Documents | Embedded tabs | **No** | Order/shipment workspaces |
| Messages | Per-workspace panels | **No** | No global inbox |

## Problems identified

1. **Passive portal feel** — Dashboard did not surface opportunities or required actions on login
2. **Flat menu** — No grouping for Opportunities vs Execution vs Collaboration
3. **Hidden execution** — PO, Shipments, Documents not discoverable from nav
4. **No quick actions** — Supplier had no shortcut bar (buyer gained this in 10A.1)
5. **No command center** — Buyer received KPI row + Action Inbox in 10A.2; supplier lagged
6. **Dead ends** — Supplier could not reach PO/Shipment/Message lists without drilling through orders

## Role visibility (pre-change)

| Role | Nav count | Pattern |
|------|-----------|---------|
| SUPPLIER | 5 flat items | RFQ + Orders only |
| BUYER | 10 grouped items | Full Trade OS (10A.1) |

## Post-10B changes

- Grouped IA: Home · Opportunities · Execution · Collaboration · Documents · Knowledge
- New list routes: `/supplier/purchase-orders`, `/supplier/shipments`, `/supplier/trade-documents`, `/supplier/messages`
- Supplier Command Center dashboard with KPI row, Action Inbox, Opportunity/Execution/Document/Communication centers, Upcoming Events
- Quick actions bar (5 shortcuts)
- Personalization modes: `new_supplier` | `active_supplier` | `top_supplier`
- Onboarding demoted below operational widgets (collapsible)
- Workspace deep links unchanged (`/workspace/*`)

## Files modified

| Area | Path |
|------|------|
| Nav config | `apps/frontend/src/routes/navigation.ts` |
| Routes | `apps/frontend/src/routes/index.tsx` |
| Dashboard | `apps/frontend/src/features/dashboard/pages/SupplierDashboardPage.tsx` |
| Aggregator | `apps/frontend/src/features/dashboard/lib/supplier-command-center.ts` |
| Widgets | `apps/frontend/src/features/dashboard/components/supplier-command-center/*` |
| Portfolio | `apps/frontend/src/features/navigation/lib/supplier-portfolio.ts` |
| List pages | `PoListPage`, `ShipmentsListPage`, `TradeDocumentsListPage`, `MessagesListPage` (role-aware) |
