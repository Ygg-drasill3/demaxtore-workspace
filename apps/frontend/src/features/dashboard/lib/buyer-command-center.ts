/**
 * Sprint 10A.2 — Buyer Command Center aggregator (existing APIs only, bounded batch).
 */
import { rfqApi } from "@/features/rfq/lib/rfq.api";
import { orderApi } from "@/features/order/lib/order.api";
import { commoditybidApi } from "@/features/commoditybid/lib/commoditybid.api";
import { purchaseOrderApi } from "@/features/purchase-order/lib/purchase-order.api";
import { tradeDocumentsApi } from "@/features/trade-documents/lib/trade-documents.api";
import { workspaceCommunicationApi } from "@/features/workspace-communication/lib/workspace-communication.api";
import { shipmentApi } from "@/features/shipment/lib/shipment.api";
import { freightEstimateApi } from "@/features/freight-estimate/lib/freight-estimate.api";
import { freightBookingApi } from "@/features/freight-booking/lib/freight-booking.api";
import { tradeTimelineApi } from "@/features/trade/lib/trade-timeline.api";
import { customsApi } from "@/features/customs/lib/customs.api";
import { inlandApi } from "@/features/inland/lib/inland.api";
import type { PurchaseOrderSummary } from "@dmx/contracts/purchase-order";
import type { TradeDocumentsSummary } from "@dmx/contracts/trade-documents";
import type { WorkspaceConversation } from "@dmx/contracts/workspace-communication";
import type { OnboardingProgressDTO } from "@dmx/contracts/onboarding";
import type { TradeTimelineKpiDto } from "@dmx/contracts/trade-timeline";

const LIMIT = 15;
const DETAIL_CAP = 8;

export type DashboardMode = "first_trade" | "standard" | "power";

export interface CommandCenterKpis {
  openRfqs: number;
  liveAuctions: number;
  awaitingAuctionApproval: number;
  activeOrders: number;
  shipmentsInTransit: number;
  unreadMessages: number;
  pendingActions: number;
  estimatedCifReady: number;
  bookingsPending: number;
  bookingsConfirmed: number;
  cutoffRisks: number;
  forecastChanges: number;
  rebookRequired: number;
  /** Sprint 43 — optional import-ops counts */
  customsActive?: number;
  deliveriesActive?: number;
}

export type ActionPriority = "high" | "medium" | "low";

export interface RequiredAction {
  id: string;
  title: string;
  priority: ActionPriority;
  dueLabel: string;
  workspaceUrl: string;
  actionLabel: string;
  kind: string;
}

export interface ActiveTradeRow {
  id: string;
  ref: string;
  type: "RFQ" | "CommodityBid" | "PO" | "Order" | "Shipment";
  stage: string;
  lastActivity: string;
  nextAction: string;
  workspaceUrl: string;
}

export interface LiveAuctionRow {
  id: string;
  ref: string;
  title: string;
  state: string;
  auctionStartsAt: string | null;
  auctionEndsAt: string | null;
  lowestBidAmount: number | null;
  needsApproval: boolean;
  workspaceUrl: string;
}

export interface ShipmentCommandRow {
  id: string;
  ref: string;
  state: string;
  orderRef: string;
  eta: string | null;
  port: string | null;
  carrier: string | null;
  trackingStatus: string | null;
  isDelayed: boolean;
  workspaceUrl: string;
}

export interface DocumentStatusRow {
  workspaceType: "ORDER" | "SHIPMENT";
  workspaceId: string;
  workspaceRef: string;
  complianceStatus: string;
  missingCount: number;
  pendingReview: number;
  approvedCount: number;
  requiredCount: number;
  workspaceUrl: string;
}

export interface CommunicationRow {
  workspaceType: string;
  workspaceId: string;
  workspaceRef: string;
  unreadCount: number;
  lastMessage: string;
  lastAt: string;
  workspaceUrl: string;
}

export interface UpcomingEvent {
  id: string;
  at: string;
  label: string;
  kind: string;
  workspaceUrl: string;
}

export interface BuyerCommandCenter {
  mode: DashboardMode;
  kpis: CommandCenterKpis;
  timelineKpis: TradeTimelineKpiDto;
  requiredActions: RequiredAction[];
  activeTrades: ActiveTradeRow[];
  liveAuctions: LiveAuctionRow[];
  shipments: ShipmentCommandRow[];
  documents: DocumentStatusRow[];
  communications: CommunicationRow[];
  upcomingEvents: UpcomingEvent[];
}

const RFQ_TERMINAL = new Set(["CLOSED", "CANCELLED", "EXPIRED", "CLOSED_NO_AWARD"]);
const CB_LIVE = new Set(["SCHEDULED", "INVITING_SUPPLIERS", "READY_TO_START", "LIVE"]);
const CB_APPROVAL = new Set(["WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL"]);
const TRANSIT_STATES = new Set(["IN_TRANSIT", "LOADED_ON_VESSEL", "DEPARTED_ORIGIN_PORT", "ARRIVED_DESTINATION_PORT"]);

function resolveMode(
  onboarding: OnboardingProgressDTO | null,
  tradeCount: number,
): DashboardMode {
  if (!onboarding?.firstTradeCompleted && (onboarding?.completionPercent ?? 0) < 60) {
    return "first_trade";
  }
  if (onboarding?.firstTradeCompleted && tradeCount >= 8) return "power";
  return "standard";
}

function humanizeState(state: string): string {
  return state.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchBuyerDashboardQuick(
  onboarding?: OnboardingProgressDTO | null,
): Promise<Pick<BuyerCommandCenter, "mode" | "kpis" | "timelineKpis">> {
  const [rfqs, orders, auctions, timelineKpis, cifKpi, bookingKpi, customsList, inlandList] = await Promise.all([
    rfqApi.list({ limit: LIMIT }),
    orderApi.list({ bucket: "active", limit: LIMIT }),
    apiListCommodityBids(),
    tradeTimelineApi.kpiSummary().catch(() => ({
      activeTrades: 0,
      tradesInProduction: 0,
      tradesInTransit: 0,
      delayedTrades: 0,
      completedTrades: 0,
    })),
    freightEstimateApi.kpiEstimatedCifReady().catch(() => ({ estimatedCifReady: 0 })),
    freightBookingApi.kpiSummary().catch(() => ({
      bookingsPending: 0,
      bookingsConfirmed: 0,
      cutoffRisks: 0,
      forecastChanges: 0,
      rebookRequired: 0,
    })),
    customsApi.list({ page: 1, pageSize: 1, attention: true }).catch(() => ({ items: [], pagination: { totalItems: 0 } })),
    inlandApi.list({ attention: true }).catch(() => ({ items: [] as Array<{ id: string }> })),
  ]);

  const rfqItems = rfqs.items as Array<{ state: string; procurementMethod: string | null }>;
  const orderItems = orders.items as Array<{ id: string }>;
  const auctionItems = auctions as Array<{ state: string }>;
  const openRfqs = rfqItems.filter(
    (r) => !RFQ_TERMINAL.has(r.state) && r.procurementMethod === "DIRECT_RFQ",
  );

  const kpis: CommandCenterKpis = {
    openRfqs: openRfqs.length,
    liveAuctions: auctionItems.filter((a) => a.state === "LIVE").length,
    awaitingAuctionApproval: auctionItems.filter((a) => CB_APPROVAL.has(a.state)).length,
    activeOrders: orderItems.length,
    shipmentsInTransit: 0,
    unreadMessages: 0,
    pendingActions: 0,
    estimatedCifReady: cifKpi.estimatedCifReady,
    bookingsPending: bookingKpi.bookingsPending,
    bookingsConfirmed: bookingKpi.bookingsConfirmed,
    cutoffRisks: bookingKpi.cutoffRisks,
    forecastChanges: bookingKpi.forecastChanges,
    rebookRequired: bookingKpi.rebookRequired,
    customsActive: customsList.pagination?.totalItems ?? customsList.items.length,
    deliveriesActive: inlandList.items?.length ?? 0,
  };

  const mode = resolveMode(onboarding ?? null, orderItems.length + openRfqs.length);
  return { mode, kpis, timelineKpis };
}

export async function fetchBuyerCommandCenter(
  onboarding?: OnboardingProgressDTO | null,
): Promise<BuyerCommandCenter> {
  const [rfqs, orders, auctions] = await Promise.all([
    rfqApi.list({ limit: LIMIT }),
    orderApi.list({ bucket: "active", limit: LIMIT }),
    apiListCommodityBids(),
  ]);

  const rfqItems = rfqs.items as Array<{
    id: string; externalRef: string; state: string; title: string;
    lastActivityAt: string; deadlineAt: string | null;
    procurementMethod: string | null;
  }>;
  const orderItems = orders.items as Array<{
    id: string; externalRef: string; state: string; lastActivityAt: string;
    shipmentCount: number; poReference: string | null; supplierName: string;
  }>;
  const auctionItems = auctions as Array<{
    id: string; externalRef: string; state: string; title: string;
    auctionStartsAt: string | null; auctionEndsAt: string | null;
    lowestBidAmount: number | null; updatedAt: string;
  }>;

  const openRfqs = rfqItems.filter(
    (r) => !RFQ_TERMINAL.has(r.state) && r.procurementMethod === "DIRECT_RFQ",
  );

  // Bounded detail fetches (parallel, capped)
  const poCandidates = orderItems.filter((o) => o.poReference).slice(0, DETAIL_CAP);
  const shipOrderCandidates = orderItems.filter((o) => o.shipmentCount > 0).slice(0, DETAIL_CAP);
  const docOrderCandidates = orderItems.slice(0, DETAIL_CAP);
  const msgTargets = [
    ...rfqItems.slice(0, 5).map((r) => ({ type: "RFQ" as const, id: r.id, ref: r.externalRef, url: `/workspace/rfq/${r.id}` })),
    ...orderItems.slice(0, 5).map((o) => ({ type: "ORDER" as const, id: o.id, ref: o.externalRef, url: `/workspace/order/${o.id}` })),
    ...auctionItems.filter((a) => CB_LIVE.has(a.state) || CB_APPROVAL.has(a.state)).slice(0, 3)
      .map((a) => ({ type: "COMMODITYBID" as const, id: a.id, ref: a.externalRef, url: `/workspace/commoditybid/${a.id}` })),
  ];

  const [poRows, shipmentRows, docRows, msgRows] = await Promise.all([
    fetchPoDetails(poCandidates),
    fetchShipmentDetails(shipOrderCandidates),
    fetchDocDetails(docOrderCandidates),
    fetchMessageDetails(msgTargets),
  ]);

  const requiredActions = buildRequiredActions(auctionItems, poRows, docRows, msgRows, orderItems);
  const activeTrades = buildActiveTrades(rfqItems, auctionItems, poRows, orderItems, shipmentRows);
  const liveAuctions = buildLiveAuctions(auctionItems);
  const upcomingEvents = buildUpcomingEvents(rfqItems, auctionItems, shipmentRows, poRows, orderItems);

  const shipmentsInTransit = shipmentRows.filter((s) => TRANSIT_STATES.has(s.state) || s.isDelayed).length;
  const unreadMessages = msgRows.reduce((n, m) => n + m.unreadCount, 0);
  let estimatedCifReady = 0;
  let bookingsPending = 0;
  let bookingsConfirmed = 0;
  let cutoffRisks = 0;
  let forecastChanges = 0;
  let rebookRequired = 0;
  let timelineKpis: TradeTimelineKpiDto = {
    activeTrades: 0,
    tradesInProduction: 0,
    tradesInTransit: 0,
    delayedTrades: 0,
    completedTrades: 0,
  };
  try {
    const kpi = await freightEstimateApi.kpiEstimatedCifReady();
    estimatedCifReady = kpi.estimatedCifReady;
  } catch { /* optional */ }
  try {
    const bookingKpi = await freightBookingApi.kpiSummary();
    bookingsPending = bookingKpi.bookingsPending;
    bookingsConfirmed = bookingKpi.bookingsConfirmed;
    cutoffRisks = bookingKpi.cutoffRisks;
    forecastChanges = bookingKpi.forecastChanges;
    rebookRequired = bookingKpi.rebookRequired;
  } catch { /* optional */ }
  try {
    timelineKpis = await tradeTimelineApi.kpiSummary();
  } catch { /* optional */ }

  const kpis: CommandCenterKpis = {
    openRfqs: openRfqs.length,
    liveAuctions: auctionItems.filter((a) => a.state === "LIVE").length,
    awaitingAuctionApproval: auctionItems.filter((a) => CB_APPROVAL.has(a.state)).length,
    activeOrders: orderItems.length,
    shipmentsInTransit,
    unreadMessages,
    pendingActions: requiredActions.length,
    estimatedCifReady,
    bookingsPending,
    bookingsConfirmed,
    cutoffRisks,
    forecastChanges,
    rebookRequired,
  };

  const mode = resolveMode(onboarding ?? null, activeTrades.length);

  return {
    mode,
    kpis,
    timelineKpis,
    requiredActions: requiredActions.slice(0, 12),
    activeTrades: activeTrades.slice(0, 20),
    liveAuctions,
    shipments: shipmentRows,
    documents: docRows,
    communications: msgRows,
    upcomingEvents: upcomingEvents.slice(0, 15),
  };
}

async function apiListCommodityBids() {
  const data = await commoditybidApi.list({ limit: LIMIT });
  return data.items ?? [];
}

async function fetchPoDetails(
  orders: Array<{ id: string; externalRef: string; supplierName: string }>,
): Promise<Array<PoListRow & { supplierName: string }>> {
  const rows: Array<PoListRow & { supplierName: string }> = [];
  await Promise.all(orders.map(async (o) => {
    try {
      const summary = await purchaseOrderApi.byOrder(o.id) as PurchaseOrderSummary;
      const po = summary.purchaseOrder;
      rows.push({
        poId: po.id,
        poNumber: po.poNumber,
        status: po.status,
        orderId: o.id,
        orderRef: o.externalRef,
        supplierName: o.supplierName,
        pendingAck: summary.pendingAcknowledgement,
        openAmendments: summary.openAmendments,
        updatedAt: po.updatedAt,
      });
    } catch { /* skip */ }
  }));
  return rows;
}

interface PoListRow {
  poId: string; poNumber: string; status: string; orderId: string; orderRef: string;
  pendingAck: boolean; openAmendments: number; updatedAt: string;
}

async function fetchShipmentDetails(
  orders: Array<{ id: string; externalRef: string }>,
): Promise<ShipmentCommandRow[]> {
  const nested = await Promise.all(orders.map(async (o) => {
    const shipments = await orderApi.spawnedShipments(o.id) as Array<{
      id: string; externalRef: string; state: string; createdAt: string;
    }>;
    return Promise.all(shipments.slice(0, 3).map(async (s) => {
      let eta: string | null = null;
      let port: string | null = null;
      let carrier: string | null = null;
      let trackingStatus: string | null = null;
      const isDelayed = s.state === "EXCEPTION";
      if (TRANSIT_STATES.has(s.state) || isDelayed) {
        try {
          const tr = await shipmentApi.tracking(s.id) as {
            eta?: string; destinationPort?: string; carrierName?: string; status?: string;
          };
          eta = tr.eta ?? null;
          port = tr.destinationPort ?? null;
          carrier = tr.carrierName ?? null;
          trackingStatus = tr.status ?? null;
        } catch { /* optional */ }
      }
      return {
        id: s.id,
        ref: s.externalRef,
        state: s.state,
        orderRef: o.externalRef,
        eta,
        port,
        carrier,
        trackingStatus,
        isDelayed,
        workspaceUrl: `/workspace/shipment/${s.id}`,
      } satisfies ShipmentCommandRow;
    }));
  }));
  return nested.flat();
}

async function fetchDocDetails(
  orders: Array<{ id: string; externalRef: string; shipmentCount: number }>,
): Promise<DocumentStatusRow[]> {
  const rows: DocumentStatusRow[] = [];
  for (const o of orders.slice(0, DETAIL_CAP)) {
    try {
      const summary = await tradeDocumentsApi.summary("ORDER", o.id) as TradeDocumentsSummary;
      const missing = summary.compliance.checklist.filter((c) => c.required && c.status === "MISSING").length;
      rows.push({
        workspaceType: "ORDER",
        workspaceId: o.id,
        workspaceRef: o.externalRef,
        complianceStatus: summary.compliance.status,
        missingCount: missing,
        pendingReview: summary.documents.filter((d) => ["UPLOADED", "UNDER_REVIEW"].includes(d.status)).length,
        approvedCount: summary.compliance.approvedCount,
        requiredCount: summary.compliance.requiredCount,
        workspaceUrl: `/workspace/order/${o.id}`,
      });
    } catch { /* skip */ }
  }
  return rows;
}

async function fetchMessageDetails(
  targets: Array<{ type: "RFQ" | "ORDER" | "COMMODITYBID"; id: string; ref: string; url: string }>,
): Promise<CommunicationRow[]> {
  const rows: CommunicationRow[] = [];
  await Promise.all(targets.map(async (t) => {
    try {
      const conv = await workspaceCommunicationApi.get(t.type, t.id) as WorkspaceConversation;
      const last = conv.messages[conv.messages.length - 1];
      rows.push({
        workspaceType: t.type,
        workspaceId: t.id,
        workspaceRef: t.ref,
        unreadCount: conv.unreadCount,
        lastMessage: last?.body?.slice(0, 100) ?? "No messages yet",
        lastAt: last?.createdAt ?? "",
        workspaceUrl: t.url,
      });
    } catch { /* skip */ }
  }));
  return rows.sort((a, b) => b.unreadCount - a.unreadCount || b.lastAt.localeCompare(a.lastAt));
}

function buildRequiredActions(
  auctions: Array<{ id: string; externalRef: string; title: string; state: string }>,
  pos: Array<PoListRow & { supplierName: string }>,
  docs: DocumentStatusRow[],
  msgs: CommunicationRow[],
  orders: Array<{ id: string; externalRef: string; state: string }>,
): RequiredAction[] {
  const actions: RequiredAction[] = [];

  for (const a of auctions.filter((x) => CB_APPROVAL.has(x.state))) {
    actions.push({
      id: `cb-approve-${a.id}`,
      title: `Approve auction winner — ${a.title || a.externalRef}`,
      priority: "high",
      dueLabel: "Awaiting buyer approval",
      workspaceUrl: `/workspace/commoditybid/${a.id}`,
      actionLabel: "Approve winner",
      kind: "approve_auction_winner",
    });
  }

  for (const o of orders.filter((x) => x.state === "FREIGHT_REQUESTED")) {
    actions.push({
      id: `freight-${o.id}`,
      title: `Review freight offers — ${o.externalRef}`,
      priority: "medium",
      dueLabel: "Freight selection pending",
      workspaceUrl: `/workspace/order/${o.id}`,
      actionLabel: "Review offers",
      kind: "review_freight",
    });
  }

  for (const d of docs.filter((x) => x.pendingReview > 0)) {
    actions.push({
      id: `doc-review-${d.workspaceId}`,
      title: `Approve documents — ${d.workspaceRef}`,
      priority: "medium",
      dueLabel: `${d.pendingReview} pending review`,
      workspaceUrl: d.workspaceUrl,
      actionLabel: "Review docs",
      kind: "approve_documents",
    });
  }

  for (const m of msgs.filter((x) => x.unreadCount > 0)) {
    actions.push({
      id: `msg-${m.workspaceId}`,
      title: `Respond to message — ${m.workspaceRef}`,
      priority: m.unreadCount > 3 ? "high" : "medium",
      dueLabel: `${m.unreadCount} unread`,
      workspaceUrl: m.workspaceUrl,
      actionLabel: "Open conversation",
      kind: "respond_message",
    });
  }

  for (const p of pos.filter((x) => x.pendingAck)) {
    actions.push({
      id: `po-${p.poId}`,
      title: `Review PO — ${p.poNumber}`,
      priority: "medium",
      dueLabel: "Acknowledgement pending",
      workspaceUrl: `/workspace/po/${p.poId}`,
      actionLabel: "Review PO",
      kind: "review_po",
    });
  }

  return actions.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });
}

function buildActiveTrades(
  rfqs: Array<{ id: string; externalRef: string; state: string; lastActivityAt: string }>,
  auctions: Array<{ id: string; externalRef: string; state: string; updatedAt: string }>,
  pos: PoListRow[],
  orders: Array<{ id: string; externalRef: string; state: string; lastActivityAt: string }>,
  shipments: ShipmentCommandRow[],
): ActiveTradeRow[] {
  const rows: ActiveTradeRow[] = [
    ...rfqs.filter((r) => !RFQ_TERMINAL.has(r.state)).map((r) => ({
      id: r.id, ref: r.externalRef, type: "RFQ" as const, stage: humanizeState(r.state),
      lastActivity: r.lastActivityAt, nextAction: nextActionFor("RFQ", r.state),
      workspaceUrl: `/workspace/rfq/${r.id}`,
    })),
    ...auctions.filter((a) => !["CANCELLED", "ORDERS_SPAWNED"].includes(a.state)).map((a) => ({
      id: a.id, ref: a.externalRef, type: "CommodityBid" as const, stage: humanizeState(a.state),
      lastActivity: a.updatedAt, nextAction: nextActionFor("CommodityBid", a.state),
      workspaceUrl: `/workspace/commoditybid/${a.id}`,
    })),
    ...pos.map((p) => ({
      id: p.poId, ref: p.poNumber, type: "PO" as const, stage: humanizeState(p.status),
      lastActivity: p.updatedAt, nextAction: p.pendingAck ? "Review acknowledgement" : "Monitor PO",
      workspaceUrl: `/workspace/po/${p.poId}`,
    })),
    ...orders.map((o) => ({
      id: o.id, ref: o.externalRef, type: "Order" as const, stage: humanizeState(o.state),
      lastActivity: o.lastActivityAt, nextAction: nextActionFor("Order", o.state),
      workspaceUrl: `/workspace/order/${o.id}`,
    })),
    ...shipments.filter((s) => s.state !== "COMPLETED").map((s) => ({
      id: s.id, ref: s.ref, type: "Shipment" as const, stage: humanizeState(s.state),
      lastActivity: s.eta ?? "", nextAction: s.isDelayed ? "Resolve exception" : "Track shipment",
      workspaceUrl: s.workspaceUrl,
    })),
  ];
  return rows.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

function nextActionFor(type: string, state: string): string {
  if (type === "CommodityBid") {
    if (CB_APPROVAL.has(state)) return "Approve winner";
    if (state === "LIVE") return "Monitor live auction";
    if (CB_LIVE.has(state)) return "Await auction start";
  }
  if (type === "RFQ") {
    if (state === "RFQ_OPEN") return "Review quotations";
    if (state === "UNDER_EVALUATION") return "Select supplier";
    if (state === "PROFORMA_RECEIVED") return "Approve proforma";
  }
  if (type === "Order") {
    if (state === "FREIGHT_REQUESTED") return "Select freight";
    if (state.startsWith("PRODUCTION")) return "Track production";
  }
  return "View details";
}

function buildLiveAuctions(
  auctions: Array<{
    id: string; externalRef: string; title: string; state: string;
    auctionStartsAt: string | null; auctionEndsAt: string | null; lowestBidAmount: number | null;
  }>,
): LiveAuctionRow[] {
  return auctions
    .filter((a) => CB_LIVE.has(a.state) || CB_APPROVAL.has(a.state) || a.state === "CLOSED")
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      ref: a.externalRef,
      title: a.title,
      state: a.state,
      auctionStartsAt: a.auctionStartsAt,
      auctionEndsAt: a.auctionEndsAt,
      lowestBidAmount: a.lowestBidAmount,
      needsApproval: CB_APPROVAL.has(a.state),
      workspaceUrl: `/workspace/commoditybid/${a.id}`,
    }));
}

function buildUpcomingEvents(
  rfqs: Array<{ id: string; externalRef: string; deadlineAt: string | null }>,
  auctions: Array<{ id: string; externalRef: string; auctionStartsAt: string | null; auctionEndsAt: string | null }>,
  shipments: ShipmentCommandRow[],
  pos: PoListRow[],
  orders: Array<{ id: string; externalRef: string; state: string }>,
): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];
  const now = Date.now();

  for (const r of rfqs) {
    if (r.deadlineAt && new Date(r.deadlineAt).getTime() > now) {
      events.push({
        id: `rfq-deadline-${r.id}`,
        at: r.deadlineAt,
        label: `RFQ deadline — ${r.externalRef}`,
        kind: "rfq_deadline",
        workspaceUrl: `/workspace/rfq/${r.id}`,
      });
    }
  }
  for (const a of auctions) {
    if (a.auctionStartsAt && new Date(a.auctionStartsAt).getTime() > now) {
      events.push({
        id: `auction-start-${a.id}`,
        at: a.auctionStartsAt,
        label: `Auction starts — ${a.externalRef}`,
        kind: "auction_start",
        workspaceUrl: `/workspace/commoditybid/${a.id}`,
      });
    }
    if (a.auctionEndsAt && new Date(a.auctionEndsAt).getTime() > now) {
      events.push({
        id: `auction-end-${a.id}`,
        at: a.auctionEndsAt,
        label: `Auction ends — ${a.externalRef}`,
        kind: "auction_end",
        workspaceUrl: `/workspace/commoditybid/${a.id}`,
      });
    }
  }
  for (const s of shipments) {
    if (s.eta) {
      events.push({
        id: `shipment-eta-${s.id}`,
        at: s.eta,
        label: `Shipment ETA — ${s.ref}`,
        kind: "shipment_eta",
        workspaceUrl: s.workspaceUrl,
      });
    }
  }
  for (const p of pos.filter((x) => x.openAmendments > 0)) {
    events.push({
      id: `po-amend-${p.poId}`,
      at: p.updatedAt,
      label: `PO amendment open — ${p.poNumber}`,
      kind: "po_review",
      workspaceUrl: `/workspace/po/${p.poId}`,
    });
  }
  for (const o of orders.filter((x) => x.state === "FREIGHT_REQUESTED")) {
    events.push({
      id: `freight-exp-${o.id}`,
      at: new Date(Date.now() + 86400_000).toISOString(),
      label: `Freight offer review — ${o.externalRef}`,
      kind: "freight_expiry",
      workspaceUrl: `/workspace/order/${o.id}`,
    });
  }

  return events
    .filter((e) => e.at && !Number.isNaN(new Date(e.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
