# Bulk Container Allocation Report — Sprint 13D

**Date:** 2026-06-09  
**Scope:** Post-approval supplier allocation for BulkContainer

## Summary

After offer approval (`BC_APPROVED`), Operations assigns suppliers to product lines using anonymous codes. Buyers see allocation references only.

## Operations Workspace

| Route | Purpose |
|-------|---------|
| `/admin/bulk-container/allocations` | Coordination inbox + KPIs |
| `/admin/bulk-container/allocations/:id` | Allocation workspace |

## Workflow

1. Buyer approves offer → `BC_APPROVED`
2. Ops assigns suppliers per line → `BC_ALLOCATION_IN_PROGRESS`
3. Ops completes allocations (all lines fully allocated in MT) → `BC_PROFORMA_PENDING`

## Data Model (`bc_supplier_allocations`)

| Field | Notes |
|-------|-------|
| `workspace_id` | BulkContainer workspace |
| `line_id` | `bulk_container_lines` FK |
| `supplier_code` | Ops-only (`SUP-001`, etc.) |
| `allocated_quantity_mt` | Supports split allocations per line |
| `allocation_status` | ASSIGNED → PROFORMA_REQUESTED → … |

## API Endpoints

- `GET /api/admin/bulk-container/allocations/kpis`
- `GET /api/admin/bulk-container/allocations/inbox`
- `GET /api/admin/bulk-container/allocations/:id`
- `POST /api/admin/bulk-container/allocations/:id/actions/start-allocation`
- `POST /api/admin/bulk-container/allocations/:id/allocations`
- `POST /api/admin/bulk-container/allocations/:id/actions/complete-allocations`

## Timeline

- `bulk_allocation_created`

## Status

**PASS** — Allocation workspace operational; supplier codes hidden from buyers.
