/**
 * One-off: split RFQ-2026-0001 into per-product line items and link Heni quote to BAR SOAP.
 * Run: npx tsx prisma/split-rfq-2026-0001-lines.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCTS = [
  "SHAMPOO 300ml bottles with tropical and exotic fragrances (5 products ranges). All bottles must be the same size and identical in design.",
  "BAR SOAP 125g — Five product ranges.",
  "LAUNDRY DETERGENT 3L — Three product ranges; green colored detergent is mandatory.",
  "A4 PAPER REAM 500 sheets",
  "LAUNDRY DETERGENT 200L green color.",
];

async function main() {
  const ws = await prisma.workspace.findFirst({
    where: { externalRef: "RFQ-2026-0001" },
    include: {
      rfqLineItems: true,
      quotations: { include: { lineItems: true }, where: { withdrawnAt: null } },
    },
  });
  if (!ws) throw new Error("RFQ-2026-0001 not found");
  if (ws.rfqLineItems.length > 1) {
    console.log("Already split —", ws.rfqLineItems.length, "line items");
    return;
  }

  const oldLineId = ws.rfqLineItems[0]?.id;
  const heniLine = ws.quotations[0]?.lineItems[0];

  await prisma.$transaction(async (tx) => {
    if (oldLineId) {
      await tx.rfqLineItem.delete({ where: { id: oldLineId } });
    }

    const created = [];
    for (let i = 0; i < PRODUCTS.length; i++) {
      const row = await tx.rfqLineItem.create({
        data: {
          workspaceId: ws.id,
          position: i + 1,
          description: PRODUCTS[i]!,
          quantity: 1,
          uom: "container",
        },
      });
      created.push(row);
    }

    const soapLine = created[1];
    if (heniLine && soapLine) {
      await tx.quotationLineItem.update({
        where: { id: heniLine.id },
        data: {
          rfqLineItemId: soapLine.id,
          description: soapLine.description,
        },
      });
    }
  });

  console.log("Split RFQ-2026-0001 into", PRODUCTS.length, "product lines. Heni quote linked to BAR SOAP.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
