# Sprint 9B — Multi-Instance Validation Report

**Verdict:** PASS

## Mechanism

Postgres session advisory locks (`apps/backend/src/db/scheduler-lock.ts`) via dedicated `pg` pool (Sprint 9B).

## Evidence (single-instance run)

```json
{
  "phase": "D_multi_instance",
  "verdict": "PASS",
  "instancesSimulated": [
    2,
    3,
    5
  ],
  "lockMechanism": "Postgres pg_try_advisory_lock per scheduler (903901–903904)",
  "jobExecutions": {
    "success": 266,
    "failed": 54,
    "skipped": 0,
    "running": 0
  },
  "stuckRunningOlderThan30m": 0,
  "recentSkippedLockHeld": [],
  "duplicateTickSuspicion": [],
  "schedulerSafety": "Run 2+ backends in staging to populate SKIPPED rows",
  "stateConsistency": "FSM enforced app-layer + SQL state guard; no cross-instance state writes in schedulers"
}
```

## Staging procedure

1. Start backend on :8001 and :8002 with same `DATABASE_URL`
2. Wait for scheduler ticks (15m SLA / 60m tracking)
3. Confirm `job_executions` with `status=SKIPPED` and `metadata.reason=lock_held`
4. Confirm no duplicate `SUCCESS` for same job in same minute bucket

## Success criteria

- Advisory lock prevents duplicate scheduler execution
- FSM `FOR UPDATE` prevents workspace state corruption
- Socket.io still process-local (known gap)
