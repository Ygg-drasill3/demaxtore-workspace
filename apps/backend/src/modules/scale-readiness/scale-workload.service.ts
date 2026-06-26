import type { PrismaClient } from "@prisma/client";
import type { OperatorWorkload } from "@dmx/contracts/scale-readiness";

const OVERLOAD_THRESHOLD = 20;

export class ScaleWorkloadService {
  constructor(private readonly db: PrismaClient) {}

  async getOperatorWorkload(): Promise<OperatorWorkload[]> {
    const admins = await this.db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, displayName: true, email: true },
    });
    const ownerships = await this.db.accountOwnership.findMany({
      select: { organisationId: true, operationsUserId: true },
    });
    const orgsByOps = new Map<string, string[]>();
    for (const o of ownerships) {
      if (!o.operationsUserId) continue;
      const list = orgsByOps.get(o.operationsUserId) ?? [];
      list.push(o.organisationId);
      orgsByOps.set(o.operationsUserId, list);
    }

    const results: OperatorWorkload[] = [];
    for (const admin of admins) {
      const orgIds = orgsByOps.get(admin.id) ?? [];
      const buyerIds =
        orgIds.length > 0
          ? (
              await this.db.user.findMany({
                where: { organisationId: { in: orgIds }, role: "BUYER" },
                select: { id: true },
              })
            ).map((u) => u.id)
          : [];

      const rfqWhere =
        buyerIds.length > 0
          ? {
              type: "RFQ" as const,
              createdById: { in: buyerIds },
              state: { notIn: ["CANCELLED", "EXPIRED", "CLOSED_NO_AWARD", "PO_ISSUED"] },
            }
          : { type: "RFQ" as const, id: "00000000-0000-0000-0000-000000000000" };

      const activeRfqs = buyerIds.length ? await this.db.workspace.count({ where: rfqWhere }) : 0;

      let orderIds: string[] = [];
      if (buyerIds.length > 0) {
        const rfqIds = (
          await this.db.workspace.findMany({
            where: { type: "RFQ", createdById: { in: buyerIds } },
            select: { id: true },
          })
        ).map((r) => r.id);
        orderIds = rfqIds.length
          ? (
              await this.db.workspace.findMany({
                where: {
                  type: "ORDER",
                  spawnedFromId: { in: rfqIds },
                  state: { notIn: ["COMPLETED", "CANCELLED", "DISPUTED"] },
                },
                select: { id: true },
              })
            ).map((o) => o.id)
          : [];
      }

      const activeOrders = orderIds.length;
      const activeShipments = orderIds.length
        ? await this.db.workspace.count({
            where: {
              type: "SHIPMENT",
              spawnedFromId: { in: orderIds },
              state: { notIn: ["DELIVERED", "CANCELLED"] },
            },
          })
        : 0;

      const openAlerts =
        orderIds.length > 0
          ? await this.db.controlTowerAlert.count({
              where: {
                resolvedAt: null,
                workspaceId: {
                  in: [
                    ...orderIds,
                    ...(await this.db.workspace.findMany({
                      where: { spawnedFromId: { in: orderIds }, type: "RFQ" },
                      select: { id: true },
                    })).map((w) => w.id),
                  ],
                },
              },
            })
          : await this.db.controlTowerAlert.count({ where: { resolvedAt: null } });

      const openDocuments = orderIds.length
        ? await this.db.tradeDocument.count({
            where: {
              workspaceId: { in: orderIds },
              status: { in: ["MISSING", "REJECTED", "PENDING_REVIEW"] },
            },
          })
        : 0;

      const totalLoad = activeRfqs + activeOrders + activeShipments + openAlerts + openDocuments;

      results.push({
        userId: admin.id,
        displayName: admin.displayName,
        email: admin.email,
        activeRfqs,
        activeOrders,
        activeShipments,
        openAlerts: Math.min(openAlerts, 99),
        openDocuments,
        totalLoad,
        overloaded: totalLoad >= OVERLOAD_THRESHOLD,
      });
    }

    return results.sort((a, b) => b.totalLoad - a.totalLoad);
  }
}
