# Buyer Dashboard Mobile Review — Sprint 10A.2

**Date:** 2026-06-05  
**Viewport tested:** 390×844 (iPhone-class)

## Layout behaviour

| Element | Mobile behaviour | Status |
|---------|------------------|--------|
| Header + CTAs | Wraps; buttons stack | ✓ |
| KPI row | `grid-cols-2` (3 rows) | ✓ |
| Action Inbox | Full-width cards; action buttons below title on narrow | ✓ |
| Active Trades | Horizontal scroll (`min-w-[640px]` table) | ✓ |
| Live Auctions / Shipments | Single column stack | ✓ |
| Docs / Messages / Events | Single column stack | ✓ |
| Onboarding | Collapsible; collapsed by default | ✓ |
| Mobile nav | Hamburger accessible (`mobile-nav-open`) | ✓ |

## Priority on mobile

Operational widgets appear **above the fold** before onboarding:
1. KPIs
2. Action Inbox
3. Active Trades (partial)

## Usability notes

- Action Inbox buttons are full-width on `< sm` for touch targets
- KPI cards are tappable links to list pages
- Shipment delayed state uses amber border for visibility on small screens

## Playwright coverage

Test 11 in `26-buyer-command-center.spec.ts` validates mobile viewport rendering.
