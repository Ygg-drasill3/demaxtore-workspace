// =============================================================================
// Sprint 30-04 — Shipment Milestones (planning / ETA / delay; not a logistics FSM)
// =============================================================================
export const SHIPMENT_MILESTONE_TYPES = [
    "BOOKING",
    "CONTAINER_READY",
    "CARGO_PICKUP",
    "PORT_GATE_IN",
    "EXPORT_CUSTOMS",
    "LOADED_ON_VESSEL",
    "DEPARTURE",
    "TRANSSHIPMENT",
    "ARRIVAL",
    "IMPORT_CUSTOMS",
    "DELIVERY",
    "COMPLETED",
];
export const SHIPMENT_MILESTONE_TYPE_LABELS = {
    BOOKING: "Booking",
    CONTAINER_READY: "Container Ready",
    CARGO_PICKUP: "Cargo Pickup",
    PORT_GATE_IN: "Port Gate-In",
    EXPORT_CUSTOMS: "Export Customs",
    LOADED_ON_VESSEL: "Loaded on Vessel",
    DEPARTURE: "Departure",
    TRANSSHIPMENT: "Transshipment",
    ARRIVAL: "Arrival",
    IMPORT_CUSTOMS: "Import Customs",
    DELIVERY: "Delivery",
    COMPLETED: "Completed",
};
export const SHIPMENT_MILESTONE_STATUSES = [
    "PENDING",
    "ACTIVE",
    "COMPLETED",
    "SKIPPED",
];
export const SHIPMENT_MILESTONE_RISKS = ["ON_TRACK", "AT_RISK", "DELAYED"];
/** Global risk thresholds (minutes). Configurable; not per-shipment. */
export const SHIPMENT_MILESTONE_RISK_THRESHOLDS = {
    atRiskMinutes: 1,
    delayedMinutes: 24 * 60,
};
export const DEFAULT_SHIPMENT_MILESTONE_PLAN = [
    { type: "BOOKING", sequence: 10 },
    { type: "CONTAINER_READY", sequence: 20 },
    { type: "CARGO_PICKUP", sequence: 30 },
    { type: "PORT_GATE_IN", sequence: 40 },
    { type: "EXPORT_CUSTOMS", sequence: 50 },
    { type: "LOADED_ON_VESSEL", sequence: 60 },
    { type: "DEPARTURE", sequence: 70 },
    { type: "TRANSSHIPMENT", sequence: 80, skipByDefault: true },
    { type: "ARRIVAL", sequence: 90 },
    { type: "IMPORT_CUSTOMS", sequence: 100 },
    { type: "DELIVERY", sequence: 110 },
    { type: "COMPLETED", sequence: 120 },
];
export function computeMilestoneDelayMinutes(input) {
    if (!input.plannedAt)
        return null;
    const planned = new Date(input.plannedAt).getTime();
    const compareSrc = input.actualAt ?? input.estimatedAt;
    if (!compareSrc)
        return null;
    const compare = new Date(compareSrc).getTime();
    if (Number.isNaN(planned) || Number.isNaN(compare))
        return null;
    return Math.round((compare - planned) / 60_000);
}
export function computeMilestoneRisk(delayMinutes, thresholds = SHIPMENT_MILESTONE_RISK_THRESHOLDS) {
    if (delayMinutes == null || delayMinutes < thresholds.atRiskMinutes)
        return "ON_TRACK";
    if (delayMinutes >= thresholds.delayedMinutes)
        return "DELAYED";
    return "AT_RISK";
}
export function effectiveMilestoneAt(input) {
    return input.actualAt ?? input.estimatedAt ?? input.plannedAt ?? null;
}
