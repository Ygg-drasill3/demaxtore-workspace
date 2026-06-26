import { PrismaClient } from "@prisma/client";
import { OrderService } from "../src/modules/order/order.service.ts";

const prisma = new PrismaClient();
const s = new OrderService(prisma);

async function main() {
  const u = await prisma.user.findUniqueOrThrow({ where: { email: "supplier1@acme-mfg.test" } });
  const ws = await prisma.workspace.findFirst({
    where: { type: "ORDER", state: "PRODUCTION_STARTED" },
    orderBy: { createdAt: "desc" },
  });
  if (!ws) { console.log("no ws"); return; }
  console.log("ws", ws.id);
  try {
    const r = await s.applyTransition({
      workspaceId: ws.id,
      action: "report_production_progress",
      actor: { id: u.id, email: u.email, role: "SUPPLIER" },
      payload: { label: "X", percentage: 50 },
    });
    console.log("ok", r);
  } catch (e) {
    console.error("fail", e);
  }
  await prisma.$disconnect();
}

main();
