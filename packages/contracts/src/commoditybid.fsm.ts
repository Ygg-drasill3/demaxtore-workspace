// =============================================================================
// DeMaxtore — CommodityBid Auction Engine FSM (Sprint 9B)
// Scheduled reverse-auction: automatic lowest-bid winner + buyer approval.
// =============================================================================

export type CommodityBidState =
  | "BID_DRAFT"
  | "SCHEDULED"
  | "INVITING_SUPPLIERS"
  | "READY_TO_START"
  | "LIVE"
  | "CLOSED"
  | "WINNER_IDENTIFIED"
  | "AWAITING_BUYER_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ORDERS_SPAWNED"
  | "CANCELLED"
  | "EXPIRED"
  | "CLOSED_NO_AWARD";

export type CommodityBidAction =
  | "create_bid"
  | "edit_bid_draft"
  | "add_lot"
  | "edit_lot"
  | "remove_lot"
  | "schedule_auction"
  | "cancel_bid"
  | "start_invitations"
  | "invitations_complete"
  | "supplier_view_invitation"
  | "supplier_accept_invitation"
  | "supplier_decline_invitation"
  | "supplier_join_auction"
  | "auction_started"
  | "submit_bid_lot"
  | "revise_bid_lot"
  | "withdraw_bid_lot"
  | "auction_warning_5min"
  | "auction_warning_1min"
  | "auction_closed"
  | "auction_closed_no_bids"
  | "winner_selected"
  | "close_without_award"
  | "require_buyer_approval"
  | "approve_winner"
  | "reject_result"
  | "spawn_orders"
  | "post_clarification"
  | "add_observer"
  | "remove_observer";

export type ActorRole =
  | "BUYER"
  | "SUPPLIER"
  | "ADMIN"
  | "SALES_CONTROL"
  | "SYSTEM"
  | "SUPER_ADMIN"
  | "OPS_MANAGER"
  | "LOGISTICS_OPERATOR"
  | "FINANCE_OPERATOR"
  | "DOCUMENT_CONTROLLER"
  | "FORWARDER";
export type ParticipantConstraint = "OWNER" | "COUNTERPARTY" | "OPERATOR" | "OBSERVER" | "ANY";
export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface NotifySpec {
  target?: "OWNER" | "COUNTERPARTY" | "OPERATOR" | "SELECTED_SUPPLIER" | "ALL_PARTICIPANTS";
  broadcast?: { role: ActorRole };
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

export const COMMODITYBID_TERMINAL_STATES: readonly CommodityBidState[] = [
  "ORDERS_SPAWNED", "REJECTED", "CANCELLED", "EXPIRED", "CLOSED_NO_AWARD",
];

export function isCommodityBidTerminal(state: CommodityBidState): boolean {
  return COMMODITYBID_TERMINAL_STATES.includes(state);
}

export const COMMODITYBID_TRANSITIONS: CommodityBidTransition[] = [
  { from: "*", to: "BID_DRAFT", action: "create_bid",
    allowedRoles: ["BUYER"], auditEvent: "commoditybid.created", notifyRecipients: [] },

  { from: "BID_DRAFT", to: "BID_DRAFT", action: "edit_bid_draft",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", auditEvent: "commoditybid.draft.edited", notifyRecipients: [] },
  { from: "BID_DRAFT", to: "BID_DRAFT", action: "add_lot",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", preconditions: ["assertLotFieldsValid"],
    auditEvent: "commoditybid.lot.added", notifyRecipients: [] },
  { from: "BID_DRAFT", to: "BID_DRAFT", action: "edit_lot",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", preconditions: ["assertLotBelongsToWorkspace"],
    auditEvent: "commoditybid.lot.edited", notifyRecipients: [] },
  { from: "BID_DRAFT", to: "BID_DRAFT", action: "remove_lot",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", preconditions: ["assertAtLeastOneLotRemains"],
    auditEvent: "commoditybid.lot.removed", notifyRecipients: [] },

  { from: "BID_DRAFT", to: "SCHEDULED", action: "schedule_auction",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", preconditions: ["assertScheduleAuctionPreconditions"],
    auditEvent: "commoditybid.scheduled",
    notifyRecipients: [{ broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "commoditybid.scheduled" }] },

  { from: "BID_DRAFT", to: "CANCELLED", action: "cancel_bid",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
    auditEvent: "commoditybid.cancelled", notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "commoditybid.cancelled" }] },

  { from: "SCHEDULED", to: "INVITING_SUPPLIERS", action: "start_invitations",
    allowedRoles: ["SYSTEM"], auditEvent: "commoditybid.invitation.sent",
    notifyRecipients: [{ target: "COUNTERPARTY", type: "INFO", titleKey: "commoditybid.invitation.sent" }] },

  { from: "SCHEDULED", to: "CANCELLED", action: "cancel_bid",
    allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
    auditEvent: "commoditybid.cancelled", notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "commoditybid.cancelled" }] },

  { from: "INVITING_SUPPLIERS", to: "INVITING_SUPPLIERS", action: "supplier_view_invitation",
    allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY",
    auditEvent: "commoditybid.invitation.viewed", notifyRecipients: [] },
  { from: "INVITING_SUPPLIERS", to: "INVITING_SUPPLIERS", action: "supplier_accept_invitation",
    allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY",
    auditEvent: "commoditybid.invitation.accepted", notifyRecipients: [{ target: "OWNER", type: "INFO", titleKey: "commoditybid.invitation.accepted" }] },
  { from: "INVITING_SUPPLIERS", to: "INVITING_SUPPLIERS", action: "supplier_decline_invitation",
    allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY", requiresReason: true,
    auditEvent: "commoditybid.invitation.declined", notifyRecipients: [{ target: "OWNER", type: "WARNING", titleKey: "commoditybid.invitation.declined" }] },

  { from: "INVITING_SUPPLIERS", to: "READY_TO_START", action: "invitations_complete",
    allowedRoles: ["SYSTEM"], auditEvent: "commoditybid.invitations.complete",
    notifyRecipients: [{ target: "OWNER", type: "INFO", titleKey: "commoditybid.ready_to_start" }] },

  { from: "READY_TO_START", to: "READY_TO_START", action: "supplier_join_auction",
    allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY",
    auditEvent: "commoditybid.supplier.joined", notifyRecipients: [] },

  { from: "READY_TO_START", to: "LIVE", action: "auction_started",
    allowedRoles: ["SYSTEM"], auditEvent: "commoditybid.started",
    notifyRecipients: [
      { target: "ALL_PARTICIPANTS", type: "SUCCESS", titleKey: "commoditybid.auction.live" },
      { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "commoditybid.auction.live" },
    ] },

  { from: "LIVE", to: "LIVE", action: "submit_bid_lot",
    allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY",
    preconditions: [
      "assertInvitedSupplier", "assertNoExistingBidFromSupplierOnLot",
      "assertBidImprovesLowest", "assertBidCurrencyMatchesWorkspace", "assertDeadlineNotPassed",
    ],
    auditEvent: "commoditybid.bid.submitted",
    notifyRecipients: [{ target: "OWNER", type: "INFO", titleKey: "commoditybid.bid.submitted" }] },

  { from: "LIVE", to: "LIVE", action: "revise_bid_lot",
    allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY",
    preconditions: [
      "assertInvitedSupplier", "assertExistingBidFromSupplierOnLot",
      "assertBidImprovesLowest", "assertBidCurrencyMatchesWorkspace", "assertDeadlineNotPassed",
    ],
    auditEvent: "commoditybid.bid.submitted",
    notifyRecipients: [{ target: "OWNER", type: "INFO", titleKey: "commoditybid.bid.submitted" }] },

  { from: "LIVE", to: "LIVE", action: "withdraw_bid_lot",
    allowedRoles: ["SUPPLIER"], requiredParticipant: "COUNTERPARTY",
    preconditions: ["assertInvitedSupplier", "assertExistingBidFromSupplierOnLot"],
    auditEvent: "commoditybid.bid.withdrawn",
    notifyRecipients: [{ target: "OWNER", type: "WARNING", titleKey: "commoditybid.bid.withdrawn" }] },

  { from: "LIVE", to: "LIVE", action: "auction_warning_5min",
    allowedRoles: ["SYSTEM"], auditEvent: "commoditybid.auction.warning.5min",
    notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "commoditybid.auction.warning.5min" }] },
  { from: "LIVE", to: "LIVE", action: "auction_warning_1min",
    allowedRoles: ["SYSTEM"], auditEvent: "commoditybid.auction.warning.1min",
    notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "commoditybid.auction.warning.1min" }] },

  { from: "LIVE", to: "CLOSED", action: "auction_closed",
    allowedRoles: ["SYSTEM"], preconditions: ["assertHasBids"],
    auditEvent: "commoditybid.closed",
    notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "commoditybid.closed" }] },

  { from: "LIVE", to: "EXPIRED", action: "auction_closed_no_bids",
    allowedRoles: ["SYSTEM"], preconditions: ["assertNoBids"],
    auditEvent: "commoditybid.auction.failed",
    notifyRecipients: [
      { target: "OWNER", type: "WARNING", titleKey: "commoditybid.auction.failed" },
      { broadcast: { role: "ADMIN" }, type: "WARNING", titleKey: "commoditybid.auction.failed" },
    ] },

  { from: "LIVE", to: "CANCELLED", action: "cancel_bid",
    allowedRoles: ["BUYER", "ADMIN"], requiresReason: true,
    auditEvent: "commoditybid.cancelled", notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "WARNING", titleKey: "commoditybid.cancelled" }] },

  { from: "CLOSED", to: "WINNER_IDENTIFIED", action: "winner_selected",
    allowedRoles: ["SYSTEM"], preconditions: ["assertHasValidWinner"],
    auditEvent: "commoditybid.winner.selected",
    notifyRecipients: [
      { target: "OWNER", type: "SUCCESS", titleKey: "commoditybid.winner.selected" },
      { target: "SELECTED_SUPPLIER", type: "SUCCESS", titleKey: "commoditybid.you_won" },
    ] },

  { from: "CLOSED", to: "CLOSED_NO_AWARD", action: "close_without_award",
    allowedRoles: ["SYSTEM"], requiresReason: true,
    auditEvent: "commoditybid.closed.no_award",
    notifyRecipients: [{ target: "OWNER", type: "WARNING", titleKey: "commoditybid.closed.no_award" }] },

  { from: "WINNER_IDENTIFIED", to: "AWAITING_BUYER_APPROVAL", action: "require_buyer_approval",
    allowedRoles: ["SYSTEM"], auditEvent: "commoditybid.approval.required",
    notifyRecipients: [{ target: "OWNER", type: "INFO", titleKey: "commoditybid.approval.required" }] },

  { from: "AWAITING_BUYER_APPROVAL", to: "APPROVED", action: "approve_winner",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER",
    auditEvent: "commoditybid.approved",
    notifyRecipients: [
      { target: "SELECTED_SUPPLIER", type: "SUCCESS", titleKey: "commoditybid.approved" },
      { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "commoditybid.approved" },
    ] },

  { from: "AWAITING_BUYER_APPROVAL", to: "REJECTED", action: "reject_result",
    allowedRoles: ["BUYER"], requiredParticipant: "OWNER", requiresReason: true,
    auditEvent: "commoditybid.rejected",
    notifyRecipients: [
      { target: "SELECTED_SUPPLIER", type: "WARNING", titleKey: "commoditybid.rejected" },
      { broadcast: { role: "ADMIN" }, type: "WARNING", titleKey: "commoditybid.rejected" },
    ] },

  { from: "APPROVED", to: "ORDERS_SPAWNED", action: "spawn_orders",
    allowedRoles: ["BUYER", "SYSTEM"], requiredParticipant: "OWNER",
    preconditions: ["assertWinnerAwardReady", "assertActiveFreightEstimate"],
    auditEvent: "commoditybid.order.spawned",
    notifyRecipients: [
      { target: "SELECTED_SUPPLIER", type: "SUCCESS", titleKey: "commoditybid.order.spawned" },
      { broadcast: { role: "ADMIN" }, type: "INFO", titleKey: "commoditybid.order.spawned" },
    ] },

  { from: "LIVE", to: "LIVE", action: "post_clarification",
    allowedRoles: ["BUYER", "SUPPLIER", "ADMIN"], requiredParticipant: "ANY",
    auditEvent: "commoditybid.clarification.posted",
    notifyRecipients: [{ target: "ALL_PARTICIPANTS", type: "INFO", titleKey: "commoditybid.clarification.posted" }] },

  { from: "BID_DRAFT", to: "BID_DRAFT", action: "add_observer",
    allowedRoles: ["ADMIN"], auditEvent: "workspace.participant.added", notifyRecipients: [] },
  { from: "BID_DRAFT", to: "BID_DRAFT", action: "remove_observer",
    allowedRoles: ["ADMIN"], auditEvent: "workspace.participant.removed", notifyRecipients: [] },
];

export function findCommodityBidTransition(
  from: CommodityBidState,
  action: CommodityBidAction,
): CommodityBidTransition | undefined {
  return COMMODITYBID_TRANSITIONS.find((t) => t.from === from && t.action === action);
}

/** Auction funnel states for Control Tower / analytics. */
export const COMMODITYBID_FUNNEL_STATES: readonly CommodityBidState[] = [
  "SCHEDULED", "INVITING_SUPPLIERS", "READY_TO_START", "LIVE", "CLOSED",
  "WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL", "APPROVED", "ORDERS_SPAWNED",
];
