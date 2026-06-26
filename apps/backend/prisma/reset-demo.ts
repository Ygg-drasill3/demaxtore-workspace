/**
 * Remove customer demo workspaces (DEMO-* refs). Keeps demo accounts intact.
 * Run: yarn demo:reset
 */
import { PrismaClient } from "@prisma/client";
import { DEMO_EMAILS } from "./demo-ids.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Resetting customer demo workspaces…");

  const demoWorkspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { externalRef: { startsWith: "DEMO-" } },
        { externalRef: { startsWith: "ORD-DEMO-" } },
        { externalRef: { startsWith: "SHP-ORD-DEMO-" } },
      ],
    },
    select: { id: true, externalRef: true },
  });

  const ids = demoWorkspaces.map((w) => w.id);
  if (ids.length === 0) {
    console.log("  · no demo workspaces found — nothing to reset");
    return;
  }

  await prisma.controlTowerAlert.deleteMany({ where: { workspaceId: { in: ids } } });
  await prisma.tradeException.deleteMany({ where: { workspaceId: { in: ids } } });

  const deleted = await prisma.workspace.deleteMany({ where: { id: { in: ids } } });

  console.log("  · removed", deleted.count, "workspaces:", demoWorkspaces.map((w) => w.externalRef).join(", "));
  console.log("  · demo accounts preserved:", Object.values(DEMO_EMAILS).join(", "));
  console.log("✅ Demo reset complete — run yarn demo:seed to recreate scenario data");
}

main()
  .catch((e) => {
    console.error("❌ Demo reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
