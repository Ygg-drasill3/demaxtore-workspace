import { JOB_REGISTRY, getJobDefinition } from "./job.registry.js";
import { jobExecutionToDto } from "./job.runner.js";
const STALE_MULTIPLIER = 2.5;
export class JobService {
    db;
    constructor(db) {
        this.db = db;
    }
    getRegistry() {
        return JOB_REGISTRY;
    }
    async getHistory(limit = 100, jobName) {
        const rows = await this.db.jobExecution.findMany({
            where: jobName ? { jobName } : undefined,
            orderBy: { startedAt: "desc" },
            take: limit,
        });
        return rows.map(jobExecutionToDto);
    }
    async getJobStatuses() {
        const out = [];
        for (const job of JOB_REGISTRY) {
            const [lastRun, lastSuccess, lastFailure, recentFailures] = await Promise.all([
                this.db.jobExecution.findFirst({
                    where: { jobName: job.name, status: { not: "SKIPPED" } },
                    orderBy: { startedAt: "desc" },
                }),
                this.db.jobExecution.findFirst({
                    where: { jobName: job.name, status: "SUCCESS" },
                    orderBy: { startedAt: "desc" },
                }),
                this.db.jobExecution.findFirst({
                    where: { jobName: job.name, status: "FAILED" },
                    orderBy: { startedAt: "desc" },
                }),
                this.db.jobExecution.count({
                    where: {
                        jobName: job.name,
                        status: "FAILED",
                        startedAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
                    },
                }),
            ]);
            let consecutiveFailures = 0;
            const recent = await this.db.jobExecution.findMany({
                where: { jobName: job.name, status: { in: ["SUCCESS", "FAILED"] } },
                orderBy: { startedAt: "desc" },
                take: 10,
            });
            for (const r of recent) {
                if (r.status === "FAILED")
                    consecutiveFailures++;
                else
                    break;
            }
            const lastAt = lastSuccess?.finishedAt ?? lastSuccess?.startedAt;
            const stale = job.enabled &&
                (!lastAt ||
                    Date.now() - lastAt.getTime() > job.intervalMs * STALE_MULTIPLIER);
            const nextRunEstimate = lastAt
                ? new Date(lastAt.getTime() + job.intervalMs).toISOString()
                : null;
            out.push({
                job,
                lastRun: lastRun ? jobExecutionToDto(lastRun) : null,
                lastSuccess: lastSuccess ? jobExecutionToDto(lastSuccess) : null,
                lastFailure: lastFailure ? jobExecutionToDto(lastFailure) : null,
                nextRunEstimate,
                consecutiveFailures: Math.max(consecutiveFailures, recentFailures > 0 ? 1 : 0),
                stale,
            });
        }
        return out;
    }
    async getFailedJobs() {
        const since = new Date(Date.now() - 7 * 86_400_000);
        const failures = await this.db.jobExecution.findMany({
            where: { status: "FAILED", startedAt: { gte: since } },
            orderBy: { startedAt: "desc" },
            take: 200,
        });
        const byJob = new Map();
        for (const f of failures) {
            const slot = byJob.get(f.jobName) ?? {
                jobName: f.jobName,
                failures: 0,
                lastError: null,
                lastFailedAt: null,
                longRunning: false,
            };
            slot.failures += 1;
            if (!slot.lastFailedAt) {
                slot.lastError = f.errorMessage;
                slot.lastFailedAt = f.startedAt.toISOString();
                slot.longRunning = (f.durationMs ?? 0) > (getJobDefinition(f.jobName)?.intervalMs ?? 60_000);
            }
            byJob.set(f.jobName, slot);
        }
        return [...byJob.values()].sort((a, b) => b.failures - a.failures);
    }
    async getStuckRunning(olderThanMs = 30 * 60_000) {
        const rows = await this.db.jobExecution.findMany({
            where: {
                status: "RUNNING",
                startedAt: { lt: new Date(Date.now() - olderThanMs) },
            },
            orderBy: { startedAt: "asc" },
            take: 50,
        });
        return rows.map(jobExecutionToDto);
    }
    async getSchedulerStatuses() {
        const statuses = await this.getJobStatuses();
        return JOB_REGISTRY.filter((j) => j.advisoryLockId).map((job) => {
            const st = statuses.find((s) => s.job.name === job.name);
            const last = st?.lastSuccess?.finishedAt ?? st?.lastSuccess?.startedAt ?? null;
            const stale = st?.stale ?? true;
            const missed = stale && job.enabled ? 1 : 0;
            return {
                name: job.name,
                lockId: job.advisoryLockId,
                intervalMs: job.intervalMs,
                healthy: !stale && (st?.consecutiveFailures ?? 0) === 0,
                lastTickAt: last,
                stale,
                missedExecutions: missed,
            };
        });
    }
}
//# sourceMappingURL=job.service.js.map