# BulkContainer — Builder Report

**Sprint:** 13B — BulkContainer Catalog + Specification Templates + Builder MVP  
**Date:** 2026-06-09  
**Status:** Implemented

---

## 1. Summary

BulkContainer Builder enables buyers to plan a **25 MT fixed-capacity container** using **metric ton (MT)** as the sole planning unit. No pallet logic. Specification templates are mandatory before line add.

---

## 2. Workspace

| Attribute | Value |
|-----------|-------|
| `WorkspaceType` | `BULK_CONTAINER` |
| External ref | `BC-{YYYY}-{NNNN}` e.g. `BC-2026-0001` |
| FSM states (13B) | `BC_DRAFT`, `BC_BUILDING`, `BC_SUBMITTED`, `BC_CANCELLED` |
| Submit action | `submit_request` → `BC_SUBMITTED` |

**Contracts:** `packages/contracts/src/bulk-container.fsm.ts`

---

## 3. Builder model

Every line contains:

| Field | Source |
|-------|--------|
| Product | `bulk_catalog_products` |
| Specification | `specValues` JSONB validated against template |
| Quantity | `quantityMt` (decimal, primary unit) |

**No pallet count.** No SmartContainer table reuse.

---

## 4. Capacity model

| Constant | Value |
|----------|-------|
| `BC_MAX_CAPACITY_MT` | 25 |
| `BC_PARTIAL_THRESHOLD_MT` | 20 |

| Calculated | Formula |
|------------|---------|
| `currentWeightMt` | Σ line `quantityMt` |
| `remainingMt` | `25 - currentWeightMt` |
| `fillPercent` | `round(current / 25 × 100)` |

### Warnings (advisory)

| Key | Condition | Label |
|-----|-----------|-------|
| `partial_container` | `0 < currentMt < 20` | Partially Utilized Container |
| `over_capacity` | `currentMt > 25` | Container Capacity Exceeded |

---

## 5. Fill meter UI

```
BulkContainer Fill
18.00 of 25 MT used · 7.00 remaining
72%
```

**Component:** `CapacityMeter.tsx`  
**testIds:** `bc-capacity-meter`, `bc-mt-used`, `bc-fill-percent`, `bc-warning-{key}`

---

## 6. API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/bulk-containers` | Create workspace |
| GET | `/api/bulk-containers` | List buyer containers |
| GET | `/api/bulk-containers/:id` | Builder DTO |
| POST | `/api/bulk-containers/:id/lines` | Add spec line |
| PATCH | `/api/bulk-containers/:id/lines/:lineId` | Update MT/spec |
| DELETE | `/api/bulk-containers/:id/lines/:lineId` | Remove line |
| POST | `/api/bulk-containers/:id/actions/submit` | Submit → `BC_SUBMITTED` |

---

## 7. Timeline events

| Event | Trigger |
|-------|---------|
| `bulk_container.created` | Workspace create |
| `bulk_container.updated` | Line add/update/remove, edit |
| `bulk_container.submitted` | Submit procurement request |

---

## 8. Buyer routes

| Route | Page |
|-------|------|
| `/buyer/bulk-container` | Home |
| `/buyer/bulk-container/requests` | My Bulk Containers (Draft / Submitted) |
| `/buyer/bulk-container/requests/:id` | Builder + capacity meter |

**Out of scope (13B):** Pricing, procurement, allocation, execution workflows.

---

## 9. Example load

| Product | MT |
|---------|-----|
| Flour | 10 |
| Bulgur | 5 |
| Pulses | 7 |
| Salt | 3 |
| **Total** | **25 (100%)** |

Verified via API smoke test and Playwright E2E.
