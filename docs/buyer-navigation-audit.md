# Buyer Navigation Audit — Sprint 10A.1

**Date:** 2026-06-05  
**Scope:** Navigation-only (no workflow/runtime changes)

## Previous state (pre-10A.1)

| Item | Route | In sidebar? | Notes |
|------|-------|-------------|-------|
| Dashboard | `/buyer/dashboard` | Yes | Onboarding-oriented widgets |
| RFQs | `/buyer/rfq` | Yes | List + create |
| Commodity Bids | `/buyer/commoditybid` | Yes | Embed + workspace |
| Orders | `/buyer/orders` | Yes | List only |
| Learning | `/learning` | Yes | Flat label |
| Notifications | `/notifications` | Yes | Shared route |
| Purchase Orders | `/workspace/po/:id` | **No** | Workspace-only via order |
| Shipments | `/workspace/shipment/:id` | **No** | Workspace-only via order |
| Trade Documents | Embedded tabs | **No** | Order/shipment/PO workspaces |
| Messages | Per-workspace panels | **No** | No global inbox |

## Problems identified

1. **Flat menu** — No lifecycle grouping (Sourcing vs Execution)
2. **Hidden execution** — PO, Shipments, Documents not discoverable from nav
3. **No mobile nav** — Sidebar `hidden lg:flex`; no drawer below 1024px
4. **Dead legacy path** — `/buyer/documents` removed in FIX-03 (404)
5. **No quick actions** — Create flows buried in dashboard/onboarding cards
6. **Supplier lookup on CB create** — Fixed in 9B closure (out of 10A.1 scope)

## Role visibility (pre-change)

| Role | Nav count | Pattern |
|------|-----------|---------|
| BUYER | 6 flat items | Sourcing-heavy |
| SUPPLIER | 6 flat items | No execution sub-nav |
| ADMIN | 15 flat items | Operations + workspace mirrors |

## Post-10A.1 changes

- Grouped IA: Home · Sourcing · Execution · Collaboration · Documents · Knowledge
- New list routes: `/buyer/purchase-orders`, `/buyer/shipments`, `/buyer/trade-documents`, `/buyer/messages`
- Mobile drawer via `mobile-nav-open` / `MobileNav`
- Quick actions bar for buyer (5 shortcuts)
- Workspace deep links unchanged (`/workspace/*`)

## Files modified

| Area | Path |
|------|------|
| Nav config | `apps/frontend/src/routes/navigation.ts` |
| Sidebar | `apps/frontend/src/layouts/components/Sidebar.tsx` |
| Mobile nav | `apps/frontend/src/layouts/components/MobileNav.tsx` |
| Routes | `apps/frontend/src/routes/index.tsx` |
| List pages | `PoListPage`, `ShipmentsListPage`, `TradeDocumentsListPage`, `MessagesListPage` |
| Portfolio agg | `apps/frontend/src/features/navigation/lib/buyer-portfolio.ts` |
