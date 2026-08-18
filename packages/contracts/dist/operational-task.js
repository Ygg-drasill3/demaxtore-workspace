// =============================================================================
// Sprint 30-03 — Operational Tasks (execution coordination; not a workflow FSM)
// =============================================================================
export const OPERATIONAL_TASK_STATUSES = [
    "OPEN",
    "ASSIGNED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
];
export const OPERATIONAL_TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const OPERATIONAL_TASK_RELATED_TYPES = [
    "ORDER",
    "PURCHASE_ORDER",
    "SHIPMENT",
    "INSPECTION",
    "DOCUMENT",
    "REVISION",
    "NCR",
];
/** Built-in automation keys (idempotent via unique orderId+automationKey). */
export const OPERATIONAL_TASK_AUTOMATION_KEYS = {
    ASSIGN_INSPECTOR: "assign_inspector",
    UPLOAD_BILL_OF_LADING: "upload_bill_of_lading",
    RESOLVE_NCR: "resolve_ncr",
    REVIEW_REVISION: "review_revision",
    CREATE_SHIPMENT_BOOKING: "create_shipment_booking",
};
