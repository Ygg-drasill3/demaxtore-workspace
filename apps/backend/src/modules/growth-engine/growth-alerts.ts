import type { PrismaClient } from "@prisma/client";
import { exceedsInactivityThreshold, formatDaysSinceActivity, isUnknownActivityDays } from "@dmx/contracts/activity-days";
import { AlertKey } from "@dmx/contracts/control-tower";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { upsertControlTowerAlert } from "../tracking/tracking-alerts.js";
import { GrowthService } from "./growth.service.js";
import { workspaceExcludesTestData } from "../control-tower/test-workspace.js";

const INACTIVE_DAYS = 45;
const STALL_DAYS = 14;

/** Sprint 7B — growth alerts (additive; does not modify Control Tower core). */
export async function scanGrowthAlerts(db: PrismaClient): Promise<number> {
  let n = 0;
  const growth = new GrowthService(db);

  const buyers = await growth.getBuyerActivation();
  for (const b of buyers.filter(
    (x) => x.classification === "Cold" && exceedsInactivityThreshold(x.daysSinceActivity, INACTIVE_DAYS),
  )) {
    const anchor = await db.workspace.findFirst({
      where: { type: "RFQ", createdById: { in: b.buyerUserIds } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (!anchor) continue;
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor.id,
        alertKey: AlertKey.GROWTH_BUYER_INACTIVE,
        severity: "WARNING",
        category: "ACCOUNT",
        workspaceType: "RFQ",
        title: "Growth: buyer inactive",
        description: `${b.organisationName} inactive (${formatDaysSinceActivity(b.daysSinceActivity)}) — activation ${b.classification}.`,
      })
    ) {
      n++;
      socketBus.emitToRole("ADMIN", SocketEvents.GROWTH_ALERT_GENERATED, { kind: "buyer.inactive", orgId: b.organisationId });
    }
  }

  const suppliers = await growth.getSupplierPerformance();
  for (const s of suppliers.filter((x) => x.classification === "Inactive")) {
    const part = await db.workspaceParticipant.findFirst({
      where: { userId: { in: s.supplierUserIds } },
      select: { workspaceId: true },
    });
    if (!part) continue;
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: part.workspaceId,
        alertKey: AlertKey.GROWTH_SUPPLIER_INACTIVE,
        severity: "WARNING",
        category: "ACCOUNT",
        workspaceType: "ORDER",
        title: "Growth: supplier inactive",
        description: `${s.organisationName} has not quoted recently.`,
      })
    ) {
      n++;
      socketBus.emitToRole("ADMIN", SocketEvents.GROWTH_ALERT_GENERATED, { kind: "supplier.inactive" });
    }
  }

  for (const b of buyers.filter(
    (x) => x.classification === "Active" && !isUnknownActivityDays(x.daysSinceActivity) && x.daysSinceActivity >= 21,
  )) {
    const anchor = await db.workspace.findFirst({
      where: { type: "RFQ", createdById: { in: b.buyerUserIds } },
      orderBy: { updatedAt: "desc" },
    });
    if (!anchor) continue;
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: anchor.id,
        alertKey: AlertKey.GROWTH_REPEAT_BUYER_AT_RISK,
        severity: "INFO",
        category: "ACCOUNT",
        workspaceType: "RFQ",
        title: "Repeat buyer at risk",
        description: `${b.organisationName} was active but quiet for ${formatDaysSinceActivity(b.daysSinceActivity)}.`,
      })
    ) n++;
  }

  const staleRfqs = await db.workspace.findMany({
    where: {
      type: "RFQ",
      state: { notIn: ["RFQ_DRAFT", "PO_ISSUED", "CLOSED", "CANCELLED", "CLOSED_NO_AWARD", "EXPIRED"] },
      updatedAt: { lte: new Date(Date.now() - STALL_DAYS * 86_400_000) },
      ...workspaceExcludesTestData(),
    },
    take: 20,
    select: { id: true, externalRef: true, state: true },
  });
  for (const r of staleRfqs) {
    if (
      await upsertControlTowerAlert(db, {
        workspaceId: r.id,
        alertKey: AlertKey.GROWTH_RFQ_STALLED,
        severity: "WARNING",
        category: "RFQ",
        workspaceType: "RFQ",
        title: "Growth: RFQ stalled",
        description: `${r.externalRef} in ${r.state} with no updates ${STALL_DAYS}+ days.`,
      })
    ) n++;
  }

  const lost = await growth.getLostOpportunities();
  if (lost.items.length >= 5) {
    const anchor = await db.workspace.findFirst({
      where: { type: "RFQ" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (anchor) {
      const existing = await db.controlTowerAlert.findFirst({
        where: { alertKey: AlertKey.GROWTH_PIPELINE_LEAKAGE, resolvedAt: null },
      });
      if (!existing) {
        try {
          await db.controlTowerAlert.create({
            data: {
              workspaceId: anchor.id,
              alertKey: AlertKey.GROWTH_PIPELINE_LEAKAGE,
              severity: "WARNING",
              category: "SYSTEM",
              workspaceType: "RFQ",
              title: "Pipeline revenue leakage",
              description: `${lost.items.length} lost opportunities; est. ${lost.totalEstimatedLostFreightiqRevenueUsd} USD FreightIQ margin at risk.`,
            },
          });
          n++;
          socketBus.emitToRole("ADMIN", SocketEvents.GROWTH_ALERT_GENERATED, { kind: "pipeline.leakage" });
        } catch {
          /* dedupe */
        }
      }
    }
  }

  const funnel = await growth.getFunnel();
  const submit = funnel.stages.find((s) => s.stage === "rfq_submitted");
  const po = funnel.stages.find((s) => s.stage === "po_issued");
  if (submit && po && submit.count > 10 && po.conversionPercent < 15) {
    const anchor = await db.workspace.findFirst({ where: { type: "RFQ" }, select: { id: true } });
    if (anchor) {
      const existing = await db.controlTowerAlert.findFirst({
        where: { alertKey: AlertKey.GROWTH_CONVERSION_DROP, resolvedAt: null },
      });
      if (!existing) {
        try {
          await db.controlTowerAlert.create({
            data: {
              workspaceId: anchor.id,
              alertKey: AlertKey.GROWTH_CONVERSION_DROP,
              severity: "CRITICAL",
              category: "SYSTEM",
              workspaceType: "RFQ",
              title: "Conversion drop detected",
              description: `RFQ→PO conversion ${po.conversionPercent}% below target.`,
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
