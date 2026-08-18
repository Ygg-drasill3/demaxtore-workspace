# Sprint 9B — 24-Hour Soak Report

**Verdict:** —

## Procedure

```bash
EV_SOAK_MS=86400000 node tools/enterprise-validation/sprint-9b-run.mjs
```

## Sample run (quick / default)

{
  "note": "Run with EV9B_QUICK=0 and EV_SOAK_MS=86400000 in staging"
}

## Monitoring checklist

- Host RSS for Node process
- `pg_stat_activity` connection count
- `job_executions` growth and absence of stale RUNNING
- `GET /api/healthz` error rate

## Success criteria

- Stable memory (no unbounded heap growth)
- p95 latency drift < 2× baseline over 24h
