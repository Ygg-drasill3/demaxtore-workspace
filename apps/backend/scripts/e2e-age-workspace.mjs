#!/usr/bin/env node
/** E2E helper: backdate workspace.updated_at by N hours. Usage: node e2e-age-workspace.mjs <uuid> <hours> */
import { PrismaClient } from "@prisma/client";

const [workspaceId, hoursStr] = process.argv.slice(2);
if (!workspaceId || !hoursStr) {
  console.error("Usage: e2e-age-workspace.mjs <workspaceId> <hours>");
  process.exit(1);
}

const hours = Number(hoursStr);
const prisma = new PrismaClient();
const updatedAt = new Date(Date.now() - hours * 3_600_000);

await prisma.workspace.update({ where: { id: workspaceId }, data: { updatedAt } });
console.log(JSON.stringify({ workspaceId, updatedAt: updatedAt.toISOString() }));
await prisma.$disconnect();
