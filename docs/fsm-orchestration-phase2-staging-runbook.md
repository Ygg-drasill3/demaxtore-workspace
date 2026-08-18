# Faz 2 — Staging Shadow Parity Runbook

## Prerequisites

- Faz 2 migration applied (`20260617140000_faz2_orchestrator`)
- Contracts + orchestration tests green locally

## Staging enablement

```bash
FSM_ORCHESTRATOR_ENABLED=true
FSM_ORCHESTRATOR_SHADOW_MODE=true
FSM_ORCHESTRATOR_AUTO_APPLY=false
```

Restart backend after env change.

## Weekly shadow parity check

1. Generate parity report:
   ```bash
   npx tsx apps/backend/scripts/shadow-parity-report.mjs \
     --markdown-out docs/shadow-parity-report-$(date +%Y%m%d).md
   ```
2. Run desync audit:
   ```bash
   npx tsx apps/backend/scripts/fsm-migration-audit.mjs --verbose > /tmp/fsm-audit.json
   ```
3. Review report metrics:
   - `matchedShadowMirrors` vs `mirrorMismatches` (target: 0 mismatches on sample)
   - `duplicateProcessedEventGroups` (target: 0)
   - `desyncPairs` trend vs baseline
4. Sample 20 active ORDER+SHIPMENT pairs from staging (ops spreadsheet or SQL).
5. For each pair, verify:
   - Shipment milestone transitions produce `orchestrator_recommendations` with expected mirror actions
   - Order state unchanged while `FSM_ORCHESTRATOR_AUTO_APPLY=false`
   - No duplicate recommendations on event replay (idempotency)
6. Compare recommendation plan vs expected mapping in `packages/contracts/src/order-shipment-orchestration.ts`.

## Rollback test (required before P2)

1. Set `FSM_ORCHESTRATOR_ENABLED=false`, restart backend
2. Run `./scripts/staging-baseline.sh`
3. Run `06-shipment-flow` E2E — expect 9/9
4. Confirm order workspace shows manual logistics actions
5. Record result in `docs/production-readiness-soak-report.md`

## Sign-off criteria (before AUTO_APPLY)

| Criterion | Target |
|-----------|--------|
| Shadow diff count on sampled pairs | 0 mismatches for 7 consecutive days |
| New desync alerts (ORDER_SHIPMENT_STATE_MISMATCH) | Trending down vs baseline |
| E2E `06-shipment-flow` | 9/9 pass on staging |
| Ops manual review | Signed checklist |

## Enabling auto-apply (production gate)

Only after staging sign-off:

```bash
FSM_ORCHESTRATOR_AUTO_APPLY=true
```

Effects:
- Order logistics mirrors applied automatically after shipment transitions
- Order workspace hides manual logistics actions
- Manual order logistics API returns `409 ORCHESTRATOR_ONLY`

## Rollback

```bash
FSM_ORCHESTRATOR_AUTO_APPLY=false
FSM_ORCHESTRATOR_ENABLED=false
```

## Manual desync remediation

Use Exception Hub recommendation **Apply** (ADMIN) or fix states in shipment workspace first (shipment-led model).
