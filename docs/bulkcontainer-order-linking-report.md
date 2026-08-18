# Sprint 13E — BulkContainer Order Linking Report

## Master BulkContainer Order

One master order per container workspace:

- Table: `bc_master_orders`
- External ref: `BC-EXEC-2026-00001` (auto-incremented per year)
- Buyer sees **one** BulkContainer Order in the execution dashboard

## Supplier Orders

One standard Order workspace per allocation:

- Spawned via existing `spawnOrderWorkspace()`
- External ref: `ORD-BC-2026-00001-A1` (per-allocation suffix)
- `parentWorkspaceType: BULK_CONTAINER`
- `spawnedFromId` → BulkContainer workspace
- PO issued via `createPurchaseOrderOnOrderSpawn()`

## Linkage Entity

`bc_order_links`:

| Field | Purpose |
|-------|---------|
| `workspace_id` | BC workspace |
| `master_order_id` | Master BC-EXEC order |
| `supplier_order_id` | Spawned Order workspace |
| `allocation_id` | Source allocation |

## Buyer Experience

Buyer navigates to **one** execution dashboard (`/buyer/bulk-container/execution/:id`) showing:

- Master order ref (BC-EXEC-*)
- Per-allocation progress (anonymized as Allocation 1, 2, …)
- Aggregated order/freight/shipment status and completion %
- Document hub (proformas + order/shipment/freight docs)

Supplier identity remains hidden.

## Status

✓ Master BulkContainer Order created  
✓ Supplier Orders created  
✓ Order linkage created  
✓ Buyer sees one BulkContainer Order
