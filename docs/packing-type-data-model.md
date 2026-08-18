# Packing Type Data Model — Sprint 13B.1

## Entities

### `packing_types`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `code` | string (unique) | Stable identifier, e.g. `PT-MC-PASTA-500G` |
| `name` | string | Display label, e.g. `500g` |
| `segment` | enum | `RETAIL`, `HORECA`, `INDUSTRIAL` |
| `unit_weight` | decimal | Numeric weight/volume |
| `unit_weight_uom` | string | `kg`, `L`, etc. |
| `description` | text | Optional |
| `is_active` | boolean | Catalog availability |
| `created_at` / `updated_at` | timestamp | Audit |

### `product_packing_types`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `catalog_kind` | enum | `MIXED_CONTAINER` or `BULK_CONTAINER` |
| `product_id` | UUID | References `catalog_products` or `bulk_catalog_products` |
| `packing_type_id` | UUID | FK → `packing_types` |
| `is_default` | boolean | Pre-selected in buyer UI |
| `is_active` | boolean | Assignment availability |

**Note:** `catalog_kind` disambiguates the dual-catalog architecture. A single `product_id` FK cannot span both product tables.

### Line-level FKs

| Table | Column |
|-------|--------|
| `container_lines` | `packing_type_id` (NOT NULL) |
| `bulk_container_lines` | `packing_type_id` (NOT NULL) |

## Architectural Principle

**Product ≠ Commercial SKU**

A catalog product (e.g. Penne Rigate) may offer multiple packing types (500g, 1kg, 3kg, 5kg). Each packing selection creates a distinct commercial line item tied to pricing, logistics, and supplier allocation.

## Segments

| Segment | Typical use |
|---------|-------------|
| RETAIL | Consumer pack sizes (SmartContainer) |
| HORECA | Foodservice / wholesale formats |
| INDUSTRIAL | Bulk bags, big bags (BulkContainer) |

## API Surface

- `GET /api/packing-types` — active packing types (authenticated)
- `GET /api/admin/packing-types` — full admin list
- `POST /api/admin/packing-types` — create
- `PATCH /api/admin/packing-types/:id` — update / activate / deactivate
- `POST /api/admin/packing-types/assign` — assign to product
- `PATCH /api/admin/packing-types/product-links/:linkId` — set default / active
- `GET /api/admin/packing-types/product-links?catalogKind=&productId=` — list assignments

## Contracts

`@dmx/contracts/packing-type` — DTOs, Zod schemas, segment enums.
