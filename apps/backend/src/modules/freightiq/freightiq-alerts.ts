import type { PrismaClient } from "@prisma/client";
import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";

const H_72 = 72 * 3_600_000;

/** FreightIQ control-tower scans (additive; does not change existing alert rules). */
export async function scanFreightAlerts(db: PrismaClient): Promise<number> {
  let n = 0;
  const now = new Date();
  const cutoff = new Date(now.getTime() - H_72);

  const stale = await db.freightRequest.findMany({
    where: {
      status: { in: ["REQUESTED", "QUOTING"] },
      createdAt: { lte: cutoff },
    },
    include: { order: { select: { externalRef: true } }, offers: { where: { status: "ACTIVE" } } },
    take: 50,
  });
  for (const fr of stale) {
    if (fr.offers.length > 0) continue;
    if (await upsertControlTowerAlert(db, {
      workspaceId: fr.orderId,
      alertKey: AlertKey.FREIGHT_NO_OFFER_72H,
      severity: "WARNING",
      category: "FREIGHT",
      workspaceType: "ORDER",
      title: "Freight request without offers",
      description: `Order ${fr.order.externalRef} freight request open >72h with no offers.`,
    })) n++;
  }

  const expiredOffers = await db.freightOffer.findMany({
    where: { status: "ACTIVE", validUntil: { lte: now } },
    include: { freightRequest: { include: { order: { select: { id: true, externalRef: true } } } } },
    take: 50,
  });
  for (const o of expiredOffers) {
    await db.freightOffer.update({ where: { id: o.id }, data: { status: "EXPIRED" } });
    if (await upsertControlTowerAlert(db, {
      workspaceId: o.freightRequest.order.id,
      alertKey: AlertKey.FREIGHT_OFFER_EXPIRED,
      severity: "WARNING",
      category: "FREIGHT",
      workspaceType: "ORDER",
      title: "Freight offer expired",
      description: `Offer from ${o.providerName} on ${o.freightRequest.order.externalRef} expired.`,
    })) n++;
  }

  const selectedNoShip = await db.freightSelection.findMany({
    where: { shipmentWorkspaceId: null },
    include: { freightRequest: { include: { order: { select: { id: true, externalRef: true } } } } },
    take: 50,
  });
  for (const s of selectedNoShip) {
    if (s.freightRequest.status !== "SELECTED") continue;
    if (await upsertControlTowerAlert(db, {
      workspaceId: s.freightRequest.order.id,
      alertKey: AlertKey.FREIGHT_SELECTED_NO_SHIPMENT,
      severity: "CRITICAL",
      category: "FREIGHT",
      workspaceType: "ORDER",
      title: "Freight selected without shipment linkage",
      description: `Order ${s.freightRequest.order.externalRef} has selected freight but no shipment link.`,
    })) n++;
  }

  const { scanFreightCommunicationAlerts } = await import("./freight-communications-alerts.js");
  n += await scanFreightCommunicationAlerts(db);

  const { scanFreightCommercialAlerts } = await import("./commercial/freight-commercial-alerts.js");
  n += await scanFreightCommercialAlerts(db);

  return n;
}
