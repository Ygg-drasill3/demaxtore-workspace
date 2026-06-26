import type { PrismaClient, Workspace } from "@prisma/client";
import type { AuthUser } from "../order/order.policy.js";
import type {
  AttentionRequiredItem,
  CarrierDistributionItem,
  ImportControlTowerDashboard,
  ImportControlTowerKpis,
  ImportControlTowerQuery,
  LiveActivityItem,
  OperationalRiskItem,
  TradePipelineStage,
  UpcomingMilestoneItem,
} from "@dmx/contracts/import-control-tower";
import { collectTradeGraph, tradeRefFromRoot } from "../trade/trade.resolver.js";
import { findAccessibleTradeRoots } from "./control-tower.policy.js";
import { isTestWorkspace, shouldExcludeTestData } from "./test-workspace.js";
import { TradeTimelineService } from "../trade-timeline/trade-timeline.service.js";
import { FreightBookingEngineService } from "../freight-booking/freight-booking.service.js";

const PRODUCTION_STATES = new Set([
  "PRODUCTION_STARTED", "PRODUCTION_COMPLETED", "PRODUCTION_IN_PROGRESS",
  "INSPECTION_PENDING", "INSPECTION_COMPLETED", "INSPECTION_REQUESTED",
]);
const TRANSIT_STATES = new Set([
  "IN_TRANSIT", "LOADED_ON_VESSEL", "DEPARTED_ORIGIN_PORT",
  "ARRIVED_DESTINATION_PORT", "BOOKING_CONFIRMED",
]);
const COMPLETED_STATES = new Set(["DELIVERED", "CLOSED", "COMPLETED"]);
const RFQ_EARLY = new Set(["DRAFT", "RFQ_SUBMITTED", "RFQ_OPEN", "UNDER_EVALUATION", "QUOTATIONS_CLOSED"]);
const SUPPLIER_SEL = new Set(["SUPPLIER_SELECTED", "PROFORMA_REQUESTED", "PROFORMA_RECEIVED", "PROFORMA_APPROVED"]);

type TradeContext = {
  root: Workspace;
  tradeRef: string;
  graph: Awaited<ReturnType<typeof collectTradeGraph>>;
  orderStates: string[];
  shipmentStates: string[];
  hasPo: boolean;
  hasBooking: boolean;
  buyerName: string | null;
  supplierName: string | null;
};

function pipelineStage(ctx: TradeContext): string {
  if (ctx.shipmentStates.some((s) => COMPLETED_STATES.has(s))) return "delivery";
  if (ctx.shipmentStates.length > 0 || ctx.shipmentStates.some((s) => TRANSIT_STATES.has(s))) return "shipment";
  if (ctx.hasBooking) return "booking";
  if (ctx.orderStates.some((s) => PRODUCTION_STATES.has(s))) return "production";
  if (ctx.hasPo) return "po";
  if (SUPPLIER_SEL.has(ctx.root.state)) return "supplier";
  if (RFQ_EARLY.has(ctx.root.state) || ctx.root.type === "RFQ") return "rfq";
  return "rfq";
}

function priorityFromSeverity(sev: string): AttentionRequiredItem["priority"] {
  if (sev === "CRITICAL" || sev === "Critical") return "Critical";
  if (sev === "WARNING" || sev === "High") return "High";
  if (sev === "Medium") return "Medium";
  return "Low";
}

function matchesQuery(ctx: TradeContext, q: string): boolean {
  const hay = [
    ctx.tradeRef,
    ctx.root.externalRef,
    ctx.buyerName ?? "",
    ctx.supplierName ?? "",
  ].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

export class ControlTowerAggregator {
  private readonly timelineSvc: TradeTimelineService;

  constructor(private readonly db: PrismaClient) {
    this.timelineSvc = new TradeTimelineService(db);
  }

  async buildDashboard(
    actor: AuthUser,
    query: ImportControlTowerQuery = {},
  ): Promise<ImportControlTowerDashboard> {
    const roots = await findAccessibleTradeRoots(this.db, actor);
    const contexts: TradeContext[] = [];

    for (const root of roots.slice(0, 100)) {
      if (shouldExcludeTestData() && await isTestWorkspace(this.db, root.id)) continue;
      const graph = await collectTradeGraph(this.db, root);
      const [orders, shipments, pos, booking] = await Promise.all([
        graph.orderIds.length
          ? this.db.workspace.findMany({ where: { id: { in: graph.orderIds } }, select: { state: true } })
          : [],
        graph.shipmentIds.length
          ? this.db.workspace.findMany({ where: { id: { in: graph.shipmentIds } }, select: { state: true } })
          : [],
        graph.orderIds.length
          ? this.db.purchaseOrder.count({ where: { orderId: { in: graph.orderIds } } })
          : 0,
        this.db.freightBooking.findFirst({ where: { tradeId: root.id }, select: { id: true } }),
      ]);

      const buyerPart = await this.db.workspaceParticipant.findFirst({
        where: { workspaceId: root.id, participantRole: "OWNER", leftAt: null },
        include: { user: { select: { displayName: true } } },
      });
      const supplierPart = await this.db.workspaceParticipant.findFirst({
        where: { workspaceId: root.id, participantRole: "COUNTERPARTY", leftAt: null },
        include: { user: { select: { displayName: true } } },
      });

      const ctx: TradeContext = {
        root,
        tradeRef: tradeRefFromRoot(root),
        graph,
        orderStates: orders.map((o) => o.state),
        shipmentStates: shipments.map((s) => s.state),
        hasPo: pos > 0,
        hasBooking: !!booking,
        buyerName: buyerPart?.user.displayName ?? null,
        supplierName: supplierPart?.user.displayName ?? null,
      };

      if (query.q && !matchesQuery(ctx, query.q)) continue;
      if (query.supplier && !(ctx.supplierName ?? "").toLowerCase().includes(query.supplier.toLowerCase())) continue;
      if (query.status && !ctx.root.state.toLowerCase().includes(query.status.toLowerCase())) continue;

      contexts.push(ctx);
    }

    const tradeIds = contexts.map((c) => c.root.id);
    const allWsIds = [...new Set(contexts.flatMap((c) => c.graph.allWorkspaceIds))];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekEnd = new Date(now.getTime() + 7 * 86_400_000);

    const [
      timelineKpis,
      bookingKpis,
      activityRows,
      openAlerts,
      openExceptions,
      trackingSnaps,
      forecasts,
      carrierOptions,
    ] = await Promise.all([
      this.timelineSvc.countKpis(actor),
      new FreightBookingEngineService(this.db).countKpis(),
      tradeIds.length
        ? this.db.tradeTimelineEvent.findMany({
            where: { tradeId: { in: tradeIds } },
            orderBy: { occurredAt: "desc" },
            take: 40,
          })
        : [],
      allWsIds.length
        ? this.db.controlTowerAlert.findMany({
            where: { workspaceId: { in: allWsIds }, resolvedAt: null },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : [],
      tradeIds.length
        ? this.db.tradeException.findMany({
            where: { tradeRootId: { in: tradeIds }, status: { notIn: ["Resolved", "Closed"] } },
            orderBy: { createdAt: "desc" },
            take: 30,
          })
        : [],
      allWsIds.length
        ? this.db.shipmentTrackingSnapshot.findMany({
            where: { shipmentId: { in: contexts.flatMap((c) => c.graph.shipmentIds) } },
            orderBy: { syncedAt: "desc" },
            take: 200,
          })
        : [],
      tradeIds.length
        ? this.db.cargoReadyForecast.findMany({
            where: { tradeId: { in: tradeIds }, status: { in: ["ACTIVE", "REVISED"] } },
            take: 50,
          })
        : [],
      tradeIds.length
        ? this.db.carrierOption.findMany({
            where: { tradeId: { in: tradeIds }, status: { in: ["AVAILABLE", "RECOMMENDED", "SELECTED"] } },
            take: 100,
          })
        : [],
    ]);

    let inProduction = 0;
    let atSea = 0;
    let deliveredThisMonth = 0;
    let pendingInspections = 0;
    let delayedTrades = 0;
    const pipelineCounts: Record<string, number> = {
      rfq: 0, supplier: 0, po: 0, production: 0, booking: 0, shipment: 0, delivery: 0,
    };

    for (const ctx of contexts) {
      const stage = pipelineStage(ctx);
      pipelineCounts[stage] = (pipelineCounts[stage] ?? 0) + 1;

      if (ctx.orderStates.some((s) => PRODUCTION_STATES.has(s))) inProduction++;
      if (ctx.shipmentStates.some((s) => TRANSIT_STATES.has(s))) atSea++;
      if (ctx.shipmentStates.some((s) => s === "DELIVERED" || s === "CLOSED")) {
        if (ctx.root.updatedAt >= monthStart) deliveredThisMonth++;
      }
      if (ctx.orderStates.some((s) => s === "INSPECTION_PENDING" || s === "INSPECTION_REQUESTED")) {
        pendingInspections++;
      }
      const isDelayed = ctx.shipmentStates.includes("EXCEPTION")
        || openExceptions.some((e) => e.tradeRootId === ctx.root.id);
      if (isDelayed) delayedTrades++;
    }

    const missingDocs = openAlerts.filter((a) => a.alertKey.includes("DOC") || a.category === "DOCUMENT").length;
    const criticalExceptions = openExceptions.filter((e) => e.severity === "Critical").length;

    const kpis: ImportControlTowerKpis = {
      activeTrades: timelineKpis.activeTrades,
      inProduction,
      atSea,
      deliveredThisMonth,
      delayedTrades: Math.max(timelineKpis.delayedTrades, delayedTrades),
      pendingInspections,
      missingDocuments: missingDocs,
      criticalExceptions,
    };

    const pipeline: TradePipelineStage[] = [
      { key: "rfq", label: "RFQ", count: pipelineCounts.rfq },
      { key: "supplier", label: "Supplier Selection", count: pipelineCounts.supplier },
      { key: "po", label: "PO Issued", count: pipelineCounts.po },
      { key: "production", label: "Production", count: pipelineCounts.production },
      { key: "booking", label: "Booking", count: pipelineCounts.booking },
      { key: "shipment", label: "Shipment", count: pipelineCounts.shipment },
      { key: "delivery", label: "Delivery", count: pipelineCounts.delivery },
    ];

    const refByTrade = new Map(contexts.map((c) => [c.root.id, c.tradeRef]));

    const attentionRequired: AttentionRequiredItem[] = [];

    for (const ex of openExceptions.slice(0, 15)) {
      const ref = refByTrade.get(ex.tradeRootId ?? "") ?? ex.tradeRootId ?? "—";
      attentionRequired.push({
        id: ex.id,
        kind: mapExceptionKind(ex.exceptionType),
        priority: priorityFromSeverity(ex.severity),
        title: ex.exceptionType,
        description: ex.requiredAction ?? ex.status,
        tradeId: ex.tradeRootId ?? "",
        tradeRef: ref,
        workspaceUrl: `/exceptions/${ex.id}`,
        dueAt: ex.dueDate?.toISOString() ?? null,
      });
    }

    for (const alert of openAlerts.slice(0, 15)) {
      if (attentionRequired.length >= 20) break;
      if (!alert.workspaceId) continue;
      const ctx = contexts.find((c) => c.graph.allWorkspaceIds.includes(alert.workspaceId!));
      if (!ctx) continue;
      attentionRequired.push({
        id: alert.id,
        kind: mapAlertKind(alert.alertKey, alert.category),
        priority: priorityFromSeverity(alert.severity),
        title: alert.title,
        description: alert.description,
        tradeId: ctx.root.id,
        tradeRef: ctx.tradeRef,
        workspaceUrl: `/workspace/trade/${ctx.root.id}`,
        dueAt: null,
      });
    }

    if (bookingKpis.cutoffRisks > 0) {
      attentionRequired.push({
        id: "cutoff-risk-summary",
        kind: "Cut-Off Risk",
        priority: "High",
        title: `${bookingKpis.cutoffRisks} booking cut-off risk(s)`,
        description: "Carrier cut-off dates approaching",
        tradeId: "",
        tradeRef: "—",
        workspaceUrl: "/buyer/rfq",
        dueAt: null,
      });
    }

    const activityFeed: LiveActivityItem[] = activityRows.map((e) => ({
      id: e.id,
      title: e.title,
      eventType: e.eventType,
      sourceModule: e.sourceModule,
      severity: e.severity,
      tradeId: e.tradeId,
      tradeRef: refByTrade.get(e.tradeId) ?? e.tradeId,
      occurredAt: e.occurredAt.toISOString(),
      workspaceUrl: `/workspace/trade/${e.tradeId}`,
    }));

    const upcomingMilestones: UpcomingMilestoneItem[] = [];

    for (const f of forecasts) {
      const ref = refByTrade.get(f.tradeId) ?? f.tradeId;
      const cargoDate = f.estimatedCargoReadyDate;
      if (cargoDate > now) {
        upcomingMilestones.push({
          id: `forecast-${f.id}`,
          label: "Cargo ready forecast",
          tradeId: f.tradeId,
          tradeRef: ref,
          at: cargoDate.toISOString(),
          responsibleParty: "Supplier",
          workspaceUrl: `/workspace/trade/${f.tradeId}`,
        });
      }
    }

    for (const opt of carrierOptions) {
      if (opt.cutoffDate <= now || opt.cutoffDate > weekEnd) continue;
      upcomingMilestones.push({
        id: `cutoff-${opt.id}`,
        label: `Booking deadline — ${opt.carrierName}`,
        tradeId: opt.tradeId,
        tradeRef: refByTrade.get(opt.tradeId) ?? opt.tradeId,
        at: opt.cutoffDate.toISOString(),
        responsibleParty: "Buyer",
        workspaceUrl: `/workspace/trade/${opt.tradeId}`,
      });
    }

    const latestSnapByShipment = new Map<string, typeof trackingSnaps[0]>();
    for (const s of trackingSnaps) {
      if (!latestSnapByShipment.has(s.shipmentId)) latestSnapByShipment.set(s.shipmentId, s);
    }

    for (const snap of latestSnapByShipment.values()) {
      if (!snap.eta || snap.eta <= now) continue;
      const ctx = contexts.find((c) => c.graph.shipmentIds.includes(snap.shipmentId));
      upcomingMilestones.push({
        id: `eta-${snap.id}`,
        label: "Shipment ETA",
        tradeId: ctx?.root.id ?? snap.shipmentId,
        tradeRef: ctx?.tradeRef ?? snap.shipmentId,
        at: snap.eta.toISOString(),
        responsibleParty: "Carrier",
        workspaceUrl: ctx ? `/workspace/trade/${ctx.root.id}` : `/workspace/shipment/${snap.shipmentId}`,
      });
    }

    upcomingMilestones.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const carrierMap = new Map<string, number>();
    let delayedShipments = 0;
    let onTimeShipments = 0;
    let etaSum = 0;
    let etaCount = 0;
    let containersAtSea = 0;
    let arrivalsThisWeek = 0;

    for (const snap of latestSnapByShipment.values()) {
      const carrier = normalizeCarrier(snap.carrier ?? "Others");
      carrierMap.set(carrier, (carrierMap.get(carrier) ?? 0) + 1);

      if (snap.trackingStatus === "IN_TRANSIT" || snap.trackingStatus === "DEPARTED") {
        containersAtSea++;
      }
      if (snap.delayFlag === "MINOR" || snap.delayFlag === "MAJOR") delayedShipments++;
      else if (snap.trackingStatus === "IN_TRANSIT") onTimeShipments++;

      if (snap.eta && snap.eta > now) {
        etaSum += (snap.eta.getTime() - now.getTime()) / 86_400_000;
        etaCount++;
      }
      if (snap.eta && snap.eta >= now && snap.eta <= weekEnd) arrivalsThisWeek++;
    }

    const carrierDistribution: CarrierDistributionItem[] = [...carrierMap.entries()]
      .map(([carrier, count]) => ({ carrier, count }))
      .sort((a, b) => b.count - a.count);

    const operationalRisks: OperationalRiskItem[] = openAlerts
      .filter((a) => a.workspaceId && (a.severity === "CRITICAL" || a.severity === "WARNING"))
      .slice(0, 20)
      .map((a) => {
        const wsId = a.workspaceId!;
        const ctx = contexts.find((c) => c.graph.allWorkspaceIds.includes(wsId));
        return {
          id: a.id,
          kind: mapRiskKind(a.alertKey, a.category),
          severity: priorityFromSeverity(a.severity),
          title: a.title,
          tradeId: ctx?.root.id ?? wsId,
          tradeRef: ctx?.tradeRef ?? wsId,
          workspaceUrl: ctx ? `/workspace/trade/${ctx.root.id}` : `/workspace/rfq/${wsId}`,
        };
      });

    return {
      kpis,
      pipeline,
      attentionRequired: dedupeAttentionRequired(attentionRequired).slice(0, 20),
      activityFeed,
      upcomingMilestones: upcomingMilestones.slice(0, 20),
      shipmentVisibility: {
        containersAtSea,
        averageEtaDays: etaCount > 0 ? Math.round(etaSum / etaCount) : null,
        arrivalsThisWeek,
        delayedShipments,
        onTimeShipments,
        carrierDistribution,
      },
      operationalRisks,
      refreshedAt: new Date().toISOString(),
    };
  }
}

function normalizeCarrier(name: string): string {
  const u = name.toUpperCase();
  if (u.includes("MSC")) return "MSC";
  if (u.includes("MAERSK")) return "Maersk";
  if (u.includes("CMA") || u.includes("CGM")) return "CMA CGM";
  if (u.includes("HAPAG") || u.includes("LLOYD")) return "Hapag-Lloyd";
  return "Others";
}

function mapExceptionKind(type: string): AttentionRequiredItem["kind"] {
  if (type.includes("Inspection")) return "Inspection Pending";
  if (type.includes("Document") || type.includes("Missing")) return "Document Missing";
  if (type.includes("Shipment") || type.includes("ETA")) return "ETA Delay";
  if (type.includes("Production")) return "Production Delay";
  if (type.includes("PO") || type.includes("Payment")) return "Exception Open";
  return "Exception Open";
}

function mapAlertKind(key: string, category: string): AttentionRequiredItem["kind"] {
  if (key.includes("INSPECTION")) return "Inspection Pending";
  if (key.includes("DOC") || category === "DOCUMENT") return "Document Missing";
  if (key.includes("TRACKING") || key.includes("ETA") || key.includes("SHIPMENT")) return "ETA Delay";
  if (key.includes("PRODUCTION")) return "Production Delay";
  if (key.includes("BOOKING") || key.includes("FREIGHT") || key.includes("CUTOFF")) return "Booking Pending";
  if (key.includes("CUTOFF")) return "Cut-Off Risk";
  if (key.includes("PO") || key.includes("ACK")) return "Exception Open";
  return "Exception Open";
}

const PRIORITY_RANK: Record<AttentionRequiredItem["priority"], number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

/** One row per trade + kind — keeps highest severity and most specific description. */
function dedupeAttentionRequired(items: AttentionRequiredItem[]): AttentionRequiredItem[] {
  const byKey = new Map<string, AttentionRequiredItem>();
  for (const item of items) {
    const key = `${item.tradeRef}::${item.kind}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }
    const itemRank = PRIORITY_RANK[item.priority] ?? 0;
    const existingRank = PRIORITY_RANK[existing.priority] ?? 0;
    if (itemRank > existingRank) {
      byKey.set(key, item);
    } else if (itemRank === existingRank && item.description.length > existing.description.length) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()].sort(
    (a, b) => (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0),
  );
}

function mapRiskKind(key: string, category: string): OperationalRiskItem["kind"] {
  if (key.includes("ETA") || key.includes("TRACKING")) return "ETA Delay Risk";
  if (key.includes("DOC")) return "Missing Documents";
  if (key.includes("INSPECTION")) return "Inspection Overdue";
  if (key.includes("CUTOFF") || key.includes("BOOKING")) return "Booking Cut-Off Risk";
  if (key.includes("PRODUCTION")) return "Production Delay";
  if (key.includes("FORECAST")) return "Forecast Change";
  if (key.includes("SHIPMENT")) return "Shipment Delay";
  return "Shipment Delay";
}
