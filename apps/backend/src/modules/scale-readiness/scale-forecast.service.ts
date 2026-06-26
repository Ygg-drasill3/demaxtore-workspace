import type { PrismaClient } from "@prisma/client";
import type { CommercialForecast } from "@dmx/contracts/scale-readiness";

export class ScaleForecastService {
  constructor(private readonly db: PrismaClient) {}

  async getForecast(horizonDays: 30 | 60 | 90): Promise<CommercialForecast> {
    const pending = await this.db.freightRevenueLedger.aggregate({
      where: { status: "PENDING" },
      _sum: { freightiqMarginUsd: true },
      _count: true,
    });
    const realized30 = await this.db.freightRevenueLedger.aggregate({
      where: {
        status: "REALIZED",
        realizedAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      _sum: { freightiqMarginUsd: true },
    });
    const dailyRealized = Number(realized30._sum.freightiqMarginUsd ?? 0) / 30;

    const activeOrders = await this.db.workspace.count({
      where: {
        type: "ORDER",
        state: {
          notIn: ["COMPLETED", "CANCELLED", "DISPUTED"],
        },
      },
    });
    const activeShipments = await this.db.workspace.count({
      where: {
        type: "SHIPMENT",
        state: { notIn: ["DELIVERED", "CANCELLED"] },
      },
    });
    const activeFreight = await this.db.freightRequest.count({
      where: { status: { in: ["REQUESTED", "QUOTING", "QUOTED", "SELECTED"] } },
    });

    const pendingMargin = Number(pending._sum.freightiqMarginUsd ?? 0);
    const projected = dailyRealized * horizonDays * 0.85;
    const expectedFreightiqRevenueUsd = Math.round((pendingMargin + projected) * 100) / 100;
    const expectedMarginUsd = expectedFreightiqRevenueUsd;
    const containerFactor = Math.max(1, activeShipments + Math.floor(pending._count / 2));
    const expectedContainerCount = Math.ceil(
      containerFactor * (horizonDays / 30) + activeFreight * 0.3,
    );
    const expectedOrders = Math.ceil(activeOrders * (horizonDays / 45));
    const expectedShipments = Math.ceil(activeShipments * (horizonDays / 40));

    await this.auditForecast(horizonDays, expectedFreightiqRevenueUsd);

    return {
      horizonDays,
      expectedFreightiqRevenueUsd,
      expectedContainerCount,
      expectedOrders,
      expectedShipments,
      expectedMarginUsd,
      generatedAt: new Date().toISOString(),
    };
  }

  private async auditForecast(horizonDays: number, revenue: number) {
    const anchor = await this.db.workspace.findFirst({
      where: { type: "ORDER" },
      orderBy: { createdAt: "asc" },
      select: { id: true, state: true },
    });
    if (!anchor) return;
    await this.db.auditLog.create({
      data: {
        workspaceId: anchor.id,
        actorUserId: "00000000-0000-0000-0000-000000000001",
        actorEmail: "system@demaxtore.local",
        actorRole: "SYSTEM",
        action: "forecast.generated",
        fromState: anchor.state,
        toState: anchor.state,
        payload: { horizonDays, expectedFreightiqRevenueUsd: revenue },
      },
    }).catch(() => undefined);
  }
}
