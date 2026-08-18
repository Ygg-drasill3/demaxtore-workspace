// =============================================================================
// Sprint 30-02 — Inspection Workspace cockpit DTOs
// Extends Order inspection fields; no parallel QA FSM / module.
// =============================================================================
export const INSPECTION_TYPES = [
    "INITIAL",
    "DURING_PRODUCTION",
    "FINAL_RANDOM",
    "LOADING",
    "CONTAINER",
    "PRE_SHIPMENT",
];
/** Workspace status aliases — mirror Order inspection lifecycle, not a replacement FSM. */
export const INSPECTION_STATUSES = [
    "DRAFT",
    "REQUESTED",
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "APPROVED",
    "REJECTED",
    "REINSPECTION_REQUIRED",
    "CANCELLED",
];
export const INSPECTION_SEVERITIES = ["MINOR", "MAJOR", "CRITICAL"];
export const INSPECTION_DECISIONS = [
    "PASS",
    "CONDITIONAL_PASS",
    "FAIL",
    "REINSPECTION_REQUIRED",
];
export const INSPECTION_NCR_STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED"];
export function inspectionDurationHours(start, finish) {
    if (!start || !finish)
        return null;
    const a = new Date(start).getTime();
    const b = new Date(finish).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a)
        return null;
    return Math.round(((b - a) / 3_600_000) * 10) / 10;
}
/** Map decision → order `inspectionResult` string for legacy Order fields. */
export function decisionToOrderResult(decision) {
    switch (decision) {
        case "PASS":
            return "PASS";
        case "CONDITIONAL_PASS":
            return "CONDITIONAL_PASS";
        case "FAIL":
            return "FAIL";
        case "REINSPECTION_REQUIRED":
            return "REINSPECTION_REQUIRED";
        default:
            return decision;
    }
}
