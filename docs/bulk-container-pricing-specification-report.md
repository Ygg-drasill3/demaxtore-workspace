# BulkContainer — Pricing & Specification Report

**Sprint:** 13A / 13A.1 — BulkContainer Architecture & Product Family Alignment  
**Date:** 2026-06-09  
**Status:** Design specification (no runtime implementation)  
**Note:** CommodityBid integration removed in 13A.1 — see `bulk-container-no-auction-decision.md`.

---

## 1. Scope

This report defines:

1. **Specification model** — generic schema and product-type templates
2. **Pricing architecture** — indicative catalog, live ops pricing, offer validity
3. **Operations-led procurement** — no auction; pricing entered by ops after buyer request

---

## 2. Specification model

### 2.1 Design goals

| Goal | Rationale |
|------|-----------|
| Generic schema | One validation engine for all bulk product types |
| Product-type templates | Flour specs ≠ rice specs — different required fields |
| Buyer fills values | Ops reviews compliance before sourcing |
| Spec affects pricing | Protein range, crop year, etc. drive supplier matching and price |
| Immutable at quote | Line snapshot freezes spec values at pricing request |

### 2.2 Generic parameter types

| Type | UI control | Validation |
|------|------------|------------|
| `range` | Min–max inputs | `min <= value <= max` within template bounds |
| `max` | Single upper bound | `value <= max` |
| `min` | Single lower bound | `value >= min` |
| `enum` | Dropdown | Value in allowed set |
| `text` | Short text | Max length |
| `year` | Year picker | 4-digit, optional crop year rules |

### 2.3 Template JSON schema (contract)

```typescript
interface BulkSpecTemplate {
  productType: 'FLOUR' | 'SEMOLINA' | 'RICE' | 'PULSES' | 'OIL' | 'GENERIC';
  parameters: BulkSpecParameter[];
}

interface BulkSpecParameter {
  key: string;
  label: string;
  type: 'range' | 'max' | 'min' | 'enum' | 'text' | 'year';
  unit?: string;
  required: boolean;
  min?: number;
  max?: number;
  options?: string[];
  pricingImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  helpText?: string;
}
```

`pricingImpact` guides ops UI highlighting — HIGH params require explicit review.

---

## 3. Product-type specification templates

### 3.1 Flour

| Parameter | Type | Example | Pricing impact |
|-----------|------|---------|----------------|
| `protein` | range (%) | 11.5 – 12.5 | HIGH |
| `ash` | max (%) | max 0.55 | HIGH |
| `moisture` | max (%) | max 14.5 | MEDIUM |
| `wetGluten` | range (%) | 26 – 30 | MEDIUM |
| `packing` | enum | 50 kg PP woven, 25 kg paper | MEDIUM |

### 3.2 Semolina

| Parameter | Type | Example | Pricing impact |
|-----------|------|---------|----------------|
| `granulation` | enum | Fine, Medium, Coarse | HIGH |
| `protein` | range (%) | 12.0 – 13.0 | HIGH |
| `ash` | max (%) | max 0.65 | MEDIUM |
| `moisture` | max (%) | max 14.5 | MEDIUM |
| `packing` | enum | 25 kg PP woven | MEDIUM |

### 3.3 Rice

| Parameter | Type | Example | Pricing impact |
|-----------|------|---------|----------------|
| `variety` | enum | Basmati, Long grain, Parboiled | HIGH |
| `brokenRate` | max (%) | max 5 | HIGH |
| `moisture` | max (%) | max 14.0 | MEDIUM |
| `origin` | enum | India, Thailand, Vietnam, etc. | MEDIUM |
| `packing` | enum | 25 kg, 50 kg | MEDIUM |

### 3.4 Pulses

| Parameter | Type | Example | Pricing impact |
|-----------|------|---------|----------------|
| `pulseType` | enum | Lentils, Chickpeas, Beans, etc. | HIGH |
| `size` | enum | 6mm, 7mm, 8mm | HIGH |
| `origin` | enum | Canada, Australia, etc. | MEDIUM |
| `cropYear` | year | 2025 | HIGH |
| `packing` | enum | 25 kg, 50 kg | MEDIUM |

### 3.5 Oil

| Parameter | Type | Example | Pricing impact |
|-----------|------|---------|----------------|
| `oilType` | enum | Sunflower, Olive, Palm olein, etc. | HIGH |
| `grade` | enum | Crude, Refined, Extra virgin | HIGH |
| `packing` | enum | 20 L tin, 20 L PET, bulk flexi | HIGH |
| `ffa` | max (%) | max 0.5 (contextual) | MEDIUM |
| `origin` | enum | Spain, Ukraine, etc. | MEDIUM |

### 3.6 Generic (foodservice / ingredients)

| Parameter | Type | Example | Pricing impact |
|-----------|------|---------|----------------|
| `productDescription` | text | "Foodservice tomato paste 4.5kg" | HIGH |
| `packing` | enum | From catalog options | HIGH |
| `shelfLifeMin` | min (months) | min 12 | MEDIUM |
| `certifications` | enum (multi) | Halal, BRC, ISO | LOW |

---

## 4. Specification review workflow (ops)

```
Buyer submits spec values
  → System validates against template (blocking)
  → Ops spec review (BC_PROCUREMENT_IN_PROGRESS)
       ├─ APPROVED → proceed to sourcing
       ├─ CLARIFICATION → message buyer (future)
       └─ REJECTED → return to BC_BUILDING with notes
```

Control Tower: `bulk_container_spec_missing` if required params empty at submit attempt.

---

## 5. Pricing architecture

### 5.1 Two-tier pricing model

| Tier | When | Source | Buyer label |
|------|------|--------|-------------|
| **Indicative** | Pre-submit (catalog browse + builder) | Market bands, historical trades | "Indicative market range" |
| **Live** | Post-submit (ops procurement) | Manual supplier quotes | "Live offer" |

No instant price lock. No checkout.

### 5.2 Catalog pricing display

Each `bulk_container_catalog_products` row exposes:

| Field | Display |
|-------|---------|
| `indicativeLow` – `indicativeHigh` | "$420 – $480 / MT" |
| `marketStatus` | Badge: Stable · Rising · Volatile |
| `lastPriceUpdatedAt` | "Last updated 2 days ago" |
| `volatilityClass` | Drives default offer validity override |

### 5.3 Unit price basis

| Basis | Used when | Example |
|-------|-----------|---------|
| `USD / MT` | Flour, rice, pulses, semolina | $445/MT |
| `USD / Bag` | Buyer orders in bags | $22.25/bag (50kg) |
| `USD / Pallet` | Buyer orders in pallets | $890/pallet |

Offer lines store `priceBasis` explicitly. Builder converts for totals.

### 5.4 Live pricing workflow

```
BC_PRICING_REQUESTED
  → bulk_container_quotes (PENDING)
  → Ops: spec review → supplier sourcing
  → Ops: manual price entry per line (bulk_container_offer_lines)
  → bulk_container_offers (DRAFT → SENT)
  → BC_BUYER_REVIEW
```

Internal procurement quotes stored ops-only (analogous to `mc_procurement_quotes`).

### 5.5 Offer validity

| Rule | Value |
|------|-------|
| Default validity | **72 hours** from `validFrom` |
| Volatile products | Shorter per-line `validUntil` on `bulk_container_offer_lines` (e.g. 48h for oil) |
| Expiry behaviour | Workspace → `BC_EXPIRED` if not approved; buyer must re-request pricing |
| Extension | Ops may publish new offer version (supersedes prior) |

### 5.6 Revision / repricing

| Trigger | Behaviour |
|---------|-----------|
| Buyer revision request | New quote cycle; prior offer `SUPERSEDED` |
| Ops cannot source line | Partial offer or revision request to buyer |
| Market move during validity | Ops judgment — honour offer or supersede with new version |

---

## 6. Pricing vs SmartContainer

| Aspect | SmartContainer | BulkContainer |
|--------|----------------|---------------|
| Primary basis | USD / pallet | USD / MT (also bag, pallet) |
| Volatility | Moderate | Higher |
| Spec impact | Low (certifications) | High (technical params) |
| Validity | 72h flat | 72h default + per-line override |
| Market display | Recent txn range / pallet | Market status + MT range |

---

## 7. No CommodityBid integration (locked — 13A.1)

BulkContainer pricing is **exclusively operations-led**. CommodityBid is reserved for large-volume competitive auction sourcing as a **separate product**.

| Excluded | Detail |
|----------|--------|
| Auction / bidding | Not in BulkContainer FSM or UI |
| Line-level CB spawn | No `commodityBidWorkspaceId` link |
| `procurementMethod` field | Removed from data model |
| `auctionEligible` catalog flag | Removed from data model |
| Supplier portal | BulkContainer is buyer + ops only |

Buyers needing auction price discovery use **CommodityBid** independently. Ops may reference market prices when entering BulkContainer offer lines, but no automated CB price feed.

See `bulk-container-no-auction-decision.md`.

---

## 8. Reporting implications (future)

| Report | Data source |
|--------|-------------|
| Bulk offer margin | offer lines vs internal allocation prices |
| Spec compliance rate | spec review pass/fail |
| Volatility tracking | indicative vs live delta per product type |
| Ops pricing turnaround | quote request → offer sent duration |

---

## 9. Summary

| Area | Decision |
|------|----------|
| Spec model | Generic schema + per-product-type templates |
| Private label | Not in V1; standard bulk packing enum only |
| Indicative pricing | Catalog bands + market status + last updated |
| Live pricing | Ops manual entry after spec review |
| Price basis | USD/MT primary; bag and pallet supported |
| Offer validity | 72h default; shorter for volatile lines |
| CommodityBid | **No integration** — separate auction product |
