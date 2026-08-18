# Mixed Container Offer Workspace Report — Sprint 12C

**Date:** 2026-06-08  
**Scope:** Container offer engine, buyer review, revision workflow, 72h expiry

## Summary

Operations builds professional container offers from manual procurement quotes. Buyers review offers at `/buyer/mixed-container/offers/:id`, approve, or request revisions — without checkout or supplier identity exposure.

## Offer Contents

- Product list with pallet counts
- Unit prices and line totals (buyer-safe)
- Export execution fee
- Estimated freight
- Offer total
- Validity date (72 hours default)
- Offer notes

## Buyer Offer Page

Route: `/buyer/mixed-container/offers/:id`

Displays:
- Container summary via offer lines
- Product pricing table (packaging, origin — no supplier name)
- Totals breakdown
- 72-hour countdown (`mc-offer-countdown`)
- **Approve Offer** / **Request Revision**

Builder page links to offer when `activeOfferId` is set and state is `MC_BUYER_REVIEW`, `MC_APPROVED`, or `MC_REVISION_REQUESTED`.

## Revision Workflow

Types: Remove Product, Reduce Pallets, Replace Product, General Comment

Buyer action → `MC_REVISION_REQUESTED` → ops **Resume Procurement** → new offer cycle.

## Offer Expiry

- Default validity: **72 hours** from offer creation
- Countdown displayed to buyer
- Expired offers → `MC_EXPIRED` (system/admin expire scan)
- Ops may regenerate via procurement resume

## FSM States (12C extension)

`MC_PROCUREMENT_IN_PROGRESS` → `MC_OFFER_READY` → `MC_BUYER_REVIEW` → `MC_APPROVED` | `MC_REVISION_REQUESTED` | `MC_EXPIRED`

## API Endpoints

- `POST /api/admin/mixed-containers/:id/offers` — create draft offer
- `POST /api/admin/mixed-containers/:id/offers/:offerId/send` — send to buyer
- `GET /api/mixed-containers/offers/:offerId` — buyer-safe offer DTO
- `POST /api/mixed-containers/offers/:offerId/actions/approve`
- `POST /api/mixed-containers/offers/:offerId/actions/request-revision`

## Timeline Events

- `mixed_container.offer_created`
- `mixed_container.offer_sent`
- `mixed_container.offer_viewed`
- `mixed_container.offer_approved`
- `mixed_container.revision_requested`
- `mixed_container.offer_expired`

## Status

**PASS** — Offer creation, buyer review, revision, and expiry implemented.
