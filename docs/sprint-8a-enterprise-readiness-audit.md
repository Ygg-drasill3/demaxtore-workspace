# Sprint 8A — Enterprise Readiness Audit (Multi-Instance)

## Scope

Readiness assessment for running **multiple backend instances** without duplicate background work or lost operational visibility. No Kubernetes or cloud migration in this sprint.

## Schedulers audited

| Scheduler | Lock ID | Interval | Job name |
|-----------|---------|----------|----------|
| Proforma SLA email | `903901` (PROFORMA_SLA) | `SLA_WORKER_INTERVAL_MS` (15m default) | `proforma_sla_email` |
| CommodityBid system FSM | `903902` (COMMODITYBID) | 15m default | `commoditybid_system_fsm` |
| Control Tower alert scan | `903903` (CONTROL_TOWER) | 15m default | `control_tower_alert_scan` |
| Maritime tracking sync | `903904` (TRACKING) | `TRACKING_SYNC_INTERVAL_MS` (60m default) | `maritime_tracking_sync` |

## Advisory lock protection

- Implementation: `apps/backend/src/db/scheduler-lock.ts` — `withSchedulerLock()` uses `pg_try_advisory_lock` / `pg_advisory_unlock` in a **single Prisma transaction** (same connection).
- Verified in `apps/backend/src/hardening/scheduler-lock.test.ts`.
- When lock is not acquired, Sprint 8A records a `SKIPPED` job execution with `metadata.reason = lock_held` (safe for horizontal scale).

## Nested scans (single lock)

Growth, market, and scale-readiness alert scans run **inside** `control_tower_alert_scan` (no separate schedulers). One lock covers the full scan bundle.

## Realtime

- Socket.io rooms: `user:{id}`, `role:{role}`, `workspace:{id}`.
- System events (`system.health.updated`, `system.job.failed`, `system.alert.generated`) emit to `role:ADMIN` only.
- Multi-instance: all instances may emit; clients dedupe by event payload (same pattern as Control Tower / growth / market).

## Findings

| Area | Status | Notes |
|------|--------|-------|
| Schedulers | **Ready** | All four use advisory locks |
| Alert scans | **Ready** | Bundled under Control Tower lock |
| Growth / market scans | **Ready** | No extra scheduler; no duplicate ticks |
| Tracking sync | **Ready** | Dedicated lock |
| Email SLA worker | **Ready** | Dedicated lock + job history |
| Job execution history | **Ready** | `job_executions` table (Sprint 8A) |
| Stale job detection | **Ready** | `JobService` + `system.job.stale` alerts |
| Backup / restore verification | **Manual** | Admin records checks via API; runbooks unchanged |
| Storage health | **Ready** | Sampled file checks vs DB references |

## Recommendations (ops)

1. Run **2+ backend instances** in staging and confirm `SKIPPED` rows appear in `job_executions` when locks contend.
2. Record backup/restore drills via `POST /api/system/backup/verify` after runbook steps.
3. Monitor Control Tower for `system.*` alert keys before customer impact.
4. Keep `GET /api/healthz` on load balancers; use `GET /api/system/health` for admin diagnostics only.

## Sprint 8A status

**CLOSED** — multi-instance readiness documented and instrumented.
