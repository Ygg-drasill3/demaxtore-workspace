# Payment Gates Readiness Report

**Date:** 2026-06-17  
**Verdict:** **BLOCKED** (P4 enablement)

---

## Dry-run summary

Source: [`05-payment-dry-run.json`](05-payment-dry-run.json)

| Metric | Value |
|--------|------:|
| Active orders | 121 |
| Orders needing plan seed | **121** |
| Orders with unsatisfied gates | 0 |
| Gated actions | `start_production`, `book_shipment`, `mark_delivered` |

All active orders lack `payment_plans` rows. Enabling `PAYMENT_GATES_ENABLED=true` without seed would block gated transitions on every in-scope order.

---

## Unit tests

| Suite | Result |
|-------|--------|
| `payment-milestone` | **PASS** (7 tests) |
| `payment.policy` | **PASS** (3 tests) — IDOR ACL |

---

## Webhook security (code verified)

| Control | Status |
|---------|--------|
| `EVENT_ID_REQUIRED` on empty eventId | Implemented |
| HMAC enforcement in production | Requires `PAYMENT_WEBHOOK_SECRET` — **MISSING in staging .env** |
| Dedup via `processed_events` | Implemented |

Payment timeline events in DB: **11**

---

## P0 pilot (flags OFF)

| Scope | Verdict |
|-------|---------|
| Payment API ACL | **READY** |
| Milestone kind alignment (`DEPOSIT_PAID` / `BALANCE_PAID`) | **READY** (code) |
| P4 flag enablement | **BLOCKED** — seed 121 plans first |

---

## Ops before P4

1. Run `PaymentMilestoneService.ensurePlan(orderId)` for active orders (or ops batch seed)
2. Satisfy offline deposits via webhook or `satisfyMilestone`
3. Re-run dry-run until `ordersNeedingPlanSeed=0`
4. Set `PAYMENT_WEBHOOK_SECRET` before production

```bash
npx tsx apps/backend/scripts/payment-milestone-seed-dry-run.mjs
```
