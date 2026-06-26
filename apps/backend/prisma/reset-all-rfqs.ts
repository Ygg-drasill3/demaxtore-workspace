/**
 * Delete ALL RFQ workspaces and their spawned orders/shipments.
 * Run: npx tsx prisma/reset-all-rfqs.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function collectSpawnTree(rootIds: string[]): Promise<string[]> {
  const all = new Set(rootIds);
  let frontier = [...rootIds];
  while (frontier.length > 0) {
    const children = await prisma.workspace.findMany({
      where: { spawnedFromId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((c) => c.id).filter((id) => !all.has(id));
    for (const id of frontier) all.add(id);
  }
  return [...all];
}

async function deleteWorkspaceIds(ids: string[]) {
  if (ids.length === 0) return 0;

  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: ids } },
    select: { id: true, type: true },
  });
  const orderIds = workspaces.filter((w) => w.type === "ORDER").map((w) => w.id);

  await prisma.tradeDocument.deleteMany({ where: { workspaceId: { in: ids } } });
  await prisma.documentRequirement.deleteMany({ where: { workspaceId: { in: ids } } });
  await prisma.controlTowerAlert.deleteMany({ where: { workspaceId: { in: ids } } });
  await prisma.tradeException.deleteMany({ where: { workspaceId: { in: ids } } });

  if (orderIds.length > 0) {
    await prisma.purchaseOrder.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.paymentPlan.deleteMany({ where: { orderId: { in: orderIds } } });
  }

  const rfqIds = workspaces.filter((w) => w.type === "RFQ").map((w) => w.id);
  await prisma.directConversation.deleteMany({
    where: {
      OR: [
        { workspaceRfqId: { in: [...rfqIds, ...ids] } },
        { contextWorkspaceId: { in: ids } },
      ],
    },
  });

  const deleted = await prisma.workspace.deleteMany({ where: { id: { in: ids } } });
  return deleted.count;
}

async function deleteTreeBottomUp(allIds: string[]) {
  const remaining = new Set(allIds);
  let total = 0;

  while (remaining.size > 0) {
    const rem = [...remaining];
    const childRows = await prisma.workspace.findMany({
      where: { spawnedFromId: { in: rem } },
      select: { spawnedFromId: true },
    });
    const hasChild = new Set(
      childRows.map((c) => c.spawnedFromId).filter((id): id is string => id != null && remaining.has(id)),
    );
    const leaves = rem.filter((id) => !hasChild.has(id));
    if (leaves.length === 0) {
      throw new Error("Could not resolve workspace tree — possible cycle in spawnedFromId");
    }
    total += await deleteWorkspaceIds(leaves);
    for (const id of leaves) remaining.delete(id);
  }

  return total;
}

async function main() {
  const rfqs = await prisma.workspace.findMany({
    where: { type: "RFQ" },
    select: { id: true, externalRef: true },
    orderBy: { createdAt: "asc" },
  });

  if (rfqs.length === 0) {
    console.log("No RFQ workspaces found.");
    return;
  }

  console.log(`Found ${rfqs.length} RFQ(s):`);
  for (const r of rfqs) console.log(`  · ${r.externalRef} (${r.id})`);

  const treeIds = await collectSpawnTree(rfqs.map((r) => r.id));
  const childCount = treeIds.length - rfqs.length;
  console.log(`Including ${childCount} spawned order/shipment workspace(s) — ${treeIds.length} total.`);

  const deleted = await deleteTreeBottomUp(treeIds);
  console.log(`✅ Deleted ${deleted} workspace(s).`);
}

main()
  .catch((e) => {
    console.error("❌ RFQ reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
