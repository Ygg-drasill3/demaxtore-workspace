import type { PrismaClient } from "@prisma/client";
import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";

const H_24 = 24 * 3_600_000;

export async function scanMixedContainerAlerts(db: PrismaClient): Promise<number> {
  let n = 0;
  const now = new Date();

  const pricingPending = await db.workspace.findMany({
    where: { type: "MIXED_CONTAINER", state: "MC_PRICING_REQUESTED" },
    take: 50,
  });
  for (const ws of pricingPending) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.MC_PRICING_PENDING,
        severity: "WARNING",
        category: "MIXED_CONTAINER",
        workspaceType: "MIXED_CONTAINER",
        title: "Mixed container pricing pending",
        description: `${ws.externalRef} awaiting procurement start.`,
      })
    ) {
      n++;
    }
  }

  const expiringSoon = await db.mcContainerOffer.findMany({
    where: {
      status: "SENT",
      validityDate: { gte: now, lte: new Date(now.getTime() + H_24) },
    },
    include: { workspace: true },
    take: 50,
  });
  for (const offer of expiringSoon) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: offer.workspaceId,
        alertKey: AlertKey.MC_OFFER_EXPIRING,
        severity: "WARNING",
        category: "MIXED_CONTAINER",
        workspaceType: "MIXED_CONTAINER",
        title: "Mixed container offer expiring",
        description: `Offer for ${offer.workspace.externalRef} expires within 24 hours.`,
      })
    ) {
      n++;
    }
  }

  const revisionPending = await db.workspace.findMany({
    where: { type: "MIXED_CONTAINER", state: "MC_REVISION_REQUESTED" },
    take: 50,
  });
  for (const ws of revisionPending) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.MC_REVISION_PENDING,
        severity: "INFO",
        category: "MIXED_CONTAINER",
        workspaceType: "MIXED_CONTAINER",
        title: "Mixed container revision pending",
        description: `${ws.externalRef} buyer requested offer revision.`,
      })
    ) {
      n++;
    }
  }

  const recentlyApproved = await db.workspace.findMany({
    where: {
      type: "MIXED_CONTAINER",
      state: { in: ["MC_EXECUTION_READY", "MC_ALLOCATION_IN_PROGRESS", "MC_PROFORMA_PENDING"] },
      mixedContainerDetails: { organizationRef: { not: null } },
      updatedAt: { gte: new Date(now.getTime() - H_24) },
    },
    take: 30,
  });
  for (const ws of recentlyApproved) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.MC_OFFER_APPROVED,
        severity: "INFO",
        category: "MIXED_CONTAINER",
        workspaceType: "MIXED_CONTAINER",
        title: "Mixed container offer approved",
        description: `${ws.externalRef} approved by buyer.`,
      })
    ) {
      n++;
    }
  }

  const allocationPending = await db.workspace.findMany({
    where: {
      type: "MIXED_CONTAINER",
      state: { in: ["MC_APPROVED", "MC_ALLOCATION_IN_PROGRESS"] },
    },
    take: 50,
  });
  for (const ws of allocationPending) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.MC_ALLOCATION_PENDING,
        severity: "WARNING",
        category: "MIXED_CONTAINER",
        workspaceType: "MIXED_CONTAINER",
        title: "Mixed container allocation pending",
        description: `${ws.externalRef} awaiting supplier allocation.`,
      })
    ) {
      n++;
    }
  }

  const proformaPending = await db.workspace.findMany({
    where: { type: "MIXED_CONTAINER", state: "MC_PROFORMA_PENDING" },
    take: 50,
  });
  for (const ws of proformaPending) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.MC_PROFORMA_PENDING,
        severity: "WARNING",
        category: "MIXED_CONTAINER",
        workspaceType: "MIXED_CONTAINER",
        title: "Mixed container proforma pending",
        description: `${ws.externalRef} awaiting proforma collection.`,
      })
    ) {
      n++;
    }
  }

  const paymentPending = await db.workspace.findMany({
    where: { type: "MIXED_CONTAINER", state: "MC_PAYMENT_TRACKING" },
    take: 50,
  });
  for (const ws of paymentPending) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.MC_PAYMENT_PENDING,
        severity: "WARNING",
        category: "MIXED_CONTAINER",
        workspaceType: "MIXED_CONTAINER",
        title: "Mixed container payment pending",
        description: `${ws.externalRef} awaiting supplier payment confirmation.`,
      })
    ) {
      n++;
    }
  }

  const executionReady = await db.workspace.findMany({
    where: {
      type: "MIXED_CONTAINER",
      state: "MC_EXECUTION_READY",
      updatedAt: { gte: new Date(now.getTime() - H_24) },
    },
    take: 30,
  });
  for (const ws of executionReady) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.MC_EXECUTION_READY,
        severity: "INFO",
        category: "MIXED_CONTAINER",
        workspaceType: "MIXED_CONTAINER",
        title: "Mixed container execution ready",
        description: `${ws.externalRef} ready for order and shipment execution.`,
      })
    ) {
      n++;
    }
  }

  const executionActive = await db.workspace.findMany({
    where: { type: "MIXED_CONTAINER", state: "MC_EXECUTION_ACTIVE" },
    include: { mcOrderLinks: true },
    take: 50,
  });
  for (const ws of executionActive) {
    const orderIds = ws.mcOrderLinks.map((l) => l.supplierOrderId);
    if (orderIds.length === 0) {
      if (
        await upsertControlTowerAlert(db, {
          workspaceId: ws.id,
          alertKey: AlertKey.SC_ORDER_SPAWN_FAILED,
          severity: "CRITICAL",
          category: "MIXED_CONTAINER",
          workspaceType: "MIXED_CONTAINER",
          title: "SmartContainer order spawn failed",
          description: `${ws.externalRef} execution active but no supplier orders linked.`,
        })
      ) {
        n++;
      }
      continue;
    }

    const freightPending = await db.freightRequest.count({
      where: { orderId: { in: orderIds }, status: { in: ["OPEN", "OFFERS_RECEIVED"] } },
    });
    const orders = await db.workspace.findMany({
      where: { id: { in: orderIds } },
      select: { state: true },
    });
    const eligibleNoFreight = orders.filter((o) =>
      ["PRODUCTION_COMPLETED", "INSPECTION_COMPLETED", "FREIGHT_REQUESTED"].includes(o.state),
    ).length;
    if (eligibleNoFreight > 0 && freightPending === 0) {
      if (
        await upsertControlTowerAlert(db, {
          workspaceId: ws.id,
          alertKey: AlertKey.SC_FREIGHT_PENDING,
          severity: "WARNING",
          category: "MIXED_CONTAINER",
          workspaceType: "MIXED_CONTAINER",
          title: "SmartContainer freight pending",
          description: `${ws.externalRef} has orders eligible for FreightIQ.`,
        })
      ) {
        n++;
      }
    }

    const shipments = await db.workspace.findMany({
      where: { spawnedFromId: { in: orderIds }, type: "SHIPMENT" },
    });
    if (shipments.length < orderIds.length) {
      if (
        await upsertControlTowerAlert(db, {
          workspaceId: ws.id,
          alertKey: AlertKey.SC_SHIPMENT_PENDING,
          severity: "WARNING",
          category: "MIXED_CONTAINER",
          workspaceType: "MIXED_CONTAINER",
          title: "SmartContainer shipment pending",
          description: `${ws.externalRef} awaiting shipment spawn for all supplier orders.`,
        })
      ) {
        n++;
      }
    }
  }

  const executionComplete = await db.workspace.findMany({
    where: {
      type: "MIXED_CONTAINER",
      state: "MC_EXECUTION_COMPLETE",
      updatedAt: { gte: new Date(now.getTime() - H_24) },
    },
    take: 30,
  });
  for (const ws of executionComplete) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: ws.id,
        alertKey: AlertKey.SC_EXECUTION_COMPLETE,
        severity: "INFO",
        category: "MIXED_CONTAINER",
        workspaceType: "MIXED_CONTAINER",
        title: "SmartContainer execution complete",
        description: `${ws.externalRef} all linked shipments completed.`,
      })
    ) {
      n++;
    }
  }

  return n;
}
