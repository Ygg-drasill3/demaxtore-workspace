# Sprint 5A — Order Integration Report

## Objective

Attach FreightIQ to the **Order Workspace** as a supporting layer. The Order remains the owner; freight requests cannot be created standalone.

## UI integration

| Location | Change |
|----------|--------|
| `/workspace/order/:id` | `order-freightiq-section` replaces the legacy freight summary block |
| Component | `FreightIqTab` — tabs: overview, offers, comparison, history |
| Shipments | Spawned shipment links retained below FreightIQ (`order-spawned-shipments`) |

## Realtime

Order workspace subscribes to existing socket bus:

- `freight.request.created`
- `freight.offer.submitted`
- `freight.offer.selected`

On receipt, order + freightiq React Query caches invalidate (same pattern as `order.state.changed`).

## Roles

| Action | BUYER | ADMIN | SUPPLIER |
|--------|-------|-------|----------|
| Create request | ✓ | ✓ | — |
| Submit / revise / withdraw offer | — | ✓ | ✓ |
| Select offer | ✓ | ✓ | — |
| Cancel request | ✓ | ✓ | — |
| View summary | ✓ (participant) | ✓ | ✓ (participant) |

Policy reuses `canAccessOrder` from `order.policy.ts`.

## Shipment linkage

On `select_offer`:

1. `freight_selections` row created with `selected_by`, `offer_id`, timestamp.
2. If a shipment workspace was already spawned from the order (`spawnedFromId`), `shipment_workspace_id` is set.
3. Request status → `CONVERTED_TO_SHIPMENT` when linked, else `SELECTED`.
4. Timeline + audit + notification emitted on the **order** workspace.
5. **No** new shipment is created by FreightIQ.

## Ops route

| Route | Access | Purpose |
|-------|--------|---------|
| `/operations/freight` | ADMIN | Open requests, pending/expired offers, selected freight list |

Nav item: **Freight ops** (`admin-freight-ops`) under ADMIN sidebar.

## Comparison after selection

Selected offers remain visible in the comparison/history views (status `SELECTED` included in summary `offers`). Hints (lowest/fastest/expiring) are computed only from `ACTIVE` / `REVISED` offers.

## Regression note

Order FSM transitions (`skip_inspection`, `proceed_to_freight`, etc.) are unchanged. E2E bootstrap for FreightIQ stops at `PRODUCTION_COMPLETED` so freight coordination can be tested without advancing the Order FSM to `FREIGHT_REQUESTED`.
