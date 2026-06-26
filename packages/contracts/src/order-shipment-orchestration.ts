// =============================================================================
// Faz 2 — Order/Shipment orchestration: desync rules, milestone mirrors, plans
// =============================================================================
import type { OrderAction, OrderState } from "./order.fsm";
import type { ShipmentAction, ShipmentState } from "./shipment.fsm";
import { findShipmentTransition } from "./shipment.fsm";
import type { ShipmentExceptionCategory } from "./exception-taxonomy";
import { shouldSuggestOrderDispute } from "./exception-taxonomy";

export const TERMINAL_ORDER_STATES: OrderState[] = ["CLOSED", "CANCELLED", "REJECTED"];
export const TERMINAL_SHIPMENT_STATES: ShipmentState[] = ["COMPLETED", "CANCELLED", "REJECTED"];

export const PRE_TRANSIT_SHIPMENT_STATES: ShipmentState[] = [
  "SHIPMENT_CREATED", "BOOKING_PENDING", "BOOKING_CONFIRMED", "CONTAINER_ASSIGNED",
  "READY_FOR_PICKUP", "PICKED_UP", "AT_ORIGIN_PORT", "LOADED_ON_VESSEL",
];

export type DesyncRuleId =
  | "ORDER_SHIPMENT_BOOKED_LAG"
  | "ORDER_IN_TRANSIT_SHIPMENT_PRE_TRANSIT"
  | "ORDER_DELIVERED_SHIPMENT_NOT_DELIVERED"
  | "ORDER_ARRIVED_SHIPMENT_IN_TRANSIT"
  | "ORDER_PARTIALLY_DELIVERED_MISMATCH";

export type DesyncSeverity = "warning" | "critical";

export interface DesyncHit {
  severity: DesyncSeverity;
  rule: DesyncRuleId;
  laggingEntity: "ORDER" | "SHIPMENT";
}

export interface OrchestratorActionStep {
  entity: "ORDER" | "SHIPMENT";
  action: string;
  payload?: Record<string, unknown>;
}

export interface OrchestratorPlan {
  orderId: string;
  shipmentId: string;
  source: "alert" | "shipment_transition" | "manual";
  rule?: DesyncRuleId;
  laggingEntity?: "ORDER" | "SHIPMENT";
  suggestedActions: OrchestratorActionStep[];
  shadowDiff?: {
    orderStateBefore: string;
    orderStateAfter?: string;
    shipmentStateBefore: string;
    shipmentStateAfter?: string;
  };
}

/** Shipment milestone action → order mirror (shipment-led). */
export const SHIPMENT_TO_ORDER_MIRROR: Partial<Record<ShipmentAction, OrderAction | "suggest_dispute">> = {
  confirm_booking: "book_shipment",
  depart_vessel: "mark_departed",
  arrive_destination: "mark_arrived",
  confirm_partial_delivery: "mark_partially_delivered",
  confirm_delivery: "mark_delivered",
  complete_shipment: "close_order",
  report_exception: "suggest_dispute",
};

/** Order action → shipment mirror (order-led). */
export const ORDER_TO_SHIPMENT_MIRROR: Partial<Record<OrderAction, ShipmentAction>> = {
  cancel_order: "cancel_shipment",
  reject_order: "reject_shipment",
};

const DESYNC_TARGET_SHIPMENT: Partial<Record<DesyncRuleId, ShipmentState>> = {
  ORDER_SHIPMENT_BOOKED_LAG: "BOOKING_CONFIRMED",
  ORDER_IN_TRANSIT_SHIPMENT_PRE_TRANSIT: "IN_TRANSIT",
  ORDER_DELIVERED_SHIPMENT_NOT_DELIVERED: "DELIVERED",
  ORDER_ARRIVED_SHIPMENT_IN_TRANSIT: "ARRIVED_DESTINATION_PORT",
  ORDER_PARTIALLY_DELIVERED_MISMATCH: "PARTIALLY_DELIVERED",
};

const DESYNC_TARGET_ORDER: Partial<Record<DesyncRuleId, OrderState>> = {
  ORDER_SHIPMENT_BOOKED_LAG: "SHIPMENT_BOOKED",
  ORDER_IN_TRANSIT_SHIPMENT_PRE_TRANSIT: "IN_TRANSIT",
  ORDER_DELIVERED_SHIPMENT_NOT_DELIVERED: "DELIVERED",
  ORDER_ARRIVED_SHIPMENT_IN_TRANSIT: "ARRIVED_PORT",
  ORDER_PARTIALLY_DELIVERED_MISMATCH: "PARTIALLY_DELIVERED",
};

/** Preferred shipment progression for catch-up (shortest path shortcuts). */
const SHIPMENT_CATCHUP_ACTIONS: Partial<Record<ShipmentState, ShipmentAction>> = {
  SHIPMENT_CREATED: "confirm_booking",
  BOOKING_PENDING: "confirm_booking",
  BOOKING_CONFIRMED: "assign_container",
  CONTAINER_ASSIGNED: "load_vessel",
  READY_FOR_PICKUP: "pickup_cargo",
  PICKED_UP: "arrive_origin_port",
  AT_ORIGIN_PORT: "load_vessel",
  LOADED_ON_VESSEL: "depart_vessel",
  IN_TRANSIT: "arrive_destination",
  ARRIVED_DESTINATION_PORT: "start_customs",
  CUSTOMS_CLEARANCE: "complete_customs",
  READY_FOR_DELIVERY: "confirm_delivery",
  PARTIALLY_DELIVERED: "confirm_delivery",
};

const SHIPMENT_STATE_RANK: Record<string, number> = {
  SHIPMENT_CREATED: 0, BOOKING_PENDING: 10, BOOKING_CONFIRMED: 20, CONTAINER_ASSIGNED: 30,
  READY_FOR_PICKUP: 35, PICKED_UP: 40, AT_ORIGIN_PORT: 45, LOADED_ON_VESSEL: 50,
  IN_TRANSIT: 60, ARRIVED_DESTINATION_PORT: 70, CUSTOMS_CLEARANCE: 75,
  READY_FOR_DELIVERY: 80, PARTIALLY_DELIVERED: 85, DELIVERED: 90, COMPLETED: 100,
};

export function evaluateOrderShipmentDesync(
  orderState: string,
  shipmentState: string,
): DesyncHit | null {
  if (orderState === "SHIPMENT_BOOKED" && ["SHIPMENT_CREATED", "BOOKING_PENDING"].includes(shipmentState)) {
    return { severity: "warning", rule: "ORDER_SHIPMENT_BOOKED_LAG", laggingEntity: "SHIPMENT" };
  }
  if (orderState === "IN_TRANSIT" && PRE_TRANSIT_SHIPMENT_STATES.includes(shipmentState as ShipmentState)) {
    return { severity: "critical", rule: "ORDER_IN_TRANSIT_SHIPMENT_PRE_TRANSIT", laggingEntity: "SHIPMENT" };
  }
  if (orderState === "DELIVERED" && !["DELIVERED", "COMPLETED"].includes(shipmentState)) {
    return { severity: "critical", rule: "ORDER_DELIVERED_SHIPMENT_NOT_DELIVERED", laggingEntity: "SHIPMENT" };
  }
  if (orderState === "ARRIVED_PORT" && shipmentState === "IN_TRANSIT") {
    return { severity: "warning", rule: "ORDER_ARRIVED_SHIPMENT_IN_TRANSIT", laggingEntity: "SHIPMENT" };
  }
  if (orderState === "FREIGHT_REQUESTED" && ["BOOKING_CONFIRMED", "CONTAINER_ASSIGNED", "LOADED_ON_VESSEL", "IN_TRANSIT"].includes(shipmentState)) {
    return { severity: "warning", rule: "ORDER_SHIPMENT_BOOKED_LAG", laggingEntity: "ORDER" };
  }
  if (orderState === "PARTIALLY_DELIVERED" && shipmentState !== "PARTIALLY_DELIVERED") {
    return { severity: "warning", rule: "ORDER_PARTIALLY_DELIVERED_MISMATCH", laggingEntity: "SHIPMENT" };
  }
  if (shipmentState === "PARTIALLY_DELIVERED" && orderState !== "PARTIALLY_DELIVERED" && !TERMINAL_ORDER_STATES.includes(orderState as OrderState)) {
    return { severity: "warning", rule: "ORDER_PARTIALLY_DELIVERED_MISMATCH", laggingEntity: "ORDER" };
  }
  return null;
}

export function orderMirrorForShipmentAction(
  action: ShipmentAction,
  opts?: { exceptionCategory?: ShipmentExceptionCategory; orderState?: string },
): OrchestratorActionStep | null {
  const mirror = SHIPMENT_TO_ORDER_MIRROR[action];
  if (!mirror) return null;
  if (mirror === "suggest_dispute") {
    if (!opts?.exceptionCategory || !shouldSuggestOrderDispute(opts.exceptionCategory)) return null;
    return { entity: "ORDER", action: "suggest_dispute", payload: { category: opts.exceptionCategory } };
  }
  if (mirror === "close_order" && opts?.orderState !== "DELIVERED") return null;
  return { entity: "ORDER", action: mirror, payload: {} };
}

export function buildShipmentCatchUpSteps(
  currentState: ShipmentState,
  targetState: ShipmentState,
  maxSteps = 12,
): OrchestratorActionStep[] {
  const steps: OrchestratorActionStep[] = [];
  let state = currentState;
  const targetRank = SHIPMENT_STATE_RANK[targetState] ?? 0;

  for (let i = 0; i < maxSteps; i++) {
    if (state === targetState) break;
    if ((SHIPMENT_STATE_RANK[state] ?? 0) >= targetRank) break;

    const action = targetState === "PARTIALLY_DELIVERED" && state === "READY_FOR_DELIVERY"
      ? "confirm_partial_delivery"
      : SHIPMENT_CATCHUP_ACTIONS[state];
    if (!action) break;
    const transition = findShipmentTransition(state, action, "ADMIN");
    if (!transition) break;

    steps.push({ entity: "SHIPMENT", action, payload: {} });
    state = transition.to;
  }
  return steps;
}

export function planFromDesyncHit(input: {
  orderId: string;
  shipmentId: string;
  orderState: string;
  shipmentState: string;
  hit: DesyncHit;
}): OrchestratorPlan {
  const { orderId, shipmentId, orderState, shipmentState, hit } = input;
  const suggestedActions: OrchestratorActionStep[] = [];

  if (hit.laggingEntity === "SHIPMENT") {
    const target = DESYNC_TARGET_SHIPMENT[hit.rule];
    if (target) {
      const shipmentSteps = buildShipmentCatchUpSteps(shipmentState as ShipmentState, target);
      suggestedActions.push(...shipmentSteps);
      const last = shipmentSteps[shipmentSteps.length - 1];
      if (last) {
        const mirror = orderMirrorForShipmentAction(last.action as ShipmentAction, { orderState });
        if (mirror) suggestedActions.push(mirror);
      }
    }
  } else {
    const target = DESYNC_TARGET_ORDER[hit.rule];
    if (target && orderState !== target) {
      const orderActions: Partial<Record<OrderState, OrderAction>> = {
        FREIGHT_REQUESTED: "book_shipment",
        SHIPMENT_BOOKED: "mark_departed",
        IN_TRANSIT: "mark_arrived",
        ARRIVED_PORT: "mark_delivered",
      };
      let action = orderActions[orderState as OrderState];
      if (!action && hit.rule === "ORDER_PARTIALLY_DELIVERED_MISMATCH") {
        action = "mark_partially_delivered";
      }
      if (action) suggestedActions.push({ entity: "ORDER", action, payload: {} });
    }
  }

  return {
    orderId,
    shipmentId,
    source: "alert",
    rule: hit.rule,
    laggingEntity: hit.laggingEntity,
    suggestedActions: dedupeSteps(suggestedActions),
    shadowDiff: {
      orderStateBefore: orderState,
      shipmentStateBefore: shipmentState,
    },
  };
}

export function shipmentMirrorForOrderAction(
  action: OrderAction,
): OrchestratorActionStep | null {
  const mirror = ORDER_TO_SHIPMENT_MIRROR[action];
  if (!mirror) return null;
  return { entity: "SHIPMENT", action: mirror, payload: {} };
}

export function planFromOrderMilestone(input: {
  orderId: string;
  shipmentId: string;
  orderAction: OrderAction;
  orderState: string;
  shipmentState: string;
}): OrchestratorPlan | null {
  const mirror = shipmentMirrorForOrderAction(input.orderAction);
  if (!mirror) return null;

  return {
    orderId: input.orderId,
    shipmentId: input.shipmentId,
    source: "manual",
    suggestedActions: [mirror],
    shadowDiff: {
      orderStateBefore: input.orderState,
      shipmentStateBefore: input.shipmentState,
    },
  };
}

export function planFromShipmentMilestone(input: {
  orderId: string;
  shipmentId: string;
  shipmentAction: ShipmentAction;
  orderState: string;
  shipmentState: string;
  exceptionCategory?: ShipmentExceptionCategory;
}): OrchestratorPlan | null {
  const mirror = orderMirrorForShipmentAction(input.shipmentAction, {
    exceptionCategory: input.exceptionCategory,
    orderState: input.orderState,
  });
  if (!mirror) return null;

  return {
    orderId: input.orderId,
    shipmentId: input.shipmentId,
    source: "shipment_transition",
    suggestedActions: [mirror],
    shadowDiff: {
      orderStateBefore: input.orderState,
      shipmentStateBefore: input.shipmentState,
    },
  };
}

function dedupeSteps(steps: OrchestratorActionStep[]): OrchestratorActionStep[] {
  const seen = new Set<string>();
  return steps.filter((s) => {
    const key = `${s.entity}:${s.action}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function alertSeverityFromDesync(severity: DesyncSeverity): "WARNING" | "CRITICAL" {
  return severity === "critical" ? "CRITICAL" : "WARNING";
}
