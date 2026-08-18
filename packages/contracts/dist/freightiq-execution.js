/**
 * Sprint 33 — FreightIQ Execution 2.0
 * Derived presentation state from Freight Request + Sprint 32 booking + Shipment FSM.
 * Not a parallel source of truth.
 */
export const FREIGHTIQ_EXECUTION_STATES = [
    "NONE",
    "REQUESTED",
    "OFFERS_AVAILABLE",
    "OFFER_SELECTED",
    "BOOKING_REQUESTED",
    "BOOKING_PENDING",
    "BOOKING_CONFIRMED",
    "BOOKING_AMENDED",
    "SHIPMENT_ACTIVE",
    "IN_TRANSIT",
    "ARRIVED",
    "DELIVERED",
    "CANCELLED",
];
/** Map canonical entities → one customer-facing execution state. */
export function deriveFreightIqExecutionState(input) {
    const fr = input.freightRequestStatus;
    if (!fr)
        return "NONE";
    if (fr === "CANCELLED" || input.bookingStatus === "CANCELLED")
        return "CANCELLED";
    const ship = input.shipmentState ?? "";
    if (ship === "DELIVERED" || ship === "COMPLETED")
        return "DELIVERED";
    if (ship === "ARRIVED_DESTINATION_PORT" ||
        ship === "CUSTOMS_IN_PROGRESS" ||
        ship === "CUSTOMS_CLEARED" ||
        ship === "READY_FOR_DELIVERY") {
        return "ARRIVED";
    }
    if (ship === "IN_TRANSIT" || ship === "DEPARTED_ORIGIN_PORT" || ship === "LOADED_ON_VESSEL") {
        return "IN_TRANSIT";
    }
    const booking = input.bookingStatus;
    if (booking === "AMENDED")
        return "BOOKING_AMENDED";
    if (booking === "CONFIRMED") {
        if (input.containerCount > 0 || input.trackingLinked || ship === "CONTAINER_ASSIGNED" || ship === "PICKED_UP") {
            return "SHIPMENT_ACTIVE";
        }
        return "BOOKING_CONFIRMED";
    }
    if (booking === "PENDING")
        return "BOOKING_PENDING";
    if (booking === "REQUESTED" || booking === "DRAFT")
        return "BOOKING_REQUESTED";
    if (input.hasSelection || fr === "SELECTED" || fr === "CONVERTED_TO_SHIPMENT") {
        return "OFFER_SELECTED";
    }
    if (input.hasActiveOffers || fr === "QUOTED" || fr === "QUOTING")
        return "OFFERS_AVAILABLE";
    return "REQUESTED";
}
export function nextFreightIqExecutionAction(state, shipmentWorkspaceId) {
    const shipmentUrl = shipmentWorkspaceId ? `/workspace/shipment/${shipmentWorkspaceId}` : null;
    const bookingUrl = shipmentWorkspaceId
        ? `/workspace/shipment/${shipmentWorkspaceId}?focus=booking`
        : null;
    switch (state) {
        case "OFFER_SELECTED":
        case "BOOKING_REQUESTED":
            return {
                nextAction: "proceed_to_booking",
                nextActionLabel: "Proceed to booking",
                bookingUrl,
                shipmentUrl,
            };
        case "BOOKING_PENDING":
            return {
                nextAction: "await_ops",
                nextActionLabel: "Awaiting booking confirmation",
                bookingUrl,
                shipmentUrl,
            };
        case "BOOKING_CONFIRMED":
        case "BOOKING_AMENDED":
            return {
                nextAction: "open_booking",
                nextActionLabel: "View booking confirmation",
                bookingUrl,
                shipmentUrl,
            };
        case "SHIPMENT_ACTIVE":
        case "IN_TRANSIT":
        case "ARRIVED":
        case "DELIVERED":
            return {
                nextAction: "open_shipment",
                nextActionLabel: "Open shipment & tracking",
                bookingUrl,
                shipmentUrl,
            };
        case "CANCELLED":
            return { nextAction: "none", nextActionLabel: "Booking cancelled", bookingUrl, shipmentUrl };
        default:
            return { nextAction: "none", nextActionLabel: null, bookingUrl, shipmentUrl };
    }
}
