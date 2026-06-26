#!/usr/bin/env node
/** Age a workspace_messages.created_at by N hours (E2E only). */
import { PrismaClient } from "@prisma/client";

const [messageId, hoursStr] = process.argv.slice(2);
if (!messageId || !hoursStr) {
  console.error("Usage: node e2e-age-workspace-message.mjs <messageId> <hours>");
  process.exit(1);
}
const hours = Number(hoursStr);
const prisma = new PrismaClient();
const row = await prisma.workspaceMessage.findUnique({ where: { id: messageId } });
if (!row) {
  console.error("Message not found");
  process.exit(1);
}
const aged = new Date(Date.now() - hours * 3_600_000);
await prisma.workspaceMessage.update({
  where: { id: messageId },
  data: { createdAt: aged },
});
console.log(`Aged message ${messageId} to ${aged.toISOString()}`);
await prisma.$disconnect();
