# Production Launch Master Checklist

**Last updated:** 2026-06-17  
**Scope:** P0–P7 phased rollout  
**Validation:** `./scripts/production-p0-validate.sh`

---

## P0 — Production launch (all flags OFF)

### Prerequisites

- [x] Migrations applied (`prisma migrate deploy`)
- [x] `PAYMENT_WEBHOOK_SECRET` + `CARRIER_WEBHOOK_SECRET` set ([`production-secrets-report.md`](production-secrets-report.md))
- [x] Backup cron installed ([`backup-operations-runbook.md`](backup-operations-runbook.md))
- [x] Restore drill verified ([`restore-drill-report.md`](restore-drill-report.md))
- [x] Undocumented desync = 0
- [ ] Uptime monitor on `/api/healthz` + `/api/ready` ([`monitoring-deployment-plan.md`](monitoring-deployment-plan.md))
- [ ] Production domain TLS + Nginx

### Commands

```bash
./scripts/production-p0-validate.sh
yarn workspace @dmx/e2e test tests/05-order-flow.spec.ts
yarn workspace @dmx/e2e test tests/06-shipment-flow.spec.ts
yarn workspace @dmx/e2e test tests/39-production-hardening.spec.ts
```

### Validation

- Baseline tests pass
- Health endpoints 200
- Documented desync only (1 pair — acceptable at P0)

### Rollback

N/A — flags already OFF. Revert deploy via PM2 previous release.

---

## P1 — Orchestrator shadow

### Prerequisites

- [ ] P0 complete
- [ ] Shadow soak dashboard ready ([`shadow-soak-dashboard.md`](shadow-soak-dashboard.md))

### Commands

```bash
# .env: FSM_ORCHESTRATOR_ENABLED=true, SHADOW_MODE=true, AUTO_APPLY=false
pm2 restart ecosystem.config.cjs
./scripts/p1-shadow-soak-daily.sh   # 7 consecutive days
```

### Validation

- 7 daily snapshots
- `mirrorMismatches` = 0 or explained
- Rollback tested once

### Rollback

```bash
FSM_ORCHESTRATOR_ENABLED=false
pm2 restart ecosystem.config.cjs
./scripts/staging-baseline.sh
```

---

## P2 — Orchestrator auto-apply

### Prerequisites

- [ ] P1 soak complete
- [ ] [`auto-apply-readiness-report.md`](auto-apply-readiness-report.md) = GO
- [ ] Documented desync remediated

### Commands

```bash
FSM_ORCHESTRATOR_AUTO_APPLY=true
pm2 restart ecosystem.config.cjs
npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose
```

### Validation

- 48–72h soak
- `desyncCount=0` or all documented
- Shipment E2E 9/9

### Rollback

`FSM_ORCHESTRATOR_AUTO_APPLY=false` (returns to shadow)

---

## P3 — Exception Engine V2

### Prerequisites

- [ ] P2 stable

### Commands

```bash
EXCEPTION_ENGINE_V2_ENABLED=true
pm2 restart ecosystem.config.cjs
```

### Validation

- Hub loads without v1 sync amplification
- Exception types aligned

### Rollback

`EXCEPTION_ENGINE_V2_ENABLED=false`

---

## P4 — Payment gates

### Prerequisites

- [ ] [`payment-seed-production-plan.md`](payment-seed-production-plan.md) executed
- [ ] `ordersNeedingPlanSeed=0`

### Commands

```bash
npx tsx apps/backend/scripts/payment-milestone-seed-dry-run.mjs
PAYMENT_GATES_ENABLED=true
pm2 restart ecosystem.config.cjs
```

### Validation

- Deposit unpaid → 409 `PAYMENT_MILESTONE_REQUIRED`
- Webhook satisfies milestone

### Rollback

`PAYMENT_GATES_ENABLED=false`

---

## P5 — Incoterms preconditions

### Prerequisites

- [ ] P4 stable

### Commands

```bash
INCOTERMS_PRECONDITIONS_ENABLED=true
pm2 restart ecosystem.config.cjs
```

### Rollback

`INCOTERMS_PRECONDITIONS_ENABLED=false`

---

## P6 — Carrier automation

### Prerequisites

- [ ] P2 AUTO_APPLY active
- [ ] `CARRIER_WEBHOOK_SECRET` set

### Commands

```bash
CARRIER_AUTO_TRANSITION_ENABLED=true
pm2 restart ecosystem.config.cjs
```

### Validation

- `carrier-event` vitest pass
- High confidence → orchestrator path

### Rollback

`CARRIER_AUTO_TRANSITION_ENABLED=false`

---

## P7 — RBAC expanded

### Prerequisites

- [ ] [`rbac-rollout-checklist.md`](rbac-rollout-checklist.md) users created

### Commands

```bash
RBAC_EXPANDED_ROLES_ENABLED=true
pm2 restart ecosystem.config.cjs
```

### Rollback

`RBAC_EXPANDED_ROLES_ENABLED=false`

---

## Master rollback (any phase)

```bash
FSM_ORCHESTRATOR_ENABLED=false
FSM_ORCHESTRATOR_AUTO_APPLY=false
EXCEPTION_ENGINE_V2_ENABLED=false
PAYMENT_GATES_ENABLED=false
INCOTERMS_PRECONDITIONS_ENABLED=false
CARRIER_AUTO_TRANSITION_ENABLED=false
RBAC_EXPANDED_ROLES_ENABLED=false
pm2 restart ecosystem.config.cjs
./scripts/staging-baseline.sh
```

See [`production-readiness-rollout-runbook.md`](../production-readiness-rollout-runbook.md).
