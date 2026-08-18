import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { systemAudit } from "./system-audit.js";
function toRecord(row) {
    return {
        id: row.id,
        jobName: row.jobName,
        startedAt: row.startedAt.toISOString(),
        finishedAt: row.finishedAt?.toISOString() ?? null,
        status: row.status,
        durationMs: row.durationMs,
        errorMessage: row.errorMessage,
        metadata: row.metadata ?? null,
        createdAt: row.createdAt.toISOString(),
    };
}
/** Runs `fn` and persists execution history + audit + realtime (ADMIN). */
export async function executeRecordedJob(db, jobName, fn, metadata) {
    const startedAt = new Date();
    const row = await db.jobExecution.create({
        data: {
            jobName,
            startedAt,
            status: "RUNNING",
            metadata: (metadata ?? undefined),
        },
    });
    try {
        await fn();
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();
        await db.jobExecution.update({
            where: { id: row.id },
            data: { finishedAt, status: "SUCCESS", durationMs },
        });
        await systemAudit(db, "job.executed", { jobName, durationMs, ...metadata });
        socketBus.emitToRole("ADMIN", SocketEvents.SYSTEM_HEALTH_UPDATED, { jobName, status: "SUCCESS" });
    }
    catch (err) {
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();
        const message = err instanceof Error ? err.message : String(err);
        await db.jobExecution.update({
            where: { id: row.id },
            data: { finishedAt, status: "FAILED", durationMs, errorMessage: message.slice(0, 2000) },
        });
        await systemAudit(db, "job.failed", { jobName, error: message, ...metadata });
        socketBus.emitToRole("ADMIN", SocketEvents.SYSTEM_JOB_FAILED, { jobName, error: message });
        throw err;
    }
}
/** Records a skipped tick (e.g. advisory lock held by another instance). */
export async function recordSkippedJob(db, jobName, reason) {
    const now = new Date();
    await db.jobExecution.create({
        data: {
            jobName,
            startedAt: now,
            finishedAt: now,
            status: "SKIPPED",
            durationMs: 0,
            metadata: { reason },
        },
    });
}
export { toRecord as jobExecutionToDto };
//# sourceMappingURL=job.runner.js.map