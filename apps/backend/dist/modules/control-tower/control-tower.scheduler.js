import { prisma } from "../../db.js";
import { SchedulerLockId, withSchedulerLock } from "../../db/scheduler-lock.js";
import { executeRecordedJob, recordSkippedJob } from "../jobs/job.runner.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { ControlTowerService } from "./control-tower.service.js";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
const service = new ControlTowerService(prisma);
async function tick() {
    try {
        const ran = await withSchedulerLock(SchedulerLockId.CONTROL_TOWER, async () => {
            await executeRecordedJob(prisma, "control_tower_alert_scan", async () => {
                const created = await service.runAlertScan();
                const metrics = await service.getMetrics();
                socketBus.emitToRole("ADMIN", SocketEvents.CONTROL_TOWER_METRIC_UPDATED, { metrics });
                logger.info({ created }, "Control Tower alert scan complete");
            });
        });
        if (!ran) {
            await recordSkippedJob(prisma, "control_tower_alert_scan", "lock_held");
            logger.debug("Control Tower scan skipped — lock held");
        }
    }
    catch (err) {
        logger.error({ err }, "Control Tower scan failed");
    }
}
export function startControlTowerScheduler() {
    const interval = env.SLA_WORKER_INTERVAL_MS ?? 15 * 60_000;
    void tick();
    setInterval(() => void tick(), interval).unref();
    logger.info({ intervalMs: interval }, "Control Tower scheduler started");
}
//# sourceMappingURL=control-tower.scheduler.js.map