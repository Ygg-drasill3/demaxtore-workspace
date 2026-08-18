# Production Readiness — Rollout Runbook

**Owner:** Platform / Ops  
**Last updated:** 2026-06-17  
**Scope:** Faz 0–6 feature flags, staging validation, production rollout P0–P7

---

## Prerequisites

- Migrations applied: `20260617120000_faz1_processed_events`, `20260617140000_faz2_orchestrator`, `20260617160000_faz3_faz4_finance_logistics`
- Baseline tests green (see [Baseline validation](#baseline-validation))
- Desync resolved or documented: [`desync-root-cause-report.md`](desync-root-cause-report.md)

---

## Feature flags reference

| Env var | Default | Phase |
|---------|---------|-------|
| `FSM_ORCHESTRATOR_ENABLED` | false | P1+ |
| `FSM_ORCHESTRATOR_SHADOW_MODE` | true when enabled | P1 |
| `FSM_ORCHESTRATOR_AUTO_APPLY` | false | P2 |
| `EXCEPTION_ENGINE_V2_ENABLED` | false | P3 |
| `PAYMENT_GATES_ENABLED` | false | P4 |
| `INCOTERMS_PRECONDITIONS_ENABLED` | false | P5 |
| `CARRIER_AUTO_TRANSITION_ENABLED` | false | P6 |
| `RBAC_EXPANDED_ROLES_ENABLED` | false | P7 |

**Shadow mode (P1):** `ENABLED=true`, `SHADOW_MODE=true`, `AUTO_APPLY=false`

---

## Baseline validation

Run before every phase:

```bash
./scripts/staging-baseline.sh
```

Or manually:

```bash
yarn workspace @dmx/contracts test
yarn workspace @dmx/backend vitest run
yarn workspace @dmx/backend typecheck
npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose
```

E2E gate (after PR-R2):

```bash
yarn workspace @dmx/e2e test tests/06-shipment-flow.spec.ts
yarn workspace @dmx/e2e test tests/05-order-flow.spec.ts
yarn workspace @dmx/e2e test tests/39-production-hardening.spec.ts
```

---

## Production rollout phases

### P0 — Deploy, all flags OFF

**Env:** all Faz 2–6 flags unset or `false`

**Gate:**
- Baseline tests pass
- Audit clean OR documented exception in `desync-root-cause-report.md`
- E2E shipment flow 9/9

**Rollback:** N/A (flags already off)

---

### P1 — Orchestrator shadow

**Env:**
```bash
FSM_ORCHESTRATOR_ENABLED=true
FSM_ORCHESTRATOR_SHADOW_MODE=true
FSM_ORCHESTRATOR_AUTO_APPLY=false
```

**Soak:** ≥7 days OR sufficient shadow event volume

**Validation:**
```bash
npx tsx apps/backend/scripts/shadow-parity-report.mjs
npx tsx apps/backend/scripts/fsm-migration-audit.mjs
yarn workspace @dmx/backend vitest run orchestration
```

**Gate:** Shadow parity report clean; mismatch explainable; rollback tested

**Runbook:** [`fsm-orchestration-phase2-staging-runbook.md`](fsm-orchestration-phase2-staging-runbook.md)

**Rollback:**
```bash
FSM_ORCHESTRATOR_ENABLED=false
# restart backend
```

---

### P2 — Orchestrator auto-apply

**Env:** `FSM_ORCHESTRATOR_AUTO_APPLY=true` (requires P1 enabled)

**Soak:** 48–72h

**Gate:**
- Shipment E2E 9/9
- Order E2E pass
- Audit `desyncCount=0`
- Control Tower false alert check

**Rollback:** `FSM_ORCHESTRATOR_AUTO_APPLY=false` (returns to shadow)

---

### P3 — Exception Engine V2

**Env:** `EXCEPTION_ENGINE_V2_ENABLED=true`

**Soak:** 48–72h

**Runbook:** [`exception-engine-v2-runbook.md`](exception-engine-v2-runbook.md)

**Rollback:** `EXCEPTION_ENGINE_V2_ENABLED=false`

---

### P4 — Payment gates

**Env:** `PAYMENT_GATES_ENABLED=true`

**Prerequisites:** Payment webhook E2E stable; prod HMAC secret; milestone seed complete

**Runbook:** [`payment-gates-rollout-runbook.md`](payment-gates-rollout-runbook.md)

**Rollback:** `PAYMENT_GATES_ENABLED=false`

---

### P5 — Incoterms preconditions

**Env:** `INCOTERMS_PRECONDITIONS_ENABLED=true`

**Runbook:** [`incoterms-rollout-runbook.md`](incoterms-rollout-runbook.md)

**Rollback:** `INCOTERMS_PRECONDITIONS_ENABLED=false`

---

### P6 — Carrier auto transition

**Env:** `CARRIER_AUTO_TRANSITION_ENABLED=true`

**Prerequisite:** **P2 active** (auto-apply)

**Runbook:** [`carrier-automation-rollout-runbook.md`](carrier-automation-rollout-runbook.md)

**Rollback:** `CARRIER_AUTO_TRANSITION_ENABLED=false`

---

### P7 — RBAC expanded roles

**Env:** `RBAC_EXPANDED_ROLES_ENABLED=true`

**Prerequisite:** Role enum migration + forwarder accounts

**Runbook:** [`rbac-expanded-rollout-runbook.md`](rbac-expanded-rollout-runbook.md)

**Rollback:** `RBAC_EXPANDED_ROLES_ENABLED=false`

---

## Soak metrics

Record per phase in [`production-readiness-soak-report.md`](production-readiness-soak-report.md):

- order / shipment / transition counts
- webhook count / failed webhooks
- duplicate processed events
- orchestrator recommendations / mismatches
- exception / payment hold counts
- carrier confidence distribution
- API 4xx/5xx, frontend errors
- rollback tested (yes/no)

---

## Hard ordering rules

1. **P6 never before P2** — carrier auto needs order mirror via orchestrator
2. **P4 never before milestone seed** — active orders blocked without deposit plans
3. **P7 never before role migration** — expanded roles need Prisma enum + user assignment

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [`desync-root-cause-report.md`](desync-root-cause-report.md) | Known desync analysis |
| [`fsm-staging-validation-report.md`](fsm-staging-validation-report.md) | Per-flag validation matrix |
| [`production-readiness-soak-report.md`](production-readiness-soak-report.md) | Soak template |
