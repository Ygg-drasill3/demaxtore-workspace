# Sprint 12E — SmartContainer Order Linking Report

## Master SmartContainer Order

One master order per container workspace:

- Table: `mc_master_orders`
- External ref: `SC-2026-00001` (auto-incremented per year)
- Buyer sees **one** SmartContainer Order in the execution dashboard

## Supplier Orders

One standard Order workspace per allocation:

- Spawned via existing `spawnOrderWorkspace()`
- External ref: `ORD-MC-2026-00001-A1` (per-allocation suffix)
- `parentWorkspaceType: MIXED_CONTAINER`
- `spawnedFromId` → SmartContainer workspace
- PO issued via `createPurchaseOrderOnOrderSpawn()`

## Linkage Entity

`mc_order_links`:

| Field | Purpose |
|-------|---------|
| `smart_container_id` | MC workspace |
| `master_order_id` | Master SC order |
| `supplier_order_id` | Spawned Order workspace |
| `allocation_id` | Source allocation |

## Buyer Experience

Buyer navigates to **one** execution dashboard showing:

- Master order ref (SC-*)
- Per-allocation progress (anonymized as Allocation 1, 2, …)
- Aggregated order/freight/shipment status
- Document hub (proformas + order/shipment docs)

Supplier identity remains hidden.

## Status

✓ Master SmartContainer Order created  
✓ Supplier Orders created  
✓ Order linkage created  
✓ Buyer sees one SmartContainer Order
