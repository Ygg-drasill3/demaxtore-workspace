import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { prisma } from "../../db/prisma.js";
import { SchedulerLockId, withSchedulerLock } from "../../db/scheduler-lock.js";
import { executeRecordedJob, recordSkippedJob } from "../jobs/job.runner.js";
import { retryFailedEmailDeliveries } from "./email-bridge.service.js";
const INTERVAL_MS = env.EMAIL_BRIDGE_RETRY_INTERVAL_MS;
async function runTick() {
    const count = await retryFailedEmailDeliveries();
    if (count > 0) {
        logger.info({ count }, "[Email Bridge] retried failed deliveries");
    }
}
export async function runEmailBridgeRetryTick() {
    const ran = await withSchedulerLock(SchedulerLockId.EMAIL_BRIDGE, async () => {
        await executeRecordedJob(prisma, "email_bridge_retry", runTick);
    });
    if (!ran)
        await recordSkippedJob(prisma, "email_bridge_retry", "lock_held");
}
export function startEmailBridgeRetryWorker() {
    const tick = () => {
        void runEmailBridgeRetryTick().catch((e) => logger.warn({ err: e }, "[Email Bridge] retry tick failed"));
    };
    tick();
    const handle = setInterval(tick, INTERVAL_MS);
    logger.info({ intervalMs: INTERVAL_MS }, "✓ Email bridge retry worker started");
    return handle;
}
//# sourceMappingURL=email-bridge.scheduler.js.map