import type { PrismaClient } from "@prisma/client";
import { exceedsInactivityThreshold, formatDaysSinceActivity } from "@dmx/contracts/activity-days";
import { AlertKey } from "@dmx/contracts/control-tower";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
import { ScalePortfolioService } from "./scale-portfolio.service.js";
import { ScaleWorkloadService } from "./scale-workload.service.js";
import { ScaleForecastService } from "./scale-forecast.service.js";
import { ScalePipelineService } from "./scale-pipeline.service.js";
import { isTestWorkspace } from "../control-tower/test-workspace.js";

const INACTIVE_DAYS = 30;
const H_30 = 30 * 86_400_000;

/** Sprint 7A — scale readiness control-tower alerts (additive). */
export async function scanScaleReadinessAlerts(db: PrismaClient): Promise<number> {
  let n = 0;
  const portfolio = new ScalePortfolioService(db);
  const workload = new ScaleWorkloadService(db);
  const forecast = new ScaleForecastService(db);
  const pipeline = new ScalePipelineService(db);

  const buyers = await portfolio.listBuyerHealth();
  for (const b of buyers) {
    if (!exceedsInactivityThreshold(b.activity.daysSinceActivity, INACTIVE_DAYS)) continue;
    const anchor = await db.workspace.findFirst({
      where: { type: "RFQ", createdById: { in: b.buyerUserIds } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (!anchor) continue;
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor.id,
        alertKey: AlertKey.CUSTOMER_INACTIVE_30D,
        severity: "WARNING",
        category: "ACCOUNT",
        workspaceType: "RFQ",
        title: "Buyer inactive 30+ days",
        description: `${b.organisationName} has had no activity for ${formatDaysSinceActivity(b.activity.daysSinceActivity)}.`,
      })
    ) n++;
  }

  const suppliers = await portfolio.listSupplierHealth();
  for (const s of suppliers) {
    if (!exceedsInactivityThreshold(s.activity.daysSinceActivity, INACTIVE_DAYS)) continue;
    const anchor = await db.workspaceParticipant.findFirst({
      where: { userId: { in: s.supplierUserIds } },
      orderBy: { joinedAt: "desc" },
      select: { workspaceId: true },
    });
    if (!anchor) continue;
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor.workspaceId,
        alertKey: AlertKey.SUPPLIER_INACTIVE_30D,
        severity: "WARNING",
        category: "ACCOUNT",
        workspaceType: "ORDER",
        title: "Supplier inactive 30+ days",
        description: `${s.organisationName} inactive (${formatDaysSinceActivity(s.activity.daysSinceActivity)}).`,
      })
    ) n++;
  }

  const pipe = await pipeline.getPipelineHealth();
  for (const item of pipe.items.filter((i) => i.stalled).slice(0, 20)) {
    if (await isTestWorkspace(db, item.workspaceId)) continue;
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: item.workspaceId,
        alertKey: AlertKey.PIPELINE_STALLED,
        severity: "WARNING",
        category: "SYSTEM",
        workspaceType: item.workspaceType,
        title: "Pipeline stalled",
        description: `${item.workspaceRef} health ${item.healthScore}/100: ${item.issues.join(", ")}`,
      })
    ) n++;
  }

  const operators = await workload.getOperatorWorkload();
  for (const op of operators.filter((o) => o.overloaded)) {
    const anchor = await db.workspace.findFirst({
      where: { type: "ORDER" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!anchor) continue;
    const existing = await db.controlTowerAlert.findFirst({
      where: {
        alertKey: AlertKey.OPERATOR_OVERLOADED,
        resolvedAt: null,
        description: { contains: op.email },
      },
    });
    if (existing) continue;
    try {
      await db.controlTowerAlert.create({
        data: {
          workspaceId: anchor.id,
          alertKey: AlertKey.OPERATOR_OVERLOADED,
          severity: "WARNING",
          category: "SYSTEM",
          workspaceType: "ORDER",
          title: "Operator overloaded",
          description: `${op.displayName} (${op.email}) load ${op.totalLoad} items.`,
        },
      });
      n++;
    } catch {
      /* dedupe */
    }
  }

  const f30 = await forecast.getForecast(30);
  const lastMonth = await db.freightRevenueLedger.aggregate({
    where: {
      status: "REALIZED",
      realizedAt: {
        gte: new Date(Date.now() - H_30 * 2),
        lt: new Date(Date.now() - H_30),
      },
    },
    _sum: { freightiqMarginUsd: true },
  });
  const prior = Number(lastMonth._sum.freightiqMarginUsd ?? 0);
  if (prior > 100 && f30.expectedFreightiqRevenueUsd < prior * 0.8) {
    const anchor = await db.workspace.findFirst({
      where: { type: "ORDER" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (anchor) {
      const existing = await db.controlTowerAlert.findFirst({
        where: { alertKey: AlertKey.FORECAST_DECLINE, resolvedAt: null },
      });
      if (!existing) {
        try {
          await db.controlTowerAlert.create({
            data: {
              workspaceId: anchor.id,
              alertKey: AlertKey.FORECAST_DECLINE,
              severity: "INFO",
              category: "SYSTEM",
              workspaceType: "ORDER",
              title: "Revenue forecast decline",
              description: `30d forecast ${f30.expectedFreightiqRevenueUsd} USD vs prior month ${prior} USD.`,
            },
          });
          n++;
        } catch {
          /* dedupe */
        }
      }
    }
  }

  return n;
}
