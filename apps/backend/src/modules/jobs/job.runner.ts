import type { Prisma, PrismaClient } from "@prisma/client";
import type { JobExecutionStatus } from "@dmx/contracts/enterprise-readiness";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { systemAudit } from "./system-audit.js";

function toRecord(row: {
  id: string;
  jobName: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: string;
  durationMs: number | null;
  errorMessage: string | null;
  metadata: unknown;
  createdAt: Date;
}) {
  return {
    id: row.id,
    jobName: row.jobName,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    status: row.status as JobExecutionStatus,
    durationMs: row.durationMs,
    errorMessage: row.errorMessage,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Runs `fn` and persists execution history + audit + realtime (ADMIN). */
export async function executeRecordedJob(
  db: PrismaClient,
  jobName: string,
  fn: () => Promise<void>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const startedAt = new Date();
  const row = await db.jobExecution.create({
    data: {
      jobName,
      startedAt,
      status: "RUNNING",
      metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
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
  } catch (err) {
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
export async function recordSkippedJob(
  db: PrismaClient,
  jobName: string,
  reason: string,
): Promise<void> {
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
