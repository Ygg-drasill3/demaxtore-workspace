# BulkContainer — Admin Catalog Report

**Sprint:** 13B — BulkContainer Catalog + Specification Templates + Builder MVP  
**Date:** 2026-06-09  
**Status:** Implemented

---

## 1. Summary

Admin catalog workspace provides CRUD for bulk categories, products, specification templates, and indicative price ranges. No supplier management — BulkContainer is buyer + ops only.

---

## 2. Admin route

| Route | Page | testId |
|-------|------|--------|
| `/admin/bulk-container/catalog` | `BulkCatalogAdminPage` | `bc-admin-catalog` |

**Navigation:** Admin → Workspaces → Bulk Container Catalog (`admin-bulk-container-catalog`)

---

## 3. API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/bulk-container/catalog/categories` | List categories |
| POST | `/api/admin/bulk-container/catalog/categories` | Create category |
| PATCH | `/api/admin/bulk-container/catalog/categories/:id` | Update category |
| GET | `/api/admin/bulk-container/catalog/products` | List products |
| POST | `/api/admin/bulk-container/catalog/products` | Create product |
| PATCH | `/api/admin/bulk-container/catalog/products/:id` | Update product |
| GET | `/api/admin/bulk-container/catalog/spec-templates` | List templates |
| POST | `/api/admin/bulk-container/catalog/spec-templates` | Create template |
| PATCH | `/api/admin/bulk-container/catalog/spec-templates/:id` | Update template |

**Auth:** `requireRole("ADMIN")`

---

## 4. Admin capabilities

| Entity | CRUD | Fields |
|--------|------|--------|
| Categories | ✓ | slug, name, sortOrder, status (ACTIVE/INACTIVE) |
| Products | ✓ | productRef, categoryId, name, standardPacking, specTemplateId, indicativeLow/High, minOrderMt, status |
| Spec templates | ✓ | productType, name, schema (JSONB), isActive |

### Activate / Deactivate

Product and category `status` field: `ACTIVE` | `INACTIVE`. Inactive products excluded from buyer catalog queries.

---

## 5. Supplier visibility

| Rule | Status |
|------|--------|
| No supplier names in catalog | ✓ |
| No supplier profiles | ✓ |
| No supplier portal/access | ✓ |

BulkContainer V1 is operations-led managed sourcing — supplier allocation is a future sprint (13D).

---

## 6. Module structure

```
apps/backend/src/modules/bulk-container-catalog/
├── catalog.service.ts
├── catalog.controller.ts
└── catalog.routes.ts

apps/frontend/src/features/bulk-container/pages/
└── BulkCatalogAdminPage.tsx
```

---

## 7. Control Tower (13B)

| Alert key | Severity | Trigger |
|-----------|----------|---------|
| `bulk_container_incomplete` | WARNING | BC workspace with no lines, age > 1h |
| `bulk_container_submitted` | INFO | `BC_SUBMITTED` within 24h |

Scanner: `bulk-container-alerts.ts` registered in `alert-engine.ts`.
