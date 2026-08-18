# BulkContainer Packing Integration — Sprint 13B.1

> **LOCKED (v1.0):** The packing list below is frozen before Sprint 13C. See `docs/bulk-container-packing-locked-decision.md`.

## Buyer Flow

```
Category → Product → Specification → Packing Type → Quantity (MT)
```

## Packing Types by Category

| Category | Packing options |
|----------|-----------------|
| Wheat Flour | 25kg Bag, 50kg Bag |
| Semolina | 25kg Bag, 50kg Bag |
| Bulgur | 25kg Bag, 50kg Bag |
| Pulses | 25kg Bag, 50kg Bag |
| Salt | 25kg Bag, 50kg Bag, 1000kg Big Bag |
| Pasta | 5kg, 10kg, 20kg, 25kg |

## UI

- **Spec cards** show available packing types (`bc-packing-types-{ref}`)
- **Add modal** uses card-style packing selector after product name, before spec fields (`bc-packing-type-selector`)
- Confirm disabled until packing type and required specs filled

## API Changes

`POST /api/bulk-containers/:id/lines` now requires:

```json
{
  "catalogProductId": "uuid",
  "packingTypeId": "uuid",
  "quantityMt": 10,
  "specValues": { ... }
}
```

`BulkContainerLineDTO` includes `packingTypeId`, `packingTypeName`, `packingTypeCode`.

## Validation

- `submitRequest` rejects containers with lines missing or deactivated packing types

## Relationship to Spec Template

Specification templates retain their `packing` enum parameter for technical specs. The unified `packing_type_id` on the line is the canonical commercial packing attribute for requests, offers, and future RFQ/FreightIQ integrations.
