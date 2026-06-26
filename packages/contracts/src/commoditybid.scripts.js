export const COMMODITYBID_BUYER_SCRIPTS = {
    BID_DRAFT: {
        mood: "action",
        past: "Auction draft created",
        future: "Invite suppliers and schedule the live auction",
        statL: { label: "Lots", value: "{{lotCount}}" },
        statR: { label: "Commodity", value: "{{commodity}}" },
        primaryAction: "invite_suppliers",
        primaryLabel: "Invite suppliers",
    },
    SCHEDULED: {
        mood: "waiting",
        past: "Auction scheduled",
        future: "Suppliers will be invited before the live window opens",
        statL: { label: "Starts in", value: "{{countdown}}" },
        statR: { label: "Lots", value: "{{lotCount}}" },
        primaryAction: null,
    },
    INVITING_SUPPLIERS: {
        mood: "waiting",
        past: "Supplier invitations sent",
        future: "Waiting for manufacturers to join before auction goes live",
        statL: { label: "Joined", value: "{{joinedCount}}" },
        statR: { label: "Starts in", value: "{{countdown}}" },
        primaryAction: null,
    },
    READY_TO_START: {
        mood: "active",
        past: "Manufacturers ready — auction opens soon",
        future: "Live bidding begins when the timer starts",
        statL: { label: "Starts in", value: "{{countdown}}" },
        statR: { label: "Joined", value: "{{joinedCount}}" },
        primaryAction: null,
    },
    LIVE: {
        mood: "active",
        past: "Auction is live — {{joinedCount}} manufacturers competing",
        future: "Monitor bids in real time — lowest bid wins when timer ends",
        statL: { label: "Time left", value: "{{countdown}}" },
        statR: { label: "Lowest bid", value: "{{lowestBid}}" },
        primaryAction: null,
    },
    WINNER_IDENTIFIED: {
        mood: "action",
        past: "Winner identified at {{lowestBid}}",
        future: "Approve the winning manufacturer to proceed to order creation",
        statL: { label: "Winner", value: "{{winnerName}}" },
        statR: { label: "Savings", value: "{{savings}}" },
        primaryAction: "approve_winner",
        primaryLabel: "Approve winner",
    },
    AWAITING_BUYER_APPROVAL: {
        mood: "action",
        past: "Winner awaiting your approval",
        future: "Approve to lock the award and spawn purchase orders",
        statL: { label: "Lowest bid", value: "{{lowestBid}}" },
        statR: { label: "Action required", value: "Your approval" },
        primaryAction: "approve_winner",
        primaryLabel: "Approve winner",
    },
    ORDERS_SPAWNED: {
        mood: "terminal-plus",
        past: "Orders created from auction award",
        future: "Open order workspaces to begin production and freight coordination",
        statL: { label: "Orders", value: "{{orderCount}}" },
        statR: { label: "Status", value: "Execution started" },
        primaryAction: null,
        fallbackPrimary: { label: "Open first order", href: "{{firstOrderUrl}}", tone: "secondary" },
    },
    CLOSED: {
        mood: "terminal-plus",
        past: "Auction closed",
        future: "Review final results and archive",
        statL: { label: "Lowest bid", value: "{{lowestBid}}" },
        statR: { label: "Status", value: "Closed" },
        primaryAction: null,
    },
};
export function commoditybidScriptFor(state, role) {
    if (role === "BUYER")
        return COMMODITYBID_BUYER_SCRIPTS[state];
    return undefined;
}
//# sourceMappingURL=commoditybid.scripts.js.map