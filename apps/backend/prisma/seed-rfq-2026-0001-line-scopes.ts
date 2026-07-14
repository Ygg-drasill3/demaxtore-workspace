/**
 * Seed per-supplier product scopes for RFQ-2026-0001.
 * Run: npx tsx prisma/seed-rfq-2026-0001-line-scopes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isPaperCompany(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("kağıt") || n.includes("kagit") || n.includes("paper") || n.includes("mopak");
}

async function main() {
  const ws = await prisma.workspace.findFirst({
    where: { externalRef: "RFQ-2026-0001" },
    include: {
      rfqLineItems: { orderBy: { position: "asc" } },
      supplierAssignments: { where: { removedAt: null } },
    },
  });
  if (!ws) throw new Error("RFQ-2026-0001 not found");

  const byPos = new Map(ws.rfqLineItems.map((l) => [l.position, l.id]));
  const paperId = byPos.get(4);
  const soapId = byPos.get(2);
  const personalCareIds = [1, 2, 3, 5].map((p) => byPos.get(p)).filter(Boolean) as string[];

  if (!paperId || !soapId) throw new Error("Expected product lines missing");

  const users = await prisma.user.findMany({
    where: { id: { in: ws.supplierAssignments.map((a) => a.supplierUserId) } },
    include: { organisation: true },
  });

  await prisma.supplierLineScope.deleteMany({ where: { workspaceId: ws.id } });

  const rows: { workspaceId: string; supplierUserId: string; rfqLineItemId: string }[] = [];

  for (const u of users) {
    const label = u.organisation?.name ?? u.displayName ?? "";
    let lineIds: string[];
    if (label.includes("Heni")) {
      lineIds = [byPos.get(1)!];
    } else if (isPaperCompany(label)) {
      lineIds = [paperId];
    } else {
      lineIds = personalCareIds;
    }
    for (const rfqLineItemId of lineIds) {
      rows.push({ workspaceId: ws.id, supplierUserId: u.id, rfqLineItemId });
    }
  }

  await prisma.supplierLineScope.createMany({ data: rows });
  console.log(`Seeded ${rows.length} supplier line scopes for RFQ-2026-0001`);
  for (const u of users) {
    const scoped = rows.filter((r) => r.supplierUserId === u.id).length;
    console.log(" -", u.organisation?.name ?? u.displayName, "→", scoped, "product(s)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
