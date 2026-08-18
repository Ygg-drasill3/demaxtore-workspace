# Bulk Container Offer Workspace Report — Sprint 13C

**Date:** 2026-06-09  
**Scope:** Buyer offer review, approval, revision, and expiration

## Buyer Offer Page

**Route:** `/buyer/bulk-container/offers/:id`

### Visible Fields (no supplier data)

| Column | Source |
|--------|--------|
| Product | `bc_offer_lines.product_name` |
| Specification | `bc_offer_lines.specification_summary` |
| Packing Type | `bc_offer_lines.packing_type` |
| Quantity (MT) | `bc_offer_lines.quantity_mt` |
| Unit Price | `bc_offer_lines.unit_price` |
| Line Total | `bc_offer_lines.line_total` |
| Offer Total | `bc_container_offers.offer_total` |
| Offer Validity | `bc_container_offers.valid_until` (72h default) |

Countdown display: `72h` / `48h` / `24h` / `Expired` via `bc-offer-countdown`.

## Buyer Actions

| Action | Transition | Result |
|--------|------------|--------|
| Approve Offer | `BC_BUYER_REVIEW` → `BC_APPROVED` | Offer locked; timeline `bulk_offer_approved` |
| Request Revision | `BC_BUYER_REVIEW` → `BC_REVISION_REQUESTED` | Message stored in `bc_revision_requests` |

Revision examples supported in free-text message: quantity change, product removal/replacement, specification changes.

## Offer Expiration

- Default validity: **72 hours** (`BC_OFFER_VALIDITY_HOURS`)
- System job / Control Tower scan calls `expireOffers()` for `SENT` offers past `valid_until`
- Transition: `BC_BUYER_REVIEW` → `BC_EXPIRED`
- Expired offers are **read-only** on buyer page (`bc-offer-expired`)

## Operations Resume After Revision

`BC_REVISION_REQUESTED` → Ops **Resume Procurement** → `BC_PROCUREMENT_IN_PROGRESS`  
Ops may re-quote, create new offer version, and re-send.

## API Endpoints (Buyer)

- `GET /api/bulk-containers/offers/:offerId`
- `POST /api/bulk-containers/offers/:offerId/actions/approve`
- `POST /api/bulk-containers/offers/:offerId/actions/request-revision`

## Status

**PASS** — Buyer offer review, approval, revision, and expiration implemented.
