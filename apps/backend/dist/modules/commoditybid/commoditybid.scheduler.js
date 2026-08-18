// Sprint 9B — CommodityBid auction scheduler (invitations, start, live, close, winner)
import { prisma } from "../../db/prisma.js";
import { SchedulerLockId, withSchedulerLock } from "../../db/scheduler-lock.js";
import { executeRecordedJob, recordSkippedJob } from "../jobs/job.runner.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";
import { createAuctionEngine } from "./auction-engine.js";
const engine = createAuctionEngine(prisma);
async function runTick() {
    await engine.processScheduledInvitations();
    await engine.processInvitationDeadlines();
    await engine.processAuctionStarts();
    await engine.processLiveAuctions();
}
async function tick() {
    const ran = await withSchedulerLock(SchedulerLockId.COMMODITYBID, async () => {
        await executeRecordedJob(prisma, "commoditybid_auction_engine", runTick);
    });
    if (!ran)
        await recordSkippedJob(prisma, "commoditybid_auction_engine", "lock_held");
}
export async function runCommodityBidSchedulerTick() {
    await tick();
}
export function startCommodityBidScheduler() {
    tick().catch((e) => logger.warn({ err: e }, "CommodityBid auction scheduler tick failed"));
    const handle = setInterval(() => {
        tick().catch((e) => logger.warn({ err: e }, "CommodityBid auction scheduler tick failed"));
    }, env.SLA_WORKER_INTERVAL_MS);
    handle.unref();
    logger.info({ intervalMs: env.SLA_WORKER_INTERVAL_MS }, "✓ CommodityBid auction scheduler started");
    return handle;
}
//# sourceMappingURL=commoditybid.scheduler.js.map