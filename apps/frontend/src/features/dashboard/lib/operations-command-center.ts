/**
 * Sprint 10C — Operations Command Center aggregator (existing APIs only).
 */
import { controlTowerApi } from "@/features/control-tower/lib/control-tower.api";
import { scaleApi } from "@/features/scale/lib/scale.api";
import { freightiqApi } from "@/features/freightiq/lib/freightiq.api";
import { rfqApi } from "@/features/rfq/lib/rfq.api";
import { orderApi } from "@/features/order/lib/order.api";
import { commoditybidApi } from "@/features/commoditybid/lib/commoditybid.api";
import type { ControlTowerAlert } from "@dmx/contracts/control-tower";
import type { PipelineHealthItem } from "@dmx/contracts/scale-readiness";

const LIMIT = 20;

export type OperationsMode = "operations_agent" | "operations_manager" | "executive";

export type OpsPriority = "critical" | "high" | "medium" | "low";

export interface OperationsKpis {
  activeTrades: number;
  liveAuctions: number;
  pendingApprovals: number;
  shipmentsInTransit: number;
  openAlerts: number;
  todaysRevenue: number;
  unreadMessages: number;
  blockedProcesses: number;
}

export interface OperationsAction {
  id: string;
  title: string;
  priority: OpsPriority;
  dueLabel: string;
  workspaceUrl: string;
  actionLabel: string;
  kind: string;
  category: string;
}

export interface TradeBoardRow {
  id: string;
  ref: string;
  type: "RFQ" | "CommodityBid" | "PO" | "Order" | "Shipment";
  status: string;
  owner: string;
  lastActivity: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  nextAction: string;
  workspaceUrl: string;
}

export interface AuctionMonitorRow {
  id: string;
  ref: string;
  title: string;
  state: string;
  participationPct: number | null;
  lowestBid: number | null;
  needsApproval: boolean;
  auctionEndsAt: string | null;
  workspaceUrl: string;
}

export interface FreightOpsRow {
  id: string;
  label: string;
  status: string;
  detail: string;
  workspaceUrl: string;
}

export interface ShipmentOpsRow {
  id: string;
  ref: string;
  state: string;
  risk: string;
  eta: string | null;
  detail: string;
  workspaceUrl: string;
}

export interface DocumentOpsRow {
  workspaceId: string;
  workspaceRef: string;
  workspaceType: string;
  status: string;
  issue: string;
  workspaceUrl: string;
}

export interface CommOpsRow {
  id: string;
  workspaceRef: string;
  workspaceType: string;
  label: string;
  waitingHours: number | null;
  workspaceUrl: string;
}

export interface AlertGroupRow {
  severity: string;
  count: number;
  sampleTitle: string;
  workspaceUrl: string | null;
}

export interface RevenueSnapshot {
  todayUsd: number;
  monthUsd: number;
  pendingUsd: number;
  realizedUsd: number;
  topRoute: string;
  topForwarder: string;
}

export interface WorkloadRow {
  userId: string;
  displayName: string;
  totalLoad: number;
  overloaded: boolean;
  openAlerts: number;
}

export interface UpcomingOpsEvent {
  id: string;
  at: string;
  label: string;
  kind: string;
  workspaceUrl: string;
}

export interface OperationsCommandCenter {
  mode: OperationsMode;
  kpis: OperationsKpis;
  actions: OperationsAction[];
  tradeBoard: TradeBoardRow[];
  auctions: AuctionMonitorRow[];
  freight: FreightOpsRow[];
  shipments: ShipmentOpsRow[];
  documents: DocumentOpsRow[];
  communications: CommOpsRow[];
  alertGroups: AlertGroupRow[];
  revenue: RevenueSnapshot;
  workload: WorkloadRow[];
  unassignedCount: number;
  upcomingEvents: UpcomingOpsEvent[];
}

export function workspacePath(type: string | null, id: string | null): string {
  if (!id || !type) return "/operations";
  const map: Record<string, string> = {
    RFQ: "rfq", COMMODITYBID: "commoditybid", ORDER: "order", SHIPMENT: "shipment", PO: "po",
  };
  const seg = map[type];
  return seg ? `/workspace/${seg}/${id}` : "/operations";
}

function alertPriority(a: ControlTowerAlert): OpsPriority {
  if (a.severity === "CRITICAL") return "critical";
  if (a.severity === "WARNING") return "high";
  if (a.alertKey.startsWith("comm_")) return "medium";
  return "low";
}

function pipelineRisk(item: PipelineHealthItem): TradeBoardRow["riskLevel"] {
  if (item.stalled) return "critical";
  if (item.healthScore < 40) return "high";
  if (item.healthScore < 70) return "medium";
  return "low";
}

function resolveMode(
  criticalAlerts: number,
  stalledCount: number,
  overloadedCount: number,
): OperationsMode {
  if (criticalAlerts > 0 || stalledCount >= 3) return "operations_agent";
  if (overloadedCount > 0 || stalledCount > 0) return "operations_manager";
  return "executive";
}

function humanize(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchOperationsCommandCenter(): Promise<OperationsCommandCenter> {
  const [
    dashboard,
    alerts,
    tracking,
    workload,
    pipeline,
    freightOps,
    commercialInsight,
    rfqs,
    orders,
    auctions,
  ] = await Promise.all([
    controlTowerApi.opsDashboard(),
    controlTowerApi.alerts({ resolved: "false", limit: 50 }),
    controlTowerApi.shipmentTracking(),
    scaleApi.workload(),
    scaleApi.pipelineHealth(),
    freightiqApi.opsOverview(),
    freightiqApi.commercialInsight(),
    rfqApi.list({ limit: LIMIT }),
    orderApi.list({ bucket: "active", limit: LIMIT }),
    commoditybidApi.list({ limit: LIMIT }),
  ]);

  const alertItems = alerts.items;
  const overview = dashboard.overview;
  const freightCommercial = dashboard.freightCommercial;
  const pipelineItems = pipeline.items;
  const stalled = pipelineItems.filter((p) => p.stalled);

  const liveAuctions = (auctions.items as Array<{ id: string; state: string }>)
    .filter((a) => ["LIVE", "READY_TO_START", "SCHEDULED"].includes(a.state));

  const pendingApprovals = alertItems.filter((a) =>
    a.alertKey.includes("awaiting_buyer") || a.alertKey.includes("approval"),
  ).length;

  const commAlerts = alertItems.filter((a) => a.category === "ACCOUNT" || a.alertKey.startsWith("comm_"));
  const docAlerts = alertItems.filter((a) => a.alertKey.startsWith("trade_doc"));

  const actions = buildActions(alertItems, stalled, freightOps);
  const tradeBoard = buildTradeBoard(
    pipelineItems,
    rfqs.items as Array<{ id: string; externalRef: string; state: string; lastActivityAt: string; buyerName?: string }>,
    orders.items as Array<{ id: string; externalRef: string; state: string; lastActivityAt: string; buyerName?: string }>,
    auctions.items as Array<{ id: string; externalRef: string; state: string; updatedAt?: string }>,
    alertItems,
  );
  const auctionRows = buildAuctions(auctions.items as Array<{
    id: string; externalRef: string; title: string; state: string;
    auctionEndsAt: string | null; lowestBidAmount: number | null;
    invitedCount?: number; participantCount?: number; needsBuyerApproval?: boolean;
  }>);
  const freightRows = buildFreight(freightOps);
  const shipmentRows = buildShipments(tracking);
  const documentRows = buildDocuments(docAlerts);
  const commRows = buildCommunications(commAlerts);
  const alertGroups = buildAlertGroups(alertItems);
  const workloadRows = workload.map((w) => ({
    userId: w.userId,
    displayName: w.displayName,
    totalLoad: w.totalLoad,
    overloaded: w.overloaded,
    openAlerts: w.openAlerts,
  }));
  const unassigned = pipelineItems.filter((p) => p.issues.some((i) => i.includes("unassigned"))).length;
  const upcomingEvents = buildEvents(auctions.items as Array<{
    id: string; externalRef: string; auctionStartsAt?: string | null; auctionEndsAt?: string | null;
  }>, freightOps, alertItems);

  const inTransit = (tracking.delayed?.length ?? 0) + (tracking.etaDrift?.length ?? 0)
    + (tracking.recentlyArrived?.length ?? 0);

  const kpis: OperationsKpis = {
    activeTrades: tradeBoard.length,
    liveAuctions: liveAuctions.length,
    pendingApprovals,
    shipmentsInTransit: inTransit,
    openAlerts: overview.openAlerts,
    todaysRevenue: commercialInsight.realizedRevenue,
    unreadMessages: commAlerts.length,
    blockedProcesses: stalled.length + overview.criticalAlerts,
  };

  const mode = resolveMode(
    overview.criticalAlerts,
    stalled.length,
    workload.filter((w) => w.overloaded).length,
  );

  return {
    mode,
    kpis,
    actions: actions.slice(0, 15),
    tradeBoard: tradeBoard.slice(0, 25),
    auctions: auctionRows,
    freight: freightRows.slice(0, 12),
    shipments: shipmentRows.slice(0, 12),
    documents: documentRows.slice(0, 10),
    communications: commRows.slice(0, 10),
    alertGroups,
    revenue: {
      todayUsd: commercialInsight.realizedRevenue,
      monthUsd: commercialInsight.revenueThisMonth,
      pendingUsd: commercialInsight.pendingRevenue ?? freightCommercial.revenuePendingUsd,
      realizedUsd: commercialInsight.realizedRevenue ?? freightCommercial.revenueRealizedUsd,
      topRoute: commercialInsight.topRoutes[0]?.route ?? "—",
      topForwarder: commercialInsight.topForwarders[0]?.forwarderName ?? "—",
    },
    workload: workloadRows,
    unassignedCount: unassigned,
    upcomingEvents: upcomingEvents.slice(0, 15),
  };
}

function buildActions(
  alerts: ControlTowerAlert[],
  stalled: PipelineHealthItem[],
  freightOps: Awaited<ReturnType<typeof freightiqApi.opsOverview>>,
): OperationsAction[] {
  const actions: OperationsAction[] = alerts.map((a) => ({
    id: `alert-${a.id}`,
    title: a.title,
    priority: alertPriority(a),
    dueLabel: a.description.slice(0, 80) || a.category,
    workspaceUrl: workspacePath(a.workspaceType, a.workspaceId),
    actionLabel: "Intervene",
    kind: a.alertKey.split(".")[0] ?? "alert",
    category: a.category,
  }));

  for (const s of stalled) {
    actions.push({
      id: `stalled-${s.workspaceId}`,
      title: `Stalled trade — ${s.workspaceRef}`,
      priority: "high",
      dueLabel: s.issues[0] ?? "Pipeline stalled",
      workspaceUrl: workspacePath(s.workspaceType, s.workspaceId),
      actionLabel: "Review trade",
      kind: "stalled_trade",
      category: s.workspaceType,
    });
  }

  for (const r of freightOps.openRequests ?? []) {
    if ((r.offerCount ?? 0) === 0) {
      actions.push({
        id: `freight-${r.id}`,
        title: `Freight selection pending — ${r.id.slice(0, 8)}`,
        priority: "medium",
        dueLabel: "Awaiting forwarder responses",
        workspaceUrl: `/workspace/order/${r.orderId}`,
        actionLabel: "Select freight",
        kind: "freight_selection",
        category: "FREIGHT",
      });
    }
  }

  const prio = { critical: 0, high: 1, medium: 2, low: 3 };
  return actions.sort((a, b) => prio[a.priority] - prio[b.priority]);
}

function buildTradeBoard(
  pipeline: PipelineHealthItem[],
  rfqs: Array<{ id: string; externalRef: string; state: string; lastActivityAt: string; buyerName?: string }>,
  orders: Array<{ id: string; externalRef: string; state: string; lastActivityAt: string; buyerName?: string }>,
  auctions: Array<{ id: string; externalRef: string; state: string; updatedAt?: string }>,
  alerts: ControlTowerAlert[],
): TradeBoardRow[] {
  const alertByWs = new Map(alerts.map((a) => [`${a.workspaceType}-${a.workspaceId}`, a]));

  const fromPipeline = pipeline.map((p) => {
    const alert = alertByWs.get(`${p.workspaceType}-${p.workspaceId}`);
    const baseRisk = pipelineRisk(p);
    const riskLevel: TradeBoardRow["riskLevel"] =
      alert?.severity === "CRITICAL" ? "critical" : alert?.severity === "WARNING" && baseRisk === "low" ? "high" : baseRisk;
    return {
      id: p.workspaceId,
      ref: p.workspaceRef,
      type: p.workspaceType as TradeBoardRow["type"],
      status: humanize(p.state),
      owner: "—",
      lastActivity: "",
      riskLevel,
      nextAction: p.stalled ? "Unblock trade" : (p.issues[0] ?? "Monitor"),
      workspaceUrl: workspacePath(p.workspaceType, p.workspaceId),
    };
  });

  const extras: TradeBoardRow[] = [
    ...rfqs.filter((r) => !["CLOSED", "CANCELLED"].includes(r.state)).map((r) => ({
      id: r.id,
      ref: r.externalRef,
      type: "RFQ" as const,
      status: humanize(r.state),
      owner: r.buyerName ?? "Buyer",
      lastActivity: r.lastActivityAt,
      riskLevel: (alertByWs.get(`RFQ-${r.id}`)?.severity === "CRITICAL" ? "critical" : "low") as TradeBoardRow["riskLevel"],
      nextAction: r.state === "SUBMITTED" ? "Assign suppliers" : "Monitor RFQ",
      workspaceUrl: `/workspace/rfq/${r.id}`,
    })),
    ...orders.map((o) => ({
      id: o.id,
      ref: o.externalRef,
      type: "Order" as const,
      status: humanize(o.state),
      owner: o.buyerName ?? "Buyer",
      lastActivity: o.lastActivityAt,
      riskLevel: "low" as const,
      nextAction: "Open order",
      workspaceUrl: `/workspace/order/${o.id}`,
    })),
    ...auctions.filter((a) => !["CLOSED", "CANCELLED"].includes(a.state)).map((a) => ({
      id: a.id,
      ref: a.externalRef,
      type: "CommodityBid" as const,
      status: humanize(a.state),
      owner: "—",
      lastActivity: a.updatedAt ?? "",
      riskLevel: (a.state === "LIVE" ? "medium" : "low") as TradeBoardRow["riskLevel"],
      nextAction: a.state === "LIVE" ? "Monitor auction" : "Prepare auction",
      workspaceUrl: `/workspace/commoditybid/${a.id}`,
    })),
  ];

  const seen = new Set(fromPipeline.map((r) => `${r.type}-${r.id}`));
  const merged = [...fromPipeline, ...extras.filter((e) => !seen.has(`${e.type}-${e.id}`))];
  return merged.sort((a, b) => (b.lastActivity || "").localeCompare(a.lastActivity || ""));
}

function buildAuctions(items: Array<{
  id: string; externalRef: string; title: string; state: string;
  auctionEndsAt: string | null; lowestBidAmount: number | null;
  invitedCount?: number; participantCount?: number; needsBuyerApproval?: boolean;
}>): AuctionMonitorRow[] {
  return items
    .filter((a) => !["CLOSED", "CANCELLED", "DRAFT"].includes(a.state))
    .map((a) => {
      const invited = a.invitedCount ?? 0;
      const participants = a.participantCount ?? 0;
      return {
        id: a.id,
        ref: a.externalRef,
        title: a.title,
        state: a.state,
        participationPct: invited > 0 ? Math.round((participants / invited) * 100) : null,
        lowestBid: a.lowestBidAmount,
        needsApproval: !!a.needsBuyerApproval,
        auctionEndsAt: a.auctionEndsAt,
        workspaceUrl: `/workspace/commoditybid/${a.id}`,
      };
    });
}

function buildFreight(ops: Awaited<ReturnType<typeof freightiqApi.opsOverview>>): FreightOpsRow[] {
  const rows: FreightOpsRow[] = [];
  for (const r of ops.openRequests ?? []) {
    rows.push({
      id: r.id,
      label: `Freight request · ${r.orderId?.slice(0, 8) ?? "order"}`,
      status: "Open",
      detail: `${r.offerCount ?? 0} offers`,
      workspaceUrl: `/workspace/order/${r.orderId}`,
    });
  }
  for (const o of ops.pendingOffers ?? []) {
    rows.push({
      id: o.id,
      label: `Pending offer · ${o.forwarderCompanyName ?? o.providerName}`,
      status: "Pending review",
      detail: `$${o.price ?? 0}`,
      workspaceUrl: `/operations/freight`,
    });
  }
  for (const e of ops.expiredOffers ?? []) {
    rows.push({
      id: e.id,
      label: `Expired offer · ${e.forwarderCompanyName ?? e.providerName}`,
      status: "Expired",
      detail: "Requires re-intake",
      workspaceUrl: `/operations/freight`,
    });
  }
  return rows;
}

function buildShipments(tracking: Awaited<ReturnType<typeof controlTowerApi.shipmentTracking>>): ShipmentOpsRow[] {
  const map = (rows: typeof tracking.delayed, risk: string) =>
    (rows ?? []).map((s) => ({
      id: s.shipmentId,
      ref: s.externalRef,
      state: s.trackingStatus ?? "—",
      risk,
      eta: s.eta ?? null,
      detail: s.vesselName ?? "—",
      workspaceUrl: `/workspace/shipment/${s.shipmentId}`,
    }));
  return [
    ...map(tracking.delayed, "Delayed"),
    ...map(tracking.etaDrift, "ETA drift"),
    ...map(tracking.trackingFailures, "Tracking issue"),
    ...map(tracking.recentlyArrived, "Arriving"),
  ];
}

function buildDocuments(alerts: ControlTowerAlert[]): DocumentOpsRow[] {
  return alerts.map((a) => ({
    workspaceId: a.workspaceId ?? a.id,
    workspaceRef: a.workspaceRef ?? "—",
    workspaceType: a.workspaceType ?? "ORDER",
    status: a.severity,
    issue: a.title,
    workspaceUrl: workspacePath(a.workspaceType, a.workspaceId),
  }));
}

function buildCommunications(alerts: ControlTowerAlert[]): CommOpsRow[] {
  return alerts.map((a) => ({
    id: a.id,
    workspaceRef: a.workspaceRef ?? "—",
    workspaceType: a.workspaceType ?? "—",
    label: a.title,
    waitingHours: a.alertKey.includes("48h") ? 48 : a.alertKey.includes("72h") ? 72 : null,
    workspaceUrl: workspacePath(a.workspaceType, a.workspaceId),
  }));
}

function buildAlertGroups(alerts: ControlTowerAlert[]): AlertGroupRow[] {
  const groups = new Map<string, ControlTowerAlert[]>();
  for (const a of alerts) {
    const g = groups.get(a.severity) ?? [];
    g.push(a);
    groups.set(a.severity, g);
  }
  return ["CRITICAL", "WARNING", "INFO"].map((severity) => {
    const items = groups.get(severity) ?? [];
    const first = items[0];
    return {
      severity,
      count: items.length,
      sampleTitle: first?.title ?? "None",
      workspaceUrl: first ? workspacePath(first.workspaceType, first.workspaceId) : null,
    };
  }).filter((g) => g.count > 0);
}

function buildEvents(
  auctions: Array<{ id: string; externalRef: string; auctionStartsAt?: string | null; auctionEndsAt?: string | null }>,
  freightOps: Awaited<ReturnType<typeof freightiqApi.opsOverview>>,
  alerts: ControlTowerAlert[],
): UpcomingOpsEvent[] {
  const events: UpcomingOpsEvent[] = [];
  const now = Date.now();

  for (const a of auctions) {
    if (a.auctionStartsAt && new Date(a.auctionStartsAt).getTime() > now) {
      events.push({
        id: `auc-s-${a.id}`,
        at: a.auctionStartsAt,
        label: `Auction starts — ${a.externalRef}`,
        kind: "auction_start",
        workspaceUrl: `/workspace/commoditybid/${a.id}`,
      });
    }
    if (a.auctionEndsAt && new Date(a.auctionEndsAt).getTime() > now) {
      events.push({
        id: `auc-e-${a.id}`,
        at: a.auctionEndsAt,
        label: `Auction ends — ${a.externalRef}`,
        kind: "auction_end",
        workspaceUrl: `/workspace/commoditybid/${a.id}`,
      });
    }
  }

  for (const e of freightOps.expiredOffers ?? []) {
    events.push({
      id: `freight-exp-${e.id}`,
      at: e.validUntil ?? new Date().toISOString(),
      label: `Freight offer expired — ${e.forwarderCompanyName ?? e.providerName}`,
      kind: "freight_expiry",
      workspaceUrl: "/operations/freight",
    });
  }

  for (const a of alerts.filter((x) => x.severity === "CRITICAL").slice(0, 5)) {
    events.push({
      id: `alert-${a.id}`,
      at: a.createdAt,
      label: a.title,
      kind: "alert",
      workspaceUrl: workspacePath(a.workspaceType, a.workspaceId),
    });
  }

  return events
    .filter((e) => e.at && !Number.isNaN(new Date(e.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
