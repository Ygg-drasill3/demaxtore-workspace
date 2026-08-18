import type { ActorRole, NotifySpec, ParticipantConstraint } from "./rfq.fsm";
export type { ActorRole, NotifySpec, ParticipantConstraint };
export type OrderState = "ORDER_CREATED" | "SUPPLIER_CONFIRMED" | "PRODUCTION_STARTED" | "PRODUCTION_IN_PROGRESS" | "PRODUCTION_COMPLETED" | "INSPECTION_REQUESTED" | "INSPECTION_COMPLETED" | "FREIGHT_REQUESTED" | "SHIPMENT_BOOKED" | "DEPARTED" | "IN_TRANSIT" | "ETA_UPDATED" | "ARRIVED_PORT" | "PARTIALLY_DELIVERED" | "DELIVERED" | "CLOSED" | "DISPUTED" | "REJECTED" | "CANCELLED";
export type OrderAction = "spawn_from_rfq" | "spawn_from_commoditybid" | "supplier_confirm_order" | "confirm_sla_expired" | "start_production" | "report_production_progress" | "mark_production_completed" | "request_inspection" | "skip_inspection" | "record_inspection_result" | "proceed_to_freight" | "book_shipment" | "mark_departed" | "auto_to_in_transit" | "update_eta" | "mark_arrived" | "mark_partially_delivered" | "mark_delivered" | "reject_order" | "close_order" | "open_dispute" | "resolve_dispute_close" | "resolve_dispute_cancel" | "cancel_order" | "post_clarification" | "upload_document" | "add_observer" | "remove_observer";
export type OrderFromState = OrderState | "*" | "ANY_ACTIVE";
export interface OrderTransition {
    from: OrderFromState;
    to: OrderState;
    action: OrderAction;
    allowedRoles: ActorRole[];
    requiredParticipant?: ParticipantConstraint;
    requiresReason?: boolean;
    auditEvent: string;
    preconditions?: string[];
    notifyRecipients: NotifySpec[];
}
export declare const ORDER_ACTIVE_STATES: OrderState[];
export declare const ORDER_TRANSITIONS: OrderTransition[];
export declare const ORDER_TERMINAL_STATES: OrderState[];
export declare const ORDER_SELF_LOOP_ACTIONS: OrderAction[];
export declare function isOrderTerminal(state: OrderState): boolean;
export declare function isOrderActive(state: OrderState): boolean;
export declare function findOrderTransition(from: OrderState, action: OrderAction, actorRole?: ActorRole): OrderTransition | undefined;
/** Self-loop and observer transitions keep current state. */
export declare function resolveOrderTargetState(from: OrderState, transition: OrderTransition): OrderState;
