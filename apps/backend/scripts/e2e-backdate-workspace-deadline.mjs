#!/usr/bin/env node
/** E2E helper: backdate workspaces.deadline_at only (auction_ends_at unchanged). */
import { PrismaClient } from "@prisma/client";

const [workspaceId] = process.argv.slice(2);
if (!workspaceId) {
  console.error("Usage: e2e-backdate-workspace-deadline.mjs <workspaceId>");
  process.exit(1);
}

const prisma = new PrismaClient();
const deadlineAt = new Date(Date.now() - 120_000);

await prisma.workspace.update({
  where: { id: workspaceId },
  data: { deadlineAt },
});
console.log(JSON.stringify({ workspaceId, deadlineAt: deadlineAt.toISOString() }));
await prisma.$disconnect();
