import { PrismaClient } from "@prisma/client";
import { RfqService } from "../src/modules/rfq/rfq.service.js";

const prisma = new PrismaClient();
const rfqService = new RfqService(prisma);

const TRIAL_SUPPLIERS = [
  "supplier.trial1@demaxtore.com",
  "supplier.trial2@demaxtore.com",
];

async function main() {
  const suppliers = await prisma.user.findMany({
    where: { email: { in: TRIAL_SUPPLIERS } },
    select: { id: true, email: true },
  });
  if (suppliers.length < 2) throw new Error("Trial suppliers missing");

  const rfqs = await prisma.workspace.findMany({
    where: {
      type: "RFQ",
      trashedAt: null,
      state: { in: ["RFQ_SUBMITTED", "SUPPLIERS_ASSIGNED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      externalRef: true,
      state: true,
      rfqDetails: { select: { title: true } },
      rfqLineItems: { select: { id: true } },
      supplierAssignments: { where: { removedAt: null }, select: { supplierUserId: true } },
    },
  });

  console.log("Candidates:", rfqs.map((r) => ({
    id: r.id,
    ref: r.externalRef,
    state: r.state,
    title: r.rfqDetails?.title,
    lines: r.rfqLineItems.length,
    assigned: r.supplierAssignments.length,
  })));

  if (!rfqs.length) throw new Error("No assignable RFQ found");

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true, role: true },
  });
  if (!admin) throw new Error("No admin user");

  const actor = { id: admin.id, email: admin.email, role: admin.role as "ADMIN" };

  for (const rfq of rfqs) {
    const lineIds = rfq.rfqLineItems.map((l) => l.id);
    if (!lineIds.length) {
      console.log("Skip (no lines):", rfq.externalRef);
      continue;
    }

    const assignments = suppliers.map((s) => ({
      supplierUserId: s.id,
      rfqLineItemIds: lineIds,
    }));

    if (rfq.state === "RFQ_SUBMITTED") {
      await rfqService.applyTransition({
        workspaceId: rfq.id,
        action: "assign_suppliers",
        payload: { assignments },
        actor,
        reason: "Assign trial suppliers for quotation testing",
      });
      console.log("Assigned ->", rfq.externalRef);
    } else if (rfq.state === "SUPPLIERS_ASSIGNED") {
      const existingIds = new Set(rfq.supplierAssignments.map((e) => e.supplierUserId));
      const toAdd = assignments.filter((a) => !existingIds.has(a.supplierUserId));
      if (toAdd.length) {
        await rfqService.applyTransition({
          workspaceId: rfq.id,
          action: "add_more_suppliers",
          payload: { assignments: toAdd },
          actor,
          reason: "Add trial suppliers",
        });
        console.log("Added suppliers ->", rfq.externalRef);
      } else {
        console.log("Already assigned ->", rfq.externalRef);
      }
    }

    const refreshed = await prisma.workspace.findUnique({
      where: { id: rfq.id },
      select: { state: true, externalRef: true },
    });

    if (refreshed?.state === "SUPPLIERS_ASSIGNED") {
      await rfqService.applyTransition({
        workspaceId: rfq.id,
        action: "publish_rfq",
        payload: {},
        actor,
        reason: "Open RFQ for supplier quotations",
      });
      console.log("Published ->", refreshed.externalRef);
    }
  }

  const finalStates = await prisma.workspace.findMany({
    where: { id: { in: rfqs.map((r) => r.id) } },
    select: {
      id: true,
      externalRef: true,
      state: true,
      supplierAssignments: { where: { removedAt: null }, select: { supplierUserId: true } },
    },
  });

  console.log("Done:", {
    rfqs: finalStates.map((f) => ({
      ref: f.externalRef,
      state: f.state,
      supplierCount: f.supplierAssignments.length,
    })),
    suppliers: suppliers.map((s) => s.email),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
