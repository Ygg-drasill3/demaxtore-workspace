/**
 * One-off: spawn a shipment for buyer1@acme.test order ORD-RFQ-2026-0234-acme-test
 * Run: cd apps/backend && npx tsx prisma/seed-buyer1-shipment.ts
 */
import { PrismaClient } from "@prisma/client";
import { spawnShipmentFromOrder } from "../src/modules/shipment/shipment.spawn.js";

const prisma = new PrismaClient();
const ORDER_ID = "a6bd19e7-7e65-4b58-b8a4-6f803084410d";
const BUYER_ID = "cc519972-e2a3-4daf-b838-32e0641a6c7c";

async function main() {
  const order = await prisma.workspace.findUniqueOrThrow({
    where: { id: ORDER_ID },
    include: { orderWorkspace: true },
  });
  const ow = order.orderWorkspace!;

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);

    const spawned = await spawnShipmentFromOrder(tx, {
      orderWorkspaceId: order.id,
      orderExternalRef: order.externalRef,
      contractRef: ow.contractRef,
      poRef: ow.contractRef,
      currency: order.currency ?? "USD",
      buyerUserId: ow.buyerUserId,
      supplierUserId: ow.supplierUserId,
      originPort: ow.originPort ?? "CNSHA",
      destinationPort: ow.destinationPort ?? "NLRTM",
      actorUserId: BUYER_ID,
    });

    await tx.workspace.update({
      where: { id: spawned.shipmentWorkspaceId },
      data: { state: "IN_TRANSIT" },
    });

    await tx.shipmentWorkspace.update({
      where: { workspaceId: spawned.shipmentWorkspaceId },
      data: {
        carrierName: "Maersk",
        vesselName: "MAERSK ACME",
        voyageNumber: "V-ACME-001",
        bookingRef: "BK-ACME-0234",
        containerNumber: "MSCU1234567",
        bookingConfirmedAt: new Date(Date.now() - 5 * 86_400_000),
        loadedAt: new Date(Date.now() - 3 * 86_400_000),
        departedAt: new Date(Date.now() - 2 * 86_400_000),
        trackingLinkedAt: new Date(),
        lastTrackingSyncAt: new Date(),
      },
    });

    await tx.shipmentTrackingSnapshot.create({
      data: {
        shipmentId: spawned.shipmentWorkspaceId,
        provider: "manual",
        vesselName: "MAERSK ACME",
        carrier: "Maersk",
        pol: ow.originPort ?? "CNSHA",
        pod: ow.destinationPort ?? "NLRTM",
        etd: new Date(Date.now() - 2 * 86_400_000),
        eta: new Date(Date.now() + 12 * 86_400_000),
        trackingStatus: "IN_TRANSIT",
        delayFlag: "ON_TIME",
        syncedAt: new Date(),
      },
    });

    return spawned;
  });

  console.log(`Shipment: ${result.externalRef}`);
  console.log(`Workspace ID: ${result.shipmentWorkspaceId}`);
  console.log(`Buyer: buyer1@acme.test`);
  console.log(`URL: /workspace/shipment/${result.shipmentWorkspaceId}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
