#!/usr/bin/env node
/** E2E helper: backdate freight_requests.created_at by N hours for order workspace. */
import { PrismaClient } from "@prisma/client";

const [orderId, hoursStr] = process.argv.slice(2);
if (!orderId || !hoursStr) {
  console.error("Usage: e2e-age-freight-request.mjs <orderId> <hours>");
  process.exit(1);
}

const hours = Number(hoursStr);
const prisma = new PrismaClient();
const createdAt = new Date(Date.now() - hours * 3_600_000);

const fr = await prisma.freightRequest.findFirst({
  where: { orderId },
  orderBy: { createdAt: "desc" },
});
if (!fr) {
  console.error("No freight request for order", orderId);
  process.exit(1);
}

await prisma.freightRequest.update({
  where: { id: fr.id },
  data: { createdAt },
});
console.log(JSON.stringify({ freightRequestId: fr.id, createdAt: createdAt.toISOString() }));
await prisma.$disconnect();
