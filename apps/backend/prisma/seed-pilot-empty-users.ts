/**
 * Idempotent empty pilot accounts for manual user testing.
 * Does not touch admin@demaxtore.local or fixture/smoke accounts (buyer1, broker.smoke, R4, etc.).
 *
 * Also seeds a Turkey-import shipment + customs case for buyer.utest (gümrük panel demo).
 *
 * Run: npx tsx prisma/seed-pilot-empty-users.ts
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { spawnOrderWorkspace } from "../src/modules/order/order.spawn.js";
import { createPurchaseOrderOnOrderSpawn } from "../src/modules/purchase-order/purchase-order.spawn.js";
import { spawnShipmentFromOrder } from "../src/modules/shipment/shipment.spawn.js";

export const PILOT_EMPTY_PASSWORD = "Passw0rd!";

export const PILOT_EMPTY_USERS = {
  buyer: "buyer.utest@demaxtore.local",
  buyerV2: "buyer.v2.utest@demaxtore.local",
  supplierTr: "supplier.utest@demaxtore.local",
  supplierForeign: "supplier.foreign.utest@demaxtore.local",
  broker: "broker.utest@demaxtore.local",
  trucker: "trucker.utest@demaxtore.local",
  originAgent: "origin.utest@demaxtore.local",
} as const;

export const ORG_IDS = {
  buyer: "00000000-0000-0000-0000-00000000e001",
  buyerV2: "00000000-0000-0000-0000-00000000e011",
  supplierTr: "00000000-0000-0000-0000-00000000e002",
  supplierForeign: "00000000-0000-0000-0000-00000000e003",
} as const;

/** Turkey import demo chain for buyer.utest — gümrük paneli testi. */
export const PILOT_TR_DEMO = {
  contractRef: "DEMO-UTEST-TR-001",
  order: "ORD-DEMO-UTEST-TR-001-00000000",
  shipment: "SHP-ORD-DEMO-UTEST-TR-001-00000000",
  poNumber: "DEMO-PO-UTEST-TR-001",
  customsCaseId: "00000000-0000-0000-0000-00000000e104",
} as const;

type EmptyUserDef = {
  email: string;
  displayName: string;
  role: Role;
  orgId?: string;
  orgName?: string;
  orgKind?: string;
  buyerOperatingModel?: "INTERNATIONAL" | "TURKEY_IMPORTER";
};

const EMPTY_USERS: EmptyUserDef[] = [
  {
    email: PILOT_EMPTY_USERS.buyer,
    displayName: "Türk İthalatçı User Test",
    role: Role.BUYER,
    orgId: ORG_IDS.buyer,
    orgName: "User Test TR Importer Co",
    orgKind: "BUYER_ORG",
    buyerOperatingModel: "TURKEY_IMPORTER",
  },
  {
    email: PILOT_EMPTY_USERS.buyerV2,
    displayName: "Türk İthalatçı User Test v2",
    role: Role.BUYER,
    orgId: ORG_IDS.buyerV2,
    orgName: "User Test TR Importer Co v2",
    orgKind: "BUYER_ORG",
    buyerOperatingModel: "TURKEY_IMPORTER",
  },
  {
    email: PILOT_EMPTY_USERS.supplierTr,
    displayName: "Türk Tedarikçi User Test (Empty)",
    role: Role.SUPPLIER,
    orgId: ORG_IDS.supplierTr,
    orgName: "User Test TR Supplier Co",
    orgKind: "SUPPLIER_ORG",
  },
  {
    email: PILOT_EMPTY_USERS.supplierForeign,
    displayName: "Yurt Dışı Tedarikçi User Test (Empty)",
    role: Role.SUPPLIER,
    orgId: ORG_IDS.supplierForeign,
    orgName: "User Test Foreign Supplier Co",
    orgKind: "SUPPLIER_ORG",
  },
  {
    email: PILOT_EMPTY_USERS.broker,
    displayName: "Broker User Test (Empty)",
    role: Role.CUSTOMS_BROKER,
  },
  {
    email: PILOT_EMPTY_USERS.trucker,
    displayName: "Trucker User Test (Empty)",
    role: Role.TRUCKER,
  },
  {
    email: PILOT_EMPTY_USERS.originAgent,
    displayName: "Origin Agent User Test (Empty)",
    role: Role.ORIGIN_AGENT,
  },
];

async function withFsm<T>(
  prisma: PrismaClient,
  fn: (tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
    return fn(tx);
  });
}

async function seedTurkeyCustomsDemo(prisma: PrismaClient) {
  const buyer = await prisma.user.findUniqueOrThrow({ where: { email: PILOT_EMPTY_USERS.buyer } });
  const supplier = await prisma.user.findUniqueOrThrow({ where: { email: PILOT_EMPTY_USERS.supplierTr } });
  const broker = await prisma.user.findUniqueOrThrow({ where: { email: PILOT_EMPTY_USERS.broker } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@demaxtore.local" } });

  const { orderWorkspaceId } = await withFsm(prisma, async (tx) => {
    const { orderWorkspaceId, externalRef: orderRef } = await spawnOrderWorkspace(tx, {
      parentWorkspaceId: null,
      parentType: "DIRECT_PO",
      parentExternalRef: PILOT_TR_DEMO.contractRef,
      buyerUserId: buyer.id,
      supplierUserId: supplier.id,
      contractRef: PILOT_TR_DEMO.contractRef,
      currency: "USD",
      totalValue: 12500,
      incoterms: "CIF",
      originPort: "ITGOA",
      destinationPort: "TRMER",
      actorUserId: buyer.id,
      auditEvent: "ORDER_WORKSPACE_CREATED",
      orderRefSuffix: "00000000",
    });

    await tx.workspace.update({
      where: { id: orderWorkspaceId },
      data: { state: "FREIGHT_SELECTED" },
    });

    await tx.orderWorkspace.update({
      where: { workspaceId: orderWorkspaceId },
      data: {
        originPort: "ITGOA",
        destinationPort: "TRMER",
        currentEta: new Date(Date.now() + 3 * 86400_000),
      },
    });

    await createPurchaseOrderOnOrderSpawn(tx, {
      orderId: orderWorkspaceId,
      poNumber: PILOT_TR_DEMO.poNumber,
      buyerId: buyer.id,
      supplierId: supplier.id,
      currency: "USD",
      incoterm: "CIF",
      paymentTerms: "Net 30",
      lines: [{ description: "Durum wheat pasta — penne 500g retail packs", quantity: 12000, unitPrice: 0.82 }],
      actorUserId: buyer.id,
      actorEmail: buyer.email,
      actorRole: "BUYER",
      issueReason: "Pilot Turkey import demo",
    });

    const { shipmentWorkspaceId } = await spawnShipmentFromOrder(tx, {
      orderWorkspaceId,
      orderExternalRef: orderRef,
      contractRef: PILOT_TR_DEMO.contractRef,
      poRef: PILOT_TR_DEMO.poNumber,
      currency: "USD",
      buyerUserId: buyer.id,
      supplierUserId: supplier.id,
      originPort: "ITGOA",
      destinationPort: "TRMER",
      actorUserId: buyer.id,
    });

    await tx.workspace.update({
      where: { id: shipmentWorkspaceId },
      data: { state: "IN_TRANSIT" },
    });

    return { orderWorkspaceId, shipmentWorkspaceId };
  });

  const shipWs = await prisma.workspace.findUniqueOrThrow({ where: { externalRef: PILOT_TR_DEMO.shipment } });

  const brokerAssignment = await prisma.partnerAssignment.upsert({
    where: {
      workspaceId_userId_partnerRole: {
        workspaceId: shipWs.id,
        userId: broker.id,
        partnerRole: "CUSTOMS_BROKER",
      },
    },
    create: {
      workspaceId: shipWs.id,
      userId: broker.id,
      partnerRole: "CUSTOMS_BROKER",
      assignedById: admin?.id ?? buyer.id,
      notes: "Pilot demo — gümrük müşaviri ataması",
    },
    update: { revokedAt: null, assignedById: admin?.id ?? buyer.id },
  });

  await prisma.customsCase.upsert({
    where: { shipmentWorkspaceId: shipWs.id },
    create: {
      id: PILOT_TR_DEMO.customsCaseId,
      organisationId: ORG_IDS.buyer,
      shipmentWorkspaceId: shipWs.id,
      orderWorkspaceId: orderWorkspaceId,
      status: "BROKER_REVIEW",
      readinessStatus: "PARTIALLY_READY",
      destinationCountryCode: "TR",
      brokerUserId: broker.id,
      brokerAssignmentId: brokerAssignment.id,
      createdById: buyer.id,
      statusSource: "SYSTEM_DERIVED",
    },
    update: {
      status: "BROKER_REVIEW",
      readinessStatus: "PARTIALLY_READY",
      destinationCountryCode: "TR",
      brokerUserId: broker.id,
      brokerAssignmentId: brokerAssignment.id,
      cancelledAt: null,
      cancelReason: null,
    },
  });

  const existingEvent = await prisma.customsCaseEvent.findFirst({
    where: { customsCaseId: PILOT_TR_DEMO.customsCaseId, toStatus: "BROKER_REVIEW" },
  });
  if (!existingEvent) {
    await prisma.customsCaseEvent.create({
      data: {
        customsCaseId: PILOT_TR_DEMO.customsCaseId,
        actorUserId: buyer.id,
        source: "SYSTEM_DERIVED",
        fromStatus: "DRAFT",
        toStatus: "BROKER_REVIEW",
        reason: "Pilot demo — gümrük dosyası oluşturuldu",
      },
    });
  }

  console.log(`  · Turkey import demo: order ${PILOT_TR_DEMO.order}`);
  console.log(`  · shipment ${PILOT_TR_DEMO.shipment} (ITGOA → TRMER)`);
  console.log(`  · customs case ${PILOT_TR_DEMO.customsCaseId} (BROKER_REVIEW)`);
}

async function main() {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(PILOT_EMPTY_PASSWORD, 10);

  console.log("Seeding empty pilot user-test accounts…");

  for (const u of EMPTY_USERS) {
    if (u.orgId && u.orgName && u.orgKind) {
      await prisma.organisation.upsert({
        where: { id: u.orgId },
        update: {
          name: u.orgName,
          kind: u.orgKind,
          ...(u.buyerOperatingModel ? { buyerOperatingModel: u.buyerOperatingModel } : {}),
        },
        create: {
          id: u.orgId,
          name: u.orgName,
          kind: u.orgKind,
          ...(u.buyerOperatingModel ? { buyerOperatingModel: u.buyerOperatingModel } : {}),
        },
      });
    }

    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        displayName: u.displayName,
        role: u.role,
        passwordHash,
        organisationId: u.orgId ?? null,
      },
      create: {
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        passwordHash,
        organisationId: u.orgId ?? null,
      },
    });

    const row = await prisma.user.findUnique({ where: { email: u.email }, select: { id: true } });
    const assignmentCount = row
      ? await prisma.partnerAssignment.count({
          where: { userId: row.id, revokedAt: null },
        })
      : 0;
    console.log(`  · ${u.email} (${u.role}) — partner assignments: ${assignmentCount}`);
  }

  console.log("\nSeeding Turkey import + customs demo for buyer.utest…");
  await seedTurkeyCustomsDemo(prisma);

  console.log("\nDone. Password for all: (see PILOT_EMPTY_PASSWORD in this script)");
  console.log("Admin unchanged. Smoke/fixture accounts unchanged.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
