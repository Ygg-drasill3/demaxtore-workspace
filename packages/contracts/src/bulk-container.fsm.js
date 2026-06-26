// Sprint 13B/13C — BulkContainer FSM
export const BC_TRANSITIONS = [
    { from: "*", to: "BC_DRAFT", action: "create_container", allowedRoles: ["BUYER"], auditEvent: "bulk_container.created" },
    { from: "BC_DRAFT", to: "BC_DRAFT", action: "edit_container", allowedRoles: ["BUYER"], auditEvent: "bulk_container.updated" },
    { from: "BC_DRAFT", to: "BC_BUILDING", action: "add_product", allowedRoles: ["BUYER"], auditEvent: "bulk_container.updated" },
    { from: "BC_BUILDING", to: "BC_BUILDING", action: "add_product", allowedRoles: ["BUYER"], auditEvent: "bulk_container.updated" },
    { from: "BC_BUILDING", to: "BC_BUILDING", action: "update_product_quantity", allowedRoles: ["BUYER"], auditEvent: "bulk_container.updated" },
    { from: "BC_DRAFT", to: "BC_BUILDING", action: "update_product_quantity", allowedRoles: ["BUYER"], auditEvent: "bulk_container.updated" },
    { from: "BC_BUILDING", to: "BC_BUILDING", action: "remove_product", allowedRoles: ["BUYER"], auditEvent: "bulk_container.updated" },
    { from: "BC_DRAFT", to: "BC_BUILDING", action: "remove_product", allowedRoles: ["BUYER"], auditEvent: "bulk_container.updated" },
    { from: "BC_BUILDING", to: "BC_BUILDING", action: "edit_container", allowedRoles: ["BUYER"], auditEvent: "bulk_container.updated" },
    { from: "BC_DRAFT", to: "BC_BUILDING", action: "edit_container", allowedRoles: ["BUYER"], auditEvent: "bulk_container.updated" },
    { from: "BC_BUILDING", to: "BC_SUBMITTED", action: "submit_request", allowedRoles: ["BUYER"], auditEvent: "bulk_container.submitted" },
    { from: "BC_DRAFT", to: "BC_SUBMITTED", action: "submit_request", allowedRoles: ["BUYER"], auditEvent: "bulk_container.submitted" },
    { from: "BC_DRAFT", to: "BC_CANCELLED", action: "cancel_container", allowedRoles: ["BUYER"], auditEvent: "bulk_container.cancelled" },
    { from: "BC_BUILDING", to: "BC_CANCELLED", action: "cancel_container", allowedRoles: ["BUYER"], auditEvent: "bulk_container.cancelled" },
    // Sprint 13C — procurement & offer
    { from: "BC_SUBMITTED", to: "BC_PROCUREMENT_IN_PROGRESS", action: "start_procurement", allowedRoles: ["ADMIN"], auditEvent: "bulk_container.procurement_started" },
    { from: "BC_REVISION_REQUESTED", to: "BC_PROCUREMENT_IN_PROGRESS", action: "resume_procurement", allowedRoles: ["ADMIN"], auditEvent: "bulk_container.procurement_started" },
    { from: "BC_EXPIRED", to: "BC_PROCUREMENT_IN_PROGRESS", action: "regenerate_offer", allowedRoles: ["ADMIN"], auditEvent: "bulk_container.procurement_started" },
    { from: "BC_PROCUREMENT_IN_PROGRESS", to: "BC_OFFER_READY", action: "create_offer", allowedRoles: ["ADMIN"], auditEvent: "bulk_offer_created" },
    { from: "BC_OFFER_READY", to: "BC_BUYER_REVIEW", action: "send_offer", allowedRoles: ["ADMIN"], auditEvent: "bulk_offer_sent" },
    { from: "BC_PROCUREMENT_IN_PROGRESS", to: "BC_BUYER_REVIEW", action: "send_offer", allowedRoles: ["ADMIN"], auditEvent: "bulk_offer_sent" },
    { from: "BC_BUYER_REVIEW", to: "BC_APPROVED", action: "approve_offer", allowedRoles: ["BUYER"], auditEvent: "bulk_offer_approved" },
    { from: "BC_BUYER_REVIEW", to: "BC_REVISION_REQUESTED", action: "request_revision", allowedRoles: ["BUYER"], auditEvent: "bulk_offer_revision_requested" },
    { from: "BC_BUYER_REVIEW", to: "BC_EXPIRED", action: "expire_offer", allowedRoles: ["ADMIN", "SYSTEM"], auditEvent: "bulk_offer_expired" },
    // Sprint 13D — allocation, proforma & payment coordination
    { from: "BC_APPROVED", to: "BC_ALLOCATION_IN_PROGRESS", action: "start_allocation", allowedRoles: ["ADMIN"], auditEvent: "bulk_allocation_started" },
    { from: "BC_ALLOCATION_IN_PROGRESS", to: "BC_ALLOCATION_IN_PROGRESS", action: "create_allocation", allowedRoles: ["ADMIN"], auditEvent: "bulk_allocation_created" },
    { from: "BC_ALLOCATION_IN_PROGRESS", to: "BC_PROFORMA_PENDING", action: "complete_allocations", allowedRoles: ["ADMIN"], auditEvent: "bulk_allocations_completed" },
    { from: "BC_PROFORMA_PENDING", to: "BC_PROFORMA_PENDING", action: "upload_proforma", allowedRoles: ["ADMIN"], auditEvent: "bulk_proforma_uploaded" },
    { from: "BC_PROFORMA_PENDING", to: "BC_PAYMENT_TRACKING", action: "begin_payment_tracking", allowedRoles: ["ADMIN", "SYSTEM"], auditEvent: "bulk_payment_tracking_started" },
    { from: "BC_PAYMENT_TRACKING", to: "BC_PAYMENT_TRACKING", action: "create_payment_record", allowedRoles: ["ADMIN"], auditEvent: "bulk_payment_record_created" },
    { from: "BC_PAYMENT_TRACKING", to: "BC_PAYMENT_TRACKING", action: "confirm_payment", allowedRoles: ["ADMIN"], auditEvent: "bulk_payment_confirmed" },
    { from: "BC_PAYMENT_TRACKING", to: "BC_PAYMENT_TRACKING", action: "reject_payment", allowedRoles: ["ADMIN"], auditEvent: "bulk_payment_rejected" },
    { from: "BC_PAYMENT_TRACKING", to: "BC_EXECUTION_READY", action: "mark_execution_ready", allowedRoles: ["ADMIN", "SYSTEM"], auditEvent: "bulk_execution_ready" },
    // Sprint 13E — execution bridge into Trade OS
    { from: "BC_EXECUTION_READY", to: "BC_EXECUTION_ACTIVE", action: "spawn_execution_orders", allowedRoles: ["ADMIN", "SYSTEM"], auditEvent: "bulk_orders_spawned" },
    { from: "BC_EXECUTION_ACTIVE", to: "BC_EXECUTION_COMPLETE", action: "mark_execution_complete", allowedRoles: ["ADMIN", "SYSTEM"], auditEvent: "bulk_execution_completed" },
];
export const BC_TERMINAL_STATES = ["BC_EXECUTION_COMPLETE", "BC_CANCELLED"];
export const BC_OFFER_VALIDITY_HOURS = 72;
/** Fixed 25 MT container capacity for Sprint 13B MVP */
export const BC_MAX_CAPACITY_MT = 25;
/** Below this threshold → partial container warning */
export const BC_PARTIAL_THRESHOLD_MT = 20;
export const BC_STATE_LABELS = {
    BC_DRAFT: "Draft",
    BC_BUILDING: "Building",
    BC_SUBMITTED: "Submitted",
    BC_PROCUREMENT_IN_PROGRESS: "Procurement In Progress",
    BC_OFFER_READY: "Offer Ready",
    BC_BUYER_REVIEW: "Awaiting Buyer Review",
    BC_APPROVED: "Approved",
    BC_REVISION_REQUESTED: "Revision Requested",
    BC_EXPIRED: "Expired",
    BC_ALLOCATION_IN_PROGRESS: "Allocation In Progress",
    BC_PROFORMA_PENDING: "Proforma Pending",
    BC_PAYMENT_TRACKING: "Payment Tracking",
    BC_EXECUTION_READY: "Execution Ready",
    BC_EXECUTION_ACTIVE: "Execution Active",
    BC_EXECUTION_COMPLETE: "Execution Complete",
    BC_CANCELLED: "Cancelled",
};
export function findBcTransition(from, action) {
    return BC_TRANSITIONS.find((t) => t.from === from && t.action === action);
}
export function isBcTerminal(state) {
    return BC_TERMINAL_STATES.includes(state);
}
export function computeBcCapacityWarnings(currentMt) {
    const warnings = [];
    if (currentMt > 0 && currentMt < BC_PARTIAL_THRESHOLD_MT)
        warnings.push("partial_container");
    if (currentMt > BC_MAX_CAPACITY_MT)
        warnings.push("over_capacity");
    return warnings;
}
//# sourceMappingURL=bulk-container.fsm.js.map