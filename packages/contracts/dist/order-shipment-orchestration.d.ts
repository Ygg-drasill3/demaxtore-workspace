import type { OrderAction, OrderState } from "./order.fsm";
import type { ShipmentAction, ShipmentState } from "./shipment.fsm";
import type { ShipmentExceptionCategory } from "./exception-taxonomy";
export declare const TERMINAL_ORDER_STATES: OrderState[];
export declare const TERMINAL_SHIPMENT_STATES: ShipmentState[];
export declare const PRE_TRANSIT_SHIPMENT_STATES: ShipmentState[];
export type DesyncRuleId = "ORDER_SHIPMENT_BOOKED_LAG" | "ORDER_IN_TRANSIT_SHIPMENT_PRE_TRANSIT" | "ORDER_DELIVERED_SHIPMENT_NOT_DELIVERED" | "ORDER_ARRIVED_SHIPMENT_IN_TRANSIT" | "ORDER_PARTIALLY_DELIVERED_MISMATCH";
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
export declare const SHIPMENT_TO_ORDER_MIRROR: Partial<Record<ShipmentAction, OrderAction | "suggest_dispute">>;
/** Order action → shipment mirror (order-led). */
export declare const ORDER_TO_SHIPMENT_MIRROR: Partial<Record<OrderAction, ShipmentAction>>;
export declare function evaluateOrderShipmentDesync(orderState: string, shipmentState: string): DesyncHit | null;
export declare function orderMirrorForShipmentAction(action: ShipmentAction, opts?: {
    exceptionCategory?: ShipmentExceptionCategory;
    orderState?: string;
}): OrchestratorActionStep | null;
export declare function buildShipmentCatchUpSteps(currentState: ShipmentState, targetState: ShipmentState, maxSteps?: number): OrchestratorActionStep[];
export declare function planFromDesyncHit(input: {
    orderId: string;
    shipmentId: string;
    orderState: string;
    shipmentState: string;
    hit: DesyncHit;
}): OrchestratorPlan;
export declare function shipmentMirrorForOrderAction(action: OrderAction): OrchestratorActionStep | null;
export declare function planFromOrderMilestone(input: {
    orderId: string;
    shipmentId: string;
    orderAction: OrderAction;
    orderState: string;
    shipmentState: string;
}): OrchestratorPlan | null;
export declare function planFromShipmentMilestone(input: {
    orderId: string;
    shipmentId: string;
    shipmentAction: ShipmentAction;
    orderState: string;
    shipmentState: string;
    exceptionCategory?: ShipmentExceptionCategory;
}): OrchestratorPlan | null;
export declare function alertSeverityFromDesync(severity: DesyncSeverity): "WARNING" | "CRITICAL";
