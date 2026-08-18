# Packing Standardization Report — Sprint 13B.1

## Mission

Create a unified Packing Type architecture mandatory across SmartContainer and BulkContainer.

## Delivered

| Capability | Status |
|------------|--------|
| `packing_types` entity | ✓ |
| `product_packing_types` junction | ✓ |
| `container_lines.packing_type_id` | ✓ |
| `bulk_container_lines.packing_type_id` | ✓ |
| Mandatory selection on add-line | ✓ |
| Submit/pricing validation | ✓ |
| Offer creation validation | ✓ |
| Allocation creation validation | ✓ |
| Catalog DTOs include `packingTypes[]` | ✓ |
| Admin CRUD + assign + activate | ✓ |
| Control Tower alerts | ✓ |
| Timeline events | ✓ |
| Learning Center article | ✓ |
| Playwright E2E | ✓ 8/8 |

## Out of Scope (per sprint rules)

- CommodityBid FSM
- Order / Shipment / FreightIQ FSM
- SmartContainer / BulkContainer workflow FSM changes

This sprint is **data standardization only** — packing type is layered onto existing builder flows without restructuring procurement or execution states.

## Seed Coverage

31 packing types seeded across SmartContainer categories (pasta, oil, tomato paste, pulses, rice, etc.) and BulkContainer categories (flour, semolina, bulgur, pulses, salt, pasta).

Every active catalog product has at least one assigned packing type.

## Validation Error Codes

| Code | When |
|------|------|
| `PACKING_TYPE_REQUIRED` | Submit/pricing/allocation without packing on line |
| `PACKING_TYPE_INVALID` | Packing type not assigned to product or inactive |
| `PACKING_TYPE_DEACTIVATED` | Line references deactivated packing type |

## Timeline Events

- `packing_type_selected` — line added with packing selection
- `packing_type_updated` — quantity update on existing packed line
