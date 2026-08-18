# Payment Seed Production Plan

**Date:** 2026-06-17  
**Mode:** Dry-run only — **DO NOT auto-execute**  
**Source:** `payment-milestone-seed-dry-run.mjs` → [`payment-dry-run.json`](payment-dry-run.json)

---

## Dry-run summary

| Metric | Value |
|--------|------:|
| Active orders | 121 |
| Orders needing plan seed | **121** |
| Orders with unsatisfied gates | 0 |
| Gated actions | `start_production`, `book_shipment`, `mark_delivered` |

Every active order lacks a `payment_plans` row. Enabling `PAYMENT_GATES_ENABLED=true` without seed blocks all gated transitions.

---

## Milestones created per order (`ensurePlan`)

| Kind | Initial status |
|------|----------------|
| `DEPOSIT_PAID` | `PENDING` |
| `BALANCE_PAID` | `PENDING` |

Currency: order default or `USD`.

---

## Orders requiring manual review

| Category | Count | Action |
|----------|------:|--------|
| No payment plan (all active) | 121 | Batch `ensurePlan` |
| Deposit already collected offline | Unknown | After seed, `satisfyMilestone(orderId, 'DEPOSIT_PAID', externalEventId)` |
| Orders in `PRODUCTION_COMPLETED`+ | ~subset | Review if gates still relevant |
| Payment disputes / holds | 0 in dry-run | Monitor post-P4 |

**Manual review trigger:** Any order where deposit was collected outside DeMaxtore before P4 enablement.

---

## Safe production execution plan

### Phase A — Staging dry-run (completed)

```bash
npx tsx apps/backend/scripts/payment-milestone-seed-dry-run.mjs
```

### Phase B — Staging seed (ops, one-time)

```typescript
// Ops script or admin REPL — NOT committed auto-runner
import { PrismaClient } from '@prisma/client';
import { PaymentMilestoneService } from './payment-milestone.service.js';

const db = new PrismaClient();
const svc = new PaymentMilestoneService(db);
const orders = await db.workspace.findMany({
  where: { type: 'ORDER', state: { notIn: ['CLOSED','CANCELLED','REJECTED'] } },
  select: { id: true },
});
for (const o of orders) {
  await svc.ensurePlan(o.id);
}
```

Run in batches of 25; log each `orderId`.

### Phase C — Verify

```bash
npx tsx apps/backend/scripts/payment-milestone-seed-dry-run.mjs
# Expect: ordersNeedingPlanSeed=0
```

### Phase D — Production (after staging sign-off)

1. Maintenance window optional (read-only OK — `ensurePlan` is insert-only)
2. Run same batch script against production DB
3. Satisfy offline deposits per finance list
4. Re-run dry-run on production
5. Enable `PAYMENT_GATES_ENABLED=true` per [`payment-gates-rollout-runbook.md`](../payment-gates-rollout-runbook.md)

### Rollback

`PAYMENT_GATES_ENABLED=false` — gates become no-op; plans remain in DB (harmless).

---

## P0 pilot note

**Payment gates remain OFF at P0 launch.** Seed is prerequisite for **P4 only**, not first customer go-live.
