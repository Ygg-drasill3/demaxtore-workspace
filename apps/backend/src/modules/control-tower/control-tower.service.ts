import type { PrismaClient } from "@prisma/client";
import type {
  BuyerPerformanceRow,
  ControlTowerAlert,
  ControlTowerFunnel,
  ControlTowerOverview,
  ControlTowerMetric,
  SlaMetricRow,
  SupplierPerformanceRow,
} from "@dmx/contracts/control-tower";
import { ListAlertsQuery, ResolveAlertBody } from "@dmx/contracts/control-tower.zod";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { AppError } from "../../utils/httpErrors.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { toAlertDto } from "./control-tower.mapper.js";
import { AlertEngine } from "./alert-engine.js";
import { formatSlaAverageHours } from "./sla-display.js";
import { cached } from "../../lib/response-cache.js";
import { FreightCommercialService } from "../freightiq/commercial/freight-commercial.service.js";
import type { FreightCommercialMetrics } from "@dmx/contracts/freight-commercial";
import {
  alertExcludesTestData,
  getTestWorkspaceIds,
  resolveOpenAlertsForTestWorkspaces,
  shouldExcludeTestData,
  workspaceExcludesTestData,
} from "./test-workspace.js";

const RFQ_FUNNEL_STATES = [
  "RFQ_SUBMITTED", "SUPPLIERS_ASSIGNED", "RFQ_OPEN", "UNDER_EVALUATION",
  "SUPPLIER_SELECTED", "PROFORMA_REQUESTED", "PO_ISSUED",
] as const;

const CB_FUNNEL_STATES = [
  "SCHEDULED", "INVITING_SUPPLIERS", "LIVE", "WINNER_IDENTIFIED",
  "AWARDS_PUBLISHED", "ACCEPTANCE_COMPLETE",
] as const;

const ORDER_FUNNEL_STATES = [
  "ORDER_CREATED", "SUPPLIER_CONFIRMED", "PRODUCTION_IN_PROGRESS",
  "INSPECTION_REQUESTED", "FREIGHT_REQUESTED", "IN_TRANSIT", "DELIVERED",
] as const;

const SHIPMENT_FUNNEL_STATES = [
  "SHIPMENT_CREATED", "BOOKING_CONFIRMED", "IN_TRANSIT",
  "CUSTOMS_CLEARANCE", "DELIVERED", "COMPLETED",
] as const;

export class ControlTowerService {
  private readonly engine: AlertEngine;
  private readonly commercial: FreightCommercialService;

  constructor(private readonly db: PrismaClient) {
    this.engine = new AlertEngine(db);
    this.commercial = new FreightCommercialService(db);
  }

  async runAlertScan(opts?: { preserveTestWorkspaces?: boolean }): Promise<number> {
    return this.engine.runFullScan(opts);
  }

  async getOverview(): Promise<ControlTowerOverview> {
    return cached("control-tower:overview", 2 * 60_000, () => this.buildOverview());
  }

  private async buildOverview(): Promise<ControlTowerOverview> {
    if (shouldExcludeTestData()) {
      await resolveOpenAlertsForTestWorkspaces(this.db);
    }
    const testIds = await getTestWorkspaceIds(this.db);
    const openWhere = openAlertWhere(testIds);
    const [open, critical, warning, funnels] = await Promise.all([
      this.db.controlTowerAlert.count({ where: openWhere }),
      this.db.controlTowerAlert.count({ where: { ...openWhere, severity: "CRITICAL" } }),
      this.db.controlTowerAlert.count({ where: { ...openWhere, severity: "WARNING" } }),
      this.buildFunnels(),
    ]);

    const overdueItems = critical + warning;

    const widgets = funnels.map((f) => ({
      id: `funnel-${f.workspaceType.toLowerCase()}`,
      title: f.title,
      description: `${f.stages.reduce((s, st) => s + st.count, 0)} active in pipeline`,
      metrics: f.stages.slice(0, 4).map((st) => ({
        key: st.state,
        label: st.label,
        value: st.count,
      })),
    }));

    return {
      widgets,
      openAlerts: open,
      criticalAlerts: critical,
      warningAlerts: warning,
      overdueItems,
      excludesTestData: shouldExcludeTestData(),
    };
  }

  async listAlerts(
    query: ListAlertsQuery,
    opts?: { includeTestData?: boolean },
  ): Promise<{ items: ControlTowerAlert[]; total: number }> {
    const testIds = opts?.includeTestData ? [] : await getTestWorkspaceIds(this.db);
    const filters: Record<string, unknown> = {};
    if (query.severity) filters.severity = query.severity;
    if (query.category) filters.category = query.category;
    if (query.workspaceId) filters.workspaceId = query.workspaceId;
    if (query.alertKey) filters.alertKey = query.alertKey;
    if (query.resolved === "true") filters.resolvedAt = { not: null };
    if (query.resolved === "false") filters.resolvedAt = null;

    const exclude = alertExcludesTestData(testIds);
    const where =
      Object.keys(exclude).length > 0
        ? { AND: [filters, exclude] }
        : filters;

    const [rows, total] = await Promise.all([
      this.db.controlTowerAlert.findMany({
        where,
        orderBy: [{ resolvedAt: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
        skip: query.offset,
        take: query.limit,
        include: { workspace: { select: { externalRef: true } } },
      }),
      this.db.controlTowerAlert.count({ where }),
    ]);
    return { items: rows.map(toAlertDto), total };
  }

  async getAlert(id: string): Promise<ControlTowerAlert> {
    const row = await this.db.controlTowerAlert.findUnique({
      where: { id },
      include: { workspace: { select: { externalRef: true } } },
    });
    if (!row) throw new AppError(404, "ALERT_NOT_FOUND");
    return toAlertDto(row);
  }

  async resolveAlert(id: string, actor: { id: string }, _body: ResolveAlertBody): Promise<ControlTowerAlert> {
    const row = await this.db.controlTowerAlert.findUnique({ where: { id } });
    if (!row) throw new AppError(404, "ALERT_NOT_FOUND");
    if (row.resolvedAt) throw new AppError(409, "ALREADY_RESOLVED");

    const updated = await this.db.controlTowerAlert.update({
      where: { id },
      data: { resolvedAt: new Date(), resolvedById: actor.id },
      include: { workspace: { select: { externalRef: true } } },
    });

    await this.db.tradeException.updateMany({
      where: { alertId: id, status: { notIn: ["Resolved", "Closed"] } },
      data: { status: "Closed", closedAt: new Date(), resolvedAt: new Date() },
    });

    socketBus.emitToRole("ADMIN", SocketEvents.CONTROL_TOWER_ALERT_RESOLVED, {
      alertId: updated.id,
      resolvedAt: updated.resolvedAt!.toISOString(),
    });

    return toAlertDto(updated);
  }

  async getMetrics(): Promise<ControlTowerMetric[]> {
    return cached("control-tower:metrics", 2 * 60_000, () => this.buildMetrics());
  }

  private async buildMetrics(): Promise<ControlTowerMetric[]> {
    const overview = await this.getOverview();
    const active = await this.db.workspace.groupBy({
      by: ["type"],
      where: {
        state: { notIn: ["CANCELLED", "CLOSED", "EXPIRED", "CLOSED_NO_AWARD", "COMPLETED"] },
        ...workspaceExcludesTestData(),
      },
      _count: true,
    });

    const metrics: ControlTowerMetric[] = [
      { key: "open_alerts", label: "Open alerts", value: overview.openAlerts },
      { key: "critical_alerts", label: "Critical alerts", value: overview.criticalAlerts },
      { key: "warning_alerts", label: "Warning alerts", value: overview.warningAlerts },
    ];

    for (const row of active) {
      metrics.push({
        key: `active_${row.type.toLowerCase()}`,
        label: `Active ${row.type}`,
        value: row._count,
      });
    }

    return metrics;
  }

  async getSla(): Promise<SlaMetricRow[]> {
    const assignment = await this.avgHoursFromAudit("assign_suppliers", "RFQ");
    const quote = await this.avgQuoteResponseHours();
    const selection = await this.avgHoursFromAudit("select_supplier", "RFQ");
    const orderCycle = await this.avgOrderCycleHours();
    const shipmentCycle = await this.avgShipmentCycleHours();

    return [
      slaRow("rfq_assignment", "Average RFQ assignment time", assignment),
      slaRow("quote_response", "Average quote response time", quote),
      slaRow("supplier_selection", "Average supplier selection time", selection),
      slaRow("order_cycle", "Average order cycle time", orderCycle),
      slaRow("shipment_cycle", "Average shipment cycle time", shipmentCycle),
    ];
  }

  async getDashboard(): Promise<{
    overview: ControlTowerOverview;
    alerts: { items: ControlTowerAlert[]; total: number };
    sla: SlaMetricRow[];
    freightCommercial: FreightCommercialMetrics;
  }> {
    const [overview, alerts, sla, freightCommercial] = await Promise.all([
      this.getOverview(),
      this.listAlerts(ListAlertsQuery.parse({ resolved: "false", limit: 50, offset: 0 })),
      this.getSla(),
      this.commercial.getMetrics(),
    ]);
    return { overview, alerts, sla, freightCommercial };
  }

  async getSupplierPerformance(): Promise<SupplierPerformanceRow[]> {
    const suppliers = await this.db.user.findMany({
      where: { role: "SUPPLIER" },
      select: { id: true, email: true, displayName: true },
      take: 100,
    });
    if (suppliers.length === 0) return [];

    const ids = suppliers.map((s) => s.id);
    const [
      invitedRfq,
      invitedCb,
      respondedRfq,
      respondedCb,
      wonRfq,
      wonCb,
      declined,
    ] = await Promise.all([
      this.db.supplierAssignment.groupBy({
        by: ["supplierUserId"],
        where: { supplierUserId: { in: ids } },
        _count: true,
      }),
      this.db.commodityBidInvitation.groupBy({
        by: ["supplierUserId"],
        where: { supplierUserId: { in: ids }, removedAt: null },
        _count: true,
      }),
      this.db.quotation.groupBy({
        by: ["supplierUserId"],
        where: { supplierUserId: { in: ids }, status: { in: ["SUBMITTED", "REVISED"] } },
        _count: true,
      }),
      this.db.commodityBidSubmission.groupBy({
        by: ["supplierUserId"],
        where: { supplierUserId: { in: ids }, withdrawnAt: null },
        _count: true,
      }),
      this.db.rfqDetails.groupBy({
        by: ["selectedSupplierUserId"],
        where: { selectedSupplierUserId: { in: ids } },
        _count: true,
      }),
      this.db.commodityBidAward.groupBy({
        by: ["supplierUserId"],
        where: {
          supplierUserId: { in: ids },
          status: { in: ["ACCEPTED", "PUBLISHED"] },
          acceptedAt: { not: null },
        },
        _count: true,
      }),
      this.db.supplierActivityLog.groupBy({
        by: ["supplierUserId"],
        where: { supplierUserId: { in: ids }, stage: "DECLINED" },
        _count: true,
      }),
    ]);

    const invitedRfqMap = countByKey(invitedRfq, "supplierUserId");
    const invitedCbMap = countByKey(invitedCb, "supplierUserId");
    const respondedRfqMap = countByKey(respondedRfq, "supplierUserId");
    const respondedCbMap = countByKey(respondedCb, "supplierUserId");
    const wonRfqMap = countByKey(wonRfq, "selectedSupplierUserId");
    const wonCbMap = countByKey(wonCb, "supplierUserId");
    const declinedMap = countByKey(declined, "supplierUserId");

    const rows: SupplierPerformanceRow[] = suppliers.map((s) => {
      const invited = (invitedRfqMap.get(s.id) ?? 0) + (invitedCbMap.get(s.id) ?? 0);
      const responded = (respondedRfqMap.get(s.id) ?? 0) + (respondedCbMap.get(s.id) ?? 0);
      const won = (wonRfqMap.get(s.id) ?? 0) + (wonCbMap.get(s.id) ?? 0);
      return {
        supplierUserId: s.id,
        email: s.email,
        displayName: s.displayName,
        invited,
        responded,
        won,
        declined: declinedMap.get(s.id) ?? 0,
        responseRate: invited > 0 ? Math.round((responded / invited) * 1000) / 1000 : null,
        awardRate: responded > 0 ? Math.round((won / responded) * 1000) / 1000 : null,
      };
    });
    return rows.sort((a, b) => b.invited - a.invited);
  }

  async getBuyerPerformance(): Promise<BuyerPerformanceRow[]> {
    const buyers = await this.db.user.findMany({
      where: { role: "BUYER" },
      select: { id: true, email: true, displayName: true },
      take: 100,
    });
    if (buyers.length === 0) return [];

    const ids = buyers.map((b) => b.id);
    const [rfqCreated, rfqCompleted, ordersCreated, shipmentsCompleted] = await Promise.all([
      this.db.workspace.groupBy({
        by: ["createdById"],
        where: { type: "RFQ", createdById: { in: ids } },
        _count: true,
      }),
      this.db.workspace.groupBy({
        by: ["createdById"],
        where: { type: "RFQ", createdById: { in: ids }, state: { in: ["PO_ISSUED", "CLOSED"] } },
        _count: true,
      }),
      this.db.workspace.groupBy({
        by: ["createdById"],
        where: { type: "ORDER", createdById: { in: ids } },
        _count: true,
      }),
      this.db.shipmentWorkspace.groupBy({
        by: ["buyerUserId"],
        where: { buyerUserId: { in: ids }, workspace: { state: "COMPLETED" } },
        _count: true,
      }),
    ]);

    const rfqCreatedMap = countByKey(rfqCreated, "createdById");
    const rfqCompletedMap = countByKey(rfqCompleted, "createdById");
    const ordersMap = countByKey(ordersCreated, "createdById");
    const shipmentsMap = countByKey(shipmentsCompleted, "buyerUserId");

    const rows: BuyerPerformanceRow[] = buyers.map((b) => ({
      buyerUserId: b.id,
      email: b.email,
      displayName: b.displayName,
      rfqCreated: rfqCreatedMap.get(b.id) ?? 0,
      rfqCompleted: rfqCompletedMap.get(b.id) ?? 0,
      ordersCreated: ordersMap.get(b.id) ?? 0,
      shipmentsCompleted: shipmentsMap.get(b.id) ?? 0,
    }));
    return rows.sort((a, b) => b.rfqCreated - a.rfqCreated);
  }

  private async buildFunnels(): Promise<ControlTowerFunnel[]> {
    return [
      await this.funnelFor("RFQ", "RFQ funnel", [...RFQ_FUNNEL_STATES]),
      await this.funnelFor("COMMODITYBID", "CommodityBid funnel", [...CB_FUNNEL_STATES]),
      await this.funnelFor("ORDER", "Order funnel", [...ORDER_FUNNEL_STATES]),
      await this.funnelFor("SHIPMENT", "Shipment funnel", [...SHIPMENT_FUNNEL_STATES]),
    ];
  }

  private async funnelFor(
    type: "RFQ" | "COMMODITYBID" | "ORDER" | "SHIPMENT",
    title: string,
    states: string[],
  ): Promise<ControlTowerFunnel> {
    const counts = await this.db.workspace.groupBy({
      by: ["state"],
      where: { type, state: { in: states }, ...workspaceExcludesTestData() },
      _count: true,
    });
    const map = new Map(counts.map((c) => [c.state, c._count]));
    return {
      workspaceType: type,
      title,
      stages: states.map((state) => ({
        state,
        label: state.replace(/_/g, " "),
        count: map.get(state) ?? 0,
      })),
    };
  }

  private async avgHoursFromAudit(
    action: string,
    workspaceType: "RFQ",
  ): Promise<{ avg: number | null; n: number }> {
    const testIds = await getTestWorkspaceIds(this.db);
    const logs = await this.db.auditLog.findMany({
      where: {
        action,
        workspace: {
          type: workspaceType,
          ...(testIds.length ? { id: { notIn: testIds } } : {}),
        },
      },
      select: {
        createdAt: true,
        workspace: { select: { createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const hours = logs.map((log) =>
      (log.createdAt.getTime() - log.workspace.createdAt.getTime()) / H_MS,
    );
    return { avg: avg(hours), n: hours.length };
  }

  private async avgQuoteResponseHours(): Promise<{ avg: number | null; n: number }> {
    const testIds = await getTestWorkspaceIds(this.db);
    const quotes = await this.db.quotation.findMany({
      where: testIds.length ? { workspaceId: { notIn: testIds } } : undefined,
      select: { workspaceId: true, submittedAt: true },
      orderBy: { submittedAt: "desc" },
      take: 100,
    });
    if (quotes.length === 0) return { avg: null, n: 0 };

    const workspaceIds = [...new Set(quotes.map((q) => q.workspaceId))];
    const publishes = await this.db.auditLog.findMany({
      where: { workspaceId: { in: workspaceIds }, action: "publish_rfq" },
      select: { workspaceId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const firstPublish = new Map<string, Date>();
    for (const p of publishes) {
      if (!firstPublish.has(p.workspaceId)) firstPublish.set(p.workspaceId, p.createdAt);
    }

    const hours: number[] = [];
    for (const q of quotes) {
      const publish = firstPublish.get(q.workspaceId);
      if (!publish) continue;
      hours.push((q.submittedAt.getTime() - publish.getTime()) / H_MS);
    }
    return { avg: avg(hours), n: hours.length };
  }

  private async avgOrderCycleHours(): Promise<{ avg: number | null; n: number }> {
    const closed = await this.db.workspace.findMany({
      where: { type: "ORDER", state: { in: ["CLOSED", "DELIVERED"] }, ...workspaceExcludesTestData() },
      select: { createdAt: true, updatedAt: true },
      take: 100,
    });
    const hours = closed.map((w) => (w.updatedAt.getTime() - w.createdAt.getTime()) / H_MS);
    return { avg: avg(hours), n: hours.length };
  }

  private async avgShipmentCycleHours(): Promise<{ avg: number | null; n: number }> {
    const done = await this.db.workspace.findMany({
      where: { type: "SHIPMENT", state: "COMPLETED", ...workspaceExcludesTestData() },
      select: { createdAt: true, updatedAt: true },
      take: 100,
    });
    const hours = done.map((w) => (w.updatedAt.getTime() - w.createdAt.getTime()) / H_MS);
    return { avg: avg(hours), n: hours.length };
  }
}

const H_MS = 3_600_000;

function openAlertWhere(testIds: string[]) {
  const base = { resolvedAt: null };
  const exclude = alertExcludesTestData(testIds);
  return Object.keys(exclude).length > 0 ? { ...base, ...exclude } : base;
}

function slaRow(
  key: string,
  label: string,
  stat: { avg: number | null; n: number },
): SlaMetricRow {
  return {
    key,
    label,
    averageHours: stat.avg,
    averageHoursDisplay: formatSlaAverageHours(stat.avg, stat.n),
    sampleSize: stat.n,
  };
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function countByKey<T extends string>(
  rows: Array<Record<T, string | null> & { _count: number }>,
  key: T,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = row[key];
    if (id) map.set(id, row._count);
  }
  return map;
}

