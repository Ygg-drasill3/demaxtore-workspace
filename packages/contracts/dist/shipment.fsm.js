// =============================================================================
// DeMaxtore — Shipment Workspace State Machine (TypeScript source of truth)
// Sprint 3C — spawned from Order at FREIGHT_REQUESTED
// =============================================================================
export const SHIPMENT_ACTIVE_STATES = [
    "SHIPMENT_CREATED",
    "BOOKING_PENDING",
    "BOOKING_CONFIRMED",
    "CONTAINER_ASSIGNED",
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "AT_ORIGIN_PORT",
    "LOADED_ON_VESSEL",
    "IN_TRANSIT",
    "ARRIVED_DESTINATION_PORT",
    "CUSTOMS_CLEARANCE",
    "READY_FOR_DELIVERY",
    "PARTIALLY_DELIVERED",
    "DELIVERED",
];
export const SHIPMENT_TRANSITIONS = [
    { from: "*", to: "SHIPMENT_CREATED", action: "create_shipment",
        allowedRoles: ["SYSTEM"], auditEvent: "shipment.created",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "SUCCESS", titleKey: "shipment.created" }] },
    { from: "SHIPMENT_CREATED", to: "BOOKING_PENDING", action: "confirm_booking",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.booking.pending",
        notifyRecipients: [{ broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "shipment.booking.pending" }] },
    { from: "BOOKING_PENDING", to: "BOOKING_CONFIRMED", action: "confirm_booking",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.booking.confirmed",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "SUCCESS", titleKey: "shipment.booking.confirmed" }] },
    { from: "BOOKING_CONFIRMED", to: "CONTAINER_ASSIGNED", action: "assign_container",
        allowedRoles: ["ADMIN"], preconditions: ["assertContainerNumber"],
        auditEvent: "shipment.container.assigned",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.container.assigned" }] },
    { from: "CONTAINER_ASSIGNED", to: "READY_FOR_PICKUP", action: "pickup_cargo",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.pickup.ready",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.pickup.ready" }] },
    { from: "READY_FOR_PICKUP", to: "PICKED_UP", action: "pickup_cargo",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.pickup.completed",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.pickup.completed" }] },
    { from: "PICKED_UP", to: "AT_ORIGIN_PORT", action: "arrive_origin_port",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.at_origin_port",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.at_origin_port" }] },
    { from: "CONTAINER_ASSIGNED", to: "LOADED_ON_VESSEL", action: "load_vessel",
        allowedRoles: ["ADMIN"], preconditions: ["assertVesselLoaded"],
        auditEvent: "shipment.loaded_on_vessel",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.loaded_on_vessel" }] },
    { from: "AT_ORIGIN_PORT", to: "LOADED_ON_VESSEL", action: "load_vessel",
        allowedRoles: ["ADMIN"], preconditions: ["assertVesselLoaded"],
        auditEvent: "shipment.loaded_on_vessel",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.loaded_on_vessel" }] },
    { from: "LOADED_ON_VESSEL", to: "IN_TRANSIT", action: "depart_vessel",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.departed",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.departed" }] },
    { from: "IN_TRANSIT", to: "ARRIVED_DESTINATION_PORT", action: "arrive_destination",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.arrived_destination",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "SUCCESS", titleKey: "shipment.arrived_destination" }] },
    { from: "ARRIVED_DESTINATION_PORT", to: "CUSTOMS_CLEARANCE", action: "start_customs",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.customs.started",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "shipment.customs.started" }] },
    { from: "CUSTOMS_CLEARANCE", to: "READY_FOR_DELIVERY", action: "complete_customs",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.customs.completed",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "SUCCESS", titleKey: "shipment.customs.completed" }] },
    { from: "READY_FOR_DELIVERY", to: "READY_FOR_DELIVERY", action: "ready_delivery",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.ready_for_delivery",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.ready_for_delivery" }] },
    { from: "READY_FOR_DELIVERY", to: "DELIVERED", action: "confirm_delivery",
        allowedRoles: ["BUYER", "ADMIN"], requiredParticipant: "OWNER",
        auditEvent: "shipment.delivered",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "SUCCESS", titleKey: "shipment.delivered" }] },
    { from: "READY_FOR_DELIVERY", to: "DELIVERED", action: "confirm_delivery",
        allowedRoles: ["ADMIN"],
        auditEvent: "shipment.delivered",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "SUCCESS", titleKey: "shipment.delivered" }] },
    { from: "READY_FOR_DELIVERY", to: "PARTIALLY_DELIVERED", action: "confirm_partial_delivery",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        preconditions: ["assertPartialDeliveryPayload"],
        auditEvent: "shipment.partially_delivered",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.partially_delivered" }] },
    { from: "READY_FOR_DELIVERY", to: "PARTIALLY_DELIVERED", action: "confirm_partial_delivery",
        allowedRoles: ["ADMIN"],
        preconditions: ["assertPartialDeliveryPayload"],
        auditEvent: "shipment.partially_delivered",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.partially_delivered" }] },
    { from: "PARTIALLY_DELIVERED", to: "DELIVERED", action: "confirm_delivery",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        auditEvent: "shipment.delivered",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "SUCCESS", titleKey: "shipment.delivered" }] },
    { from: "PARTIALLY_DELIVERED", to: "DELIVERED", action: "confirm_delivery",
        allowedRoles: ["ADMIN"],
        auditEvent: "shipment.delivered",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "SUCCESS", titleKey: "shipment.delivered" }] },
    { from: "DELIVERED", to: "COMPLETED", action: "complete_shipment",
        allowedRoles: ["ADMIN"], auditEvent: "shipment.completed",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "SUCCESS", titleKey: "shipment.completed" }] },
    { from: "ANY_ACTIVE", to: "EXCEPTION", action: "report_exception",
        allowedRoles: ["BUYER", "SUPPLIER", "ADMIN"], requiresReason: true,
        preconditions: ["assertExceptionCategory"],
        auditEvent: "shipment.exception.reported",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "ERROR", titleKey: "shipment.exception.reported" }] },
    { from: "EXCEPTION", to: "IN_TRANSIT", action: "resolve_exception",
        allowedRoles: ["ADMIN"], requiresReason: true,
        preconditions: ["assertOpenException", "assertResolution"],
        auditEvent: "shipment.exception.resolved",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "shipment.exception.resolved" }] },
    { from: "ANY_ACTIVE", to: "CANCELLED", action: "cancel_shipment",
        allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
        auditEvent: "shipment.cancelled",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "shipment.cancelled" }] },
    { from: "ANY_ACTIVE", to: "REJECTED", action: "reject_shipment",
        allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
        auditEvent: "shipment.rejected",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "shipment.rejected" }] },
    { from: "ANY_ACTIVE", to: "SHIPMENT_CREATED", action: "upload_document",
        allowedRoles: ["BUYER", "SUPPLIER", "ADMIN"],
        preconditions: ["assertDocumentUpload"],
        auditEvent: "shipment.document.uploaded", notifyRecipients: [] },
];
export const SHIPMENT_TERMINAL_STATES = ["COMPLETED", "CANCELLED", "REJECTED"];
export const SHIPMENT_SELF_LOOP_ACTIONS = [
    "upload_document",
    "ready_delivery",
];
export function isShipmentTerminal(state) {
    return SHIPMENT_TERMINAL_STATES.includes(state);
}
export function isShipmentActive(state) {
    return SHIPMENT_ACTIVE_STATES.includes(state);
}
export function findShipmentTransition(from, action, actorRole) {
    const matches = SHIPMENT_TRANSITIONS.filter((t) => {
        if (t.action !== action)
            return false;
        if (t.from === "ANY_ACTIVE")
            return isShipmentActive(from);
        if (t.from === "*")
            return action === "create_shipment";
        return t.from === from;
    });
    if (actorRole) {
        const roleMatch = matches.find((t) => t.allowedRoles.includes(actorRole));
        if (roleMatch)
            return roleMatch;
    }
    return matches[0];
}
export function resolveShipmentTargetState(from, transition) {
    if (transition.action === "upload_document" || transition.action === "ready_delivery")
        return from;
    return transition.to;
}
