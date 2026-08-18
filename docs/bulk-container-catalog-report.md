# BulkContainer — Catalog Report

**Sprint:** 13B — BulkContainer Catalog + Specification Templates + Builder MVP  
**Date:** 2026-06-09  
**Status:** Implemented

---

## 1. Summary

BulkContainer V1 catalog delivers **6 categories**, **6 specification templates**, and **8 seeded products** for bulk/horeca/industrial procurement. Catalog uses **specification cards** — not retail product cards.

---

## 2. Database tables

| Table | Prisma model | Purpose |
|-------|--------------|---------|
| `bulk_catalog_categories` | `BulkCatalogCategory` | Category taxonomy |
| `bulk_catalog_products` | `BulkCatalogProduct` | Product index with indicative USD/MT |
| `bulk_spec_templates` | `BulkSpecTemplate` | JSONB parameter schemas |

**Migration:** `20260609120000_sprint13b_bulk_container`

---

## 3. V1 categories

| # | Slug | Name | Products seeded |
|---|------|------|-----------------|
| 1 | `wheat-flour` | Wheat Flour | BC-FLOUR-001 |
| 2 | `semolina` | Semolina | BC-SEMOLINA-001 |
| 3 | `pasta` | Pasta | BC-PASTA-001 |
| 4 | `bulgur` | Bulgur | BC-BULGUR-001 |
| 5 | `pulses` | Pulses | BC-PULSE-001 (Red Lentils), BC-PULSE-002 (Chickpeas), BC-PULSE-003 (White Beans) |
| 6 | `salt` | Salt | BC-SALT-001 |

**Excluded:** Private Label, Custom Packaging, Custom Brand (per product rules).

---

## 4. Specification templates

| Product type | Parameters |
|--------------|------------|
| **WHEAT_FLOUR** | Protein, Ash, Moisture, Wet Gluten, Packing, Origin |
| **SEMOLINA** | Protein, Ash, Granulation, Moisture, Packing |
| **PASTA** | Shape, Packing, Protein |
| **BULGUR** | Type, Coarse, Medium, Fine, Packing, Origin |
| **PULSES** | Product Type (Red/Green Lentils, Chickpeas, White/Kidney Beans, Peas), Origin, Crop Year, Packing |
| **SALT** | Refined, Industrial, Iodized, Packing, Origin |

Validation engine: `bulk-container.service.ts` → `validateSpecValues()` against template schema.

---

## 5. API endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/bulk-container/catalog/categories` | BUYER+ |
| GET | `/api/bulk-container/catalog/products` | BUYER+ |
| GET | `/api/bulk-container/catalog/products/:id` | BUYER+ |

**Buyer DTO safety:** No supplier names, org IDs, or factory refs.

---

## 6. Indicative pricing

| Product | Range (USD/MT) |
|---------|----------------|
| Industrial Wheat Flour | $320 – $360 |
| Durum Semolina | $380 – $420 |
| Bulk Pasta Penne | $450 – $490 |
| Yellow Bulgur | $340 – $380 |
| Red Lentils | $520 – $580 |
| Chickpeas | $480 – $540 |
| White Beans | $460 – $510 |
| Refined Table Salt | $80 – $120 |

Displayed as "Indicative market range" — not live pricing.

---

## 7. Frontend

| Route | Page | testId |
|-------|------|--------|
| `/buyer/bulk-container/catalog` | Categories | `bc-catalog-categories` |
| `/buyer/bulk-container/catalog/:category` | Spec cards | `bc-catalog-products`, `bc-product-card-{ref}` |

**Component:** `SpecCard.tsx` — specification-first layout with left accent border, no retail imagery.

---

## 8. Seed

`apps/backend/prisma/seed.ts` — idempotent upsert for categories, templates, and products.
