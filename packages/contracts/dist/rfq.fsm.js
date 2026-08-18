// =============================================================================
// DeMaxtore — RFQ State Machine Descriptor (TypeScript source of truth)
// Generated FROM: /app/docs/rfq-state-machine.md §3 + §5 + §7
// Destination:    packages/contracts/src/rfq.fsm.ts
//
// CONTRACT: Every backend mutation MUST go through applyTransition() which
// consumes this array. No state change is allowed outside this list.
// Frontend Next-Action buttons MUST be derived from this list — no hardcoded
// state-action JSX allowed.
// =============================================================================
/** All valid RFQ workspace states (for admin override picker). */
export const RFQ_STATES = [
    "RFQ_DRAFT",
    "RFQ_SUBMITTED",
    "REJECTED_BY_ADMIN",
    "SUPPLIERS_ASSIGNED",
    "RFQ_OPEN",
    "QUOTATIONS_CLOSED",
    "UNDER_EVALUATION",
    "PARTIALLY_AWARDED",
    "FULLY_AWARDED",
    "SUPPLIER_SELECTED",
    "PROFORMA_REQUESTED",
    "PROFORMA_RECEIVED",
    "PROFORMA_APPROVED",
    "PO_ISSUED",
    "CLOSED",
    "CANCELLED",
    "EXPIRED",
    "CLOSED_NO_AWARD",
];
// -----------------------------------------------------------------------------
// 40 Transitions — mirror /app/docs/rfq-state-machine.md §3 EXACTLY.
// -----------------------------------------------------------------------------
export const RFQ_TRANSITIONS = [
    // ---------- Draft & submission ----------
    { from: "*", to: "RFQ_DRAFT", action: "create_rfq",
        allowedRoles: ["BUYER"], auditEvent: "rfq.created",
        notifyRecipients: [] },
    { from: "RFQ_DRAFT", to: "RFQ_DRAFT", action: "edit_rfq_draft",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        auditEvent: "rfq.draft.edited", notifyRecipients: [] },
    { from: "RFQ_DRAFT", to: "RFQ_SUBMITTED", action: "submit_rfq",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        preconditions: ["assertSubmitPreconditions"],
        auditEvent: "rfq.submitted",
        notifyRecipients: [{ broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "rfq.submitted.admin" }] },
    { from: "RFQ_DRAFT", to: "CANCELLED", action: "cancel_rfq",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
        auditEvent: "rfq.cancelled",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "rfq.cancelled" }] },
    // ---------- Admin triage ----------
    { from: "RFQ_SUBMITTED", to: "SUPPLIERS_ASSIGNED", action: "assign_suppliers",
        allowedRoles: ["ADMIN"], preconditions: ["assertAssignable"],
        auditEvent: "rfq.suppliers.assigned",
        notifyRecipients: [
            { target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.suppliers.assigned.supplier" },
            { target: "OWNER", type: "INFO", titleKey: "rfq.suppliers.assigned.buyer" },
        ] },
    { from: "RFQ_SUBMITTED", to: "REJECTED_BY_ADMIN", action: "reject_rfq",
        allowedRoles: ["ADMIN"], requiresReason: true,
        auditEvent: "rfq.rejected_by_admin",
        notifyRecipients: [{ target: "OWNER", type: "ERROR", titleKey: "rfq.rejected_by_admin" }] },
    { from: "RFQ_SUBMITTED", to: "CANCELLED", action: "withdraw_rfq",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        preconditions: ["assertNotYetTriaged"],
        auditEvent: "rfq.cancelled",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "rfq.cancelled" }] },
    // ---------- Revise from rejection (Decision #6) ----------
    { from: "REJECTED_BY_ADMIN", to: "RFQ_DRAFT", action: "revise_rejected_rfq",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        preconditions: ["assertAtLeastOneFieldChanged"],
        auditEvent: "rfq.revised_from_rejection",
        notifyRecipients: [{ broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "rfq.revised_from_rejection" }] },
    // ---------- Suppliers assigned ----------
    { from: "SUPPLIERS_ASSIGNED", to: "SUPPLIERS_ASSIGNED", action: "add_more_suppliers",
        allowedRoles: ["ADMIN"], preconditions: ["assertSuppliersNew"],
        auditEvent: "rfq.suppliers.added",
        notifyRecipients: [{ target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.suppliers.added" }] },
    { from: "SUPPLIERS_ASSIGNED", to: "SUPPLIERS_ASSIGNED", action: "update_supplier_scopes",
        allowedRoles: ["ADMIN"], preconditions: ["assertAssignable", "assertAssignedSuppliers", "assertSupplierScopesExpanded"],
        auditEvent: "rfq.supplier_scopes.updated",
        notifyRecipients: [{ target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.supplier_scope.expanded" }] },
    { from: "SUPPLIERS_ASSIGNED", to: "SUPPLIERS_ASSIGNED", action: "remove_supplier",
        allowedRoles: ["ADMIN"], preconditions: ["assertSupplierHasNoQuotation"],
        auditEvent: "rfq.suppliers.removed", notifyRecipients: [] },
    { from: "SUPPLIERS_ASSIGNED", to: "RFQ_OPEN", action: "publish_rfq",
        allowedRoles: ["ADMIN"], preconditions: ["assertAtLeastOneSupplier", "assertFutureDeadline"],
        auditEvent: "rfq.published",
        notifyRecipients: [{ target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.published" }] },
    { from: "SUPPLIERS_ASSIGNED", to: "CANCELLED", action: "cancel_rfq",
        allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
        auditEvent: "rfq.cancelled",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "rfq.cancelled" }] },
    { from: "SUPPLIERS_ASSIGNED", to: "RFQ_SUBMITTED", action: "return_to_review",
        allowedRoles: ["ADMIN"], requiresReason: true,
        preconditions: ["assertNoActiveQuotations"],
        auditEvent: "rfq.returned_to_review",
        notifyRecipients: [
            { target: "OWNER", type: "INFO", titleKey: "rfq.returned_to_review" },
            { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "rfq.returned_to_review" },
        ] },
    // ---------- RFQ open: admin supplier management ----------
    { from: "RFQ_OPEN", to: "RFQ_OPEN", action: "add_more_suppliers",
        allowedRoles: ["ADMIN"], preconditions: ["assertSuppliersNew"],
        auditEvent: "rfq.suppliers.added",
        notifyRecipients: [{ target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.suppliers.added" }] },
    { from: "RFQ_OPEN", to: "RFQ_OPEN", action: "update_supplier_scopes",
        allowedRoles: ["ADMIN"], preconditions: ["assertAssignable", "assertAssignedSuppliers", "assertSupplierScopesExpanded"],
        auditEvent: "rfq.supplier_scopes.updated",
        notifyRecipients: [{ target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.supplier_scope.expanded" }] },
    // ---------- RFQ open: supplier actions ----------
    { from: "RFQ_OPEN", to: "RFQ_OPEN", action: "submit_quotation",
        allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY",
        auditEvent: "quotation.submitted",
        notifyRecipients: [{ target: "OWNER", type: "INFO", titleKey: "quotation.submitted" }] },
    { from: "RFQ_OPEN", to: "RFQ_OPEN", action: "revise_quotation",
        allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY",
        preconditions: ["assertExistingQuotationFromSupplier", "assertDeadlineNotPassed"],
        auditEvent: "quotation.revised",
        notifyRecipients: [{ target: "OWNER", type: "INFO", titleKey: "quotation.revised" }] },
    { from: "RFQ_OPEN", to: "RFQ_OPEN", action: "withdraw_quotation",
        allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY",
        preconditions: ["assertExistingQuotationFromSupplier", "assertDeadlineNotPassed"],
        auditEvent: "quotation.withdrawn",
        notifyRecipients: [{ target: "OWNER", type: "WARNING", titleKey: "quotation.withdrawn" }] },
    // ---------- RFQ open: clarifications + deadline ----------
    { from: "RFQ_OPEN", to: "RFQ_OPEN", action: "post_clarification",
        allowedRoles: ["BUYER", "SUPPLIER", "ADMIN"], requiredParticipant: "ANY",
        auditEvent: "rfq.clarification.posted",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "rfq.clarification.posted" }] },
    { from: "RFQ_OPEN", to: "RFQ_OPEN", action: "extend_deadline",
        allowedRoles: ["BUYER", "ADMIN"],
        preconditions: ["assertDeadlineExtensionAllowed"],
        auditEvent: "rfq.deadline.extended",
        notifyRecipients: [{ target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.deadline.extended" }] },
    { from: "RFQ_OPEN", to: "QUOTATIONS_CLOSED", action: "close_quotations_early",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        auditEvent: "rfq.quotations.closed_manual",
        notifyRecipients: [{ target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.quotations.closed" }] },
    { from: "RFQ_OPEN", to: "QUOTATIONS_CLOSED", action: "deadline_reached",
        allowedRoles: ["SYSTEM"], preconditions: ["assertHasQuotations"],
        auditEvent: "rfq.quotations.closed_auto",
        notifyRecipients: [{ target: "OWNER", type: "INFO", titleKey: "rfq.evaluation.ready" }] },
    { from: "RFQ_OPEN", to: "EXPIRED", action: "deadline_reached_no_bids",
        allowedRoles: ["SYSTEM"], preconditions: ["assertNoQuotations"],
        auditEvent: "rfq.expired",
        notifyRecipients: [
            { target: "OWNER", type: "WARNING", titleKey: "rfq.expired" },
            { broadcast: { role: "ADMIN" }, type: "WARNING", titleKey: "rfq.expired.admin" },
        ] },
    { from: "RFQ_OPEN", to: "CANCELLED", action: "cancel_rfq",
        allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
        auditEvent: "rfq.cancelled",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "rfq.cancelled" }] },
    { from: "RFQ_OPEN", to: "SUPPLIERS_ASSIGNED", action: "unpublish_rfq",
        allowedRoles: ["ADMIN"], requiresReason: true,
        preconditions: ["assertNoActiveQuotations"],
        auditEvent: "rfq.unpublished",
        notifyRecipients: [
            { target: "OWNER", type: "INFO", titleKey: "rfq.unpublished" },
            { target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.unpublished" },
        ] },
    // ---------- Evaluation ----------
    { from: "QUOTATIONS_CLOSED", to: "UNDER_EVALUATION", action: "start_evaluation",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        auditEvent: "rfq.evaluation.started",
        notifyRecipients: [{ target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.evaluation.started" }] },
    // Decision #4 — ADMIN only
    { from: "QUOTATIONS_CLOSED", to: "RFQ_OPEN", action: "reopen_quotations",
        allowedRoles: ["ADMIN"], requiresReason: true,
        preconditions: ["assertNewDeadline"],
        auditEvent: "rfq.quotations.reopened",
        notifyRecipients: [
            { target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.quotations.reopened" },
            { target: "OWNER", type: "INFO", titleKey: "rfq.quotations.reopened" },
        ] },
    { from: "QUOTATIONS_CLOSED", to: "CANCELLED", action: "cancel_rfq",
        allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
        auditEvent: "rfq.cancelled",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "rfq.cancelled" }] },
    { from: "UNDER_EVALUATION", to: "SUPPLIER_SELECTED", action: "select_supplier",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        preconditions: ["assertQuotationValid"],
        auditEvent: "rfq.supplier.selected",
        notifyRecipients: [
            { target: "SELECTED_SUPPLIER", type: "SUCCESS", titleKey: "rfq.you_won" },
            { target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.you_lost" },
            { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "rfq.supplier.selected" },
        ] },
    { from: "UNDER_EVALUATION", to: "CLOSED_NO_AWARD", action: "close_without_award",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
        auditEvent: "rfq.closed_no_award",
        notifyRecipients: [{ target: "COUNTERPARTY", type: "INFO", titleKey: "rfq.closed_no_award" }] },
    { from: "UNDER_EVALUATION", to: "CANCELLED", action: "cancel_rfq",
        allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
        auditEvent: "rfq.cancelled",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "rfq.cancelled" }] },
    { from: "UNDER_EVALUATION", to: "QUOTATIONS_CLOSED", action: "revert_evaluation",
        allowedRoles: ["ADMIN"], requiresReason: true,
        preconditions: ["assertNoSupplierSelected"],
        auditEvent: "rfq.evaluation.reverted",
        notifyRecipients: [
            { target: "OWNER", type: "INFO", titleKey: "rfq.evaluation.reverted" },
            { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "rfq.evaluation.reverted" },
        ] },
    // ---------- Proforma ----------
    { from: "SUPPLIER_SELECTED", to: "PROFORMA_REQUESTED", action: "request_proforma",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        auditEvent: "proforma.requested",
        notifyRecipients: [{ target: "SELECTED_SUPPLIER", type: "WARNING", titleKey: "proforma.requested" }] },
    { from: "SUPPLIER_SELECTED", to: "UNDER_EVALUATION", action: "revert_selection",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
        preconditions: ["assertProformaNotRequested"],
        auditEvent: "rfq.selection.reverted",
        notifyRecipients: [{ target: "SELECTED_SUPPLIER", type: "WARNING", titleKey: "rfq.selection.reverted" }] },
    { from: "PROFORMA_REQUESTED", to: "PROFORMA_RECEIVED", action: "submit_proforma",
        allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY",
        preconditions: ["assertProformaAttached"],
        auditEvent: "proforma.submitted",
        notifyRecipients: [
            { target: "OWNER", type: "INFO", titleKey: "proforma.submitted" },
            { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "proforma.submitted" },
        ] },
    { from: "PROFORMA_REQUESTED", to: "UNDER_EVALUATION", action: "decline_proforma",
        allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY", requiresReason: true,
        auditEvent: "proforma.declined_by_supplier",
        notifyRecipients: [{ target: "OWNER", type: "WARNING", titleKey: "proforma.declined" }] },
    // Decision #3 — 5 business day SLA
    { from: "PROFORMA_REQUESTED", to: "UNDER_EVALUATION", action: "proforma_sla_expired",
        allowedRoles: ["SYSTEM"],
        auditEvent: "proforma.sla_expired",
        notifyRecipients: [
            { target: "OWNER", type: "WARNING", titleKey: "proforma.sla_expired" },
            { broadcast: { role: "ADMIN" }, type: "WARNING", titleKey: "proforma.sla_expired" },
        ] },
    { from: "PROFORMA_REQUESTED", to: "CANCELLED", action: "cancel_rfq",
        allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
        auditEvent: "rfq.cancelled",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "rfq.cancelled" }] },
    { from: "PROFORMA_RECEIVED", to: "PROFORMA_APPROVED", action: "approve_proforma",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        auditEvent: "proforma.approved",
        notifyRecipients: [{ target: "SELECTED_SUPPLIER", type: "SUCCESS", titleKey: "proforma.approved" }] },
    { from: "PROFORMA_RECEIVED", to: "PROFORMA_REQUESTED", action: "reject_proforma",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
        auditEvent: "proforma.rejected",
        notifyRecipients: [{ target: "SELECTED_SUPPLIER", type: "WARNING", titleKey: "proforma.rejected" }] },
    { from: "PROFORMA_RECEIVED", to: "CANCELLED", action: "cancel_rfq",
        allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
        auditEvent: "rfq.cancelled",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "rfq.cancelled" }] },
    // ---------- PO issued (spawns Order workspace — Sprint 3) ----------
    { from: "PROFORMA_APPROVED", to: "PO_ISSUED", action: "issue_po",
        allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
        preconditions: ["assertPoNumberUnique", "assertActiveFreightEstimate"],
        auditEvent: "po.issued",
        notifyRecipients: [
            { target: "SELECTED_SUPPLIER", type: "SUCCESS", titleKey: "po.issued" },
            { broadcast: { role: "ADMIN" }, type: "SUCCESS", titleKey: "po.issued" },
        ] },
    { from: "PO_ISSUED", to: "CLOSED", action: "sync_order_closed",
        allowedRoles: ["SYSTEM"],
        auditEvent: "rfq.order_fulfilled",
        notifyRecipients: [{ target: "OWNER", type: "SUCCESS", titleKey: "rfq.order_fulfilled" }] },
    { from: "PROFORMA_APPROVED", to: "CANCELLED", action: "cancel_rfq",
        allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
        auditEvent: "rfq.cancelled",
        notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "rfq.cancelled" }] },
    // ---------- Universal: observers ----------
    { from: "*", to: "*", action: "add_observer",
        allowedRoles: ["ADMIN"], auditEvent: "workspace.participant.added", notifyRecipients: [] },
    { from: "*", to: "*", action: "remove_observer",
        allowedRoles: ["ADMIN"], auditEvent: "workspace.participant.removed", notifyRecipients: [] },
    // Admin override — jump to any RFQ state (ops / correction).
    { from: "*", to: "*", action: "admin_set_state",
        allowedRoles: ["ADMIN"], requiresReason: true,
        preconditions: ["assertAdminSetStateTarget"],
        auditEvent: "rfq.admin.state_set",
        notifyRecipients: [
            { target: "OWNER", type: "INFO", titleKey: "rfq.admin.state_set" },
            { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "rfq.admin.state_set" },
        ] },
];
import { RFQ_SPLIT_AWARD_TRANSITIONS } from "./rfq-split-award.fsm.js";
/** Base + split-award transitions (split appended to avoid circular init). */
export const RFQ_ALL_TRANSITIONS = [
    ...RFQ_TRANSITIONS,
    ...RFQ_SPLIT_AWARD_TRANSITIONS,
];
// -----------------------------------------------------------------------------
// Convenience lookups for runtime
// -----------------------------------------------------------------------------
export const RFQ_TERMINAL_STATES = [
    "CANCELLED", "EXPIRED", "CLOSED_NO_AWARD", "PO_ISSUED", "CLOSED",
];
/** Award-phase states where line-item awards and supplier PO spawn are active. */
export const RFQ_SPLIT_AWARD_STATES = [
    "RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION",
    "PARTIALLY_AWARDED", "FULLY_AWARDED",
];
export function isRfqTerminal(state) {
    return RFQ_TERMINAL_STATES.includes(state);
}
export function findRfqTransition(from, action) {
    return RFQ_ALL_TRANSITIONS.find((t) => (t.from === from || t.from === "*") && t.action === action);
}
