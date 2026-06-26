import type { PrismaClient } from "@prisma/client";
import { AlertKey } from "@dmx/contracts/control-tower";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
import { JobService } from "./job.service.js";
import { StorageHealthService } from "./storage-health.service.js";
import { BackupVerificationService } from "./backup-verification.service.js";
import { systemAudit } from "./system-audit.js";

async function systemAnchor(db: PrismaClient): Promise<string | null> {
  const ws = await db.workspace.findFirst({
    where: { type: "ORDER" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return ws?.id ?? null;
}

export async function scanSystemAlerts(db: PrismaClient): Promise<number> {
  let n = 0;
  const anchor = await systemAnchor(db);
  if (!anchor) return 0;

  const jobs = new JobService(db);
  const jobStatuses = await jobs.getJobStatuses();
  const failed = await jobs.getFailedJobs();

  for (const f of failed.filter((x) => x.failures >= 2)) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor,
        alertKey: AlertKey.SYSTEM_JOB_FAILED,
        severity: "WARNING",
        category: "SYSTEM",
        workspaceType: "ORDER",
        title: "Background job failures",
        description: `${f.jobName}: ${f.failures} failures — ${f.lastError ?? "unknown"}`,
      })
    ) {
      n++;
      socketBus.emitToRole("ADMIN", SocketEvents.SYSTEM_ALERT_GENERATED, { kind: "job.failed" });
      await systemAudit(db, "system.alert.generated", { alertKey: AlertKey.SYSTEM_JOB_FAILED });
    }
  }

  for (const st of jobStatuses.filter((s) => s.stale && s.job.enabled)) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor,
        alertKey: AlertKey.SYSTEM_JOB_STALE,
        severity: "WARNING",
        category: "SYSTEM",
        workspaceType: "ORDER",
        title: "Stale background job",
        description: `${st.job.label} has not completed within expected interval.`,
      })
    ) {
      n++;
      socketBus.emitToRole("ADMIN", SocketEvents.SYSTEM_ALERT_GENERATED, { kind: "job.stale" });
    }
  }

  for (const sch of await jobs.getSchedulerStatuses()) {
    if (!sch.healthy) {
      if (
        await upsertControlTowerAlert(db, {
          workspaceId: anchor,
          alertKey: AlertKey.SYSTEM_SCHEDULER_FAILURE,
          severity: "CRITICAL",
          category: "SYSTEM",
          workspaceType: "ORDER",
          title: "Scheduler unhealthy",
          description: `${sch.name} lock ${sch.lockId} — stale=${sch.stale}`,
        })
      ) {
        n++;
        socketBus.emitToRole("ADMIN", SocketEvents.SYSTEM_ALERT_GENERATED, { kind: "scheduler.failure" });
      }
    }
  }

  const storage = await new StorageHealthService(db).scan();
  if (storage.driftDetected || !storage.accessible) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor,
        alertKey: AlertKey.SYSTEM_STORAGE_ERROR,
        severity: "CRITICAL",
        category: "SYSTEM",
        workspaceType: "ORDER",
        title: "Storage health issue",
        description: `Missing ${storage.missingFiles}, broken ${storage.brokenReferences}, accessible=${storage.accessible}`,
      })
    ) {
      n++;
      socketBus.emitToRole("ADMIN", SocketEvents.SYSTEM_ALERT_GENERATED, { kind: "storage.error" });
    }
  }

  const backup = await new BackupVerificationService(db).getStatus();
  if (backup.backupOverdue) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor,
        alertKey: AlertKey.SYSTEM_BACKUP_OVERDUE,
        severity: "WARNING",
        category: "SYSTEM",
        workspaceType: "ORDER",
        title: "Backup verification overdue",
        description: "Run backup per docs/backup-runbook.md and record verification.",
      })
    ) {
      n++;
      socketBus.emitToRole("ADMIN", SocketEvents.SYSTEM_ALERT_GENERATED, { kind: "backup.overdue" });
    }
  }

  if (backup.restoreUnverified) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor,
        alertKey: AlertKey.SYSTEM_RESTORE_UNVERIFIED,
        severity: "INFO",
        category: "SYSTEM",
        workspaceType: "ORDER",
        title: "Restore drill unverified",
        description: "Schedule restore verification per docs/restore-runbook.md.",
      })
    ) {
      n++;
      socketBus.emitToRole("ADMIN", SocketEvents.SYSTEM_ALERT_GENERATED, { kind: "restore.unverified" });
    }
  }

  return n;
}
