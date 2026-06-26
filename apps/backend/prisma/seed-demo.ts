/**
 * Customer demo seed — ABC Foods Germany sourcing scenario.
 * Idempotent: safe to re-run (upserts on email / externalRef / fixed UUIDs).
 *
 * Run: yarn demo:seed  (requires base prisma seed for catalog + admin)
 */
import {
  PrismaClient,
  Role,
  WorkspaceType,
  ParticipantRole,
  QuotationStatus,
  SupplierStage,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { AlertEngine } from "../src/modules/control-tower/alert-engine.js";
import { spawnOrderWorkspace } from "../src/modules/order/order.spawn.js";
import { createPurchaseOrderOnOrderSpawn } from "../src/modules/purchase-order/purchase-order.spawn.js";
import { spawnShipmentFromOrder } from "../src/modules/shipment/shipment.spawn.js";
import { upsertControlTowerAlert } from "../src/modules/tracking/tracking-alerts.js";
import { AlertKey } from "@dmx/contracts/control-tower";
import { DEMO_EMAILS, DEMO_IDS, DEMO_PASSWORD, DEMO_REFS } from "./demo-ids.js";

const prisma = new PrismaClient();

async function withFsm<T>(fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
    return fn(tx);
  });
}

async function ensureState(workspaceId: string, state: string): Promise<void> {
  await withFsm(async (tx) => {
    await tx.workspace.update({ where: { id: workspaceId }, data: { state } });
  });
}

async function seedAccounts(passwordHash: string) {
  const buyerOrg = await prisma.organisation.upsert({
    where: { id: DEMO_IDS.orgBuyer },
    update: { name: "ABC Foods Germany" },
    create: { id: DEMO_IDS.orgBuyer, name: "ABC Foods Germany", kind: "BUYER_ORG" },
  });

  const suppliers = [
    { id: DEMO_IDS.orgPasta, name: "Alpine Pasta Works", loc: "Milan, IT", userId: DEMO_IDS.userPasta, email: DEMO_EMAILS.pasta, display: "Alpine Pasta Sales" },
    { id: DEMO_IDS.orgTomato, name: "Mediterranean Tomato Co.", loc: "Bursa, TR", userId: DEMO_IDS.userTomato, email: DEMO_EMAILS.tomato, display: "Med Tomato Export" },
    { id: DEMO_IDS.orgFlour, name: "Anatolian Flour Mills", loc: "Konya, TR", userId: DEMO_IDS.userFlour, email: DEMO_EMAILS.flour, display: "Anatolian Flour Desk" },
    { id: DEMO_IDS.orgJuice, name: "Nordic Juice Partners", loc: "Hamburg, DE", userId: DEMO_IDS.userJuice, email: DEMO_EMAILS.juice, display: "Nordic Juice Sales" },
  ] as const;

  const buyer = await prisma.user.upsert({
    where: { email: DEMO_EMAILS.buyer },
    update: { displayName: "Anna Becker — ABC Foods", organisationId: buyerOrg.id },
    create: {
      id: DEMO_IDS.userBuyer,
      email: DEMO_EMAILS.buyer,
      passwordHash,
      displayName: "Anna Becker — ABC Foods",
      role: Role.BUYER,
      organisationId: buyerOrg.id,
    },
  });

  const supplierUsers = [];
  for (const s of suppliers) {
    await prisma.organisation.upsert({
      where: { id: s.id },
      update: { name: s.name, location: s.loc },
      create: {
        id: s.id,
        name: s.name,
        kind: "SUPPLIER_ORG",
        location: s.loc,
        verifiedSince: new Date("2024-06-01"),
        pastPoCount: 5,
      },
    });
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: { displayName: s.display, organisationId: s.id },
      create: {
        id: s.userId,
        email: s.email,
        passwordHash,
        displayName: s.display,
        role: Role.SUPPLIER,
        organisationId: s.id,
      },
    });
    supplierUsers.push(u);
  }

  return { buyer, supplierUsers, admin: await prisma.user.findUniqueOrThrow({ where: { email: "admin@demaxtore.local" } }) };
}

async function seedRfqOpen(
  buyerId: string,
  adminId: string,
  supplierIds: string[],
) {
  const rfq = await prisma.workspace.upsert({
    where: { externalRef: DEMO_REFS.rfqOpen },
    update: { createdById: buyerId },
    create: {
      id: DEMO_IDS.wsRfqOpen,
      externalRef: DEMO_REFS.rfqOpen,
      type: WorkspaceType.RFQ,
      state: "RFQ_OPEN",
      currency: "EUR",
      createdById: buyerId,
      deadlineAt: new Date(Date.now() + 12 * 86400_000),
      rfqDetails: {
        create: {
          title: "Q2 pantry restock — pasta, tomato paste, flour & juice",
          productCategory: "FMCG",
          productDescription: "Retail-grade assortment for ABC Foods Germany distribution centres.",
          targetMarket: "Germany, Austria",
          incoterm: "FOB",
        },
      },
      participants: {
        create: [
          { userId: buyerId, participantRole: ParticipantRole.OWNER },
          { userId: adminId, participantRole: ParticipantRole.OPERATOR },
          ...supplierIds.map((id) => ({ userId: id, participantRole: ParticipantRole.COUNTERPARTY })),
        ],
      },
    },
  });
  await ensureState(rfq.id, "RFQ_OPEN");

  const lineItems = [
    { position: 1, description: "Durum wheat pasta — penne 500g retail packs", quantity: 12000, uom: "PCS", targetPrice: 0.82 },
    { position: 2, description: "Tomato paste 28–30° Brix — 400g tins", quantity: 24000, uom: "PCS", targetPrice: 0.65 },
    { position: 3, description: "Type 00 wheat flour — 25 kg bags", quantity: 800, uom: "BAG", targetPrice: 18.5 },
    { position: 4, description: "Multivitamin fruit juice 1L tetra", quantity: 18000, uom: "PCS", targetPrice: 0.95 },
  ];
  for (const li of lineItems) {
    await prisma.rfqLineItem.upsert({
      where: { workspaceId_position: { workspaceId: rfq.id, position: li.position } },
      create: { workspaceId: rfq.id, ...li },
      update: { description: li.description, quantity: li.quantity, uom: li.uom, targetPrice: li.targetPrice },
    });
  }

  const quotes = [
    { supplierUserId: supplierIds[0], total: 9840, leadTimeDays: 28 },
    { supplierUserId: supplierIds[1], total: 15120, leadTimeDays: 21 },
    { supplierUserId: supplierIds[2], total: 14800, leadTimeDays: 18 },
  ];
  for (const q of quotes) {
    const existing = await prisma.quotation.findFirst({
      where: { workspaceId: rfq.id, supplierUserId: q.supplierUserId },
    });
    if (!existing) {
      await prisma.quotation.create({
        data: {
          workspaceId: rfq.id,
          supplierUserId: q.supplierUserId,
          total: q.total,
          currency: "EUR",
          leadTimeDays: q.leadTimeDays,
          incoterm: "FOB",
          status: QuotationStatus.SUBMITTED,
        },
      });
    }
    await prisma.supplierActivityLog.upsert({
      where: { workspaceId_supplierUserId: { workspaceId: rfq.id, supplierUserId: q.supplierUserId } },
      create: { workspaceId: rfq.id, supplierUserId: q.supplierUserId, stage: SupplierStage.QUOTED },
      update: { stage: SupplierStage.QUOTED },
    });
  }
  await prisma.supplierActivityLog.upsert({
    where: { workspaceId_supplierUserId: { workspaceId: rfq.id, supplierUserId: supplierIds[3] } },
    create: { workspaceId: rfq.id, supplierUserId: supplierIds[3], stage: SupplierStage.VIEWED },
    update: { stage: SupplierStage.VIEWED },
  });

  return rfq;
}

async function seedRfqPoChain(
  buyerId: string,
  adminId: string,
  pastaSupplierId: string,
  allSupplierIds: string[],
) {
  const rfq = await prisma.workspace.upsert({
    where: { externalRef: DEMO_REFS.rfqPo },
    update: { createdById: buyerId },
    create: {
      id: DEMO_IDS.wsRfqPo,
      externalRef: DEMO_REFS.rfqPo,
      type: WorkspaceType.RFQ,
      state: "PO_ISSUED",
      currency: "EUR",
      createdById: buyerId,
      rfqDetails: {
        create: {
          title: "Awarded pasta programme — ABC Foods Q2",
          productCategory: "Pasta",
          productDescription: "Penne & spaghetti retail packs for DE retail banners.",
          targetMarket: "Germany",
          incoterm: "FOB",
          selectedSupplierUserId: pastaSupplierId,
        },
      },
      participants: {
        create: [
          { userId: buyerId, participantRole: ParticipantRole.OWNER },
          { userId: adminId, participantRole: ParticipantRole.OPERATOR },
          { userId: pastaSupplierId, participantRole: ParticipantRole.COUNTERPARTY },
          ...allSupplierIds.filter((id) => id !== pastaSupplierId).map((id) => ({
            userId: id,
            participantRole: ParticipantRole.COUNTERPARTY,
          })),
        ],
      },
    },
  });

  await ensureState(rfq.id, "PO_ISSUED");

  const issuedAt = new Date(Date.now() - 4 * 86400_000);

  await withFsm(async (tx) => {
    const { orderWorkspaceId, externalRef: orderRef } = await spawnOrderWorkspace(tx, {
      parentWorkspaceId: rfq.id,
      parentType: "RFQ",
      parentExternalRef: DEMO_REFS.rfqPo,
      buyerUserId: buyerId,
      supplierUserId: pastaSupplierId,
      contractRef: DEMO_REFS.rfqPo,
      currency: "EUR",
      totalValue: 9840,
      incoterms: "FOB",
      originPort: "ITGOA",
      destinationPort: "DEHAM",
      actorUserId: buyerId,
      auditEvent: "order.created_from_rfq",
      orderRefSuffix: "00000000",
    });

    await tx.workspace.update({
      where: { id: orderWorkspaceId },
      data: { state: "FREIGHT_SELECTED" },
    });

    await tx.orderWorkspace.update({
      where: { workspaceId: orderWorkspaceId },
      data: {
        currentEta: new Date(Date.now() - 2 * 86400_000),
        originPort: "ITGOA",
        destinationPort: "DEHAM",
      },
    });

    const poId = await createPurchaseOrderOnOrderSpawn(tx, {
      orderId: orderWorkspaceId,
      poNumber: DEMO_REFS.poNumber,
      buyerId,
      supplierId: pastaSupplierId,
      currency: "EUR",
      incoterm: "FOB",
      paymentTerms: "Net 30",
      lines: [
        { description: "Durum wheat pasta — penne 500g", quantity: 12000, unitPrice: 0.82 },
      ],
      actorUserId: buyerId,
      actorEmail: DEMO_EMAILS.buyer,
      actorRole: "BUYER",
      issueReason: "ABC Foods Q2 pasta award",
    });

    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { issuedAt },
    });

    const { shipmentWorkspaceId } = await spawnShipmentFromOrder(tx, {
      orderWorkspaceId,
      orderExternalRef: DEMO_REFS.order,
      contractRef: DEMO_REFS.rfqPo,
      poRef: DEMO_REFS.poNumber,
      currency: "EUR",
      buyerUserId: buyerId,
      supplierUserId: pastaSupplierId,
      originPort: "ITGOA",
      destinationPort: "DEHAM",
      actorUserId: buyerId,
    });

    await tx.workspace.update({
      where: { id: shipmentWorkspaceId },
      data: { state: "IN_TRANSIT" },
    });
  });

  return rfq;
}

async function seedCommodityBid(
  buyerId: string,
  adminId: string,
  supplierIds: string[],
) {
  const past = new Date(Date.now() - 3 * 86400_000);
  const ended = new Date(Date.now() - 2 * 86400_000);

  const cb = await prisma.workspace.upsert({
    where: { externalRef: DEMO_REFS.cb },
    update: { createdById: buyerId },
    create: {
      id: DEMO_IDS.wsCb,
      externalRef: DEMO_REFS.cb,
      type: WorkspaceType.COMMODITYBID,
      state: "CLOSED",
      currency: "EUR",
      createdById: buyerId,
      commodityBidDetails: {
        create: {
          title: "Tomato paste 28–30° Brix — sealed bid lot",
          productCategory: "Tomato paste",
          description: "Single-lot reverse auction for 20 MT tomato paste, retail tins.",
          targetMarket: "Germany",
          auctionStartsAt: past,
          auctionEndsAt: ended,
          invitationDeadlineAt: new Date(past.getTime() - 86400_000),
          auctionDurationMinutes: 30,
          lowestBidAmount: 612,
          lowestBidSupplierId: supplierIds[1],
        },
      },
      participants: {
        create: [
          { userId: buyerId, participantRole: ParticipantRole.OWNER },
          { userId: adminId, participantRole: ParticipantRole.OPERATOR },
          ...supplierIds.map((id) => ({ userId: id, participantRole: ParticipantRole.COUNTERPARTY })),
        ],
      },
    },
  });
  await ensureState(cb.id, "CLOSED");

  const lot = await prisma.commodityBidLot.upsert({
    where: { workspaceId_lotNumber: { workspaceId: cb.id, lotNumber: 1 } },
    create: {
      id: DEMO_IDS.cbLot,
      workspaceId: cb.id,
      lotNumber: 1,
      commodity: "Tomato paste 28–30° Brix",
      quantity: 20,
      uom: "MT",
      incoterms: "FOB",
      deliveryWindow: "May 2026",
    },
    update: { commodity: "Tomato paste 28–30° Brix", quantity: 20 },
  });

  const codes = ["PST", "TMT", "FLR", "JUC"] as const;
  const bidPrices = [640, 612, 628, 655];
  let winnerSubmissionId: string | null = null;

  for (let i = 0; i < supplierIds.length; i++) {
    await prisma.commodityBidInvitation.upsert({
      where: { workspaceId_supplierUserId: { workspaceId: cb.id, supplierUserId: supplierIds[i] } },
      create: {
        workspaceId: cb.id,
        supplierUserId: supplierIds[i],
        bidderCode: codes[i],
        invitedById: buyerId,
        status: "JOINED",
        joinedAt: past,
      },
      update: { status: "JOINED", bidderCode: codes[i] },
    });

    const sub = await prisma.commodityBidSubmission.upsert({
      where: { lotId_supplierUserId: { lotId: lot.id, supplierUserId: supplierIds[i] } },
      create: {
        workspaceId: cb.id,
        lotId: lot.id,
        supplierUserId: supplierIds[i],
        unitPrice: bidPrices[i],
        currency: "EUR",
        leadTimeDays: 21,
        validUntil: new Date(Date.now() + 30 * 86400_000),
      },
      update: { unitPrice: bidPrices[i] },
    });
    if (i === 1) winnerSubmissionId = sub.id;
  }

  if (winnerSubmissionId) {
    await prisma.commodityBidDetails.update({
      where: { workspaceId: cb.id },
      data: { winnerSubmissionId, lowestBidAmount: 612, lowestBidSupplierId: supplierIds[1] },
    });
    const existingAward = await prisma.commodityBidAward.findFirst({
      where: { workspaceId: cb.id, lotId: lot.id },
    });
    if (!existingAward) {
      await prisma.commodityBidAward.create({
        data: {
          workspaceId: cb.id,
          lotId: lot.id,
          supplierUserId: supplierIds[1],
          submissionId: winnerSubmissionId,
          status: "PENDING_BUYER_APPROVAL",
          awardedAt: ended,
        },
      });
    }
  }

  return cb;
}

async function seedMixedContainer(buyerId: string, adminId: string) {
  const pastaProduct = await prisma.catalogProduct.findUniqueOrThrow({ where: { productRef: "MC-PASTA-001" } });
  const tomatoProduct = await prisma.catalogProduct.findUniqueOrThrow({ where: { productRef: "MC-TOMATO-001" } });
  const packing = await prisma.packingType.findFirstOrThrow({ where: { code: "PT-MC-PASTA-500G" } });

  const mc = await prisma.workspace.upsert({
    where: { externalRef: DEMO_REFS.mc },
    update: { createdById: buyerId },
    create: {
      id: DEMO_IDS.wsMc,
      externalRef: DEMO_REFS.mc,
      type: WorkspaceType.MIXED_CONTAINER,
      state: "MC_PRICING_REQUESTED",
      currency: "USD",
      createdById: buyerId,
      participants: {
        create: [
          { userId: buyerId, participantRole: ParticipantRole.OWNER },
          { userId: adminId, participantRole: ParticipantRole.OPERATOR },
        ],
      },
    },
  });
  await ensureState(mc.id, "MC_PRICING_REQUESTED");

  await prisma.mixedContainerDetails.upsert({
    where: { workspaceId: mc.id },
    create: {
      id: DEMO_IDS.mcDetails,
      workspaceId: mc.id,
      containerType: "40HC",
      maxPalletCapacity: 20,
      currentPalletCount: 8,
      destinationMarket: "Germany",
      currency: "USD",
      estValueMin: 12000,
      estValueMax: 14500,
      pricingRequestedAt: new Date(Date.now() - 2 * 86400_000),
      buyerNotes: "SmartContainer demo — pasta + tomato paste mixed FCL for ABC Foods.",
    },
    update: {
      currentPalletCount: 8,
      pricingRequestedAt: new Date(Date.now() - 2 * 86400_000),
      buyerNotes: "SmartContainer demo — pasta + tomato paste mixed FCL for ABC Foods.",
    },
  });

  const lines = [
    { id: DEMO_IDS.mcLinePasta, productId: pastaProduct.id, pallets: 4, sort: 1 },
    { id: DEMO_IDS.mcLineTomato, productId: tomatoProduct.id, pallets: 4, sort: 2 },
  ];
  for (const l of lines) {
    await prisma.containerLine.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        workspaceId: mc.id,
        catalogProductId: l.productId,
        packingTypeId: packing.id,
        palletCount: l.pallets,
        sortOrder: l.sort,
      },
      update: { palletCount: l.pallets },
    });
  }

  return mc;
}

async function seedBulkContainer(buyerId: string, adminId: string) {
  const flourProduct = await prisma.bulkCatalogProduct.findUniqueOrThrow({ where: { productRef: "BC-FLOUR-001" } });
  const packing = await prisma.packingType.findFirstOrThrow({ where: { code: "PT-BC-FLOUR-25KG" } });

  const bc = await prisma.workspace.upsert({
    where: { externalRef: DEMO_REFS.bc },
    update: { createdById: buyerId },
    create: {
      id: DEMO_IDS.wsBc,
      externalRef: DEMO_REFS.bc,
      type: WorkspaceType.BULK_CONTAINER,
      state: "BC_SUBMITTED",
      currency: "USD",
      createdById: buyerId,
      participants: {
        create: [
          { userId: buyerId, participantRole: ParticipantRole.OWNER },
          { userId: adminId, participantRole: ParticipantRole.OPERATOR },
        ],
      },
    },
  });
  await ensureState(bc.id, "BC_SUBMITTED");

  await prisma.bulkContainerDetails.upsert({
    where: { workspaceId: bc.id },
    create: {
      id: DEMO_IDS.bcDetails,
      workspaceId: bc.id,
      maxCapacityMt: 25,
      currentWeightMt: 18,
      destinationMarket: "Germany",
      currency: "USD",
      estValueMin: 5800,
      estValueMax: 6200,
      submittedAt: new Date(Date.now() - 1 * 86400_000),
    },
    update: { currentWeightMt: 18, submittedAt: new Date(Date.now() - 1 * 86400_000) },
  });

  await prisma.bulkContainerLine.upsert({
    where: { id: DEMO_IDS.bcLineFlour },
    create: {
      id: DEMO_IDS.bcLineFlour,
      workspaceId: bc.id,
      catalogProductId: flourProduct.id,
      packingTypeId: packing.id,
      quantityMt: 18,
      sortOrder: 1,
      specValues: { protein: 12.5, moisture: 13.2, packing: "50 kg PP woven" },
    },
    update: { quantityMt: 18 },
  });

  return bc;
}

async function seedAlerts(orderWorkspaceId: string, shipmentWorkspaceId: string) {
  const engine = new AlertEngine(prisma);
  const scanned = await engine.runFullScan();

  const po = await prisma.purchaseOrder.findFirst({ where: { orderId: orderWorkspaceId } });
  if (po) {
    await upsertControlTowerAlert(prisma, {
      workspaceId: orderWorkspaceId,
      alertKey: AlertKey.PO_NO_ACK_72H,
      severity: "WARNING",
      category: "ORDER",
      workspaceType: "ORDER",
      title: "PO issued without acknowledgement",
      description: `PO ${po.poNumber} awaits supplier acknowledgement (>72h).`,
    });
  }

  await upsertControlTowerAlert(prisma, {
    workspaceId: shipmentWorkspaceId,
    alertKey: AlertKey.SHIPMENT_ETA_EXCEEDED,
    severity: "CRITICAL",
    category: "SHIPMENT",
    workspaceType: "SHIPMENT",
    title: "Shipment ETA exceeded",
    description: `${DEMO_REFS.shipment} is in transit past planned ETA.`,
  });

  return scanned;
}

async function main() {
  console.log("🎬 Seeding customer demo (ABC Foods Germany)…");

  const baseAdmin = await prisma.user.findUnique({ where: { email: "admin@demaxtore.local" } });
  if (!baseAdmin) {
    throw new Error("Base seed required — run: yarn workspace @dmx/backend prisma:seed");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const { buyer, supplierUsers, admin } = await seedAccounts(passwordHash);
  const supplierIds = supplierUsers.map((u) => u.id);

  const rfqOpen = await seedRfqOpen(buyer.id, admin.id, supplierIds);
  const rfqPo = await seedRfqPoChain(buyer.id, admin.id, supplierIds[0], supplierIds);
  const cb = await seedCommodityBid(buyer.id, admin.id, supplierIds);
  const mc = await seedMixedContainer(buyer.id, admin.id);
  const bc = await seedBulkContainer(buyer.id, admin.id);

  const orderWs = await prisma.workspace.findUniqueOrThrow({ where: { externalRef: DEMO_REFS.order } });
  const shipWs = await prisma.workspace.findUniqueOrThrow({ where: { externalRef: DEMO_REFS.shipment } });
  const alertCount = await seedAlerts(orderWs.id, shipWs.id);

  console.log("  · demo buyer:", DEMO_EMAILS.buyer);
  console.log("  · suppliers:", supplierUsers.map((u) => u.email).join(", "));
  console.log("  · workspaces:", [rfqOpen, rfqPo, cb, mc, bc].map((w) => `${w.externalRef} (${w.state})`).join(", "));
  console.log("  · order:", DEMO_REFS.order, "· PO:", DEMO_REFS.poNumber, "· shipment:", DEMO_REFS.shipment);
  console.log("  · control tower scan + demo alerts (scan touched", alertCount, "new rows)");
  console.log("✅ Customer demo seed complete — password:", DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error("❌ Customer demo seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
