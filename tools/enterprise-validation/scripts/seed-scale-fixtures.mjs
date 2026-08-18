#!/usr/bin/env node
/**
 * Optional staging seed — creates minimal RFQ workspaces for load validation.
 * Does NOT modify application code or FSM rules.
 * Usage: SCALE_RFQS=5000 node scripts/seed-scale-fixtures.mjs
 */
import { PrismaClient } from "@prisma/client";

const target = Number(process.env.SCALE_RFQS ?? 1000);
const batch = Number(process.env.SCALE_BATCH ?? 200);
const db = new PrismaClient();

async function main() {
  const buyer = await db.user.findUnique({ where: { email: "buyer1@acme.test" } });
  if (!buyer) throw new Error("Run prisma seed first (buyer1@acme.test missing)");

  const existing = await db.workspace.count({ where: { type: "RFQ" } });
  const need = Math.max(0, target - existing);
  console.log(`RFQs in DB: ${existing}, target: ${target}, creating: ${need}`);
  if (need === 0) return;

  for (let offset = 0; offset < need; offset += batch) {
    const size = Math.min(batch, need - offset);
    for (let i = 0; i < size; i++) {
      const n = existing + offset + i;
      await db.workspace.create({
        data: {
          type: "RFQ",
          state: n % 5 === 0 ? "OPEN" : "DRAFT",
          externalRef: `SCALE-RFQ-${Date.now()}-${n}`,
          createdById: buyer.id,
          currency: "USD",
          rfqDetails: {
            create: {
              title: `Scale test RFQ ${n}`,
              productCategory: "Flour",
              productDescription: "Validation fixture",
              targetMarket: "UAE",
              incoterm: "FOB",
            },
          },
        },
      });
    }
    console.log(`  created ${offset + size} / ${need}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
