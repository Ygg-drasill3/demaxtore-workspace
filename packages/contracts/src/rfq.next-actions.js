// =============================================================================
// DeMaxtore — RFQ Next Action Engine (pure function, FSM-derived)
// Destination: packages/contracts/src/rfq.next-actions.ts
//
// CONTRACT: This is the ONLY source of CTA buttons in the RFQ UI.
// Frontend `<RfqNextActions />` simply maps over this function's output.
// Hardcoded JSX buttons for specific (state × role) pairs are forbidden.
// =============================================================================
import { RFQ_TRANSITIONS, isRfqTerminal, } from "./rfq.fsm";
// -----------------------------------------------------------------------------
// Human-readable labels keyed by RfqAction. Single source of UI copy.
// -----------------------------------------------------------------------------
const LABELS = {
    create_rfq: { label: "Create RFQ", description: "Start a new sourcing request", variant: "primary" },
    edit_rfq_draft: { label: "Edit Draft", description: "Update RFQ details before submission", variant: "secondary" },
    submit_rfq: { label: "Submit RFQ", description: "Send to DeMaxtore for triage", variant: "primary" },
    withdraw_rfq: { label: "Withdraw", description: "Cancel before admin triage", variant: "destructive", confirm: "This will withdraw your RFQ. Continue?" },
    assign_suppliers: { label: "Assign Suppliers", description: "Select suppliers to invite", variant: "primary" },
    add_more_suppliers: { label: "Add Suppliers", description: "Invite additional suppliers", variant: "secondary" },
    remove_supplier: { label: "Remove Supplier", description: "Remove a supplier who hasn't quoted yet", variant: "secondary" },
    reject_rfq: { label: "Reject RFQ", description: "Return RFQ to the buyer with reason", variant: "destructive" },
    publish_rfq: { label: "Publish RFQ", description: "Open the RFQ to assigned suppliers", variant: "primary" },
    revise_rejected_rfq: { label: "Revise & Re-submit", description: "Fix issues and submit again", variant: "primary" },
    submit_quotation: { label: "Submit Quotation", description: "Send your bid to the buyer", variant: "primary" },
    revise_quotation: { label: "Revise Quotation", description: "Update your existing bid", variant: "secondary" },
    withdraw_quotation: { label: "Withdraw Quotation", description: "Remove your bid before deadline", variant: "destructive" },
    post_clarification: { label: "Post Question", description: "Ask a clarification", variant: "secondary" },
    extend_deadline: { label: "Extend Deadline", description: "Give suppliers more time (max 2× / +14 days)", variant: "secondary" },
    close_quotations_early: { label: "Close Quotations", description: "Stop accepting new quotations now", variant: "secondary" },
    deadline_reached: { label: "(system)", description: "", variant: "secondary" },
    deadline_reached_no_bids: { label: "(system)", description: "", variant: "secondary" },
    start_evaluation: { label: "Start Evaluation", description: "Begin reviewing supplier quotations", variant: "primary" },
    reopen_quotations: { label: "Reopen Quotations", description: "Re-open the RFQ (Admin only, requires reason + new deadline)", variant: "secondary" },
    select_supplier: { label: "Select Supplier", description: "Pick the winning quotation", variant: "primary" },
    revert_selection: { label: "Revert Selection", description: "Undo selection before requesting proforma", variant: "secondary" },
    close_without_award: { label: "Close — No Award", description: "End the RFQ without selecting any supplier", variant: "destructive" },
    request_proforma: { label: "Request Proforma", description: "Ask supplier for proforma invoice (5 BD SLA)", variant: "primary" },
    submit_proforma: { label: "Submit Proforma", description: "Upload proforma invoice file", variant: "primary" },
    decline_proforma: { label: "Decline", description: "Decline to provide proforma (with reason)", variant: "destructive" },
    proforma_sla_expired: { label: "(system)", description: "", variant: "secondary" },
    approve_proforma: { label: "Approve Proforma", description: "Approve and proceed to PO", variant: "primary" },
    reject_proforma: { label: "Request Revision", description: "Send proforma back to supplier with comments", variant: "secondary" },
    issue_po: { label: "Issue PO", description: "Issue the Purchase Order — creates an Order workspace", variant: "primary" },
    sync_order_closed: { label: "(system)", description: "", variant: "secondary" },
    cancel_rfq: { label: "Cancel RFQ", description: "Permanently cancel this RFQ (requires reason)", variant: "destructive", confirm: "This will cancel the RFQ for all participants. Continue?" },
    add_observer: { label: "Add Observer", description: "Invite a read-only observer", variant: "secondary" },
    remove_observer: { label: "Remove Observer", description: "Remove an observer", variant: "secondary" },
};
// -----------------------------------------------------------------------------
// Core engine — filter RFQ_TRANSITIONS by current context.
// -----------------------------------------------------------------------------
export function computeRfqNextActions(ctx) {
    // Terminal states have no actions
    if (isRfqTerminal(ctx.state))
        return [];
    return RFQ_TRANSITIONS
        .filter((t) => t.from === ctx.state || t.from === "*")
        // Hide SYSTEM transitions — they aren't user-facing CTAs
        .filter((t) => !t.allowedRoles.every((r) => r === "SYSTEM"))
        .filter((t) => t.allowedRoles.includes(ctx.actorRole))
        .filter((t) => satisfiesParticipantConstraint(t, ctx))
        .filter((t) => satisfiesSemanticConstraint(t, ctx))
        .map(toNextAction)
        .filter((a) => a.label !== "(system)");
}
function satisfiesParticipantConstraint(t, ctx) {
    // ADMIN bypasses participant requirement (RFQ FSM §5.4)
    if (ctx.actorRole === "ADMIN")
        return true;
    switch (t.requiredParticipant) {
        case "OWNER": return ctx.isOwner;
        case "COUNTERPARTY": return ctx.isCounterparty;
        case "OPERATOR": return false; // OPERATOR is ADMIN-only; admins returned true above
        case "ANY": return ctx.isOwner || ctx.isCounterparty;
        case undefined: return true;
        default: return false;
    }
}
function satisfiesSemanticConstraint(t, ctx) {
    // Domain-specific gating that can't be expressed in the FSM table alone.
    switch (t.action) {
        case "create_rfq":
            // Workspace CTAs are rendered inside an existing workspace; "Create RFQ"
            // belongs to the list page's primary CTA, never inside a workspace.
            return false;
        case "submit_quotation":
            // Only show if supplier hasn't quoted yet
            return ctx.hasQuotationFromUser !== true;
        case "revise_quotation":
        case "withdraw_quotation":
            // Only show if supplier has an existing quotation
            return ctx.hasQuotationFromUser === true;
        case "submit_proforma":
        case "decline_proforma":
            // Only the selected supplier sees these in PROFORMA_REQUESTED
            return ctx.isSelectedSupplier === true;
        case "add_observer":
        case "remove_observer":
            // Hidden from primary CTA panel — surfaced in the participants management UI
            return false;
        default:
            return true;
    }
}
function toNextAction(t) {
    const meta = LABELS[t.action];
    return {
        action: t.action,
        label: meta.label,
        description: meta.description,
        variant: meta.variant,
        requiresReason: t.requiresReason ?? false,
        requiresConfirmation: !!meta.confirm || t.requiresReason === true || meta.variant === "destructive",
        confirmation: meta.confirm,
    };
}
//# sourceMappingURL=rfq.next-actions.js.map