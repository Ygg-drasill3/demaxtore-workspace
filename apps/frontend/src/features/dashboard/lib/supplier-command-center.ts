/**
 * Sprint 10B — Supplier Command Center aggregator (existing APIs only).
 */
import { rfqApi } from "@/features/rfq/lib/rfq.api";
import { orderApi } from "@/features/order/lib/order.api";
import { commoditybidApi } from "@/features/commoditybid/lib/commoditybid.api";
import type { OnboardingProgressDTO } from "@dmx/contracts/onboarding";
import {
  fetchSupplierPoList,
  fetchSupplierShipmentList,
  fetchSupplierTradeDocList,
  fetchSupplierMessageList,
} from "@/features/navigation/lib/supplier-portfolio";

const LIMIT = 15;

const OPEN_RFQ = new Set(["SUPPLIERS_ASSIGNED", "RFQ_OPEN"]);
const CB_OPPORTUNITY = new Set(["SCHEDULED", "INVITING_SUPPLIERS", "READY_TO_START", "LIVE"]);
const CB_LIVE = new Set(["LIVE"]);
const TRANSIT = new Set(["IN_TRANSIT", "LOADED_ON_VESSEL", "DEPARTED_ORIGIN_PORT", "BOOKING_PENDING", "SHIPMENT_CREATED"]);

export type SupplierDashboardMode = "new_supplier" | "active_supplier" | "top_supplier";

export type ActionPriority = "high" | "medium" | "low";

export interface SupplierKpis {
  pendingRfqInvites: number;
  liveAuctions: number;
  pendingPos: number;
  activeOrders: number;
  shipmentsInProgress: number;
  unreadMessages: number;
}

export interface SupplierAction {
  id: string;
  title: string;
  priority: ActionPriority;
  dueLabel: string;
  workspaceUrl: string;
  actionLabel: string;
  kind: string;
}

export interface OpportunityRow {
  id: string;
  ref: string;
  type: "RFQ" | "CommodityBid";
  title: string;
  state: string;
  auctionEndsAt: string | null;
  participationStatus: string;
  workspaceUrl: string;
}

export interface ExecutionRow {
  id: string;
  ref: string;
  type: "PO" | "Order" | "Shipment";
  stage: string;
  nextAction: string;
  lastActivity: string;
  workspaceUrl: string;
}

export interface SupplierDocRow {
  workspaceType: "ORDER" | "SHIPMENT";
  workspaceId: string;
  workspaceRef: string;
  complianceStatus: string;
  missingCount: number;
  pendingReview: number;
  rejectedCount: number;
  approvedCount: number;
  requiredCount: number;
  workspaceUrl: string;
}

export interface SupplierCommRow {
  workspaceType: string;
  workspaceId: string;
  workspaceRef: string;
  unreadCount: number;
  lastMessage: string;
  lastAt: string;
  workspaceUrl: string;
}

export interface SupplierEvent {
  id: string;
  at: string;
  label: string;
  kind: string;
  workspaceUrl: string;
}

export interface SupplierCommandCenter {
  mode: SupplierDashboardMode;
  kpis: SupplierKpis;
  actions: SupplierAction[];
  opportunities: OpportunityRow[];
  execution: ExecutionRow[];
  documents: SupplierDocRow[];
  communications: SupplierCommRow[];
  upcomingEvents: SupplierEvent[];
}

function resolveMode(onboarding: OnboardingProgressDTO | null, workload: number): SupplierDashboardMode {
  if (!onboarding?.firstTradeCompleted && (onboarding?.completionPercent ?? 0) < 50) return "new_supplier";
  if (onboarding?.firstTradeCompleted && workload >= 10) return "top_supplier";
  return "active_supplier";
}

function humanize(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchSupplierCommandCenter(
  onboarding?: OnboardingProgressDTO | null,
): Promise<SupplierCommandCenter> {
  const [rfqs, orders, auctions, pos, shipments, docs, messages] = await Promise.all([
    rfqApi.list({ limit: LIMIT }),
    orderApi.list({ bucket: "active", limit: LIMIT }),
    commoditybidApi.list({ limit: LIMIT }),
    fetchSupplierPoList(),
    fetchSupplierShipmentList(),
    fetchSupplierTradeDocList(),
    fetchSupplierMessageList(),
  ]);

  const rfqItems = rfqs.items as Array<{
    id: string; externalRef: string; title: string; state: string;
    lastActivityAt: string; deadlineAt: string | null; hasMyQuotation?: boolean;
  }>;
  const orderItems = orders.items as Array<{
    id: string; externalRef: string; state: string; lastActivityAt: string; buyerName: string;
  }>;
  const auctionItems = auctions.items as Array<{
    id: string; externalRef: string; title: string; state: string;
    auctionStartsAt: string | null; auctionEndsAt: string | null; updatedAt: string;
  }>;

  const pendingRfqs = rfqItems.filter((r) => OPEN_RFQ.has(r.state));
  const liveAuctions = auctionItems.filter((a) => CB_LIVE.has(a.state));
  const pendingPos = pos.filter((p) => p.pendingAck);
  const shipmentsActive = shipments.filter((s) => s.state !== "COMPLETED" && s.state !== "CANCELLED");
  const unreadMessages = messages.reduce((n, m) => n + m.unreadCount, 0);

  const opportunities = buildOpportunities(rfqItems, auctionItems);
  const execution = buildExecution(pos, orderItems, shipments);
  const actions = buildActions(rfqItems, auctionItems, pos, docs, messages, orderItems, shipments);
  const upcomingEvents = buildEvents(rfqItems, auctionItems, pos, shipments);

  const documentRows: SupplierDocRow[] = docs.map((d) => ({
    ...d,
    workspaceUrl: d.workspaceType === "ORDER"
      ? `/workspace/order/${d.workspaceId}`
      : `/workspace/shipment/${d.workspaceId}`,
  }));

  const kpis: SupplierKpis = {
    pendingRfqInvites: pendingRfqs.length,
    liveAuctions: liveAuctions.length,
    pendingPos: pendingPos.length,
    activeOrders: orderItems.length,
    shipmentsInProgress: shipmentsActive.filter((s) => TRANSIT.has(s.state) || s.state === "EXCEPTION").length,
    unreadMessages,
  };

  const mode = resolveMode(onboarding ?? null, execution.length + opportunities.length);

  return {
    mode,
    kpis,
    actions: actions.slice(0, 12),
    opportunities,
    execution: execution.slice(0, 20),
    documents: documentRows,
    communications: messages,
    upcomingEvents: upcomingEvents.slice(0, 15),
  };
}

function buildOpportunities(
  rfqs: Array<{ id: string; externalRef: string; title: string; state: string }>,
  auctions: Array<{ id: string; externalRef: string; title: string; state: string; auctionEndsAt: string | null }>,
): OpportunityRow[] {
  const rows: OpportunityRow[] = [
    ...rfqs.filter((r) => OPEN_RFQ.has(r.state)).map((r) => ({
      id: r.id,
      ref: r.externalRef,
      type: "RFQ" as const,
      title: r.title,
      state: r.state,
      auctionEndsAt: null,
      participationStatus: "Awaiting quotation",
      workspaceUrl: `/workspace/rfq/${r.id}`,
    })),
    ...auctions.filter((a) => CB_OPPORTUNITY.has(a.state)).map((a) => ({
      id: a.id,
      ref: a.externalRef,
      type: "CommodityBid" as const,
      title: a.title,
      state: a.state,
      auctionEndsAt: a.auctionEndsAt,
      participationStatus: a.state === "LIVE" ? "Live — submit bids" : "Invitation open",
      workspaceUrl: `/workspace/commoditybid/${a.id}`,
    })),
  ];
  return rows;
}

function buildExecution(
  pos: Awaited<ReturnType<typeof fetchSupplierPoList>>,
  orders: Array<{ id: string; externalRef: string; state: string; lastActivityAt: string }>,
  shipments: Awaited<ReturnType<typeof fetchSupplierShipmentList>>,
): ExecutionRow[] {
  return [
    ...pos.map((p) => ({
      id: p.poId,
      ref: p.poNumber,
      type: "PO" as const,
      stage: humanize(p.status),
      nextAction: p.pendingAck ? "Acknowledge PO" : "Monitor PO",
      lastActivity: p.updatedAt,
      workspaceUrl: `/workspace/po/${p.poId}`,
    })),
    ...orders.map((o) => ({
      id: o.id,
      ref: o.externalRef,
      type: "Order" as const,
      stage: humanize(o.state),
      nextAction: o.state === "ORDER_CREATED" ? "Confirm order" : nextOrderAction(o.state),
      lastActivity: o.lastActivityAt,
      workspaceUrl: `/workspace/order/${o.id}`,
    })),
    ...shipments.filter((s) => s.state !== "COMPLETED").map((s) => ({
      id: s.id,
      ref: s.externalRef,
      type: "Shipment" as const,
      stage: humanize(s.state),
      nextAction: s.state === "EXCEPTION" ? "Resolve exception" : "Update milestone",
      lastActivity: s.createdAt,
      workspaceUrl: `/workspace/shipment/${s.id}`,
    })),
  ].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

function nextOrderAction(state: string): string {
  if (state.startsWith("PRODUCTION")) return "Report progress";
  if (state === "FREIGHT_REQUESTED") return "Await freight booking";
  return "Open order";
}

function buildActions(
  rfqs: Array<{ id: string; externalRef: string; title: string; state: string; hasMyQuotation?: boolean }>,
  auctions: Array<{ id: string; externalRef: string; title: string; state: string }>,
  pos: Awaited<ReturnType<typeof fetchSupplierPoList>>,
  docs: Awaited<ReturnType<typeof fetchSupplierTradeDocList>>,
  messages: Awaited<ReturnType<typeof fetchSupplierMessageList>>,
  orders: Array<{ id: string; externalRef: string; state: string }>,
  shipments: Awaited<ReturnType<typeof fetchSupplierShipmentList>>,
): SupplierAction[] {
  const actions: SupplierAction[] = [];

  for (const r of rfqs.filter((x) => OPEN_RFQ.has(x.state))) {
    const hasQuote = (r as { hasMyQuotation?: boolean }).hasMyQuotation === true;
    actions.push({
      id: `rfq-quote-${r.id}`,
      title: hasQuote
        ? `Revise RFQ response — ${r.externalRef}`
        : `Submit RFQ response — ${r.externalRef}`,
      priority: "high",
      dueLabel: hasQuote ? "Revision available" : "Quotation requested",
      workspaceUrl: `/workspace/rfq/${r.id}`,
      actionLabel: hasQuote ? "Submit revision" : "Submit quote",
      kind: hasQuote ? "revise_rfq_response" : "submit_rfq_response",
    });
  }

  for (const a of auctions.filter((x) => CB_OPPORTUNITY.has(x.state))) {
    actions.push({
      id: `cb-join-${a.id}`,
      title: `${a.state === "LIVE" ? "Bid in live auction" : "Join auction"} — ${a.title || a.externalRef}`,
      priority: a.state === "LIVE" ? "high" : "medium",
      dueLabel: a.state === "LIVE" ? "Auction live now" : "Invitation received",
      workspaceUrl: `/workspace/commoditybid/${a.id}`,
      actionLabel: a.state === "LIVE" ? "Submit bid" : "Join auction",
      kind: "join_auction",
    });
  }

  for (const p of pos.filter((x) => x.pendingAck)) {
    actions.push({
      id: `po-ack-${p.poId}`,
      title: `Acknowledge PO — ${p.poNumber}`,
      priority: "high",
      dueLabel: "Acknowledgement required",
      workspaceUrl: `/workspace/po/${p.poId}`,
      actionLabel: "Acknowledge PO",
      kind: "acknowledge_po",
    });
  }

  for (const d of docs.filter((x) => x.missingCount > 0)) {
    actions.push({
      id: `doc-upload-${d.workspaceId}`,
      title: `Upload missing documents — ${d.workspaceRef}`,
      priority: "high",
      dueLabel: `${d.missingCount} missing`,
      workspaceUrl: `/workspace/order/${d.workspaceId}`,
      actionLabel: "Upload docs",
      kind: "upload_document",
    });
  }

  for (const m of messages.filter((x) => x.unreadCount > 0)) {
    actions.push({
      id: `msg-${m.workspaceId}`,
      title: `Respond to buyer — ${m.workspaceRef}`,
      priority: m.unreadCount > 2 ? "high" : "medium",
      dueLabel: `${m.unreadCount} unread`,
      workspaceUrl: m.workspaceUrl,
      actionLabel: "Reply",
      kind: "respond_buyer",
    });
  }

  for (const o of orders.filter((x) => x.state === "ORDER_CREATED")) {
    actions.push({
      id: `order-confirm-${o.id}`,
      title: `Confirm order — ${o.externalRef}`,
      priority: "medium",
      dueLabel: "Awaiting supplier confirmation",
      workspaceUrl: `/workspace/order/${o.id}`,
      actionLabel: "Confirm order",
      kind: "confirm_order",
    });
  }

  for (const s of shipments.filter((x) => x.state === "EXCEPTION")) {
    actions.push({
      id: `ship-${s.id}`,
      title: `Review shipment exception — ${s.externalRef}`,
      priority: "high",
      dueLabel: "Exception reported",
      workspaceUrl: `/workspace/shipment/${s.id}`,
      actionLabel: "Review shipment",
      kind: "review_shipment",
    });
  }

  const prio = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => prio[a.priority] - prio[b.priority]);
}

function buildEvents(
  rfqs: Array<{ id: string; externalRef: string; deadlineAt: string | null }>,
  auctions: Array<{ id: string; externalRef: string; auctionStartsAt: string | null; auctionEndsAt: string | null }>,
  pos: Awaited<ReturnType<typeof fetchSupplierPoList>>,
  shipments: Awaited<ReturnType<typeof fetchSupplierShipmentList>>,
): SupplierEvent[] {
  const events: SupplierEvent[] = [];
  const now = Date.now();

  for (const r of rfqs) {
    if (r.deadlineAt && new Date(r.deadlineAt).getTime() > now) {
      events.push({
        id: `rfq-dl-${r.id}`,
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
        id: `auc-start-${a.id}`,
        at: a.auctionStartsAt,
        label: `Auction starts — ${a.externalRef}`,
        kind: "auction_start",
        workspaceUrl: `/workspace/commoditybid/${a.id}`,
      });
    }
    if (a.auctionEndsAt && new Date(a.auctionEndsAt).getTime() > now) {
      events.push({
        id: `auc-end-${a.id}`,
        at: a.auctionEndsAt,
        label: `Auction ends — ${a.externalRef}`,
        kind: "auction_end",
        workspaceUrl: `/workspace/commoditybid/${a.id}`,
      });
    }
  }
  for (const p of pos.filter((x) => x.pendingAck)) {
    events.push({
      id: `po-dl-${p.poId}`,
      at: p.updatedAt,
      label: `PO acknowledgement — ${p.poNumber}`,
      kind: "po_deadline",
      workspaceUrl: `/workspace/po/${p.poId}`,
    });
  }
  for (const s of shipments) {
    events.push({
      id: `ship-ms-${s.id}`,
      at: s.createdAt,
      label: `Shipment milestone — ${s.externalRef} (${humanize(s.state)})`,
      kind: "shipment_milestone",
      workspaceUrl: `/workspace/shipment/${s.id}`,
    });
  }

  return events
    .filter((e) => e.at && !Number.isNaN(new Date(e.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
