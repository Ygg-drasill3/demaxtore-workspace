// Faz 4 — Normalized carrier / logistics events
export const CARRIER_EVENT_TYPES = [
    "CARRIER_BOOKING_CONFIRMED",
    "CONTAINER_ASSIGNED",
    "CARGO_PICKED_UP",
    "ARRIVED_ORIGIN_PORT",
    "LOADED_ON_VESSEL",
    "VESSEL_DEPARTED",
    "IN_TRANSIT",
    "ARRIVED_DESTINATION_PORT",
    "CUSTOMS_STARTED",
    "CUSTOMS_CLEARED",
    "READY_FOR_DELIVERY",
    "DELIVERED",
];
export const EVENT_CONFIDENCE_LEVELS = ["low", "medium", "high"];
/** Carrier event → shipment FSM action (high confidence auto-apply only). */
export const CARRIER_EVENT_TO_SHIPMENT_ACTION = {
    CARRIER_BOOKING_CONFIRMED: "confirm_booking",
    CONTAINER_ASSIGNED: "assign_container",
    CARGO_PICKED_UP: "pickup_cargo",
    ARRIVED_ORIGIN_PORT: "arrive_origin_port",
    LOADED_ON_VESSEL: "load_vessel",
    VESSEL_DEPARTED: "depart_vessel",
    ARRIVED_DESTINATION_PORT: "arrive_destination",
    CUSTOMS_STARTED: "start_customs",
    CUSTOMS_CLEARED: "complete_customs",
    READY_FOR_DELIVERY: "ready_delivery",
    DELIVERED: "confirm_delivery",
};
