import { JobService } from "./job.service.js";
import { SystemHealthService } from "./system-health.service.js";
import { BackupVerificationService } from "./backup-verification.service.js";
import { StorageHealthService } from "./storage-health.service.js";
function csvEscape(v) {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}
export async function exportSystemCsv(reportType, db) {
    const jobs = new JobService(db);
    const health = new SystemHealthService(db);
    const backup = new BackupVerificationService(db);
    const storage = new StorageHealthService(db);
    switch (reportType) {
        case "jobs": {
            const rows = await jobs.getJobStatuses();
            const header = "job,label,last_status,last_run,stale,consecutive_failures";
            const lines = rows.map((r) => [
                r.job.name,
                r.job.label,
                r.lastRun?.status ?? "",
                r.lastRun?.startedAt ?? "",
                r.stale,
                r.consecutiveFailures,
            ]
                .map(csvEscape)
                .join(","));
            return [header, ...lines].join("\n");
        }
        case "system-health": {
            const snap = await health.getDetailedHealth();
            const header = "component,status,detail";
            const lines = snap.components.map((c) => [c.key, c.status, c.detail ?? ""].map(csvEscape).join(","));
            return [header, ...lines].join("\n");
        }
        case "backup-history": {
            const rows = await db.backupVerificationRecord.findMany({
                orderBy: { verifiedAt: "desc" },
                take: 500,
            });
            const header = "check_type,status,verified_at,notes";
            const lines = rows.map((r) => [r.checkType, r.status, r.verifiedAt.toISOString(), r.notes ?? ""]
                .map(csvEscape)
                .join(","));
            return [header, ...lines].join("\n");
        }
        case "storage-health": {
            const rep = await storage.scan();
            const header = "kind,id,storage_key,ok";
            const lines = rep.samples.map((s) => [s.kind, s.id, s.storageKey, s.ok].map(csvEscape).join(","));
            return [header, ...lines].join("\n");
        }
        case "scheduler-health": {
            const rows = await jobs.getSchedulerStatuses();
            const header = "name,lock_id,healthy,stale,last_tick,missed";
            const lines = rows.map((r) => [r.name, r.lockId, r.healthy, r.stale, r.lastTickAt ?? "", r.missedExecutions]
                .map(csvEscape)
                .join(","));
            return [header, ...lines].join("\n");
        }
        default:
            return "error,unknown_report_type\n";
    }
}
//# sourceMappingURL=system-csv.js.map