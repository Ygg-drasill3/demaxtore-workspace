# BulkContainer Packing Catalog — Locked Decision

**Status:** LOCKED as of Sprint 13B.1 (pre-13C)  
**Catalog version:** `1.0`  
**Contract:** `@dmx/contracts/bulk-container-packing-locked`

## Decision

BulkContainer packing types are **frozen** before Sprint 13C. Pricing, offers, and supplier matching will bind to these stable codes — they must not be changed casually.

## Locked Catalog

| Category | Packing types |
|----------|---------------|
| Wheat Flour | 25kg Bag, 50kg Bag |
| Semolina | 25kg Bag, 50kg Bag |
| Bulgur | 25kg Bag, 50kg Bag |
| Pulses | 25kg Bag, 50kg Bag |
| Salt | 25kg Bag, 50kg Bag, 1000kg Big Bag |
| Pasta | 5kg, 10kg, 20kg, 25kg |

## Stable Codes (15 total)

```
PT-BC-FLOUR-25KG      PT-BC-FLOUR-50KG
PT-BC-SEMOLINA-25KG   PT-BC-SEMOLINA-50KG
PT-BC-BULGUR-25KG     PT-BC-BULGUR-50KG
PT-BC-PULSE-25KG      PT-BC-PULSE-50KG
PT-BC-SALT-25KG       PT-BC-SALT-50KG     PT-BC-SALT-1000KG
PT-BC-PASTA-5KG       PT-BC-PASTA-10KG    PT-BC-PASTA-20KG    PT-BC-PASTA-25KG
```

## Enforcement

| Layer | Guard |
|-------|-------|
| Contracts | Single source of truth + unit tests |
| Seed | Imports locked list only |
| API `create` | Rejects new `PT-BC-*` codes outside catalog |
| API `update` | Blocks deactivate / rename / weight change on locked types |
| API `assign` | Only locked codes valid per category |
| Line validation | `assertValidPackingTypeForProduct` checks locked catalog |
| Admin UI | Locked notice + deactivate disabled for BC types |

## Change Process

To modify this catalog:

1. Bump `BULK_CONTAINER_PACKING_CATALOG_VERSION` (e.g. `1.0` → `1.1`)
2. Update `BULK_CONTAINER_LOCKED_PACKING_TYPES` in contracts
3. Migration + seed re-sync
4. Reconcile 13C pricing/supplier tables against new version

**SmartContainer (`PT-MC-*`) packing types remain flexible** — this lock applies to BulkContainer only.

## Rationale

13C will attach:

- Indicative → live pricing per packing code
- Supplier capability matrix per packing code
- Offer line items keyed by `packing_type_id`

Changing packing codes mid-stream would orphan pricing and matching data.
