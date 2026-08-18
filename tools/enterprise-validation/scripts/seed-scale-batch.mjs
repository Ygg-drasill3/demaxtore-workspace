#!/usr/bin/env node
/**
 * Batch RFQ seed for Sprint 9B large-dataset validation.
 * Usage: SCALE_RFQS=10000 SCALE_BATCH=500 node tools/enterprise-validation/scripts/seed-scale-batch.mjs
 */
import { PrismaClient } from "@prisma/client";

const target = Number(process.env.SCALE_RFQS ?? 10_000);
const batch = Number(process.env.SCALE_BATCH ?? 500);
const db = new PrismaClient();

async function main() {
  const buyer = await db.user.findUnique({ where: { email: "buyer1@acme.test" } });
  if (!buyer) throw new Error("Run prisma seed first");

  const existing = await db.workspace.count({ where: { type: "RFQ" } });
  const need = Math.max(0, target - existing);
  console.log(`RFQs: ${existing} → target ${target}, creating ${need}`);
  if (need === 0) return;

  const t0 = Date.now();
  for (let offset = 0; offset < need; offset += batch) {
    const size = Math.min(batch, need - offset);
    await db.$transaction(
      Array.from({ length: size }, (_, i) => {
        const n = existing + offset + i;
        return db.workspace.create({
          data: {
            type: "RFQ",
            state: n % 7 === 0 ? "RFQ_OPEN" : n % 5 === 0 ? "RFQ_SUBMITTED" : "RFQ_DRAFT",
            externalRef: `SCALE9B-RFQ-${n}`,
            createdById: buyer.id,
            currency: "USD",
            rfqDetails: {
              create: {
                title: `Scale9B RFQ ${n}`,
                productCategory: "Flour",
                productDescription: "Sprint 9B validation fixture",
                targetMarket: "UAE",
                incoterm: "FOB",
              },
            },
          },
        });
      }),
    );
    console.log(`  ${offset + size} / ${need}`);
  }
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
