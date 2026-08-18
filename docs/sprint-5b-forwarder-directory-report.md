# Sprint 5B — Forwarder Directory Report

## Summary

Sprint 5B adds an **admin-only forwarder directory** for external freight partners. Forwarders have **no DeMaxtore accounts**, **no portal**, and **no login**.

## Delivered

| Item | Status |
|------|--------|
| `packages/contracts/src/freight-communications.ts` | ✓ |
| `forwarder_contacts` table + migration `20260613120000_sprint5b_forwarder_communication` | ✓ |
| CRUD API (create, edit, deactivate, list, search) | ✓ |
| UI `/operations/forwarders` | ✓ |

## API (ADMIN)

| Method | Path |
|--------|------|
| GET | `/api/freightiq/forwarders?q=` |
| POST | `/api/freightiq/forwarders` |
| PATCH | `/api/freightiq/forwarders/:id` |
| POST | `/api/freightiq/forwarders/:id/deactivate` |

## Fields

Company name, contact name, email, phone, country, notes, active flag.

## Out of scope (honoured)

Forwarder login, forwarder portal, carrier onboarding marketplace, carrier APIs.
