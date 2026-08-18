# Mixed Container Builder Report — Sprint 12B

**Date:** 2026-06-08  
**Scope:** Container planning workspace (not checkout)

## Summary

The Container Builder is a planning workspace where buyers assemble mixed food containers by pallet. It emphasizes RFQ-grade trade workflow language — not e-commerce checkout.

## Routes

| Route | Purpose |
|-------|---------|
| `/buyer/mixed-container/requests/:id` | Container Builder |
| `/buyer/mixed-container/requests` | My Mixed Containers list |

## Container Builder Features

### Display

- Container type (default 40FT)
- Used pallets / remaining capacity
- Fill meter (`mc-fill-meter`, `mc-fill-percent`, `mc-fill-bar`)
- Estimated value range (min–max from indicative ranges × pallet qty)
- Product breakdown table with category mix per line
- Partial container message: *Partial containers are allowed*

### Actions

- Increase / decrease pallets per line
- Remove product
- Continue browsing (returns to catalog with `containerId`)
- **Request Live Pricing** — creates pricing request

### Estimated Value

```
estValueMin = Σ (indicativeLow × palletCount)
estValueMax = Σ (indicativeHigh × palletCount)
```

Displayed with label: *Estimated value only — not final supplier pricing*

## Add To Container Flow

1. Buyer clicks **Add To Container** on product card
2. Modal opens with default quantity = MOQ pallets
3. Buyer adjusts pallet count (minimum MOQ)
4. Confirm → product added to container → navigates to builder

If no container exists, one is created automatically (`CONTAINER_40FT`, USD).

## Request Creation

On **Request Live Pricing**:

- Status transitions: `MC_DRAFT` / `MC_BUILDING` → `MC_PRICING_REQUESTED`
- Success banner: *Your request has been submitted. Expected response time: 24–48 hours.*
- Timeline events recorded (see mixed-container service)

## FSM States (Sprint 12B scope)

| State | Meaning |
|-------|---------|
| `MC_DRAFT` | Empty or reset container |
| `MC_BUILDING` | Products added |
| `MC_PRICING_REQUESTED` | Live pricing requested |

## Timeline Events

- `mixed_container.created`
- `mixed_container.product_added`
- `mixed_container.product_removed`
- `mixed_container.quantity_updated`
- `mixed_container.pricing_requested`

## My Mixed Containers

List columns: Reference, Status, Products, Pallets, Estimated Value, Created Date, Last Activity, Open link.

## Verification

Playwright tests 03–05 validate add, pallet adjustment, fill meter, estimated value, remove, request pricing, and list appearance.

## Status

**PASS** — Container Builder MVP operational.
