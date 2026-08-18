import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { prisma } from "../../db/prisma.js";
import { SchedulerLockId, withSchedulerLock } from "../../db/scheduler-lock.js";
import { executeRecordedJob, recordSkippedJob } from "../jobs/job.runner.js";
import { retryFailedWhatsAppDeliveries } from "../whatsapp-notification-bridge/whatsapp-bridge.service.js";
const INTERVAL_MS = env.WHATSAPP_BRIDGE_RETRY_INTERVAL_MS;
async function runTick() {
    const count = await retryFailedWhatsAppDeliveries();
    if (count > 0) {
        logger.info({ count }, "[WA Bridge] retried failed deliveries");
    }
}
export async function runWhatsAppBridgeRetryTick() {
    const ran = await withSchedulerLock(SchedulerLockId.WHATSAPP_BRIDGE, async () => {
        await executeRecordedJob(prisma, "whatsapp_bridge_retry", runTick);
    });
    if (!ran)
        await recordSkippedJob(prisma, "whatsapp_bridge_retry", "lock_held");
}
export function startWhatsAppBridgeRetryWorker() {
    const tick = () => {
        void runWhatsAppBridgeRetryTick().catch((e) => logger.warn({ err: e }, "[WA Bridge] retry tick failed"));
    };
    tick();
    const handle = setInterval(tick, INTERVAL_MS);
    logger.info({ intervalMs: INTERVAL_MS }, "✓ WhatsApp bridge retry worker started");
    return handle;
}
//# sourceMappingURL=whatsapp-bridge.scheduler.js.map