import { prisma } from "../../db.js";
import { SchedulerLockId, withSchedulerLock } from "../../db/scheduler-lock.js";
import { executeRecordedJob, recordSkippedJob } from "../jobs/job.runner.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { TrackingService } from "./tracking.service.js";

const service = new TrackingService(prisma);

async function tick(): Promise<void> {
  const ran = await withSchedulerLock(SchedulerLockId.TRACKING, async () => {
    await executeRecordedJob(prisma, "maritime_tracking_sync", async () => {
      const n = await service.syncAllLinked();
      logger.info({ synced: n }, "Maritime tracking sync complete");
    });
  });
  if (!ran) {
    await recordSkippedJob(prisma, "maritime_tracking_sync", "lock_held");
    logger.debug("Tracking sync skipped — lock held");
  }
}

export function startTrackingScheduler(): void {
  const interval = env.TRACKING_SYNC_INTERVAL_MS;
  void tick();
  setInterval(() => void tick(), interval).unref();
  logger.info({ intervalMs: interval }, "Maritime tracking scheduler started");
}
