# Sprint 7A — Customer Portfolio Report

## Scope

Customer portfolio runtime aggregates buyer and supplier health for operational scale (100+ concurrent processes).

## Entities

| Entity | Description |
|--------|-------------|
| Buyer Health | Per buyer organisation: RFQ/order/shipment counts, freight volume, revenue, commercial score |
| Supplier Health | Per supplier organisation: invitations, orders, attributed revenue, commercial score |
| Account Activity | Last activity timestamp, days since activity, last event type |
| Commercial Score | 0–100 heuristic from revenue, volume, and recency |

## API (ADMIN)

| Method | Path |
|--------|------|
| GET | `/api/scale/portfolio/buyers` |
| GET | `/api/scale/portfolio/buyers/:organisationId` |
| GET | `/api/scale/portfolio/suppliers` |
| GET | `/api/scale/portfolio/suppliers/:organisationId` |

## Account ownership

Table `account_ownership` links organisations to operations and sales admin users.

| Method | Path |
|--------|------|
| POST | `/api/scale/accounts/:organisationId/assign` |

Audit: `account.assigned`, `account.reassigned`

## UI

Executive dashboard sections: `executive-top-customers`, `executive-top-suppliers`

## Status

**PASS** — portfolio APIs and assignment verified in spec 18.
