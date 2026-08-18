# Payment Gates Rollout Runbook

**Owner:** Finance / Platform  
**Flag:** `PAYMENT_GATES_ENABLED=true`

---

## Prerequisites

- PR-R2 payment webhook E2E stable (`39-production-hardening`)
- `PAYMENT_WEBHOOK_SECRET` set in production (generate: `../../scripts/generate-secret.sh`)
- `PAYMENT_WEBHOOK_ENFORCE_HMAC=true` (or `NODE_ENV=production`)
- Milestone seed dry-run reviewed:

```bash
npx tsx apps/backend/scripts/payment-milestone-seed-dry-run.mjs
```

---

## Enablement

```bash
PAYMENT_GATES_ENABLED=true
# restart backend
```

---

## Validation

```bash
yarn workspace @dmx/backend vitest run payment-milestone
yarn workspace @dmx/e2e test tests/39-production-hardening.spec.ts
```

Manual checks:
- Deposit unpaid → `start_production` returns `409 PAYMENT_MILESTONE_REQUIRED`
- Webhook `succeeded` → milestone satisfied → production allowed
- `TradeFinancialPanel` shows milestone status on trade workspace

---

## Active order backfill

1. Run seed dry-run; export `needsSeed` list
2. For each active order in production scope:
   - `PaymentMilestoneService.ensurePlan(orderId)` (creates DEPOSIT_REQUIRED, BALANCE_REQUIRED)
   - If deposit already collected offline: `satisfyMilestone(orderId, 'DEPOSIT_PAID', externalEventId)`
3. Re-run dry-run until `ordersNeedingPlanSeed=0` for in-scope orders

---

## Rollback

```bash
PAYMENT_GATES_ENABLED=false
# restart backend
```

Effect: `assertOrderActionAllowed` no-op; order transitions unblocked.

---

## Log signals

| Signal | Meaning |
|--------|---------|
| `PAYMENT_MILESTONE_REQUIRED` | Gate blocking transition (expected when deposit missing) |
| `PAYMENT_HOLD_ACTIVE` | Manual or dispute hold |
| `INVALID_WEBHOOK_SIGNATURE` | HMAC misconfiguration — fix before re-enable |

---

## Known risks

- Enabling P4 without seed blocks `start_production` / `book_shipment` on active orders
- Gate checks `DEPOSIT_PAID` / `BALANCE_PAID` milestone kinds (not `*_REQUIRED`)
