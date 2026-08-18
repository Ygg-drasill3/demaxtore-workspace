# Sprint 8A — System Health Runtime Report

## Objective

Operational observability so management can answer: Are jobs healthy? Which integrations failed? Is the platform degraded?

## System Health Runtime

**Service:** `SystemHealthService` in `apps/backend/src/modules/jobs/system-health.service.ts`  
**Contract:** `SystemHealthSnapshot`, `SystemDashboardInsight` in `packages/contracts/src/enterprise-readiness.ts`

## Endpoints

| Endpoint | Access | Purpose |
|----------|--------|---------|
| `GET /api/healthz` | Public | Unchanged — `status`, `db`, `uptimeSec` |
| `GET /api/system/health` | ADMIN | Detailed component health |
| `GET /api/system/insights` | ADMIN | Full dashboard bundle |

## Health components

| Key | Label | Checks |
|-----|-------|--------|
| api | API Health | Process up |
| db | DB Health | `SELECT 1` |
| socket | Socket Health | Socket.io initialized |
| scheduler | Scheduler Health | Stale scheduler detection |
| jobs | Job Health | Repeated failures (7d) |
| tracking | Tracking Health | Last successful sync age |
| email | Email Health | Provider config (console/resend/smtp) |
| storage | Storage Health | `STORAGE_DIR` + sampled file refs |

Overall: `healthy` | `degraded` | `critical`.

## Related runtimes

- **Storage health:** `StorageHealthService` — RFQ attachments, order/shipment docs, comm attachments
- **Backup verification:** `BackupVerificationService` — `backup_verification_records` + `POST /api/system/backup/verify`
- **Failed jobs:** `JobService.getFailedJobs()` — long-running, repeated failures, missed/stale via registry

## Control Tower (additive)

- `system.job.failed`
- `system.job.stale`
- `system.storage.error`
- `system.backup.overdue`
- `system.restore.unverified`
- `system.scheduler.failure`

Wired in `scanSystemAlerts()` → `AlertEngine.runFullScan()`.

## Dashboard

**Route:** `/operations/system` (ADMIN)  
**Page:** `SystemOperationsPage.tsx` — health, jobs, failed jobs, schedulers, storage, backup, tracking, email

## CSV exports

- `jobs`, `system-health`, `backup-history`, `storage-health`, `scheduler-health`

## Sprint 8A status

**CLOSED**
