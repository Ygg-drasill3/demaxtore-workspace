/**
 * One-off: clone RFQ-2026-0237 → RFQ-2026-0239 with freight offers listed (buyer not selected).
 * Run: cd apps/backend && npx tsx prisma/clone-rfq-0237-freight.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { RfqService } from "../src/modules/rfq/rfq.service.js";
import { OrderService } from "../src/modules/order/order.service.js";
import { FreightIqService } from "../src/modules/freightiq/freightiq.service.js";
import { FreightCommunicationsService } from "../src/modules/freightiq/freight-communications.service.js";
import { PaymentMilestoneService } from "../src/modules/payments/payment-milestone.service.js";

const SOURCE_REF = "RFQ-2026-0237";
const TARGET_REF = "RFQ-2026-0239";

const BUYER = {
  id: "403e12a3-b59e-4f96-8354-9246b4758d8d",
  email: "shemimhsn@gmail.com",
  role: "BUYER" as const,
};
const ADMIN = {
  id: "b98d6549-df2d-4d0d-882a-3b1f2f184ea6",
  email: "admin@demaxtore.local",
  role: "ADMIN" as const,
};
const SUPPLIER_TATMAKARNA = {
  id: "38bf7df9-862c-40e9-974f-aee3ab761155",
  email: "export@tatmakarna.com.tr",
  role: "SUPPLIER" as const,
};

const prisma = new PrismaClient();
const rfqService = new RfqService(prisma);
const orderService = new OrderService(prisma);
const freightIq = new FreightIqService(prisma);
const freightComms = new FreightCommunicationsService(prisma);
const payments = new PaymentMilestoneService(prisma);

function mapId(oldId: string, idMap: Map<string, string>): string {
  let next = idMap.get(oldId);
  if (!next) {
    next = randomUUID();
    idMap.set(oldId, next);
  }
  return next;
}

async function cloneRfq(sourceId: string): Promise<string> {
  const existing = await prisma.workspace.findUnique({ where: { externalRef: TARGET_REF } });
  if (existing) {
    console.log(`Already exists: ${TARGET_REF} (${existing.id})`);
    return existing.id;
  }

  const source = await prisma.workspace.findUniqueOrThrow({
    where: { id: sourceId },
    include: {
      rfqDetails: true,
      rfqLineItems: { orderBy: { position: "asc" } },
      participants: { where: { leftAt: null } },
      supplierAssignments: { where: { removedAt: null } },
      supplierLineScopes: true,
      quotations: { include: { lineItems: { orderBy: { position: "asc" } } } },
    },
  });

  const idMap = new Map<string, string>();
  const newWsId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);

    await tx.workspace.create({
      data: {
        id: newWsId,
        externalRef: TARGET_REF,
        type: source.type,
        state: source.state,
        currency: source.currency,
        createdById: source.createdById,
        deadlineAt: source.deadlineAt,
        metadata: source.metadata ?? Prisma.JsonNull,
      },
    });

    if (source.rfqDetails) {
      const d = source.rfqDetails;
      await tx.rfqDetails.create({
        data: {
          workspaceId: newWsId,
          title: d.title,
          productCategory: d.productCategory,
          productDescription: d.productDescription,
          targetMarket: d.targetMarket,
          incoterm: d.incoterm,
          procurementMethod: d.procurementMethod,
        },
      });
    }

    for (const li of source.rfqLineItems) {
      const newLiId = mapId(li.id, idMap);
      await tx.rfqLineItem.create({
        data: {
          id: newLiId,
          workspaceId: newWsId,
          position: li.position,
          description: li.description,
          quantity: li.quantity,
          uom: li.uom,
          notes: li.notes,
          awardStatus: "OPEN",
        },
      });
    }

    for (const p of source.participants) {
      await tx.workspaceParticipant.create({
        data: {
          workspaceId: newWsId,
          userId: p.userId,
          participantRole: p.participantRole,
        },
      });
    }

    for (const sa of source.supplierAssignments) {
      await tx.supplierAssignment.create({
        data: {
          workspaceId: newWsId,
          supplierUserId: sa.supplierUserId,
          assignedById: sa.assignedById,
        },
      });
    }

    for (const scope of source.supplierLineScopes) {
      await tx.supplierLineScope.create({
        data: {
          workspaceId: newWsId,
          supplierUserId: scope.supplierUserId,
          rfqLineItemId: mapId(scope.rfqLineItemId, idMap),
        },
      });
    }

    for (const q of source.quotations) {
      const newQId = mapId(q.id, idMap);
      await tx.quotation.create({
        data: {
          id: newQId,
          workspaceId: newWsId,
          supplierUserId: q.supplierUserId,
          total: q.total,
          currency: q.currency,
          unitPriceAvg: q.unitPriceAvg,
          leadTimeDays: q.leadTimeDays,
          moq: q.moq,
          incoterm: q.incoterm,
          paymentTerms: q.paymentTerms,
          sampleAvail: q.sampleAvail,
          validUntil: q.validUntil,
          status: q.status,
          submittedAt: q.submittedAt,
          revisedAt: q.revisedAt,
        },
      });

      for (const qli of q.lineItems) {
        await tx.quotationLineItem.create({
          data: {
            quotationId: newQId,
            rfqLineItemId: qli.rfqLineItemId ? mapId(qli.rfqLineItemId, idMap) : null,
            position: qli.position,
            description: qli.description,
            quantity: qli.quantity,
            uom: qli.uom,
            unitPrice: qli.unitPrice,
            total: qli.total,
            notes: qli.notes,
          },
        });
      }
    }

    await tx.timelineEvent.create({
      data: {
        workspaceId: newWsId,
        eventType: "rfq.cloned",
        actorUserId: BUYER.id,
        payload: { sourceRef: SOURCE_REF, sourceId },
      },
    });
  });

  console.log(`Cloned ${SOURCE_REF} → ${TARGET_REF} (${newWsId})`);
  return newWsId;
}

async function ensureIncotermDocs(orderId: string, uploaderId: string) {
  const required = ["COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING"];
  for (const documentType of required) {
    await prisma.tradeDocument.upsert({
      where: {
        workspaceType_workspaceId_documentType: {
          workspaceType: "ORDER",
          workspaceId: orderId,
          documentType,
        },
      },
      create: {
        workspaceType: "ORDER",
        workspaceId: orderId,
        documentType,
        status: "APPROVED",
        ownerRole: "SUPPLIER",
        uploadedById: uploaderId,
        fileName: `${documentType.toLowerCase()}.pdf`,
        uploadedAt: new Date(),
        approvedAt: new Date(),
      },
      update: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });
  }
}

async function resolveAwardPayload(
  rfqId: string,
  linePos: number,
  supplierEmail: string,
): Promise<{ rfqLineItemId: string; quotationId: string; supplierUserId: string }> {
  const line = await prisma.rfqLineItem.findFirstOrThrow({
    where: { workspaceId: rfqId, position: linePos },
  });
  const supplier = await prisma.user.findUniqueOrThrow({ where: { email: supplierEmail } });
  const quotation = await prisma.quotation.findFirstOrThrow({
    where: { workspaceId: rfqId, supplierUserId: supplier.id },
  });
  return { rfqLineItemId: line.id, quotationId: quotation.id, supplierUserId: supplier.id };
}

async function progressToFreightOffers(rfqId: string): Promise<{ orderId: string }> {
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: rfqId } });

  if (ws.state === "RFQ_OPEN") {
    await rfqService.applyTransition({
      workspaceId: rfqId,
      action: "close_quotations_early",
      actor: BUYER,
      reason: "Clone demo — close quotations",
    });
    await rfqService.applyTransition({
      workspaceId: rfqId,
      action: "start_evaluation",
      actor: BUYER,
    });
  }

  // Award only line 1 (Pasta → Tatmakarna) — enough for a freight demo order.
  const line1Awarded = await prisma.rfqLineAward.findFirst({
    where: { workspaceId: rfqId, status: "ACTIVE" },
  });
  if (!line1Awarded) {
    const award = await resolveAwardPayload(rfqId, 1, "export@tatmakarna.com.tr");
    await rfqService.applyTransition({
      workspaceId: rfqId,
      action: "award_line_item",
      actor: BUYER,
      payload: { ...award, rationale: "Clone award line 1 (Pasta)" },
    });
  }

  let spawn = await prisma.rfqSupplierPoSpawn.findFirst({
    where: { workspaceId: rfqId, supplierUserId: SUPPLIER_TATMAKARNA.id },
  });
  if (!spawn) {
    await rfqService.applyTransition({
      workspaceId: rfqId,
      action: "issue_supplier_po",
      actor: BUYER,
      payload: { supplierUserId: SUPPLIER_TATMAKARNA.id, mode: "auto" },
    });
    spawn = await prisma.rfqSupplierPoSpawn.findFirstOrThrow({
      where: { workspaceId: rfqId, supplierUserId: SUPPLIER_TATMAKARNA.id },
    });
  }

  const orderId = spawn.orderWorkspaceId;
  if (!orderId) throw new Error("Order not spawned");

  let order = await prisma.workspace.findUniqueOrThrow({ where: { id: orderId } });
  const future = new Date(Date.now() + 30 * 86_400_000).toISOString();

  const advance = async (action: Parameters<OrderService["applyTransition"]>[0]["action"], actor: typeof BUYER, payload: Record<string, unknown> = {}) => {
    order = await prisma.workspace.findUniqueOrThrow({ where: { id: orderId } });
    await orderService.applyTransition({ workspaceId: orderId, action, actor, payload });
  };

  if (order.state === "ORDER_CREATED") {
    await advance("supplier_confirm_order", SUPPLIER_TATMAKARNA, { plannedCompletionDate: future });
  }
  order = await prisma.workspace.findUniqueOrThrow({ where: { id: orderId } });
  if (order.state === "SUPPLIER_CONFIRMED") {
    await ensureIncotermDocs(orderId, SUPPLIER_TATMAKARNA.id);
    await payments.ensurePlan(orderId, order.currency ?? "USD");
    await payments.satisfyMilestone(orderId, "DEPOSIT_PAID", `clone-${orderId}-deposit`);
    await advance("start_production", SUPPLIER_TATMAKARNA, { plannedCompletionDate: future });
  }
  order = await prisma.workspace.findUniqueOrThrow({ where: { id: orderId } });
  if (order.state === "PRODUCTION_STARTED" || order.state === "PRODUCTION_IN_PROGRESS") {
    await advance("report_production_progress", SUPPLIER_TATMAKARNA, {
      label: "Production complete",
      percentage: 100,
    });
  }
  order = await prisma.workspace.findUniqueOrThrow({ where: { id: orderId } });
  if (order.state === "PRODUCTION_COMPLETED") {
    await advance("skip_inspection", BUYER);
  }

  const existingFr = await prisma.freightRequest.findFirst({ where: { orderId } });
  if (!existingFr) {
    await freightIq.applyFreightAction(orderId, "create_request", ADMIN, {
      mode: "OCEAN_FCL",
      pol: "TRMER",
      pod: "QAHMD",
      cargoDescription: "Pasta — Rawabi Food International (RFQ clone)",
      containerType: "40HC",
    });
  }

  const offerCount = await prisma.freightOffer.count({
    where: { freightRequest: { orderId }, status: { in: ["ACTIVE", "REVISED"] } },
  });
  if (offerCount < 2) {
    const forwarders = await prisma.forwarderContact.findMany({
      where: { active: true },
      take: 2,
      orderBy: { createdAt: "desc" },
    });
    if (forwarders.length < 2) throw new Error("Need at least 2 active forwarders");

    const validUntil = new Date(Date.now() + 21 * 86_400_000).toISOString();
    const etd = new Date(Date.now() + 14 * 86_400_000).toISOString();
    const eta = new Date(Date.now() + 40 * 86_400_000).toISOString();
    const cutOff = new Date(Date.now() + 10 * 86_400_000).toISOString();

    const offers = [
      { forwarder: forwarders[0], carrier: "Maersk", vessel: "MAERSK HAMAD", freight: 2100, transit: 28 },
      { forwarder: forwarders[1], carrier: "MSC", vessel: "MSC RAWABI", freight: 1850, transit: 24 },
      { forwarder: forwarders[0], carrier: "CMA CGM", vessel: "CMA TURKEY", freight: 1925, transit: 26 },
    ];

    for (const o of offers) {
      await freightComms.intakeOffer(orderId, ADMIN, {
        forwarderContactId: o.forwarder.id,
        offerSource: "MANUAL_ENTRY",
        carrierName: o.carrier,
        vesselName: o.vessel,
        etd,
        eta,
        transitDays: o.transit,
        cutOff,
        oceanFreight: o.freight,
        currency: "USD",
        validUntil,
      });
    }
  }

  return { orderId };
}

async function main() {
  const source = await prisma.workspace.findUniqueOrThrow({ where: { externalRef: SOURCE_REF } });
  const rfqId = await cloneRfq(source.id);

  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: rfqId } });
  if (!["PO_ISSUED", "CLOSED", "PARTIALLY_AWARDED", "FULLY_AWARDED"].includes(ws.state) || !(await prisma.rfqSupplierPoSpawn.findFirst({ where: { workspaceId: rfqId } }))) {
    const { orderId } = await progressToFreightOffers(rfqId);
    const order = await prisma.workspace.findUniqueOrThrow({ where: { id: orderId } });
    const offerCount = await prisma.freightOffer.count({
      where: {
        freightRequest: { orderId },
        status: { in: ["ACTIVE", "REVISED"] },
      },
    });
    const selection = await prisma.freightSelection.findFirst({
      where: { freightRequest: { orderId } },
    });

    console.log("\n✅ Done");
    console.log(`  RFQ: ${TARGET_REF} (${rfqId})`);
    console.log(`  Order: ${order.externalRef} — state ${order.state}`);
    console.log(`  Freight offers: ${offerCount} (buyer selected: ${selection ? "yes" : "no"})`);
    console.log(`  Order URL: /workspace/order/${orderId}`);
  } else {
    const { orderId } = await progressToFreightOffers(rfqId);
    const order = await prisma.workspace.findUniqueOrThrow({ where: { id: orderId } });
    const offerCount = await prisma.freightOffer.count({
      where: { freightRequest: { orderId }, status: { in: ["ACTIVE", "REVISED"] } },
    });
    const selection = await prisma.freightSelection.findFirst({ where: { freightRequest: { orderId } } });
    console.log("\n✅ Continued existing clone");
    console.log(`  RFQ: ${TARGET_REF} (${rfqId}) — state ${ws.state}`);
    console.log(`  Order: ${order.externalRef} — state ${order.state}`);
    console.log(`  Freight offers: ${offerCount} (buyer selected: ${selection ? "yes" : "no"})`);
    console.log(`  Order URL: /workspace/order/${orderId}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
