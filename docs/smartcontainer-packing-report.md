# SmartContainer Packing Integration — Sprint 13B.1

## Buyer Flow

```
Category → Product → Packing Type → Pallet Quantity
```

## Packing Types by Category

| Category | Packing options |
|----------|-----------------|
| Pasta | 500g, 1kg, 3kg, 5kg |
| Sunflower Oil | 1L, 2L, 3L, 5L, 10L |
| Tomato Paste | 400g, 800g, 1650g |
| Pulses | 500g, 1kg, 2kg, 5kg |
| Rice / Flour / Biscuits / Sugar / Canned | Category-appropriate defaults |

## UI

- **Product cards** display available packing types (`mc-packing-types-{ref}`)
- **Add modal** uses radio-button packing selector (`mc-packing-type-selector`)
- Confirm disabled until packing type selected

## API Changes

`POST /api/mixed-containers/:id/lines` now requires:

```json
{
  "catalogProductId": "uuid",
  "packingTypeId": "uuid",
  "palletCount": 2
}
```

`ContainerLineDTO` includes `packingTypeId`, `packingTypeName`, `packingTypeCode`.

## Validation

- `requestPricing` rejects containers with lines missing or deactivated packing types
- `createOffer` (admin) validates all lines have active packing types
- `createAllocation` (admin) validates line packing type before assignment

## Lines Model

Same product + different packing type = separate container lines (not merged).
