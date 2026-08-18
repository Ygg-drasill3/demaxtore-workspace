// =============================================================================
// Sprint 30-05 — Operational Issues (business exceptions; not Tasks / not FSM)
// =============================================================================
export const OPERATIONAL_ISSUE_STATUSES = [
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
];
export const OPERATIONAL_ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const OPERATIONAL_ISSUE_CATEGORIES = [
    "SHIPMENT_DELAY",
    "BOOKING_FAILURE",
    "INSPECTION_FAILURE",
    "DOCUMENT_MISSING",
    "DOCUMENT_EXPIRED",
    "SUPPLIER_RESPONSE",
    "QUALITY_ISSUE",
    "OTHER",
];
export const OPERATIONAL_ISSUE_RELATED_TYPES = [
    "PURCHASE_ORDER",
    "SHIPMENT",
    "INSPECTION",
    "COMMERCIAL_DOCUMENT",
    "TASK",
];
export const OPERATIONAL_ISSUE_CATEGORY_LABELS = {
    SHIPMENT_DELAY: "Shipment Delay",
    BOOKING_FAILURE: "Booking Failure",
    INSPECTION_FAILURE: "Inspection Failure",
    DOCUMENT_MISSING: "Document Missing",
    DOCUMENT_EXPIRED: "Document Expired",
    SUPPLIER_RESPONSE: "Supplier Response",
    QUALITY_ISSUE: "Quality Issue",
    OTHER: "Other",
};
export const OPERATIONAL_ISSUE_AUTOMATION_KEYS = {
    INSPECTION_FAILURE: "inspection_failure",
    /** Sprint 34 rule pack (suffix entity id in ensureAutomatedIssue) */
    ETA_DELIVERY_RISK: "ei_eta_delivery_risk",
    BOOKING_STALLED: "ei_booking_stalled",
    BOOKING_CUTOFF_RISK: "ei_booking_cutoff_risk",
    DOCUMENT_MISSING: "ei_document_missing",
    DOCUMENT_REJECTED: "ei_document_rejected",
    MILESTONE_OVERDUE: "ei_milestone_overdue",
    CUSTOMS_BROKER_MISSING: "ei_customs_broker_missing",
    CUSTOMS_ORIGIN_MISSING: "ei_customs_origin_missing",
    CUSTOMS_CLASSIFICATION_MISSING: "ei_customs_classification_missing",
    CUSTOMS_HOLD: "ei_customs_hold",
    CUSTOMS_CLEARANCE_DELAY: "ei_customs_clearance_delay",
    CUSTOMS_DOCUMENT_MISSING: "ei_customs_document_missing",
    CUSTOMS_PREPARATION_AT_RISK: "ei_customs_preparation_at_risk",
    CUSTOMS_BROKER_REVIEW_PENDING: "ei_customs_broker_review_pending",
    CUSTOMS_ARRIVAL_NOT_READY: "ei_customs_arrival_not_ready",
};
