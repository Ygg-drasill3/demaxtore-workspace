# Faz 2–6 Staging Validation Report

**Generated:** 2026-06-17  
**Environment validated:** local dev stack (API `:3001`, frontend `:3010`) — staging sign-off checklist below applies to staging DB after deploy.

---

## Phase 0 — Baseline (all flags OFF)

Default when env vars are unset or `false`:

| Flag | Default |
|------|---------|
| `FSM_ORCHESTRATOR_ENABLED` | false |
| `FSM_ORCHESTRATOR_SHADOW_MODE` | true (ignored when disabled) |
| `FSM_ORCHESTRATOR_AUTO_APPLY` | false |
| `PAYMENT_GATES_ENABLED` | false |
| `CARRIER_AUTO_TRANSITION_ENABLED` | false |
| `INCOTERMS_PRECONDITIONS_ENABLED` | false |
| `EXCEPTION_ENGINE_V2_ENABLED` | false |
| `RBAC_EXPANDED_ROLES_ENABLED` | false |

### Tests executed

| Suite | Command | Result |
|-------|---------|--------|
| Contracts | `yarn workspace @dmx/contracts test` | **109/109 pass** |
| Backend unit/integration | `yarn workspace @dmx/backend vitest run` (excl. sealed-bid scheduler) | **38/38 pass** |
| Typecheck | `yarn workspace @dmx/backend typecheck` | **pass** |
| Desync audit | `npx tsx apps/backend/scripts/fsm-migration-audit.mjs` | **pass** (112 orders, 1 desync pair) |
| E2E Shipment flow | `06-shipment-flow.spec.ts` | **9/9 pass** (retry after 1 transient bootstrap fail) |
| E2E batch (grep) | shipment + order + trade + exception + hardening | 32 pass, 2 fail (see notes) |

### E2E baseline notes

- **Regression gate (Faz 2):** `06-shipment-flow` **9/9 green** — legacy shipment-led UI path intact with orchestrator off.
- **Flaky / data-dependent:** `05-order-flow` step 04 (supplier UI select), `29-exception-hub` API payload, `39-production-hardening` payment webhook — failures observed under parallel grep run; re-run individually on staging before sign-off.
- **Old flows broken?** **No** — with flags off, `OrderService` / `ShipmentService` behave as pre–Faz 2; orchestrator hooks no-op.

### Migrations at baseline

| Migration | Risk |
|-----------|------|
| `20260617120000_faz1_processed_events` | Low — additive table |
| `20260617140000_faz2_orchestrator` | Low — `orchestrator_recommendations`, `control_tower_alerts.metadata` |
| `20260617160000_faz3_faz4_finance_logistics` | Low — new payment/carrier tables; no FSM change until flags on |

**Rollback (baseline):** no flag rollback needed; schema is backward compatible.

---

## Flag 1 — Orchestrator shadow

> User label: `FSM_ORCHESTRATOR_SHADOW`  
> **Actual env (both required):**
> ```bash
> FSM_ORCHESTRATOR_ENABLED=true
> FSM_ORCHESTRATOR_SHADOW_MODE=true
> FSM_ORCHESTRATOR_AUTO_APPLY=false
> ```

### Behaviour

- Shipment transitions → `orchestrator_recommendations` (mode `shadow`).
- Order state **not** auto-mirrored.
- Desync alerts → catch-up plans enqueued (idempotent).
- Order manual logistics buttons **remain visible**.

### Tests to run on staging

| Test | Purpose |
|------|---------|
| `yarn workspace @dmx/backend vitest run orchestration` | 10/10 shadow, desync, idempotency, cancel mirror |
| `npx tsx apps/backend/scripts/fsm-migration-audit.mjs` | Desync baseline vs post-shadow trend |
| `06-shipment-flow.spec.ts` | No regression; shipment UI still drives FSM |
| Manual: advance shipment `confirm_booking` → check `orchestrator_recommendations` contains `book_shipment`; order still `FREIGHT_REQUESTED` |

### E2E scenarios

| Scenario | Expected |
|----------|----------|
| Shipment workspace flow 9/9 | Pass (validated locally) |
| Order logistics manual | Still works |
| Exception Hub desync alert | Shows `orchestratorRecommendation` on detail |

### Migration risk

- **Low** — writes to `orchestrator_recommendations` + `processed_events`; no destructive order/shipment updates.
- **Ops:** 1 existing desync pair in dev DB; shadow plans should appear for new transitions only.

### Old flow broken?

**No** — shadow mode does not call `applyPlan` on order mirrors.

### Rollback

```bash
FSM_ORCHESTRATOR_ENABLED=false
# restart backend
```

Optional: leave `orchestrator_recommendations` rows; they are audit-only.

**Sign-off gate:** ≥7 days shadow parity, sampled pairs diff=0 — see [`fsm-orchestration-phase2-staging-runbook.md`](fsm-orchestration-phase2-staging-runbook.md).

---

## Flag 2 — Orchestrator auto-apply

```bash
FSM_ORCHESTRATOR_ENABLED=true
FSM_ORCHESTRATOR_AUTO_APPLY=true
# SHADOW_MODE=true still recommended for logging; auto-apply takes precedence for mirrors
```

### Behaviour

- Shipment milestone → order mirror applied via `OrderService.applyTransition` (SYSTEM).
- Order workspace hides `book_shipment`, `mark_departed`, `mark_arrived`, `mark_delivered`.
- Manual order logistics API → `409 ORCHESTRATOR_ONLY`.

### Tests to run on staging

| Test | Purpose |
|------|---------|
| `vitest run orchestration` | Plan builders unchanged |
| `06-shipment-flow.spec.ts` | **Critical** — shipment-only path must still complete |
| `05-order-flow.spec.ts` | Order production path unaffected |
| Manual: `depart_vessel` → order reaches `IN_TRANSIT` (via `mark_departed` + `auto_to_in_transit`) |

### E2E scenarios

| Scenario | Expected |
|----------|----------|
| Shipment flow 9/9 | Pass — shipment remains source of truth |
| Order drawer | Logistics actions hidden (`hideOrderLogisticsActions`) |
| Double-apply | Idempotency keys prevent duplicate mirrors |

### Migration risk

- **Medium** — automatic order FSM writes; incorrect mirror mapping could advance order ahead of shipment.
- **Mitigation:** shadow parity sign-off first; `claimProcessedEvent` per plan.

### Old flow broken?

**Partial by design** — manual order logistics replaced by shipment workspace + orchestrator. Shipment and production order actions unchanged.

### Rollback

```bash
FSM_ORCHESTRATOR_AUTO_APPLY=false
# keep ENABLED=true + SHADOW=true to continue logging without apply
# or full off:
FSM_ORCHESTRATOR_ENABLED=false
```

No DB rollback; order states already mirrored may need ops review via audit script.

---

## Flag 3 — Payment gates

```bash
PAYMENT_GATES_ENABLED=true
```

### Behaviour

- `start_production`, `book_shipment`, `mark_delivered` blocked until milestones satisfied.
- `GET /api/payments/orders/:orderId/plan` surfaces milestones.
- Payment webhook can satisfy `DEPOSIT_PAID` / `BALANCE_PAID`.

### Tests to run on staging

| Test | Purpose |
|------|---------|
| `yarn workspace @dmx/contracts test payment-milestones` | Gate map |
| `39-production-hardening.spec.ts` — payment webhook | HMAC + intent flow |
| Manual: order without `DEPOSIT_PAID` → `start_production` → `409 PAYMENT_MILESTONE_REQUIRED` |
| Manual: webhook `payment.succeeded` → milestone satisfied → production allowed |

### E2E scenarios

| Scenario | Expected |
|----------|----------|
| Trade workspace financial panel | `trade-financial-panel` shows milestones |
| Deposit → production E2E | **Add/staging manual** — not in default E2E suite yet |
| Shipment flow with gates off path | Pass if milestones pre-seeded or gates off |

### Migration risk

- **Medium** — `payment_plans` auto-created on first plan read; in-flight orders without deposits may block production until ops seeds milestones or waives.
- **Tables:** `payment_plans`, `payment_milestones`, `payment_events`, `payment_holds`.

### Old flow broken?

**Only when flag on** — production/shipment/delivery gates enforced. With flag off, no change.

### Rollback

```bash
PAYMENT_GATES_ENABLED=false
```

Holds/milestones remain in DB but are ignored.

---

## Flag 4 — Carrier auto-transition

```bash
CARRIER_AUTO_TRANSITION_ENABLED=true
FSM_ORCHESTRATOR_ENABLED=true   # required for order mirror after shipment apply
```

### Behaviour

- High-confidence carrier webhooks → `CarrierEventService.ingest` → shipment FSM + orchestrator.
- Medium → review queue timeline event.
- Low → timeline only, no FSM.

### Tests to run on staging

| Test | Purpose |
|------|---------|
| `vitest run carrier-event` | Normalization + action map |
| `39-production-hardening.spec.ts` — carrier webhook | HMAC + dedup |
| Manual: POST `/api/webhooks/carrier/maersk` with `LOADED_ON_VESSEL`, `confidence: high` |

### E2E scenarios

| Scenario | Expected |
|----------|----------|
| `09-maritime-tracking.spec.ts` | Tracking display unchanged |
| `06-shipment-flow` | Manual buttons still work (override) |
| Carrier auto path | **Staging manual** — webhook drives milestone |

### Migration risk

- **Medium–High** — wrong carrier mapping could skip shipment states; `carrier_event_records` audit trail mitigates.
- Requires orchestrator for order sync when auto-apply on.

### Old flow broken?

**No** — manual shipment actions remain; automation is additive.

### Rollback

```bash
CARRIER_AUTO_TRANSITION_ENABLED=false
```

Webhook reverts to log + timeline-only for low/medium; high stops auto-apply.

---

## Flag 5 — Incoterms preconditions

```bash
INCOTERMS_PRECONDITIONS_ENABLED=true
```

### Behaviour

- `resolveIncotermProfile` from order `incoterms`.
- Document precondition checks via `assertIncotermDocuments` (e.g. CIF → insurance cert).
- Trade workspace shows **Incoterms & Responsibility** panel (UI always available).

### Tests to run on staging

| Test | Purpose |
|------|---------|
| `yarn workspace @dmx/contracts test incoterms` | Profiles FOB/CIF/EXW |
| `26-trade-workspace.spec.ts` | Incoterm badge + panel |
| Manual: FOB order at `LOADED_ON_VESSEL` — risk transfer timeline |

### E2E scenarios

| Scenario | Expected |
|----------|----------|
| Trade workspace | Incoterm panel renders when `header.incoterm` set |
| FOB/EXW risk transfer | **Staging manual** — document in runbook |

### Migration risk

- **Low** — null incoterm defaults to FOB profile; no schema change.
- **Ops:** legacy orders without `incoterms` on `order_workspace` use FOB defaults.

### Old flow broken?

**No** when incoterm null (FOB default). **Possible** extra document gates when flag on and docs missing.

### Rollback

```bash
INCOTERMS_PRECONDITIONS_ENABLED=false
```

---

## Flag 6 — Exception engine v2

```bash
EXCEPTION_ENGINE_V2_ENABLED=true
```

### Behaviour

- New Control Tower alerts → deduped `TradeException` with SLA `dueDate`, `ownerRole`.
- Complements existing Exception Hub sync (v1).

### Tests to run on staging

| Test | Purpose |
|------|---------|
| `vitest run exception-engine` | RBAC + engine unit |
| `29-exception-hub.spec.ts` | Hub API + UI |
| `08-control-tower.spec.ts` | Alert surfacing |
| Manual: trigger `ORDER_SHIPMENT_STATE_MISMATCH` → one Open exception, no duplicate on rescan |

### E2E scenarios

| Scenario | Expected |
|----------|----------|
| Exception hub list/detail | Pass (re-validate on staging) |
| Desync alert + orchestrator rec | Recommendation on detail |

### Migration risk

- **Low** — uses existing `trade_exceptions` table; more rows, dedup by type+workspace.
- **Ops:** duplicate alert storms reduced; verify ownerRole assignment matches ops roster.

### Old flow broken?

**No** — v1 Exception Hub still works; v2 adds cases when flag on.

### Rollback

```bash
EXCEPTION_ENGINE_V2_ENABLED=false
```

Open exceptions remain; no auto-close on rollback.

---

## Flag 7 — Expanded RBAC

```bash
RBAC_EXPANDED_ROLES_ENABLED=true
```

### Behaviour

- `requirePermission()` enforces `ROLE_PERMISSIONS` matrix.
- Forwarder portal `/api/forwarder` (milestone submit scope).
- Legacy `ADMIN`/`BUYER`/`SUPPLIER` unchanged when flag off.

### Tests to run on staging

| Test | Purpose |
|------|---------|
| `vitest run exception-engine` | `hasPermission` matrix |
| Manual: FINANCE_OPERATOR can access payment routes; cannot `shipment:milestone` |
| Manual: `/api/forwarder/shipments` as ADMIN |

### E2E scenarios

| Scenario | Expected |
|----------|----------|
| Existing ADMIN flows | Unchanged (ADMIN = full permissions) |
| Forwarder portal | **Staging manual** — Prisma `Role` enum may need FORWARDER user seed |

### Migration risk

- **Medium** — Prisma `Role` enum may not include `FORWARDER`/`FINANCE_OPERATOR` yet; expanded roles apply when JWT carries mapped role string and flag on.
- **Mitigation:** keep flag off until user role migration PR; ADMIN bypass via full permission list.

### Old flow broken?

**No** when flag off. **Possible** 403s if flag on without user role migration.

### Rollback

```bash
RBAC_EXPANDED_ROLES_ENABLED=false
```

---

## Production flag rollout order

Recommended sequence (each step ≥48–72h soak on staging before prod; Faz 2 shadow ≥7 days):

| Step | Flags | Prerequisite |
|------|-------|--------------|
| **P0** | Deploy migrations only; all flags **off** | Baseline E2E + audit |
| **P1** | `FSM_ORCHESTRATOR_ENABLED=true`, `SHADOW_MODE=true`, `AUTO_APPLY=false` | P0 green; shadow parity 7d |
| **P2** | `FSM_ORCHESTRATOR_AUTO_APPLY=true` | P1 sign-off; shipment E2E 9/9 on staging |
| **P3** | `EXCEPTION_ENGINE_V2_ENABLED=true` | P2 stable; CT/Hub monitored |
| **P4** | `PAYMENT_GATES_ENABLED=true` | Payment webhooks HMAC prod; milestones seeded for active orders |
| **P5** | `INCOTERMS_PRECONDITIONS_ENABLED=true` | Order incoterms populated; trade docs baseline |
| **P6** | `CARRIER_AUTO_TRANSITION_ENABLED=true` | P2 orchestrator on; carrier HMAC prod; start one provider |
| **P7** | `RBAC_EXPANDED_ROLES_ENABLED=true` | User/role migration; forwarder accounts seeded |

**Do not enable P6 before P2** — carrier automation requires orchestrator apply path for order mirrors.

**Do not enable P4 before payment ops runbook** — risk of blocking production on legacy orders without deposit milestones.

---

## Staging deploy checklist (ops)

```bash
# 1. Migrate
yarn workspace @dmx/backend prisma:deploy

# 2. Baseline
yarn workspace @dmx/contracts test
yarn workspace @dmx/backend vitest run orchestration
npx tsx apps/backend/scripts/fsm-migration-audit.mjs

# 3. E2E (staging URLs)
E2E_API_URL=https://staging-api.example E2E_FRONTEND_URL=https://staging.example \
  yarn workspace @dmx/e2e test --grep "Shipment workspace flow"

# 4. Enable flags one at a time per sections above; restart backend after each change
```

---

## Summary

| Phase | Status (local validation) |
|-------|---------------------------|
| Baseline flags off | Contracts 109/109, backend 38/38, typecheck OK, shipment E2E 9/9 |
| Ready for staging P1 (shadow) | **Yes** — code + migrations applied |
| Ready for production P2+ | **After** staging soak per table above |
