// apps/backend/src/modules/messaging/sla-worker.ts
//
// Proforma SLA reminder worker.
// Runs every SLA_WORKER_INTERVAL_MS (default 15 min). For each workspace
// currently in PROFORMA_REQUESTED whose deadline is within 24h and that we
// haven't reminded in the last 24h, send the supplier counterparty a reminder.
//
// Idempotency: workspaces.last_sla_reminder_at column gates the send.
// Cron is in-process (no extra worker container needed at this scale).
import { prisma } from "../../db/prisma.js";
import { SchedulerLockId, withSchedulerLock } from "../../db/scheduler-lock.js";
import { executeRecordedJob, recordSkippedJob } from "../jobs/job.runner.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";
import { mailer } from "./mailer.js";
import { proformaSlaReminderTemplate } from "./templates.js";
const DAY_MS = 24 * 60 * 60 * 1000;
async function runTick() {
    const now = new Date();
    const horizon = new Date(now.getTime() + DAY_MS);
    const due = await prisma.workspace.findMany({
        where: {
            type: "RFQ",
            state: "PROFORMA_REQUESTED",
            deadlineAt: { not: null, lte: horizon, gte: now },
            OR: [
                { lastSlaReminderAt: null },
                { lastSlaReminderAt: { lt: new Date(now.getTime() - DAY_MS) } },
            ],
        },
        include: {
            rfqDetails: { select: { selectedSupplierUserId: true, title: true } },
        },
        take: 50,
    });
    for (const ws of due) {
        const supplierId = ws.rfqDetails?.selectedSupplierUserId;
        if (!supplierId)
            continue;
        const supplier = await prisma.user.findUnique({ where: { id: supplierId } });
        if (!supplier)
            continue;
        const tpl = proformaSlaReminderTemplate({
            displayName: supplier.displayName,
            rfqRef: ws.externalRef,
            deadlineAt: ws.deadlineAt.toISOString(),
            workspaceUrl: `${env.APP_BASE_URL}/workspace/rfq/${ws.id}`,
        });
        mailer.sendAsync({ to: supplier.email, ...tpl });
        await prisma.workspace.update({
            where: { id: ws.id },
            data: { lastSlaReminderAt: now },
        });
        logger.info({ workspaceId: ws.id, supplierId, rfqRef: ws.externalRef }, "📧 SLA reminder queued");
    }
}
async function tick() {
    const ran = await withSchedulerLock(SchedulerLockId.PROFORMA_SLA, async () => {
        await executeRecordedJob(prisma, "proforma_sla_email", runTick);
    });
    if (!ran)
        await recordSkippedJob(prisma, "proforma_sla_email", "lock_held");
}
export function startSlaWorker() {
    tick().catch((e) => logger.warn({ err: e }, "SLA worker tick failed"));
    const handle = setInterval(() => {
        tick().catch((e) => logger.warn({ err: e }, "SLA worker tick failed"));
    }, env.SLA_WORKER_INTERVAL_MS);
    handle.unref();
    logger.info({ intervalMs: env.SLA_WORKER_INTERVAL_MS }, "✓ Proforma SLA worker started");
    return handle;
}
//# sourceMappingURL=sla-worker.js.map