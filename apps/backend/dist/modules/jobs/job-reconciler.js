import { logger } from "../../config/logger.js";
import { systemAudit } from "./system-audit.js";
const STALE_MESSAGE = "Marked FAILED by stale RUNNING reconciler (worker crash, hot reload, or lock timeout)";
/**
 * Reclaims job_executions stuck in RUNNING beyond maxAgeMs.
 * Safe to run on boot and on an interval — does not cancel in-flight work younger than threshold.
 */
export async function reconcileStaleRunningJobs(db, maxAgeMs) {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const stale = await db.jobExecution.findMany({
        where: { status: "RUNNING", startedAt: { lt: cutoff } },
        select: { id: true, jobName: true, startedAt: true },
        take: 500,
    });
    if (stale.length === 0) {
        return { reconciled: 0, jobIds: [], oldestStartedAt: null };
    }
    const now = new Date();
    for (const row of stale) {
        await db.jobExecution.update({
            where: { id: row.id },
            data: {
                status: "FAILED",
                finishedAt: now,
                errorMessage: STALE_MESSAGE,
                durationMs: now.getTime() - row.startedAt.getTime(),
            },
        });
    }
    for (const row of stale) {
        await systemAudit(db, "job.failed", {
            jobExecutionId: row.id,
            jobName: row.jobName,
            startedAt: row.startedAt.toISOString(),
        });
    }
    logger.warn({ count: stale.length, jobNames: [...new Set(stale.map((s) => s.jobName))] }, "Reconciled stale RUNNING job executions");
    return {
        reconciled: stale.length,
        jobIds: stale.map((s) => s.id),
        oldestStartedAt: stale.reduce((min, s) => (s.startedAt < min ? s.startedAt : min), stale[0].startedAt).toISOString(),
    };
}
//# sourceMappingURL=job-reconciler.js.map