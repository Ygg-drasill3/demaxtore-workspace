import type { PrismaClient } from "@prisma/client";
import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
import { BulkContainerProcurementService } from "./bulk-container-procurement.service.js";

const H_24 = 24 * 3_600_000;

export async function scanBulkContainerAlerts(db: PrismaClient): Promise<number> {
  let created = 0;

  await new BulkContainerProcurementService(db).expireOffers({
    id: "00000000-0000-0000-0000-000000000001",
    role: "SYSTEM",
    email: "system@demaxtore.local",
  });

  const incomplete = await db.workspace.findMany({
    where: {
      type: "BULK_CONTAINER",
      state: { in: ["BC_DRAFT", "BC_BUILDING"] },
      bulkContainerLines: { none: { removedAt: null } },
    },
    select: { id: true, externalRef: true, updatedAt: true },
    take: 50,
  });

  for (const ws of incomplete) {
    const ageHours = (Date.now() - ws.updatedAt.getTime()) / 3_600_000;
    if (ageHours >= 1) {
      if (
        await upsertControlTowerAlert(db, {
          workspaceId: ws.id,
          alertKey: AlertKey.BC_INCOMPLETE,
          severity: "WARNING",
          category: "BULK_CONTAINER",
          workspaceType: "BULK_CONTAINER",
          title: "BulkContainer incomplete",
          description: `${ws.externalRef} has no product lines yet.`,
        })
      ) {
        created++;
      }
    }
  }

  const pricingPending = await db.workspace.findMany({
    where: { type: "BULK_CONTAINER", state: "BC_SUBMITTED" },
    take: 50,
  });
  for (const ws of pricingPending) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.BC_PRICING_PENDING,
        severity: "WARNING",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer pricing pending",
        description: `${ws.externalRef} submitted — awaiting operations procurement start.`,
      })
    ) {
      created++;
    }
  }

  const submitted = await db.workspace.findMany({
    where: {
      type: "BULK_CONTAINER",
      state: "BC_SUBMITTED",
      bulkContainerDetails: { submittedAt: { gte: new Date(Date.now() - H_24) } },
    },
    select: { id: true, externalRef: true },
    take: 50,
  });
  for (const ws of submitted) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.BC_SUBMITTED,
        severity: "INFO",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer request submitted",
        description: `Bulk procurement request ${ws.externalRef} awaiting operations review.`,
      })
    ) {
      created++;
    }
  }

  const expiringSoon = await db.bcContainerOffer.findMany({
    where: {
      status: "SENT",
      validUntil: { gte: new Date(), lte: new Date(Date.now() + H_24) },
    },
    include: { workspace: true },
    take: 50,
  });
  for (const offer of expiringSoon) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: offer.workspaceId,
        alertKey: AlertKey.BC_OFFER_EXPIRING,
        severity: "WARNING",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer offer expiring",
        description: `Offer ${offer.offerReference} for ${offer.workspace.externalRef} expires within 24 hours.`,
      })
    ) {
      created++;
    }
  }

  const expired = await db.workspace.findMany({
    where: { type: "BULK_CONTAINER", state: "BC_EXPIRED" },
    take: 30,
  });
  for (const ws of expired) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.BC_OFFER_EXPIRED,
        severity: "WARNING",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer offer expired",
        description: `${ws.externalRef} offer validity has passed.`,
      })
    ) {
      created++;
    }
  }

  const revisionPending = await db.workspace.findMany({
    where: { type: "BULK_CONTAINER", state: "BC_REVISION_REQUESTED" },
    take: 50,
  });
  for (const ws of revisionPending) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.BC_REVISION_PENDING,
        severity: "INFO",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer revision pending",
        description: `${ws.externalRef} buyer requested offer revision.`,
      })
    ) {
      created++;
    }
  }

  const recentlyApproved = await db.workspace.findMany({
    where: {
      type: "BULK_CONTAINER",
      state: "BC_APPROVED",
      updatedAt: { gte: new Date(Date.now() - H_24) },
    },
    take: 30,
  });
  for (const ws of recentlyApproved) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.BC_OFFER_APPROVED,
        severity: "INFO",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer offer approved",
        description: `${ws.externalRef} approved by buyer.`,
      })
    ) {
      created++;
    }
  }

  const allocationPending = await db.workspace.findMany({
    where: {
      type: "BULK_CONTAINER",
      state: { in: ["BC_APPROVED", "BC_ALLOCATION_IN_PROGRESS"] },
    },
    take: 50,
  });
  for (const ws of allocationPending) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.BC_ALLOCATION_PENDING,
        severity: "WARNING",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer allocation pending",
        description: `${ws.externalRef} awaiting supplier allocation.`,
      })
    ) {
      created++;
    }
  }

  const proformaPending = await db.workspace.findMany({
    where: { type: "BULK_CONTAINER", state: "BC_PROFORMA_PENDING" },
    take: 50,
  });
  for (const ws of proformaPending) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.BC_PROFORMA_PENDING,
        severity: "WARNING",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer proforma pending",
        description: `${ws.externalRef} awaiting proforma collection.`,
      })
    ) {
      created++;
    }
  }

  const paymentPending = await db.workspace.findMany({
    where: { type: "BULK_CONTAINER", state: "BC_PAYMENT_TRACKING" },
    take: 50,
  });
  for (const ws of paymentPending) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.BC_PAYMENT_PENDING,
        severity: "WARNING",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer payment pending",
        description: `${ws.externalRef} awaiting supplier payment confirmation.`,
      })
    ) {
      created++;
    }
  }

  const executionReady = await db.workspace.findMany({
    where: {
      type: "BULK_CONTAINER",
      state: "BC_EXECUTION_READY",
      updatedAt: { gte: new Date(Date.now() - H_24) },
    },
    take: 30,
  });
  for (const ws of executionReady) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.BC_EXECUTION_READY,
        severity: "INFO",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer execution ready",
        description: `${ws.externalRef} ready for order spawn.`,
      })
    ) {
      created++;
    }
  }

  const executionActive = await db.workspace.findMany({
    where: { type: "BULK_CONTAINER", state: "BC_EXECUTION_ACTIVE" },
    include: { bcOrderLinks: true },
    take: 50,
  });
  for (const ws of executionActive) {
    if (ws.bcOrderLinks.length === 0) {
      if (
        await upsertControlTowerAlert(db, {
          workspaceId: ws.id,
          alertKey: AlertKey.BC_ORDER_SPAWN_FAILED,
          severity: "CRITICAL",
          category: "BULK_CONTAINER",
          workspaceType: "BULK_CONTAINER",
          title: "BulkContainer order spawn failed",
          description: `${ws.externalRef} execution active but no supplier orders linked.`,
        })
      ) {
        created++;
      }
      continue;
    }

    const orderIds = ws.bcOrderLinks.map((l) => l.supplierOrderId);
    const orders = await db.workspace.findMany({ where: { id: { in: orderIds } } });
    const freightEligible = ["PRODUCTION_COMPLETED", "INSPECTION_COMPLETED", "FREIGHT_REQUESTED"];
    const needsFreight = orders.some((o) => freightEligible.includes(o.state));
    if (needsFreight) {
      const freightCount = await db.freightRequest.count({ where: { orderId: { in: orderIds } } });
      if (freightCount === 0) {
        if (
          await upsertControlTowerAlert(db, {
            workspaceId: ws.id,
            alertKey: AlertKey.BC_FREIGHT_PENDING,
            severity: "WARNING",
            category: "BULK_CONTAINER",
            workspaceType: "BULK_CONTAINER",
            title: "BulkContainer freight pending",
            description: `${ws.externalRef} orders eligible for FreightIQ but no freight request.`,
          })
        ) {
          created++;
        }
      }
    }

    const shipmentCount = await db.workspace.count({
      where: { spawnedFromId: { in: orderIds }, type: "SHIPMENT" },
    });
    if (shipmentCount < orderIds.length) {
      if (
        await upsertControlTowerAlert(db, {
          workspaceId: ws.id,
          alertKey: AlertKey.BC_SHIPMENT_PENDING,
          severity: "WARNING",
          category: "BULK_CONTAINER",
          workspaceType: "BULK_CONTAINER",
          title: "BulkContainer shipment pending",
          description: `${ws.externalRef} awaiting shipment spawn from orders.`,
        })
      ) {
        created++;
      }
    }
  }

  const executionComplete = await db.workspace.findMany({
    where: {
      type: "BULK_CONTAINER",
      state: "BC_EXECUTION_COMPLETE",
      updatedAt: { gte: new Date(Date.now() - H_24) },
    },
    take: 30,
  });
  for (const ws of executionComplete) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.BC_EXECUTION_COMPLETE,
        severity: "INFO",
        category: "BULK_CONTAINER",
        workspaceType: "BULK_CONTAINER",
        title: "BulkContainer execution complete",
        description: `${ws.externalRef} all linked shipments delivered.`,
      })
    ) {
      created++;
    }
  }

  return created;
}
