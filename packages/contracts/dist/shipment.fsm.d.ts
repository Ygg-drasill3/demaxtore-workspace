import type { ActorRole, NotifySpec, ParticipantConstraint } from "./rfq.fsm";
export type { ActorRole };
export type ShipmentState = "SHIPMENT_CREATED" | "BOOKING_PENDING" | "BOOKING_CONFIRMED" | "CONTAINER_ASSIGNED" | "READY_FOR_PICKUP" | "PICKED_UP" | "AT_ORIGIN_PORT" | "LOADED_ON_VESSEL" | "IN_TRANSIT" | "ARRIVED_DESTINATION_PORT" | "CUSTOMS_CLEARANCE" | "READY_FOR_DELIVERY" | "PARTIALLY_DELIVERED" | "DELIVERED" | "COMPLETED" | "CANCELLED" | "REJECTED" | "EXCEPTION";
export type ShipmentAction = "create_shipment" | "confirm_booking" | "assign_container" | "pickup_cargo" | "arrive_origin_port" | "load_vessel" | "depart_vessel" | "arrive_destination" | "start_customs" | "complete_customs" | "ready_delivery" | "confirm_partial_delivery" | "confirm_delivery" | "reject_shipment" | "complete_shipment" | "report_exception" | "resolve_exception" | "cancel_shipment" | "upload_document";
export type ShipmentFromState = ShipmentState | "*" | "ANY_ACTIVE";
export interface ShipmentTransition {
    from: ShipmentFromState;
    to: ShipmentState;
    action: ShipmentAction;
    allowedRoles: ActorRole[];
    requiredParticipant?: ParticipantConstraint;
    requiresReason?: boolean;
    auditEvent: string;
    preconditions?: string[];
    notifyRecipients: NotifySpec[];
}
export declare const SHIPMENT_ACTIVE_STATES: ShipmentState[];
export declare const SHIPMENT_TRANSITIONS: ShipmentTransition[];
export declare const SHIPMENT_TERMINAL_STATES: ShipmentState[];
export declare const SHIPMENT_SELF_LOOP_ACTIONS: ShipmentAction[];
export declare function isShipmentTerminal(state: ShipmentState): boolean;
export declare function isShipmentActive(state: ShipmentState): boolean;
export declare function findShipmentTransition(from: ShipmentState, action: ShipmentAction, actorRole?: ActorRole): ShipmentTransition | undefined;
export declare function resolveShipmentTargetState(from: ShipmentState, transition: ShipmentTransition): ShipmentState;
