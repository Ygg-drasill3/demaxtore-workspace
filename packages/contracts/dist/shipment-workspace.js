// =============================================================================
// Sprint 30-01 — Shipment Workspace cockpit DTOs (extends existing Shipment FSM)
// =============================================================================
export const SHIPMENT_TRANSPORT_MODES = ["SEA", "AIR", "ROAD", "RAIL"];
export const SHIPMENT_BADGE_GROUPS = [
    "DRAFT",
    "BOOKED",
    "TRANSIT",
    "DELIVERED",
    "CANCELLED",
];
export const SHIPMENT_CONTAINER_STATUSES = [
    "PLANNED",
    "LOADED",
    "IN_TRANSIT",
    "ARRIVED",
    "DELIVERED",
    "CANCELLED",
];
/** Map FSM state → UI badge group (no parallel status machine). */
export function shipmentBadgeGroup(state) {
    switch (state) {
        case "SHIPMENT_CREATED":
        case "BOOKING_PENDING":
            return "DRAFT";
        case "BOOKING_CONFIRMED":
        case "CONTAINER_ASSIGNED":
        case "READY_FOR_PICKUP":
        case "PICKED_UP":
        case "AT_ORIGIN_PORT":
            return "BOOKED";
        case "LOADED_ON_VESSEL":
        case "IN_TRANSIT":
        case "ARRIVED_DESTINATION_PORT":
        case "CUSTOMS_CLEARANCE":
        case "READY_FOR_DELIVERY":
        case "PARTIALLY_DELIVERED":
            return "TRANSIT";
        case "DELIVERED":
        case "COMPLETED":
            return "DELIVERED";
        case "CANCELLED":
        case "REJECTED":
        case "EXCEPTION":
            return "CANCELLED";
        default:
            return "DRAFT";
    }
}
/** Convenience status alias → existing FSM action (never invents new states). */
export const SHIPMENT_STATUS_ALIAS_ACTIONS = {
    booked: "confirm_booking",
    in_transit: "depart_vessel",
    delivered: "confirm_delivery",
};
export function buildShipmentOperationalMilestones(input) {
    const badge = shipmentBadgeGroup(input.state);
    const order = [
        {
            key: "booking_confirmed",
            label: "Booking Confirmed",
            planned: null,
            actual: input.bookingConfirmedAt ?? null,
            doneWhen: !!input.bookingConfirmedAt || ["BOOKED", "TRANSIT", "DELIVERED"].includes(badge),
        },
        {
            key: "cargo_ready",
            label: "Cargo Ready",
            planned: null,
            actual: input.containerAssignedAt ?? input.pickedUpAt ?? null,
            doneWhen: !!input.containerAssignedAt
                || !!input.pickedUpAt
                || ["TRANSIT", "DELIVERED"].includes(badge)
                || ["CONTAINER_ASSIGNED", "READY_FOR_PICKUP", "PICKED_UP", "AT_ORIGIN_PORT"].includes(input.state),
        },
        {
            key: "loaded",
            label: "Loaded",
            planned: input.etd ?? null,
            actual: input.loadedAt ?? null,
            doneWhen: !!input.loadedAt || ["TRANSIT", "DELIVERED"].includes(badge),
        },
        {
            key: "departed",
            label: "Departed",
            planned: input.etd ?? null,
            actual: input.departedAt ?? null,
            doneWhen: !!input.departedAt || input.state === "IN_TRANSIT" || ["DELIVERED"].includes(badge)
                || ["ARRIVED_DESTINATION_PORT", "CUSTOMS_CLEARANCE", "READY_FOR_DELIVERY", "PARTIALLY_DELIVERED"].includes(input.state),
        },
        {
            key: "arrived",
            label: "Arrived",
            planned: input.eta ?? null,
            actual: input.arrivedAt ?? null,
            doneWhen: !!input.arrivedAt
                || ["DELIVERED"].includes(badge)
                || ["ARRIVED_DESTINATION_PORT", "CUSTOMS_CLEARANCE", "READY_FOR_DELIVERY", "PARTIALLY_DELIVERED"].includes(input.state),
        },
        {
            key: "delivered",
            label: "Delivered",
            planned: null,
            actual: input.deliveredAt ?? null,
            doneWhen: !!input.deliveredAt || badge === "DELIVERED",
        },
    ];
    let foundCurrent = false;
    return order.map((m) => {
        if (m.doneWhen) {
            return { key: m.key, label: m.label, planned: m.planned, actual: m.actual, status: "done" };
        }
        if (!foundCurrent) {
            foundCurrent = true;
            return {
                key: m.key,
                label: m.label,
                planned: m.planned,
                actual: m.actual,
                status: "current",
            };
        }
        return {
            key: m.key,
            label: m.label,
            planned: m.planned,
            actual: m.actual,
            status: m.planned ? "planned" : "pending",
        };
    });
}
