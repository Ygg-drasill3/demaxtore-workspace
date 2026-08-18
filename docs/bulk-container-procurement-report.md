# Bulk Container Procurement Report — Sprint 13C

**Date:** 2026-06-09  
**Scope:** Operations-led procurement for BulkContainer requests (no supplier portal)

## Summary

DeMaxtore Operations can receive submitted BulkContainer requests, manually source supplier pricing offline, and prepare buyer-ready offers — without supplier login, bidding, or CommodityBid integration.

## Operations Workspace

| Route | Purpose |
|-------|---------|
| `/admin/bulk-container` | Request inbox + KPI dashboard |
| `/admin/bulk-container/procurement/:id` | Procurement workspace |

## Request Inbox KPIs

- Pricing Requested (`BC_SUBMITTED`)
- Procurement In Progress (`BC_PROCUREMENT_IN_PROGRESS`)
- Offer Ready (`BC_OFFER_READY`)
- Awaiting Buyer Review (`BC_BUYER_REVIEW`)
- Approved (`BC_APPROVED`)
- Expired (`BC_EXPIRED`)

## Procurement Workflow

1. Buyer submits request → `BC_SUBMITTED`
2. Ops **Start Procurement** → `BC_PROCUREMENT_IN_PROGRESS`
3. Ops enters manual pricing per line (supplier code `SUP-00x`, USD/MT — ops-only)
4. Ops **Create Offer** → `BC_OFFER_READY`
5. Ops **Send to Buyer** → `BC_BUYER_REVIEW`

## Manual Pricing (`bc_procurement_quotes`)

| Field | Visibility |
|-------|------------|
| `supplier_code` | Operations only |
| `unit_price` / `currency` | Operations only |
| `specification_snapshot` | Operations audit trail |
| `notes` | Operations only |

Buyer never sees supplier identity.

## API Endpoints

- `GET /api/admin/bulk-container/kpis`
- `GET /api/admin/bulk-container/inbox`
- `GET /api/admin/bulk-container/procurement/:id`
- `POST /api/admin/bulk-container/procurement/:id/actions/start-procurement`
- `POST /api/admin/bulk-container/procurement/:id/quotes`
- `POST /api/admin/bulk-container/procurement/:id/offers`
- `POST /api/admin/bulk-container/procurement/:id/offers/:offerId/send`
- `POST /api/admin/bulk-container/procurement/:id/actions/resume-procurement`
- `POST /api/admin/bulk-container/actions/expire-offers`

## Timeline Events

- `bulk_offer_created`
- `bulk_offer_sent`
- `bulk_offer_viewed`
- `bulk_offer_approved`
- `bulk_offer_expired`
- `bulk_offer_revision_requested`

## Status

**PASS** — Operations procurement workspace operational; manual supplier pricing stored off-platform.
