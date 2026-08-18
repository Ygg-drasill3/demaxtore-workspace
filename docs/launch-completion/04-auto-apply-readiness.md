# Auto Apply Readiness Report

**Date:** 2026-06-17  
**Verdict:** **NOT READY**

---

## Evaluation

| Question | Answer |
|----------|--------|
| Remaining risks | Documented desync (`blocksP2AutoApply`); 7-day shadow soak incomplete; orchestrator currently OFF |
| Orders affected if AUTO_APPLY on | **121 active orders** could receive mirror transitions; **1 order** has known critical desync |
| Rollback duration | **&lt;5 min** — set `FSM_ORCHESTRATOR_AUTO_APPLY=false` (or `FSM_ORCHESTRATOR_ENABLED=false`) + PM2 restart |
| New desync risk | **YES** — documented pair `ORD-RFQ-2026-0055-78c8680d` would produce false CT alerts and incorrect mirror plans |

---

## Remediation dry-run (documented order)

Order `06a3f2e8-dd6d-4f2a-958f-316811b519db` — shipment-led catch-up:

1. `confirm_booking` → 2. `assign_container` → 3. `load_vessel` → 4. `depart_vessel` → 5. `mark_departed` (if order still lags)

```bash
npx tsx apps/backend/scripts/fsm-desync-remediation-dry-run.mjs \
  --order-id 06a3f2e8-dd6d-4f2a-958f-316811b519db
```

---

## Orchestrator state

- `orchestrator_recommendations` count: **0** (flags off; integration tests generate ephemeral recs only)
- Shadow soak: **1/7 days** — see [`03-shadow-parity-final-verdict.md`](03-shadow-parity-final-verdict.md)

---

## Gate checklist (all must pass)

| Gate | Status |
|------|--------|
| `undocumentedDesyncCount === 0` | PASS |
| Documented desync remediated | **FAIL** |
| 7-day shadow soak complete | **FAIL** |
| Rollback tested | Not executed this session |

---

## Decision

**NOT READY** for `FSM_ORCHESTRATOR_AUTO_APPLY=true` in staging or production.
