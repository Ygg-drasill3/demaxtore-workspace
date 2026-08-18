export type CommodityBidState = "BID_DRAFT" | "SCHEDULED" | "INVITING_SUPPLIERS" | "READY_TO_START" | "LIVE" | "CLOSED" | "WINNER_IDENTIFIED" | "AWAITING_BUYER_APPROVAL" | "APPROVED" | "REJECTED" | "ORDERS_SPAWNED" | "CANCELLED" | "EXPIRED" | "CLOSED_NO_AWARD";
export type CommodityBidAction = "create_bid" | "edit_bid_draft" | "add_lot" | "edit_lot" | "remove_lot" | "schedule_auction" | "cancel_bid" | "start_invitations" | "invitations_complete" | "supplier_view_invitation" | "supplier_accept_invitation" | "supplier_decline_invitation" | "supplier_join_auction" | "auction_started" | "submit_bid_lot" | "revise_bid_lot" | "withdraw_bid_lot" | "auction_warning_5min" | "auction_warning_1min" | "auction_closed" | "auction_closed_no_bids" | "winner_selected" | "close_without_award" | "require_buyer_approval" | "approve_winner" | "reject_result" | "spawn_orders" | "post_clarification" | "add_observer" | "remove_observer";
export type ActorRole = "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SYSTEM" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "CUSTOMS_BROKER" | "TRUCKER";
export type ParticipantConstraint = "OWNER" | "COUNTERPARTY" | "OPERATOR" | "OBSERVER" | "ANY";
export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
export interface NotifySpec {
    target?: "OWNER" | "COUNTERPARTY" | "OPERATOR" | "SELECTED_SUPPLIER" | "ALL_PARTICIPANTS";
    broadcast?: {
        role: ActorRole;
    };
    type: NotificationType;
    titleKey: string;
}
export interface CommodityBidTransition {
    from: CommodityBidState | "*";
    to: CommodityBidState;
    action: CommodityBidAction;
    allowedRoles: ActorRole[];
    requiredParticipant?: ParticipantConstraint;
    requiresReason?: boolean;
    auditEvent: string;
    preconditions?: string[];
    notifyRecipients: NotifySpec[];
}
export declare const COMMODITYBID_TERMINAL_STATES: readonly CommodityBidState[];
export declare function isCommodityBidTerminal(state: CommodityBidState): boolean;
export declare const COMMODITYBID_TRANSITIONS: CommodityBidTransition[];
export declare function findCommodityBidTransition(from: CommodityBidState, action: CommodityBidAction): CommodityBidTransition | undefined;
/** Auction funnel states for Control Tower / analytics. */
export declare const COMMODITYBID_FUNNEL_STATES: readonly CommodityBidState[];
