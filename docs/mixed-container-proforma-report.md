# Sprint 12D — Mixed Container Proforma Collection Report

## Summary

After supplier allocation, operations collects proforma invoices per allocation. Buyers review proformas without seeing supplier identity.

## Delivered

### Data Model

- `mc_supplier_proformas` — one proforma per allocation
- Fields: `proforma_number`, `supplier_reference`, `issue_date`, `due_date`, `currency`, `amount`, `document_url`, `status`

### Workflow

```
Allocation Created (PROFORMA_REQUESTED)
  → Operations uploads proforma (UPLOADED)
  → Buyer reviews (BUYER_REVIEWED)
  → All proformas uploaded → MC_PAYMENT_TRACKING
```

### API

- Admin upload: `POST /api/admin/mixed-containers/allocations/:id/allocations/:allocationId/proformas`
- Buyer review: `POST /api/mixed-containers/:id/proformas/:proformaId/review`

### Buyer View

- Proformas shown by allocation reference and product name
- Document link available for download/review
- No supplier reference or code exposed

### Timeline Events

- `mixed_container.proforma_uploaded`

### Control Tower

- `mixed_container_proforma_pending` — containers in `MC_PROFORMA_PENDING`

## Status

✓ Proforma collection workflow created  
✓ Buyer proforma view created
