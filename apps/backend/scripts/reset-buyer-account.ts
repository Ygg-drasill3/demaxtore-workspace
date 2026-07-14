/**
 * Reset a single buyer account to fresh state (workspaces, notifications, onboarding).
 * Run: npx tsx scripts/reset-buyer-account.ts [email]
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEST_PASSWORD, TEST_USER_EMAILS } from "../src/test/fixture-users.js";

const EMAIL = process.argv[2] ?? TEST_USER_EMAILS.buyer1;
const ORG_ACME = "00000000-0000-0000-0000-00000000c002";

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
  const rfqIds = workspaces.filter((w) => w.type === "RFQ").map((w) => w.id);

  // MC/BC offer lines block container_line cascade — remove first.
  await prisma.mcOfferLine.deleteMany({
    where: { containerLine: { workspaceId: { in: ids } } },
  });
  await prisma.bcOfferLine.deleteMany({
    where: { line: { workspaceId: { in: ids } } },
  });

  await prisma.tradeDocument.deleteMany({ where: { workspaceId: { in: ids } } });
  await prisma.documentRequirement.deleteMany({ where: { workspaceId: { in: ids } } });
  await prisma.controlTowerAlert.deleteMany({ where: { workspaceId: { in: ids } } });
  await prisma.tradeException.deleteMany({ where: { workspaceId: { in: ids } } });

  if (orderIds.length > 0) {
    await prisma.purchaseOrder.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.paymentPlan.deleteMany({ where: { orderId: { in: orderIds } } });
  }

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
      throw new Error("Workspace tree cycle detected");
    }
    total += await deleteWorkspaceIds(leaves);
    for (const id of leaves) remaining.delete(id);
  }

  return total;
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    throw new Error(`User not found: ${EMAIL}`);
  }
  if (user.role !== "BUYER") {
    throw new Error(`Refusing to reset non-buyer account: ${EMAIL} (${user.role})`);
  }

  console.log(`🧹 Resetting buyer account: ${EMAIL} (${user.id})`);

  const ROOT_TYPES = ["RFQ", "COMMODITYBID", "MIXED_CONTAINER", "BULK_CONTAINER"] as const;

  const roots = await prisma.workspace.findMany({
    where: { createdById: user.id, type: { in: [...ROOT_TYPES] } },
    select: { id: true, externalRef: true, type: true },
    orderBy: { createdAt: "asc" },
  });

  if (roots.length > 0) {
    console.log(`  · ${roots.length} root workspace(s):`);
    for (const r of roots) console.log(`    - ${r.externalRef} (${r.type})`);
    const treeIds = await collectSpawnTree(roots.map((r) => r.id));
    const deleted = await deleteTreeBottomUp(treeIds);
    console.log(`  · deleted ${deleted} workspace(s) (incl. spawned orders/shipments)`);
  } else {
    console.log("  · no workspaces created by this buyer");
  }

  const conv = await prisma.directConversation.deleteMany({ where: { buyerUserId: user.id } });
  console.log(`  · removed ${conv.count} direct conversation(s)`);

  const notif = await prisma.notification.deleteMany({ where: { userId: user.id } });
  console.log(`  · removed ${notif.count} notification(s)`);

  const tokens = await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  console.log(`  · revoked ${tokens.count} refresh token(s)`);

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.idempotencyKey.deleteMany({ where: { userId: user.id } });
  await prisma.telemetryEvent.deleteMany({ where: { userId: user.id } });

  await prisma.userOnboardingProgress.deleteMany({ where: { userId: user.id } });

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await prisma.organisation.upsert({
    where: { id: ORG_ACME },
    update: { name: "Acme Foods", kind: "BUYER_ORG" },
    create: { id: ORG_ACME, name: "Acme Foods", kind: "BUYER_ORG" },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName: "Buyer One Acme",
      role: "BUYER",
      passwordHash,
      organisationId: ORG_ACME,
      avatarUrl: null,
      googleId: null,
      whatsappPhone: null,
    },
  });

  console.log("\n✅ Buyer account reset complete.");
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${TEST_PASSWORD}`);
  console.log("   State:    fresh buyer (no workspaces, onboarding, or notifications)");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
