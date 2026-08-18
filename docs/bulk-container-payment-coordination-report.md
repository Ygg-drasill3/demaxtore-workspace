# Bulk Container Payment Coordination Report — Sprint 13D

**Date:** 2026-06-09  
**Scope:** Direct buyer-to-supplier payment tracking and execution readiness

## Commercial Model

Buyers pay suppliers **directly** (bank transfer). DeMaxtore coordinates tracking only — no payment gateway.

## Payment Status Enum

| Status | Meaning |
|--------|---------|
| `PAYMENT_PENDING` | Awaiting buyer payment / ops confirmation |
| `PAYMENT_CONFIRMED` | Ops verified payment received |
| `PAYMENT_REJECTED` | Payment rejected / needs rework |

## Data Model (`bc_payment_records`)

Auto-created from proforma amounts when all proformas are uploaded.

| Field | Notes |
|-------|-------|
| `allocation_id` | Links to allocation |
| `supplier_code` | Ops-only |
| `payment_reference` | Optional bank ref |
| `confirmed_at` | Set on confirmation |

## Buyer Coordination Page

Route: `/buyer/bulk-container/coordination/:id`

| Section | Content |
|---------|---------|
| Payment Progress | Per-allocation: Proforma Received / Payment Pending / Confirmed |
| Allocations | Allocation 1, 2, 3 — no supplier names |
| Proformas | Download links |
| Payments | Status per allocation |
| Timeline | Offer → Allocation → Proforma → Payment → Execution Ready |

## Execution Ready Rule

`BC_EXECUTION_READY` requires:

- Every line fully allocated (MT)
- Every allocation has proforma
- Every payment `PAYMENT_CONFIRMED`

**No order spawn in 13D** — Sprint 13E handles execution.

## Control Tower Alerts

- `bulk_allocation_pending`
- `bulk_proforma_pending`
- `bulk_payment_pending`
- `bulk_execution_ready`

## API

```
PATCH /api/admin/bulk-container/allocations/:id/payments/:paymentId
Body: { status: "PAYMENT_CONFIRMED", paymentReference? }

GET /api/bulk-containers/:id/coordination
```

## Timeline Events

- `bulk_payment_record_created`
- `bulk_payment_confirmed`
- `bulk_execution_ready`

## Status

**PASS** — Payment tracking and execution-ready gating complete.
