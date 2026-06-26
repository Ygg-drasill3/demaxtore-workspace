#!/usr/bin/env node
/** E2E helper: backdate CB auction clocks so scheduler can reach LIVE immediately. */
import { PrismaClient } from "@prisma/client";

const [workspaceId] = process.argv.slice(2);
if (!workspaceId) {
  console.error("Usage: e2e-force-cb-auction-live.mjs <workspaceId>");
  process.exit(1);
}

const prisma = new PrismaClient();
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
console.log(JSON.stringify({ workspaceId, invitationDeadlineAt: past.toISOString(), auctionStartsAt: past.toISOString() }));
await prisma.$disconnect();
