import { PrismaClient } from "@prisma/client";
import { FreightIqService } from "../src/modules/freightiq/freightiq.service.js";
import { FreightCommunicationsService } from "../src/modules/freightiq/freight-communications.service.js";

const prisma = new PrismaClient();
const freightIq = new FreightIqService(prisma);
const freightComms = new FreightCommunicationsService(prisma);

const ADMIN = {
  id: "b98d6549-df2d-4d0d-882a-3b1f2f184ea6",
  email: "admin@demaxtore.local",
  role: "ADMIN" as const,
};

async function main() {
  const rfq = await prisma.workspace.findUniqueOrThrow({
    where: { externalRef: "RFQ-2026-0239" },
    include: { spawnedChildWorkspaces: true }
  });

  const orderWorkspace = rfq.spawnedChildWorkspaces.find(w => w.type === "ORDER");
  if (!orderWorkspace) {
    throw new Error("No spawned order workspace found for RFQ-2026-0239");
  }

  const orderId = orderWorkspace.id;
  console.log(`Target Order ID: ${orderId}`);

  // 1. Ensure Freight Request exists
  let request = await prisma.freightRequest.findFirst({ where: { orderId } });
  if (!request) {
    console.log("Creating freight request...");
    await freightIq.applyFreightAction(orderId, "create_request", ADMIN, {
      mode: "OCEAN_FCL",
      pol: "TRMER",
      pod: "QAHMD",
      cargoDescription: "Pasta — Rawabi Food International (RFQ clone)",
      containerType: "40HC",
    });
    request = await prisma.freightRequest.findFirstOrThrow({ where: { orderId } });
  }

  // 2. Clear any existing offers/communications if we want to ensure exactly 5 random offers
  console.log("Clearing existing offers and communications for this request...");
  await prisma.freightOffer.deleteMany({ where: { freightRequestId: request.id } });
  await prisma.forwarderCommunication.deleteMany({ where: { freightRequestId: request.id } });

  // 3. Find active forwarders
  const forwarders = await prisma.forwarderContact.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  if (forwarders.length === 0) {
    throw new Error("No active forwarders found in the database");
  }
  console.log(`Found ${forwarders.length} active forwarders.`);

  const carriers = ["Maersk", "MSC", "CMA CGM", "Hapag-Lloyd", "ONE", "Evergreen", "COSCO"];
  const vessels = ["MAERSK HAMAD", "MSC RAWABI", "CMA TURKEY", "HAPAG HAMBURG", "ONE TOKYO", "EVER GREEN", "COSCO ASIA"];

  const validUntil = new Date(Date.now() + 21 * 86_400_000).toISOString();
  const etd = new Date(Date.now() + 14 * 86_400_000).toISOString();
  const eta = new Date(Date.now() + 40 * 86_400_000).toISOString();
  const cutOff = new Date(Date.now() + 10 * 86_400_000).toISOString();

  // 4. Generate 5 random offers
  console.log("Inserting 5 random freight offers...");
  for (let i = 0; i < 5; i++) {
    const forwarder = forwarders[i % forwarders.length];
    const carrier = carriers[i % carriers.length];
    const vessel = vessels[i % vessels.length];
    const transit = 20 + Math.floor(Math.random() * 15); // 20 to 34 days
    const freight = 1500 + Math.floor(Math.random() * 1000); // 1500 to 2490 USD

    console.log(`Intaking offer ${i + 1}: ${forwarder.name} via ${carrier} (${vessel}) - $${freight}, Transit: ${transit} days`);

    await freightComms.intakeOffer(orderId, ADMIN, {
      forwarderContactId: forwarder.id,
      offerSource: "MANUAL_ENTRY",
      carrierName: carrier,
      vesselName: vessel,
      etd,
      eta,
      transitDays: transit,
      cutOff,
      oceanFreight: freight,
      currency: "USD",
      validUntil,
    });
  }

  const finalOffersCount = await prisma.freightOffer.count({
    where: { freightRequestId: request.id }
  });
  console.log(`\n✅ Success! Total offers now: ${finalOffersCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
