# Navigation Role Matrix — Sprint 10A.1

## BUYER (10 nav items, 6 groups)

| Group | Items |
|-------|-------|
| Home | Dashboard |
| Sourcing | RFQs, Commodity Bids |
| Execution | **Purchase Orders**, Orders, **Shipments** |
| Collaboration | **Messages**, Notifications |
| Documents | **Trade Documents** |
| Knowledge | Learning Center |

Quick actions: New RFQ, Create CommodityBid, Open Messages, View Shipments, Open Documents

## SUPPLIER (6 nav items, 5 groups)

| Group | Items |
|-------|-------|
| Home | Dashboard |
| Sourcing | RFQs, Commodity Bids |
| Execution | Orders only |
| Collaboration | Notifications |
| Knowledge | Learning Center |

**Not visible:** Purchase Orders list, Shipments list, Messages inbox, Trade Documents list (buyer-only routes guarded by `RequireRole BUYER`)

## ADMIN (14 nav items, 3 groups)

| Group | Items |
|-------|-------|
| Operations | Control Tower, Freight ops, Freight commercial, Executive, Growth, Market intel, System, Onboarding, Forwarders |
| Workspaces | Dashboard, RFQs, Commodity Bids, Orders |
| Collaboration | Notifications, Learning Center |

**Not visible:** Buyer execution list pages (`/buyer/*` routes)

## Shared routes (all authenticated roles)

| Route | BUYER | SUPPLIER | ADMIN |
|-------|-------|----------|-------|
| `/learning` | ✓ | ✓ | ✓ |
| `/notifications` | ✓ | ✓ | ✓ |
| `/workspace/rfq/:id` | ✓* | ✓* | ✓* |
| `/workspace/order/:id` | ✓* | ✓* | ✓* |
| `/workspace/po/:id` | ✓* | ✓* | ✓* |
| `/workspace/shipment/:id` | ✓* | ✓* | ✓* |

\* Participant access enforced by backend policy, not route guard.

## Mobile behaviour

| Viewport | Navigation |
|----------|------------|
| ≥ lg (1024px) | Grouped sidebar + quick actions |
| < lg | Hamburger → `MobileNav` drawer with same IA |
