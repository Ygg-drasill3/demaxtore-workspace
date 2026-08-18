/**
 * One-off: restore missing Olive Oil + Peanut Butter line items on RFQ-2026-0231.
 * Run: npx tsx prisma/fix-rfq-2026-0231-lines.ts
 */
import { PrismaClient } from "@prisma/client";
import { parseLineItems } from "../src/modules/integrations/catalog-rfq-ingest.service.js";

const prisma = new PrismaClient();

async function main() {
  const ws = await prisma.workspace.findFirst({
    where: { externalRef: "RFQ-2026-0231" },
    include: { rfqDetails: true, rfqLineItems: { orderBy: { position: "asc" } } },
  });
  if (!ws?.rfqDetails) throw new Error("RFQ-2026-0231 not found");

  const expected = parseLineItems(
    ws.rfqDetails.productDescription,
    ws.rfqDetails.productCategory,
  );
  if (expected.length <= 1) {
    console.log("Nothing to fix — parsed", expected.length, "line item(s)");
    return;
  }

  const existing = new Set(ws.rfqLineItems.map((li) => li.description.trim().toLowerCase()));
  const missing = expected.filter((li) => !existing.has(li.description.trim().toLowerCase()));
  if (!missing.length) {
    console.log("All", expected.length, "line items already present");
    return;
  }

  let position = ws.rfqLineItems.length;
  await prisma.$transaction(async (tx) => {
    for (const li of missing) {
      position += 1;
      await tx.rfqLineItem.create({
        data: {
          workspaceId: ws.id,
          position,
          description: li.description,
          quantity: li.quantity,
          uom: li.uom,
          notes: li.notes ?? null,
        },
      });
    }
  });

  console.log(
    "Added",
    missing.length,
    "line item(s) to RFQ-2026-0231:",
    missing.map((m) => m.description).join(", "),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
