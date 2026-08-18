# Supplier Mobile Review — Sprint 10B

**Date:** 2026-06-05  
**Viewport tested:** 390×844 (iPhone 14 class)

## Navigation

| Check | Result |
|-------|--------|
| Sidebar hidden below `lg` | ✓ |
| Hamburger opens `mobile-nav` drawer | ✓ |
| All 6 nav groups visible in drawer | ✓ |
| Opportunities group includes RFQ + CommodityBid | ✓ |
| Execution group includes PO, Orders, Shipments | ✓ |
| Deep link from drawer resolves | ✓ |

## Dashboard widgets

| Widget | Mobile behaviour |
|--------|------------------|
| KPI Row | 2-column grid (`grid-cols-2`) — 6 cards stack in 3 rows |
| Action Inbox | Full width; action buttons stack below text on `sm` breakpoint |
| Opportunity Center | Full width list items |
| Execution Center | Horizontal scroll table (overflow on narrow screens) |
| Document / Messages / Events | Single column (`lg:grid-cols-3` collapses to 1) |
| Onboarding | Collapsible — does not dominate viewport when collapsed |

## Action Inbox

- Priority badges remain readable at 390px
- CTA buttons use `shrink-0` and stack on narrow screens
- Empty state visible without scroll

## Auctions

- KPI "Live Auctions" links to `/supplier/commoditybid`
- Opportunity Center shows countdown for live auctions
- Mobile drawer navigates to CommodityBid embed

## Orders / PO / Shipments

- List pages use responsive tables with horizontal overflow
- Nav active state visible after navigation

## Messages / Documents

- Communication and Document centers link to full list pages
- List pages use card layout (messages) or scrollable table (documents)

## Verdict

Supplier workspace is **operable from mobile** for discovery, action prioritization, and navigation to workspaces. Complex table editing remains workspace-native (unchanged).
