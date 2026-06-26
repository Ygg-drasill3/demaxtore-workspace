import { Prisma, type PrismaClient } from "@prisma/client";
import type { OrderAction } from "@dmx/contracts/order.fsm";
import type { ShipmentAction } from "@dmx/contracts/shipment.fsm";
import type { OrchestratorPlan } from "@dmx/contracts/order-shipment-orchestration";
import {
  evaluateOrderShipmentDesync,
  planFromDesyncHit,
  planFromOrderMilestone,
  planFromShipmentMilestone,
} from "@dmx/contracts/order-shipment-orchestration";
import { claimProcessedEvent } from "../../lib/processed-event.js";
import { OrderService } from "../order/order.service.js";
import { isOrchestratorAutoApply, isOrchestratorEnabled, isOrchestratorShadowMode } from "../../config/orchestrator.js";
import { AppError } from "../../utils/httpErrors.js";
import { logger } from "../../config/logger.js";

const SYSTEM_ACTOR = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "system@demaxtore.local",
  role: "SYSTEM" as const,
};

const ORDER_ACTION_PATH: Partial<Record<OrderAction, string>> = {
  book_shipment: "book-shipment",
  mark_departed: "mark-departed",
  mark_arrived: "mark-arrived",
  mark_delivered: "mark-delivered",
  close_order: "close-order",
};

const SHIPMENT_ACTION_PATH: Partial<Record<ShipmentAction, string>> = {
  confirm_booking: "confirm-booking",
  assign_container: "assign-container",
  load_vessel: "load-vessel",
  depart_vessel: "depart-vessel",
  arrive_destination: "arrive-destination",
  confirm_delivery: "confirm-delivery",
  complete_shipment: "complete-shipment",
  cancel_shipment: "cancel-shipment",
  reject_shipment: "reject-shipment",
};

export class OrderShipmentOrchestrator {
  private readonly orders: OrderService;

  constructor(private readonly db: PrismaClient) {
    this.orders = new OrderService(db);
  }

  async evaluatePair(orderId: string, shipmentId: string) {
    const [order, shipment] = await Promise.all([
      this.db.workspace.findUnique({ where: { id: orderId }, select: { state: true } }),
      this.db.workspace.findUnique({ where: { id: shipmentId }, select: { state: true } }),
    ]);
    if (!order || !shipment) return null;
    const hit = evaluateOrderShipmentDesync(order.state, shipment.state);
    if (!hit) return null;
    return planFromDesyncHit({
      orderId,
      shipmentId,
      orderState: order.state,
      shipmentState: shipment.state,
      hit,
    });
  }

  async planFromDesyncAlert(input: {
    orderId: string;
    shipmentId: string;
    orderState: string;
    shipmentState: string;
    rule: string;
    laggingEntity: "ORDER" | "SHIPMENT";
  }): Promise<{ id: string; mode: string } | null> {
    if (!isOrchestratorEnabled()) return null;

    const eventId = `desync:${input.orderId}:${input.rule}`;
    const claimed = await claimProcessedEvent(this.db, {
      source: `orchestrator:plan:${input.orderId}`,
      eventId,
      workspaceId: input.orderId,
      payload: input,
    });
    if (!claimed) return null;

    const hit = evaluateOrderShipmentDesync(input.orderState, input.shipmentState);
    if (!hit) return null;

    const plan = planFromDesyncHit({
      orderId: input.orderId,
      shipmentId: input.shipmentId,
      orderState: input.orderState,
      shipmentState: input.shipmentState,
      hit,
    });

    return this.recordAndMaybeApply(plan, isOrchestratorShadowMode() ? "shadow" : "apply");
  }

  async onShipmentTransition(input: {
    shipmentId: string;
    action: ShipmentAction;
    payload?: Record<string, unknown>;
    eventId?: string;
  }): Promise<void> {
    if (!isOrchestratorEnabled()) return;

    const shipment = await this.db.workspace.findUnique({
      where: { id: input.shipmentId },
      select: { state: true, spawnedFromId: true },
    });
    if (!shipment?.spawnedFromId) return;

    const order = await this.db.workspace.findUnique({
      where: { id: shipment.spawnedFromId },
      select: { state: true },
    });
    if (!order) return;

    const eventId = input.eventId ?? `shipment:${input.shipmentId}:${input.action}`;
    const claimed = await claimProcessedEvent(this.db, {
      source: `orchestrator:plan:${shipment.spawnedFromId}`,
      eventId,
      workspaceId: shipment.spawnedFromId,
      action: input.action,
    });
    if (!claimed) return;

    const plan = planFromShipmentMilestone({
      orderId: shipment.spawnedFromId,
      shipmentId: input.shipmentId,
      shipmentAction: input.action,
      orderState: order.state,
      shipmentState: shipment.state,
      exceptionCategory: input.payload?.category as never,
    });
    if (!plan) return;

    const shadow = isOrchestratorShadowMode() && !isOrchestratorAutoApply();
    await this.recordAndMaybeApply(plan, shadow ? "shadow" : "apply");
  }

  async onOrderTransition(input: {
    orderId: string;
    action: OrderAction;
    payload?: Record<string, unknown>;
    eventId?: string;
    result: { fromState: string; toState: string };
  }): Promise<void> {
    if (!isOrchestratorEnabled()) return;

    const shipment = await this.db.workspace.findFirst({
      where: { spawnedFromId: input.orderId, type: "SHIPMENT" },
      orderBy: { createdAt: "desc" },
      select: { id: true, state: true },
    });
    if (!shipment) return;

    const eventId = input.eventId ?? `order:${input.orderId}:${input.action}:${input.result.fromState}->${input.result.toState}`;
    const claimed = await claimProcessedEvent(this.db, {
      source: `orchestrator:plan:${input.orderId}`,
      eventId,
      workspaceId: input.orderId,
      action: input.action,
    });
    if (!claimed) return;

    if (input.action === "open_dispute") {
      await this.linkOrderDisputeException(input.orderId, shipment.id, input.payload);
      return;
    }

    const plan = planFromOrderMilestone({
      orderId: input.orderId,
      shipmentId: shipment.id,
      orderAction: input.action,
      orderState: input.result.toState,
      shipmentState: shipment.state,
    });
    if (!plan) return;

    const shadow = isOrchestratorShadowMode() && !isOrchestratorAutoApply();
    await this.recordAndMaybeApply(plan, shadow ? "shadow" : "apply");
  }

  /** UI/manual compatibility — records orchestrator plan after FSM apply. */
  async handleManualAction(input: {
    entity: "ORDER" | "SHIPMENT";
    workspaceId: string;
    action: string;
    payload?: Record<string, unknown>;
    eventId?: string;
  }): Promise<void> {
    if (!isOrchestratorEnabled()) return;
    if (input.entity === "SHIPMENT") {
      await this.onShipmentTransition({
        shipmentId: input.workspaceId,
        action: input.action as ShipmentAction,
        payload: input.payload,
        eventId: input.eventId ?? `manual:shipment:${input.workspaceId}:${input.action}`,
      });
    }
  }

  private async linkOrderDisputeException(
    orderId: string,
    shipmentId: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const order = await this.db.workspace.findUnique({
      where: { id: orderId },
      select: { externalRef: true, spawnedFromId: true },
    });
    if (!order) return;

    const tradeRootId = order.spawnedFromId ?? orderId;
    const existing = await this.db.tradeException.findFirst({
      where: { workspaceId: orderId, exceptionType: "Quality Claim", status: "Open" },
    });
    if (existing) return;

    await this.db.tradeException.create({
      data: {
        tradeRootId,
        workspaceId: orderId,
        workspaceType: "ORDER",
        exceptionType: "Quality Claim",
        severity: "High",
        status: "Open",
        requiredAction: "Review order dispute and linked shipment operations",
        resolutionNote: payload?.reason ? String(payload.reason) : null,
      },
    });

    await this.db.timelineEvent.create({
      data: {
        workspaceId: orderId,
        eventType: "orchestrator.dispute.linked",
        actorUserId: null,
        payload: { shipmentId, category: payload?.category ?? null },
      },
    });
  }

  async recordAndMaybeApply(
    plan: OrchestratorPlan,
    mode: "shadow" | "apply",
  ): Promise<{ id: string; mode: string }> {
    const row = await this.db.orchestratorRecommendation.create({
      data: {
        orderId: plan.orderId,
        shipmentId: plan.shipmentId,
        source: plan.source,
        rule: plan.rule ?? null,
        mode,
        plan: plan as unknown as Prisma.InputJsonValue,
      },
    });

    await this.db.timelineEvent.create({
      data: {
        workspaceId: plan.orderId,
        eventType: "orchestrator.recommendation.created",
        actorUserId: null,
        payload: { recommendationId: row.id, mode, rule: plan.rule ?? null },
      },
    });

    if (mode === "apply") {
      await this.applyPlan(plan);
      await this.db.orchestratorRecommendation.update({
        where: { id: row.id },
        data: { mode: "applied" },
      });
      return { id: row.id, mode: "applied" };
    }

    logger.info({ recommendationId: row.id, plan }, "Orchestrator shadow recommendation");
    return { id: row.id, mode: "shadow" };
  }

  async applyRecommendation(id: string, actorId: string): Promise<void> {
    const row = await this.db.orchestratorRecommendation.findUnique({ where: { id } });
    if (!row) throw new AppError(404, "ORCHESTRATOR_RECOMMENDATION_NOT_FOUND");
    if (row.mode === "applied" || row.mode === "rejected") {
      throw new AppError(409, "ORCHESTRATOR_RECOMMENDATION_CLOSED");
    }
    const plan = row.plan as unknown as OrchestratorPlan;
    await this.applyPlan(plan);
    await this.db.orchestratorRecommendation.update({
      where: { id },
      data: { mode: "applied" },
    });
    await this.db.timelineEvent.create({
      data: {
        workspaceId: row.orderId,
        eventType: "orchestrator.recommendation.applied",
        actorUserId: actorId,
        payload: { recommendationId: id },
      },
    });
  }

  async dismissRecommendation(id: string, actorId: string): Promise<void> {
    const row = await this.db.orchestratorRecommendation.findUnique({ where: { id } });
    if (!row) throw new AppError(404, "ORCHESTRATOR_RECOMMENDATION_NOT_FOUND");
    await this.db.orchestratorRecommendation.update({
      where: { id },
      data: { mode: "rejected" },
    });
    await this.db.timelineEvent.create({
      data: {
        workspaceId: row.orderId,
        eventType: "orchestrator.recommendation.dismissed",
        actorUserId: actorId,
        payload: { recommendationId: id },
      },
    });
  }

  async listRecommendations(query: { orderId?: string; shipmentId?: string }) {
    return this.db.orchestratorRecommendation.findMany({
      where: {
        orderId: query.orderId,
        shipmentId: query.shipmentId,
        mode: { in: ["shadow", "applied"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async latestForOrder(orderId: string) {
    return this.db.orchestratorRecommendation.findFirst({
      where: { orderId, mode: { in: ["shadow", "applied"] } },
      orderBy: { createdAt: "desc" },
    });
  }

  async onPaymentEvent(orderId: string, kind: string): Promise<void> {
    if (!isOrchestratorEnabled()) return;
    logger.info({ orderId, kind }, "Orchestrator payment event received");
    await this.db.timelineEvent.create({
      data: {
        workspaceId: orderId,
        eventType: "orchestrator.payment.event",
        actorUserId: null,
        payload: { kind },
      },
    });
  }

  async onCarrierEvent(input: {
    shipmentId: string;
    action: ShipmentAction;
    eventId: string;
    source: string;
  }): Promise<void> {
    if (!isOrchestratorEnabled()) return;
    await this.onShipmentTransition({
      shipmentId: input.shipmentId,
      action: input.action,
      eventId: input.eventId,
      payload: { transitionSource: input.source },
    });
  }

  private async applyPlan(plan: OrchestratorPlan): Promise<void> {
    const { ShipmentService } = await import("../shipment/shipment.service.js");
    const shipments = new ShipmentService(this.db);

    for (const step of plan.suggestedActions) {
      if (step.action === "suggest_dispute") continue;

      if (step.entity === "ORDER") {
        await this.orders.applyTransition({
          workspaceId: plan.orderId,
          action: step.action as OrderAction,
          actor: SYSTEM_ACTOR,
          payload: this.defaultOrderPayload(step.action as OrderAction, step.payload),
          idempotencyKey: `orch:${plan.orderId}:${step.action}`,
        });
      } else {
        await shipments.applyTransition({
          workspaceId: plan.shipmentId,
          action: step.action as ShipmentAction,
          actor: { ...SYSTEM_ACTOR, role: "ADMIN" },
          payload: this.defaultShipmentPayload(step.action as ShipmentAction, step.payload),
          idempotencyKey: `orch:${plan.shipmentId}:${step.action}`,
        });
      }
    }
  }

  private defaultOrderPayload(action: OrderAction, base?: Record<string, unknown>): Record<string, unknown> {
    const now = new Date().toISOString();
    const payload = { ...(base ?? {}) };
    if (action === "book_shipment") {
      payload.freightForwarder ??= "Orchestrator";
      payload.vesselName ??= "MV Orchestrator";
      payload.billOfLading ??= `BL-ORCH-${Date.now()}`;
      payload.expectedDeparture ??= now;
    }
    if (action === "mark_departed") payload.actualDepartureDate ??= now;
    if (action === "mark_arrived") payload.actualArrivalDate ??= now;
    return payload;
  }

  private defaultShipmentPayload(action: ShipmentAction, base?: Record<string, unknown>): Record<string, unknown> {
    const payload = { ...(base ?? {}) };
    if (action === "assign_container") payload.containerNumber ??= `ORCH${Date.now().toString().slice(-7)}`;
    if (action === "load_vessel") {
      payload.vesselName ??= "MV Orchestrator";
      payload.voyageNumber ??= "V001";
    }
    if (action === "confirm_booking") {
      payload.carrierName ??= "Maersk";
      payload.bookingRef ??= `BK-${Date.now()}`;
    }
    if (action === "cancel_shipment" || action === "reject_shipment") {
      payload.reason ??= "Orchestrator mirror";
    }
    return payload;
  }

  /** Exposed for route guard tests */
  static orderLogisticsActions(): OrderAction[] {
    return ["book_shipment", "mark_departed", "mark_arrived", "mark_delivered"];
  }

  static actionPath(entity: "ORDER" | "SHIPMENT", action: string): string | undefined {
    if (entity === "ORDER") return ORDER_ACTION_PATH[action as OrderAction];
    return SHIPMENT_ACTION_PATH[action as ShipmentAction];
  }
}
