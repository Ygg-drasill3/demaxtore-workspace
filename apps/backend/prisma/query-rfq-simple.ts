import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rfq = await prisma.workspace.findUnique({
    where: { externalRef: "RFQ-2026-0239" },
    include: { spawnedChildWorkspaces: true }
  });
  console.log("RFQ ID:", rfq?.id);
  console.log("RFQ State:", rfq?.state);
  
  if (rfq) {
    for (const child of rfq.spawnedChildWorkspaces) {
      console.log("Spawned Workspace:", child.id, "Type:", child.type, "State:", child.state, "ExternalRef:", child.externalRef);
      const freightRequest = await prisma.freightRequest.findFirst({
        where: { orderId: child.id },
        include: {
          offers: true,
          communications: true,
        }
      });
      console.log("Freight Request:", freightRequest ? {
        id: freightRequest.id,
        status: freightRequest.status,
        pol: freightRequest.pol,
        pod: freightRequest.pod,
        offersCount: freightRequest.offers.length,
        commsCount: freightRequest.communications.length
      } : "None");
    }
  }
}

main().finally(() => prisma.$disconnect());
