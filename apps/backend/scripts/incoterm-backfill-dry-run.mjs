#!/usr/bin/env node
/**
 * Read-only incoterm backfill report (null incoterm → FOB default at runtime).
 * Usage: npx tsx apps/backend/scripts/incoterm-backfill-dry-run.mjs
 */
import { PrismaClient } from "@prisma/client";
import { resolveIncotermProfile } from "@dmx/contracts/incoterms";

const prisma = new PrismaClient();

const rows = await prisma.orderWorkspace.findMany({
  where: { OR: [{ incoterms: null }, { incoterms: "" }] },
  select: {
    workspaceId: true,
    incoterms: true,
    workspace: { select: { externalRef: true, state: true } },
  },
  take: 5000,
});

const report = {
  generatedAt: new Date().toISOString(),
  mode: "dry-run",
  nullIncotermCount: rows.length,
  runtimeDefault: "FOB",
  rows: rows.map((r) => ({
    orderId: r.workspaceId,
    orderRef: r.workspace.externalRef,
    orderState: r.workspace.state,
    currentIncoterm: r.incoterms,
    resolvedProfile: resolveIncotermProfile(r.incoterms).code,
    optionalBackfill: "UPDATE order_workspace SET incoterms = 'FOB' WHERE workspace_id = ...",
  })),
};

console.log(JSON.stringify(report, null, 2));
await prisma.$disconnect();
