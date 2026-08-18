# Bulk Container Proforma Report — Sprint 13D

**Date:** 2026-06-09  
**Scope:** Proforma collection after supplier allocation

## Summary

Operations uploads supplier proformas (PDF, Excel, documents) per allocation. Buyers download proformas from the coordination page without seeing supplier identity.

## Data Model (`bc_supplier_proformas`)

| Field | Visibility |
|-------|------------|
| `allocation_id` | Internal |
| `supplier_code` | Operations only |
| `proforma_number` | Buyer + Ops |
| `proforma_file_url` | Buyer download link |
| `amount` / `currency` | Buyer + Ops |
| `uploaded_at` | Buyer + Ops |

## Workflow

1. Workspace in `BC_PROFORMA_PENDING` (or auto-transition from allocation upload)
2. Ops uploads proforma per allocation via workspace UI or API
3. When all allocations have proformas → auto `BC_PAYMENT_TRACKING` + payment records created

## API

```
POST /api/admin/bulk-container/allocations/:id/allocations/:allocationId/proformas
Body: { proformaNumber, proformaFileUrl, amount, currency }
```

## Buyer Access

Route: `/buyer/bulk-container/coordination/:id`  
Section: Supplier Proformas — download link per allocation reference.

## Timeline

- `bulk_proforma_uploaded`

## Status

**PASS** — Proforma upload and buyer download implemented.
