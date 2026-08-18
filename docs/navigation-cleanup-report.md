# Navigation Cleanup Report (FIX-03)

**Date:** 2026-06-04  
**Source:** `navigation-audit.md` NAV-001, NAV-003; `recommended-fixes.md` FIX-03

---

## Principle

Show menu entries only when the route renders a **working runtime page**, not `PlaceholderPage`.

---

## Before → After

### Buyer

| Before | After |
|--------|-------|
| Dashboard, RFQ Workspaces, CommodityBid, **Orders (placeholder)**, **Documents (placeholder)**, Notifications | Dashboard, **RFQs**, **Commodity Bids**, **Orders (list)**, Notifications |

### Supplier

| Before | After |
|--------|-------|
| Dashboard, Assigned RFQs, **CommodityBid Invites (placeholder)**, **Orders (placeholder)**, **Documents (placeholder)**, Notifications | Dashboard, **RFQs**, **Orders (list)**, Notifications |

### Admin

| Before | After |
|--------|-------|
| Control Tower, Freight ops, Forwarders, Dashboard, RFQs, **CommodityBids (placeholder)**, **Orders (placeholder)**, **Suppliers**, **Documents**, Notifications, **Messages**, **Settings** | **Operations**, Freight ops, Forwarders, Dashboard, RFQs, **Orders (list)**, Notifications |

---

## Intentionally not in menu

| Capability | Reason |
|------------|--------|
| Shipments | No role-scoped list page; discovery via Order workspace + notifications |
| POs | PO workspace exists; no buyer/supplier PO list in this fix pack |
| Trade Documents | Embedded in Order/Shipment workspaces |
| Supplier CommodityBid | List not implemented (out of pack scope) |

---

## Route changes

| Path | Before | After |
|------|--------|-------|
| `/buyer/orders` | Placeholder | `OrdersListPage` |
| `/supplier/orders` | Placeholder | `OrdersListPage` |
| `/admin/orders` | Placeholder | `OrdersListPage` |
| `/buyer/documents` | Placeholder | Route removed from nav (URL still 404 if typed) |
| `/admin/messages` etc. | Placeholder | Removed from nav |

---

## Verification

E2E `15-pilot-readiness.spec.ts` tests 10–12: each primary `nav-*` item must not render `data-testid="placeholder-page"`.

**Config:** `apps/frontend/src/routes/navigation.ts`
