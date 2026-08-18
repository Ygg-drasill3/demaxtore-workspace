# Shadow Parity Report (template)

**Generated:** 2026-06-17  
**Environment:** local dev (orchestrator flags OFF at generation time)

Run with shadow flags enabled:

```bash
FSM_ORCHESTRATOR_ENABLED=true
FSM_ORCHESTRATOR_SHADOW_MODE=true
FSM_ORCHESTRATOR_AUTO_APPLY=false
```

Then:

```bash
npx tsx apps/backend/scripts/shadow-parity-report.mjs --markdown-out docs/shadow-parity-report-latest.md
```

## Totals (baseline snapshot)

| Metric | Value |
|--------|-------|
| Active orders | — |
| Active shipments | — |
| Recommendations | 0 (orchestrator off) |
| Matched shadow mirrors | — |
| Mirror mismatches | — |
| Desync pairs | 1 |
| Duplicate processed_event groups | 0 |

See [`desync-root-cause-report.md`](desync-root-cause-report.md) for the known desync pair.
