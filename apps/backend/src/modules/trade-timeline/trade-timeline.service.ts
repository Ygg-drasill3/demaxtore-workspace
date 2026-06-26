import type { PrismaClient } from "@prisma/client";
import type { AuthUser } from "../trade/trade.policy.js";
import { canAccessTradeTimeline } from "./trade-timeline.policy.js";
import { AppError } from "../../utils/httpErrors.js";
import {
  collectTradeGraph,
  resolveTradeRoot,
  tradeRefFromRoot,
} from "../trade/trade.resolver.js";
import {
  buildTimelineEvents,
  collectSourceEvents,
  type BuiltTimelineEvent,
} from "./trade-timeline-builder.js";
import type {
  TradeMilestoneType,
  TradeTimelineEventDto,
  TradeTimelineKpiDto,
  TradeTimelineNextMilestone,
  TradeTimelinePayload,
} from "@dmx/contracts/trade-timeline";
import { MILESTONE_PROGRESS } from "@dmx/contracts/trade-timeline";

const MILESTONE_ORDER: TradeMilestoneType[] = [
  "RFQ_SUBMITTED",
  "SUPPLIER_SELECTED",
  "FREIGHT_ESTIMATE_READY",
  "ESTIMATED_CIF_AVAILABLE",
  "PURCHASE_ORDER_ISSUED",
  "CARGO_READY_FORECAST_SUBMITTED",
  "CARRIER_SELECTED",
  "BOOKING_CONFIRMED",
  "PRODUCTION_STARTED",
  "PRODUCTION_COMPLETED",
  "INSPECTION_SCHEDULED",
  "INSPECTION_PASSED",
  "CONTAINER_LOADED",
  "VESSEL_DEPARTED",
  "ETA_UPDATED",
  "SHIPMENT_ARRIVED",
  "DOCUMENTS_COMPLETED",
  "DELIVERED",
];

const NEXT_MILESTONE_META: Record<TradeMilestoneType, { title: string; responsibleParty: string }> = {
  RFQ_SUBMITTED: { title: "RFQ Submitted", responsibleParty: "Buyer" },
  SUPPLIER_SELECTED: { title: "Supplier Selected", responsibleParty: "Buyer" },
  FREIGHT_ESTIMATE_READY: { title: "Freight Estimate Ready", responsibleParty: "Operations" },
  ESTIMATED_CIF_AVAILABLE: { title: "Estimated CIF Available", responsibleParty: "Buyer" },
  PURCHASE_ORDER_ISSUED: { title: "Purchase Order Issued", responsibleParty: "Buyer" },
  CARGO_READY_FORECAST_SUBMITTED: { title: "Cargo Ready Forecast", responsibleParty: "Supplier" },
  CARRIER_SELECTED: { title: "Carrier Selected", responsibleParty: "Buyer" },
  BOOKING_CONFIRMED: { title: "Booking Confirmed", responsibleParty: "Operations" },
  PRODUCTION_STARTED: { title: "Production Started", responsibleParty: "Supplier" },
  PRODUCTION_COMPLETED: { title: "Production Completed", responsibleParty: "Supplier" },
  INSPECTION_SCHEDULED: { title: "Inspection Scheduled", responsibleParty: "Supplier" },
  INSPECTION_PASSED: { title: "Inspection Passed", responsibleParty: "Inspector" },
  CONTAINER_LOADED: { title: "Container Loaded", responsibleParty: "Forwarder" },
  VESSEL_DEPARTED: { title: "Vessel Departed", responsibleParty: "Carrier" },
  ETA_UPDATED: { title: "ETA Updated", responsibleParty: "Carrier" },
  SHIPMENT_ARRIVED: { title: "Shipment Arrived", responsibleParty: "Forwarder" },
  DOCUMENTS_COMPLETED: { title: "Documents Completed", responsibleParty: "Buyer" },
  DELIVERED: { title: "Delivered", responsibleParty: "Forwarder" },
};

const STAGE_LABELS: Record<TradeMilestoneType, string> = {
  RFQ_SUBMITTED: "Waiting For Supplier Selection",
  SUPPLIER_SELECTED: "Waiting For PO",
  FREIGHT_ESTIMATE_READY: "Freight Planning",
  ESTIMATED_CIF_AVAILABLE: "Reviewing CIF Estimate",
  PURCHASE_ORDER_ISSUED: "Awaiting Production",
  CARGO_READY_FORECAST_SUBMITTED: "Cargo Planning",
  CARRIER_SELECTED: "Awaiting Booking Confirmation",
  BOOKING_CONFIRMED: "Production In Progress",
  PRODUCTION_STARTED: "Production In Progress",
  PRODUCTION_COMPLETED: "Awaiting Inspection",
  INSPECTION_SCHEDULED: "Inspection Scheduled",
  INSPECTION_PASSED: "Awaiting Shipment",
  CONTAINER_LOADED: "Preparing Departure",
  VESSEL_DEPARTED: "At Sea",
  ETA_UPDATED: "At Sea",
  SHIPMENT_ARRIVED: "Arrived At Destination",
  DOCUMENTS_COMPLETED: "Finalizing Documents",
  DELIVERED: "Delivered",
};

function filterForRole(events: BuiltTimelineEvent[], role: string): BuiltTimelineEvent[] {
  if (role === "ADMIN" || role === "BUYER" || role === "SALES_CONTROL") return events;
  return events.filter((e) => e.visibility === "ALL");
}

function computeProgress(achieved: Set<TradeMilestoneType>): number {
  let max = 0;
  for (const m of MILESTONE_ORDER) {
    if (achieved.has(m)) max = Math.max(max, MILESTONE_PROGRESS[m]);
  }
  return max;
}

function computeCurrentMilestone(achieved: Set<TradeMilestoneType>): TradeMilestoneType | null {
  let current: TradeMilestoneType | null = null;
  for (const m of MILESTONE_ORDER) {
    if (achieved.has(m)) current = m;
  }
  return current;
}

function computeNextMilestone(
  achieved: Set<TradeMilestoneType>,
  graph: Awaited<ReturnType<typeof collectTradeGraph>>,
): TradeTimelineNextMilestone | null {
  for (const m of MILESTONE_ORDER) {
    if (!achieved.has(m)) {
      const meta = NEXT_MILESTONE_META[m];
      return {
        eventType: m,
        title: meta.title,
        estimatedDate: null,
        responsibleParty: meta.responsibleParty,
      };
    }
  }
  return null;
}

function toDto(tradeId: string, row: {
  id: string;
  eventType: string;
  eventCategory: string;
  title: string;
  description: string | null;
  sourceModule: string;
  severity: string;
  occurredAt: Date;
  createdAt: Date;
  metadata: unknown;
}): TradeTimelineEventDto {
  return {
    id: row.id,
    tradeId,
    eventType: row.eventType,
    eventCategory: row.eventCategory as TradeTimelineEventDto["eventCategory"],
    title: row.title,
    description: row.description,
    sourceModule: row.sourceModule as TradeTimelineEventDto["sourceModule"],
    severity: row.severity as TradeTimelineEventDto["severity"],
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

export class TradeTimelineService {
  constructor(private readonly db: PrismaClient) {}

  async getTimeline(actor: AuthUser, workspaceId: string): Promise<TradeTimelinePayload> {
    if (!(await canAccessTradeTimeline(this.db, actor, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }

    const root = await resolveTradeRoot(this.db, workspaceId);
    if (!root) throw new AppError(404, "TRADE_NOT_FOUND");

    const graph = await collectTradeGraph(this.db, root);
    const tradeRef = tradeRefFromRoot(root);

    const sourceEvents = await collectSourceEvents(this.db, graph);
    const built = buildTimelineEvents(sourceEvents, graph);
    const filtered = filterForRole(built, actor.role);

    await this.syncEvents(graph.rootId, filtered);

    const stored = await this.db.tradeTimelineEvent.findMany({
      where: { tradeId: graph.rootId },
      orderBy: { occurredAt: "asc" },
    });

    const events = stored
      .filter((s) => {
        if (actor.role === "ADMIN" || actor.role === "BUYER" || actor.role === "SALES_CONTROL") return true;
        const meta = s.metadata as Record<string, unknown>;
        return meta.visibility !== "BUYER" && meta.visibility !== "ADMIN";
      })
      .map((s) => toDto(graph.rootId, s));

    const achieved = new Set<TradeMilestoneType>();
    for (const e of filtered) {
      if (e.milestoneType) achieved.add(e.milestoneType);
    }

    const currentMilestone = computeCurrentMilestone(achieved);
    const progressPercent = computeProgress(achieved);
    const nextMilestone = computeNextMilestone(achieved, graph);

    const stage = currentMilestone
      ? STAGE_LABELS[currentMilestone]
      : root.state === "DRAFT"
        ? "Draft"
        : "In Progress";

    return {
      tradeId: graph.rootId,
      tradeRef,
      events,
      currentStatus: {
        stage,
        milestoneType: currentMilestone,
        progressPercent,
      },
      progressPercent,
      nextMilestone,
    };
  }

  async countKpis(actor: AuthUser): Promise<TradeTimelineKpiDto> {
    const roots = await this.findUserTradeRoots(actor);

    let activeTrades = 0;
    let tradesInProduction = 0;
    let tradesInTransit = 0;
    let delayedTrades = 0;
    let completedTrades = 0;

    const PRODUCTION_STATES = new Set([
      "PRODUCTION_STARTED", "PRODUCTION_COMPLETED", "INSPECTION_PENDING", "INSPECTION_COMPLETED",
    ]);
    const TRANSIT_STATES = new Set([
      "IN_TRANSIT", "LOADED_ON_VESSEL", "DEPARTED_ORIGIN_PORT", "ARRIVED_DESTINATION_PORT",
    ]);
    const COMPLETED_STATES = new Set(["DELIVERED", "CLOSED", "COMPLETED"]);

    for (const root of roots) {
      const graph = await collectTradeGraph(this.db, root);
      const [orders, shipments] = await Promise.all([
        graph.orderIds.length
          ? this.db.workspace.findMany({ where: { id: { in: graph.orderIds } }, select: { state: true } })
          : [],
        graph.shipmentIds.length
          ? this.db.workspace.findMany({ where: { id: { in: graph.shipmentIds } }, select: { state: true } })
          : [],
      ]);

      const orderStates = orders.map((o) => o.state);
      const shipmentStates = shipments.map((s) => s.state);
      const isCompleted = shipmentStates.some((s) => COMPLETED_STATES.has(s))
        || orderStates.some((s) => s === "DELIVERED" || s === "CLOSED");

      if (isCompleted) {
        completedTrades++;
        continue;
      }

      activeTrades++;

      if (orderStates.some((s) => PRODUCTION_STATES.has(s))) tradesInProduction++;
      if (shipmentStates.some((s) => TRANSIT_STATES.has(s))) tradesInTransit++;
      if (shipmentStates.some((s) => s === "EXCEPTION") || orderStates.some((s) => s.includes("DISPUTE"))) {
        delayedTrades++;
      }
    }

    return { activeTrades, tradesInProduction, tradesInTransit, delayedTrades, completedTrades };
  }

  private async syncEvents(tradeId: string, events: BuiltTimelineEvent[]): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.tradeTimelineEvent.deleteMany({ where: { tradeId } });
      if (events.length === 0) return;
      await tx.tradeTimelineEvent.createMany({
        data: events.map((e) => ({
          tradeId,
          eventType: e.eventType,
          eventCategory: e.eventCategory,
          title: e.title,
          description: e.description,
          sourceModule: e.sourceModule,
          severity: e.severity,
          occurredAt: e.occurredAt,
          metadata: { sourceEventId: e.sourceEventId, visibility: e.visibility, ...e.metadata },
        })),
      });
    });
  }

  private async findUserTradeRoots(actor: AuthUser) {
    if (actor.role === "ADMIN") {
      return this.db.workspace.findMany({
        where: { type: { in: ["RFQ", "COMMODITYBID", "MIXED_CONTAINER", "BULK_CONTAINER"] } },
        take: 200,
        orderBy: { updatedAt: "desc" },
      });
    }

    const participations = await this.db.workspaceParticipant.findMany({
      where: { userId: actor.id, leftAt: null },
      select: { workspaceId: true },
      take: 500,
    });

    const roots: Awaited<ReturnType<typeof this.db.workspace.findUnique>>[] = [];
    for (const p of participations) {
      const root = await resolveTradeRoot(this.db, p.workspaceId);
      if (root && !roots.some((r) => r?.id === root.id)) roots.push(root);
    }
    return roots.filter(Boolean) as NonNullable<Awaited<ReturnType<typeof this.db.workspace.findUnique>>>[];
  }
}
