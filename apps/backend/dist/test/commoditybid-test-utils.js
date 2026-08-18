/**
 * Deterministic CommodityBid scheduler helpers for vitest + E2E.
 */
import { prisma } from "../db.js";
import { runCommodityBidSchedulerTick } from "../modules/commoditybid/commoditybid.scheduler.js";
/** Backdate invitation/start deadlines so one scheduler tick can reach LIVE. */
export async function backdateCommodityBidForLive(workspaceId) {
    const past = new Date(Date.now() - 120_000);
    const futureEnd = new Date(Date.now() + 45 * 60_000);
    await prisma.commodityBidDetails.update({
        where: { workspaceId },
        data: {
            invitationDeadlineAt: past,
            auctionStartsAt: past,
            auctionEndsAt: futureEnd,
        },
    });
    await prisma.workspace.update({
        where: { id: workspaceId },
        data: { deadlineAt: futureEnd },
    });
}
/** Advance SCHEDULED → LIVE via direct scheduler ticks (no wall-clock polling). */
export async function waitForCommodityBidLive(workspaceId, maxTicks = 24) {
    await backdateCommodityBidForLive(workspaceId);
    for (let i = 0; i < maxTicks; i++) {
        await runCommodityBidSchedulerTick();
        const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (ws?.state === "LIVE")
            return;
        // Yield when production scheduler competes on the same DB connection pool.
        await new Promise((r) => setTimeout(r, 50));
    }
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    throw new Error(`workspace ${workspaceId} did not reach LIVE (state=${ws?.state ?? "missing"})`);
}
//# sourceMappingURL=commoditybid-test-utils.js.map