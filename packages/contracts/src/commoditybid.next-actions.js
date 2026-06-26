// Sprint 9B — CommodityBid auction next-action engine
import { COMMODITYBID_TRANSITIONS, isCommodityBidTerminal, } from "./commoditybid.fsm";
const LABELS = {
    schedule_auction: { label: "Schedule Auction", description: "Set auction date, duration, and invite suppliers", variant: "primary" },
    cancel_bid: { label: "Cancel Auction", description: "Cancel this CommodityBid for all participants", variant: "destructive", confirm: "Cancel this auction?" },
    supplier_accept_invitation: { label: "Accept Invitation", description: "Confirm participation in the scheduled auction", variant: "primary" },
    supplier_decline_invitation: { label: "Decline Invitation", description: "Decline auction participation", variant: "destructive" },
    supplier_join_auction: { label: "Join Auction", description: "Enter the live auction room", variant: "primary" },
    submit_bid_lot: { label: "Submit Bid", description: "Submit a live bid — must beat the current lowest", variant: "primary" },
    revise_bid_lot: { label: "Improve Bid", description: "Lower your bid to take the lead", variant: "primary" },
    withdraw_bid_lot: { label: "Withdraw Bid", description: "Withdraw your current bid", variant: "destructive" },
    approve_winner: { label: "Approve Winner", description: "Approve the automatically identified lowest valid bid", variant: "primary" },
    reject_result: { label: "Reject Result", description: "Reject the auction outcome", variant: "destructive" },
    spawn_orders: { label: "Start Order Execution", description: "Spawn PO and order workspaces", variant: "primary" },
    post_clarification: { label: "Post Clarification", description: "Public Q&A during the auction", variant: "secondary" },
};
export function computeCommodityBidNextActions(ctx) {
    if (isCommodityBidTerminal(ctx.state))
        return [];
    return COMMODITYBID_TRANSITIONS
        .filter((t) => t.from === ctx.state)
        .filter((t) => !t.allowedRoles.every((r) => r === "SYSTEM"))
        .filter((t) => t.allowedRoles.includes(ctx.actorRole))
        .filter((t) => satisfiesParticipantConstraint(t, ctx))
        .filter((t) => satisfiesSemanticConstraint(t, ctx))
        .map(toNextAction)
        .filter((a) => a.label !== "(system)");
}
function satisfiesParticipantConstraint(t, ctx) {
    if (ctx.actorRole === "ADMIN")
        return true;
    switch (t.requiredParticipant) {
        case "OWNER": return ctx.isOwner;
        case "COUNTERPARTY": return ctx.isCounterparty;
        case "ANY": return ctx.isOwner || ctx.isCounterparty;
        case undefined: return true;
        default: return false;
    }
}
function satisfiesSemanticConstraint(t, ctx) {
    switch (t.action) {
        case "submit_bid_lot":
            return ctx.hasActiveBidOnAnyLot !== true;
        case "revise_bid_lot":
        case "withdraw_bid_lot":
            return ctx.hasActiveBidOnAnyLot === true;
        case "spawn_orders":
            return ctx.state === "APPROVED";
        default:
            return true;
    }
}
function toNextAction(t) {
    const meta = LABELS[t.action] ?? { label: t.action, description: "", variant: "secondary" };
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
//# sourceMappingURL=commoditybid.next-actions.js.map