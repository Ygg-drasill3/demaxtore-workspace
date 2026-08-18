import { ORDER_TRANSITIONS, isOrderTerminal, isOrderActive, } from "./order.fsm.js";
import { isProductionCompletePercent } from "./order.production.js";
const LABELS = {
    supplier_confirm_order: { label: "Confirm Order", description: "Accept commercial terms and planned timeline", variant: "primary" },
    start_production: { label: "Start Production", description: "Begin manufacturing for this order", variant: "primary" },
    report_production_progress: { label: "Update Production", description: "Report progress — below 100% the order stays in production; 100% completes it", variant: "secondary" },
    mark_production_completed: { label: "Complete Production", description: "Mark all goods produced", variant: "primary" },
    request_inspection: { label: "Request Inspection", description: "Schedule Demaxtore Inspection", variant: "primary" },
    skip_inspection: { label: "Skip Inspection", description: "Proceed directly to freight", variant: "secondary" },
    record_inspection_result: { label: "Complete Inspection", description: "Record PASS/FAIL inspection report", variant: "primary" },
    proceed_to_freight: { label: "Request Freight", description: "Proceed to freight booking", variant: "primary" },
    book_shipment: { label: "Book Shipment", description: "Confirm carrier and B/L", variant: "primary" },
    mark_departed: { label: "Mark Departed", description: "Vessel left origin port", variant: "primary" },
    update_eta: { label: "Update ETA", description: "Revise estimated arrival", variant: "secondary" },
    mark_arrived: { label: "Arrived at Port", description: "Vessel reached destination port", variant: "primary" },
    mark_partially_delivered: { label: "Partial Delivery", description: "Confirm partial delivery received", variant: "primary" },
    mark_delivered: { label: "Confirm Delivery", description: "Buyer confirms goods received", variant: "primary" },
    reject_order: { label: "Reject Order", description: "Reject order with reason", variant: "destructive", confirm: "Reject this order?" },
    close_order: { label: "Close Order", description: "Finalize settlement and close workspace", variant: "primary", confirm: "Close this order permanently?" },
    open_dispute: { label: "Open Dispute", description: "Escalate an issue", variant: "destructive" },
    resolve_dispute_close: { label: "Resolve & Close", description: "Close order after dispute resolution", variant: "primary", confirm: "Close this order after resolving the dispute?" },
    resolve_dispute_cancel: { label: "Resolve & Cancel", description: "Cancel order after dispute resolution", variant: "destructive", confirm: "Cancel this order after resolving the dispute?" },
    cancel_order: { label: "Cancel Order", description: "Cancel with reason", variant: "destructive" },
    upload_document: { label: "Upload Document", description: "Add PO, PI, inspection, or freight doc", variant: "secondary" },
    post_clarification: { label: "Post Message", description: "Message all participants", variant: "secondary" },
};
function satisfiesParticipant(t, ctx) {
    if (!t.requiredParticipant)
        return true;
    if (ctx.actorRole === "ADMIN" || ctx.actorRole === "SYSTEM")
        return true;
    if (t.requiredParticipant === "OWNER")
        return ctx.isOwner;
    if (t.requiredParticipant === "COUNTERPARTY")
        return ctx.isCounterparty;
    return true;
}
function satisfiesSemantic(t, ctx) {
    if (t.action === "proceed_to_freight" && ctx.inspectionResult && ctx.inspectionResult !== "PASS")
        return false;
    if (t.preconditions?.includes("assertInspectionPass") && ctx.inspectionResult !== "PASS")
        return false;
    if (t.action === "mark_production_completed" && !isProductionCompletePercent(ctx.productionPercent ?? 0)) {
        return false;
    }
    if (t.preconditions?.includes("assertFreightCoordinationReady") &&
        ctx.freightOfferSelected === false) {
        return false;
    }
    return true;
}
function toNextAction(t) {
    const meta = LABELS[t.action] ?? { label: t.action, description: "", variant: "secondary" };
    return {
        action: t.action,
        label: meta.label,
        description: meta.description,
        variant: meta.variant,
        requiresReason: !!t.requiresReason,
        requiresConfirmation: !!meta.confirm,
        confirmation: meta.confirm,
    };
}
export function computeOrderNextActions(ctx) {
    if (isOrderTerminal(ctx.state))
        return [];
    const candidates = ORDER_TRANSITIONS.filter((t) => {
        if (t.allowedRoles.every((r) => r === "SYSTEM"))
            return false;
        if (!t.allowedRoles.includes(ctx.actorRole))
            return false;
        if (t.from === "ANY_ACTIVE")
            return isOrderActive(ctx.state);
        if (t.from === "*")
            return false;
        return t.from === ctx.state;
    });
    const seen = new Set();
    const out = [];
    for (const t of candidates) {
        if (!satisfiesParticipant(t, ctx))
            continue;
        if (!satisfiesSemantic(t, ctx))
            continue;
        if (!LABELS[t.action])
            continue;
        if (seen.has(t.action))
            continue;
        seen.add(t.action);
        out.push(toNextAction(t));
    }
    return out;
}
