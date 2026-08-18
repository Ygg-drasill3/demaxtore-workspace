# Mixed Container Procurement Report — Sprint 12C

**Date:** 2026-06-08  
**Scope:** Operations procurement workspace for Mixed Container requests

## Summary

DeMaxtore Operations can receive pricing requests, manually source supplier pricing offline, and prepare container offers — without supplier portal or in-platform bidding.

## Operations Workspace

| Route | Purpose |
|-------|---------|
| `/admin/mixed-container` | Request inbox + KPI dashboard |
| `/admin/mixed-container/:id` | Procurement workspace |

## Request Inbox

Columns: Reference, Buyer, Products, Pallets, Estimated Value, Status, Priority, Open action.

KPI widgets: Pricing Requested, Procurement In Progress, Offer Ready, Awaiting Buyer Review, Approved, Expired.

## Procurement Workflow

1. Buyer submits **Request Live Pricing** → `MC_PRICING_REQUESTED`
2. Ops clicks **Start Procurement** → `MC_PROCUREMENT_IN_PROGRESS`
3. Ops enters manual pricing per line (supplier code, EXW price — ops-only)
4. Ops **Create Offer** → `MC_OFFER_READY`
5. Ops **Send to Buyer** → `MC_BUYER_REVIEW`

## Manual Pricing Fields (Operations Only)

- Supplier Code
- EXW Price / pallet
- Currency, price unit
- Notes, validity date

Buyer never sees supplier code or internal allocation notes.

## API Endpoints

- `GET /api/admin/mixed-containers/inbox`
- `GET /api/admin/mixed-containers/kpis`
- `GET /api/admin/mixed-containers/:id`
- `POST /api/admin/mixed-containers/:id/actions/start-procurement`
- `POST /api/admin/mixed-containers/:id/procurement-quotes`
- `POST /api/admin/mixed-containers/:id/actions/resume-procurement`

## Timeline Events

- `mixed_container.procurement_started`
- `mixed_container.manager_assigned`

## Status

**PASS** — Request inbox and procurement workspace operational.
