# Sprint 12D — Mixed Container Supplier Allocation Report

## Summary

Sprint 12D introduces the operational coordination layer after offer approval. Supplier allocation assigns each container line to a supplier (operations-only) without exposing supplier identity to buyers.

## Delivered

### Data Model

- `mc_supplier_allocations` — one row per product-to-supplier assignment
- Fields: `container_request_id`, `product_id`, `supplier_id`, `supplier_code`, `allocated_pallets`, `allocated_quantity`, `expected_exw_price`, `notes`, `status`

### FSM Extension

```
MC_APPROVED
  → start_allocation → MC_ALLOCATION_IN_PROGRESS
  → create_allocation (per line)
  → complete_allocations → MC_PROFORMA_PENDING
```

### Admin Workspace

- Route: `/admin/mixed-container/allocations`
- API: `GET/POST /api/admin/mixed-containers/allocations/*`
- Operations assigns suppliers using `SUP-NNN` codes (never visible to buyers)
- Buyer sees anonymized references: **Allocation 1**, **Allocation 2**, etc.

### Timeline Events

- `mixed_container.allocation_started`
- `mixed_container.allocation_created`
- `mixed_container.allocations_completed`

### Control Tower

- `mixed_container_allocation_pending` — containers in `MC_APPROVED` or `MC_ALLOCATION_IN_PROGRESS`

## Supplier Anonymity

Buyer DTOs (`McAllocationBuyerDTO`) omit `supplier_id` and `supplier_code`. E2E validates no `SUP-` strings in buyer API responses.

## Status

✓ Allocation workspace created  
✓ Allocation records created  
✓ Supplier anonymity preserved
