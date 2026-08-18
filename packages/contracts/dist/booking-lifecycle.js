/**
 * Sprint 32 — Operational booking lifecycle on ShipmentWorkspace (GLOBAL CORE).
 * Not a parallel Booking entity; statuses live on shipment_workspaces.booking_status.
 */
export const BOOKING_STATUSES = [
    "DRAFT",
    "REQUESTED",
    "PENDING",
    "CONFIRMED",
    "AMENDED",
    "CANCELLED",
];
export const BOOKING_SOURCES = [
    "MANUAL",
    "DEMAXTORE_OPERATIONS",
    "PARTNER",
    "CARRIER_API",
    "EDI",
    "SYSTEM",
];
/** Explicit valid transitions — invalid transitions must be rejected. */
export const BOOKING_TRANSITIONS = {
    DRAFT: ["REQUESTED", "PENDING", "CONFIRMED", "CANCELLED"],
    REQUESTED: ["PENDING", "CONFIRMED", "CANCELLED"],
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["AMENDED", "CANCELLED"],
    AMENDED: ["CONFIRMED", "AMENDED", "CANCELLED"],
    CANCELLED: [], // no reopen unless future explicit rule
};
export function isBookingStatus(v) {
    return typeof v === "string" && BOOKING_STATUSES.includes(v);
}
export function canTransitionBooking(from, to) {
    // First write onto legacy null: treat as DRAFT entrypoint
    const src = from ?? "DRAFT";
    if (src === to)
        return true; // idempotent same-status
    return (BOOKING_TRANSITIONS[src] ?? []).includes(to);
}
/** Forward Ops transitions excluding Cancel (Cancel has its own control). */
export function nextBookingStatuses(from) {
    const src = from ?? "DRAFT";
    return (BOOKING_TRANSITIONS[src] ?? []).filter((s) => s !== "CANCELLED");
}
export function assertBookingTransition(from, to) {
    if (!canTransitionBooking(from, to)) {
        throw new Error(`INVALID_BOOKING_TRANSITION:${from ?? "null"}→${to}`);
    }
}
