export type RfqState = "RFQ_DRAFT" | "RFQ_SUBMITTED" | "REJECTED_BY_ADMIN" | "SUPPLIERS_ASSIGNED" | "RFQ_OPEN" | "QUOTATIONS_CLOSED" | "UNDER_EVALUATION" | "PARTIALLY_AWARDED" | "FULLY_AWARDED" | "SUPPLIER_SELECTED" | "PROFORMA_REQUESTED" | "PROFORMA_RECEIVED" | "PROFORMA_APPROVED" | "PO_ISSUED" | "CLOSED" | "CANCELLED" | "EXPIRED" | "CLOSED_NO_AWARD";
export type RfqAction = "create_rfq" | "edit_rfq_draft" | "submit_rfq" | "withdraw_rfq" | "assign_suppliers" | "add_more_suppliers" | "update_supplier_scopes" | "remove_supplier" | "reject_rfq" | "publish_rfq" | "revise_rejected_rfq" | "submit_quotation" | "revise_quotation" | "withdraw_quotation" | "post_clarification" | "extend_deadline" | "close_quotations_early" | "deadline_reached" | "deadline_reached_no_bids" | "start_evaluation" | "reopen_quotations" | "select_supplier" | "revert_selection" | "close_without_award" | "return_to_review" | "unpublish_rfq" | "revert_evaluation" | "award_line_item" | "revert_line_award" | "mark_line_no_award" | "issue_supplier_po" | "close_rfq_awards" | "request_proforma" | "submit_proforma" | "decline_proforma" | "proforma_sla_expired" | "approve_proforma" | "reject_proforma" | "issue_po" | "sync_order_closed" | "cancel_rfq" | "add_observer" | "remove_observer" | "admin_set_state";
/** All valid RFQ workspace states (for admin override picker). */
export declare const RFQ_STATES: readonly ["RFQ_DRAFT", "RFQ_SUBMITTED", "REJECTED_BY_ADMIN", "SUPPLIERS_ASSIGNED", "RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION", "PARTIALLY_AWARDED", "FULLY_AWARDED", "SUPPLIER_SELECTED", "PROFORMA_REQUESTED", "PROFORMA_RECEIVED", "PROFORMA_APPROVED", "PO_ISSUED", "CLOSED", "CANCELLED", "EXPIRED", "CLOSED_NO_AWARD"];
export type ActorRole = "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SYSTEM" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "CUSTOMS_BROKER" | "TRUCKER";
export type ParticipantConstraint = "OWNER" | "COUNTERPARTY" | "OPERATOR" | "OBSERVER" | "ANY";
export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
export interface NotifySpec {
    /** Direct user reference (resolved at runtime from workspace context). */
    target?: "OWNER" | "COUNTERPARTY" | "OPERATOR" | "SELECTED_SUPPLIER" | "ALL_PARTICIPANTS";
    /** Role-wide broadcast (e.g. notify every ADMIN). */
    broadcast?: {
        role: ActorRole;
    };
    type: NotificationType;
    titleKey: string;
}
export interface RfqTransition {
    from: RfqState | "*";
    to: RfqState;
    action: RfqAction;
    allowedRoles: ActorRole[];
    requiredParticipant?: ParticipantConstraint;
    requiresReason?: boolean;
    auditEvent: string;
    /** Symbolic preconditions; actual functions live in rfq.preconditions.ts. */
    preconditions?: string[];
    notifyRecipients: NotifySpec[];
}
export declare const RFQ_TRANSITIONS: RfqTransition[];
/** Base + split-award transitions (split appended to avoid circular init). */
export declare const RFQ_ALL_TRANSITIONS: RfqTransition[];
export declare const RFQ_TERMINAL_STATES: RfqState[];
/** Award-phase states where line-item awards and supplier PO spawn are active. */
export declare const RFQ_SPLIT_AWARD_STATES: RfqState[];
export declare function isRfqTerminal(state: RfqState): boolean;
export declare function findRfqTransition(from: RfqState, action: RfqAction): RfqTransition | undefined;
