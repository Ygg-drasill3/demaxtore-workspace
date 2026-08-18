// RFQ deadline + proforma SLA scheduler (SYSTEM transitions)
import { prisma } from "../../db/prisma.js";
import { SchedulerLockId, withSchedulerLock } from "../../db/scheduler-lock.js";
import { executeRecordedJob, recordSkippedJob } from "../jobs/job.runner.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";
import { RfqService } from "./rfq.service.js";
const service = new RfqService(prisma);
const SYSTEM_ACTOR = {
    id: "00000000-0000-0000-0000-000000000000",
    email: "system@demaxtore.local",
    role: "SYSTEM",
};
async function processRfqDeadlines() {
    const now = new Date();
    const due = await prisma.workspace.findMany({
        where: {
            type: "RFQ",
            state: "RFQ_OPEN",
            deadlineAt: { lt: now },
        },
        select: { id: true },
        take: 100,
    });
    for (const ws of due) {
        const quotationCount = await prisma.quotation.count({
            where: { workspaceId: ws.id, withdrawnAt: null },
        });
        const action = quotationCount > 0 ? "deadline_reached" : "deadline_reached_no_bids";
        try {
            await service.applyTransition({
                workspaceId: ws.id,
                action,
                actor: SYSTEM_ACTOR,
                payload: { idempotencyKey: `rfq-deadline-${ws.id}-${action}` },
            });
        }
        catch (e) {
            logger.warn({ err: e, workspaceId: ws.id, action }, "RFQ deadline transition failed");
        }
    }
}
async function processProformaSlaExpiry() {
    const now = new Date();
    const due = await prisma.workspace.findMany({
        where: {
            type: "RFQ",
            state: "PROFORMA_REQUESTED",
            proformaSlaDeadlineAt: { lt: now },
        },
        select: { id: true },
        take: 100,
    });
    for (const ws of due) {
        try {
            await service.applyTransition({
                workspaceId: ws.id,
                action: "proforma_sla_expired",
                actor: SYSTEM_ACTOR,
                payload: { idempotencyKey: `rfq-proforma-sla-${ws.id}` },
            });
        }
        catch (e) {
            logger.warn({ err: e, workspaceId: ws.id }, "RFQ proforma SLA transition failed");
        }
    }
}
async function runTick() {
    await processRfqDeadlines();
    await processProformaSlaExpiry();
}
async function tick() {
    const ran = await withSchedulerLock(SchedulerLockId.RFQ_DEADLINE, async () => {
        await executeRecordedJob(prisma, "rfq_deadline_scheduler", runTick);
    });
    if (!ran)
        await recordSkippedJob(prisma, "rfq_deadline_scheduler", "lock_held");
}
export async function runRfqSchedulerTick() {
    await tick();
}
export function startRfqScheduler() {
    tick().catch((e) => logger.warn({ err: e }, "RFQ scheduler tick failed"));
    const handle = setInterval(() => {
        tick().catch((e) => logger.warn({ err: e }, "RFQ scheduler tick failed"));
    }, env.SLA_WORKER_INTERVAL_MS);
    handle.unref();
    logger.info({ intervalMs: env.SLA_WORKER_INTERVAL_MS }, "✓ RFQ deadline scheduler started");
    return handle;
}
//# sourceMappingURL=rfq.scheduler.js.map