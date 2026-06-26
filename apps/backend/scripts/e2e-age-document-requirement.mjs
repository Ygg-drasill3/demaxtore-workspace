#!/usr/bin/env node
/** Backdate document_requirements.created_at by N hours for a workspace. */
import { PrismaClient } from "@prisma/client";

const [workspaceType, workspaceId, hoursStr] = process.argv.slice(2);
if (!workspaceType || !workspaceId || !hoursStr) {
  console.error("Usage: e2e-age-document-requirement.mjs <ORDER|SHIPMENT> <workspaceId> <hours>");
  process.exit(1);
}

const hours = Number(hoursStr);
const prisma = new PrismaClient();
const createdAt = new Date(Date.now() - hours * 3_600_000);

const result = await prisma.documentRequirement.updateMany({
  where: { workspaceType, workspaceId },
  data: { createdAt },
});
console.log(JSON.stringify({ updated: result.count, createdAt: createdAt.toISOString() }));
await prisma.$disconnect();
