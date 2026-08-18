# Mixed Container Admin Catalog Report — Sprint 12B

**Date:** 2026-06-08  
**Scope:** Admin catalog management for Mixed Container products

## Summary

Admin users manage the buyer-facing Mixed Container catalog via `/admin/mixed-container/catalog`. This is a simple CRUD interface — no supplier allocation or live pricing.

## Route

`/admin/mixed-container/catalog` — nav item **MC Catalog** under admin menu

## Capabilities

| Action | UI | API |
|--------|-----|-----|
| Create category | `admin-mc-cat-create` | `POST /api/admin/mixed-container/catalog/categories` |
| Edit category | (API ready) | `PATCH /api/admin/mixed-container/catalog/categories/:id` |
| Create product | `admin-mc-prod-save` | `POST /api/admin/mixed-container/catalog/products` |
| Edit product | `admin-mc-edit-*` | `PATCH /api/admin/mixed-container/catalog/products/:id` |
| Deactivate product | `admin-mc-deactivate-*` | `PATCH` with `status: DISCONTINUED` |
| Update indicative range | form fields low/high | patch product |
| Update market status | `admin-mc-prod-market` | patch product |
| Upload product image | `admin-mc-upload-*` | `POST /api/admin/mixed-container/catalog/products/:id/image` |

## Admin Product Fields

- Category, product ref, name, packaging
- Units per pallet, MOQ pallets
- Market status (STABLE / RISING / SHORT)
- Indicative low / high (USD)
- Origin country
- Supplier count (aggregate for buyer label — not identity)

## Image Upload

- Accepted: PNG, JPEG, WebP
- Stored via platform file storage
- Buyer sees image at `/api/mixed-container/catalog/products/:id/image`

## Buyer Impact

- Deactivated products (`DISCONTINUED`) excluded from buyer catalog queries
- Category/product changes reflect immediately in buyer discovery

## Seed Data

Migration `20260608120000_sprint12b_mixed_container` + seed provides 9 categories and 12 products for demo/E2E.

## Status

**PASS** — Admin catalog CRUD, deactivate, price range, market status, and image upload implemented.
