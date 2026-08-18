# Bulk Container Control Tower Report — Sprint 13C

**Date:** 2026-06-09  
**Scope:** BulkContainer procurement & offer alerts

## Alert Keys (Sprint 13C)

| Key | Trigger | Severity |
|-----|---------|----------|
| `bulk_pricing_pending` | `BC_SUBMITTED` — awaiting ops start | WARNING |
| `bulk_offer_expiring` | Sent offer `valid_until` within 24h | WARNING |
| `bulk_offer_expired` | Workspace `BC_EXPIRED` | WARNING |
| `bulk_revision_pending` | `BC_REVISION_REQUESTED` | WARNING |
| `bulk_offer_approved` | `BC_APPROVED` (recent) | INFO |

Existing Sprint 13B keys retained: `bulk_container_incomplete`, `bulk_container_submitted`.

## Scan Behaviour

`scanBulkContainerAlerts()` in `bulk-container-alerts.ts`:

1. Runs `expireOffers()` automatically (system transition to `BC_EXPIRED`)
2. Upserts alerts per workspace/offer state
3. Invoked via `POST /api/control-tower/scan`

## Category Filter

```
GET /api/control-tower/alerts?category=BULK_CONTAINER&workspaceId={id}
```

## Learning Center Integration

Three Sprint 13C cards wired in Learning Center:

- **How Bulk Pricing Works** (`bulk-pricing`)
- **Why Bulk Offers Expire** (`bulk-offer-expiry`)
- **How Specifications Affect Pricing** (`bulk-spec-pricing`)

## Status

**PASS** — Control Tower monitors bulk procurement lifecycle end-to-end.
