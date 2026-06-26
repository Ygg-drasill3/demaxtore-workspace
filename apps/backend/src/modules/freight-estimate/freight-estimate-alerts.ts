import type { PrismaClient } from "@prisma/client";
import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";

const EXPIRING_SOON_MS = 48 * 3_600_000;

export async function scanFreightEstimateAlerts(db: PrismaClient): Promise<number> {
  let n = 0;
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRING_SOON_MS);

  const expiring = await db.freightEstimate.findMany({
    where: { status: "ACTIVE", expiresAt: { gt: now, lte: soon } },
    include: { trade: { select: { externalRef: true, type: true } } },
    orderBy: { expiresAt: "asc" },
    take: 50,
  });
  for (const est of expiring) {
    if (await upsertControlTowerAlert(db, {
      workspaceId: est.tradeId,
      alertKey: AlertKey.FREIGHT_ESTIMATE_EXPIRING_SOON,
      severity: "WARNING",
      category: "FREIGHT",
      workspaceType: est.trade.type,
      title: "Freight estimate expiring soon",
      description: `Indicative freight estimate for ${est.trade.externalRef} expires ${est.expiresAt.toISOString().slice(0, 10)}.`,
    })) n++;
  }

  const expired = await db.freightEstimate.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
    include: { trade: { select: { externalRef: true, type: true, state: true } } },
    orderBy: { expiresAt: "asc" },
    take: 50,
  });
  for (const est of expired) {
    await db.freightEstimate.update({ where: { id: est.id }, data: { status: "EXPIRED" } });
    if (await upsertControlTowerAlert(db, {
      workspaceId: est.tradeId,
      alertKey: AlertKey.FREIGHT_ESTIMATE_EXPIRED,
      severity: "WARNING",
      category: "FREIGHT",
      workspaceType: est.trade.type,
      title: "Freight estimate expired",
      description: `Indicative freight estimate for ${est.trade.externalRef} has expired.`,
    })) n++;
  }

  const poReadyStates = ["PROFORMA_APPROVED", "APPROVED", "MC_EXECUTION_READY", "BC_EXECUTION_READY"];
  const roots = await db.workspace.findMany({
    where: {
      type: { in: ["RFQ", "COMMODITYBID", "MIXED_CONTAINER", "BULK_CONTAINER"] },
      state: { in: poReadyStates },
    },
    select: { id: true, externalRef: true, type: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  for (const ws of roots) {
    const active = await db.freightEstimate.findFirst({
      where: { tradeId: ws.id, status: "ACTIVE", expiresAt: { gt: now } },
    });
    if (active) continue;
    const hadEstimate = await db.freightEstimate.findFirst({
      where: { tradeId: ws.id },
      orderBy: { estimatedAt: "desc" },
    });
    if (!hadEstimate) continue;
    if (await upsertControlTowerAlert(db, {
      workspaceId: ws.id,
      alertKey: AlertKey.FREIGHT_ESTIMATE_REFRESH_REQUIRED,
      severity: "CRITICAL",
      category: "FREIGHT",
      workspaceType: ws.type,
      title: "Freight estimate refresh required",
      description: `${ws.externalRef} needs a refreshed indicative freight estimate before PO approval.`,
    })) n++;
  }

  return n;
}
