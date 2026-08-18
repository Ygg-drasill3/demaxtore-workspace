# Sprint 8A — Job Runtime Report

## Objective

Centralize non-user-facing workloads with **execution history**, **registry metadata**, and **failure visibility** for enterprise scale.

## Implementation

| Component | Path |
|-----------|------|
| Job registry | `apps/backend/src/modules/jobs/job.registry.ts` |
| Job runner | `apps/backend/src/modules/jobs/job.runner.ts` |
| Job service | `apps/backend/src/modules/jobs/job.service.ts` |
| Migration | `20260620120000_sprint8a_job_runtime` → `job_executions` |

## Registered jobs

1. **proforma_sla_email** — Proforma SLA reminders (`sla-worker.ts`)
2. **commoditybid_system_fsm** — Deadline + award SLA (`commoditybid.scheduler.ts`)
3. **control_tower_alert_scan** — Full CT scan incl. growth/market/scale/system (`control-tower.scheduler.ts`)
4. **maritime_tracking_sync** — Tracking sync (`tracking.scheduler.ts`)

## Execution metadata

Each run persists:

- `job_name`, `started_at`, `finished_at`
- `status`: `RUNNING` | `SUCCESS` | `FAILED` | `SKIPPED`
- `duration_ms`, `error_message`, `metadata` (JSON)

Indexes: `job_name`, `status`, `created_at`.

## API (ADMIN)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/system/jobs` | Registry + last run / success / failure / stale |
| `GET /api/system/jobs/history` | Execution history |
| `GET /api/system/jobs/failed` | Failed job summary (7d) |
| `GET /api/system/schedulers` | Scheduler health + lock IDs |
| `GET /api/system/export/jobs.csv` | CSV export |

## Audit

- `job.executed`
- `job.failed`

## Realtime (ADMIN)

- `system.health.updated` on success
- `system.job.failed` on failure

## Sprint 8A status

**CLOSED**
