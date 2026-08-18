# Sprint 9B — Stale Job Recovery Report

**Verdict:** PASS

## Root causes (audit)

- Process crash mid-`executeRecordedJob`
- tsx hot-reload during development
- Historical: 39 stale rows cleared manually during Sprint 9 validation

## Implementation

| Component | Path |
|-----------|------|
| Reconciler | `apps/backend/src/modules/jobs/job-reconciler.ts` |
| Boot + interval | `apps/backend/src/server.ts` |
| API | `GET /api/system/jobs/stuck-running`, `POST /api/system/jobs/reconcile-stale` |
| Health | `SystemHealthService.checkJobsHealth` flags stale RUNNING |
| Env | `JOB_STALE_RUNNING_MS` (default 30m), `JOB_RECONCILE_INTERVAL_MS` (10m) |

## Validation probe

```json
{
  "phase": "C_stale_job_recovery",
  "verdict": "PASS",
  "stuckRunning": [],
  "reconcile": {
    "reconciled": 0,
    "jobIds": [],
    "oldestStartedAt": null
  },
  "reconcileMs": 2
}
```

## Success criteria

- [x] Detection API
- [x] Automatic reclaim on boot and interval
- [x] Manual admin reclaim endpoint
- [ ] Load test: kill -9 mid-scan (staging drill)
