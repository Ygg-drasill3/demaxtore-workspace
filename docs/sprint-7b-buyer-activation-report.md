# Sprint 7B — Buyer Activation Report

## Activation score (0–100)

Derived from RFQs created/submitted, orders, shipments completed, communication timeline activity, and recency.

## Classification

| Class | Criteria (heuristic) |
|-------|----------------------|
| Cold | No recent engagement |
| Warm | RFQs submitted, limited orders |
| Active | Orders in last 90 days |
| Power Buyer | 3+ orders and 3+ completed shipments |

## API

`GET /api/growth/buyers/activation` — ADMIN only

Included in `GET /api/growth/insights`.

## Visibility

Admin growth dashboard (`growth-buyer-activation`) and operations users via ADMIN role.

## Status

**PASS** — spec 19 test 03.
