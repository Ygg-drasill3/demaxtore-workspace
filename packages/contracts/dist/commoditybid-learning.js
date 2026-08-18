/** First Trade Success checklist for CommodityBid (content / education only). */
export const CommodityBidOnboardingStep = [
    "create_commoditybid",
    "auction_scheduled",
    "suppliers_invited",
    "auction_completed",
    "winner_identified",
    "buyer_approval",
    "order_created",
];
export const COMMODITYBID_STEP_LABELS = {
    create_commoditybid: "Create CommodityBid",
    auction_scheduled: "Auction scheduled",
    suppliers_invited: "Suppliers invited",
    auction_completed: "Auction completed",
    winner_identified: "Winner identified",
    buyer_approval: "Buyer approval",
    order_created: "Order created",
};
export const COMMODITYBID_STEP_DESCRIPTIONS = {
    create_commoditybid: "Define commodity lots and auction requirements.",
    auction_scheduled: "The system schedules the auction window automatically.",
    suppliers_invited: "Qualified suppliers receive invitations to compete.",
    auction_completed: "The auction closes on schedule when the window ends.",
    winner_identified: "The lowest valid bid is determined automatically.",
    buyer_approval: "Review the winning result and approve execution.",
    order_created: "PO and order workspaces begin after approval.",
};
/** Expanded Learning Center body for CommodityBid. */
export const COMMODITYBID_LEARNING = {
    summary: "CommodityBid is a competitive reverse-auction engine for commodity procurement. Buyers schedule auctions; suppliers compete in real time; the lowest valid bid wins after the auction closes.",
    whatIs: "CommodityBid is a competitive reverse-auction engine for commodity procurement.",
    howItWorks: [
        { step: "Create Bid", detail: "Buyer defines commodity lots and auction requirements." },
        { step: "Schedule Auction", detail: "The system schedules the auction window." },
        { step: "Invite Suppliers", detail: "Qualified suppliers are invited to participate." },
        { step: "Live Bidding", detail: "Auction opens automatically; suppliers submit live bids." },
        { step: "Lowest Valid Bid Wins", detail: "When the auction closes, the lowest valid bid wins." },
        { step: "Buyer Approval", detail: "Buyer reviews the winning result and approves execution." },
        { step: "Order Execution", detail: "PO and order workspaces begin after approval." },
    ],
    buyerRole: [
        "Create auction requirements",
        "Review winning result",
        "Approve execution",
    ],
    supplierRole: [
        "Join auction",
        "Submit bids",
        "Compete in real time",
        "Manage awarded orders",
    ],
    automatic: [
        "Auction scheduling",
        "Countdown management",
        "Auction closing",
        "Winner determination (lowest valid bid)",
        "Participant notifications",
    ],
};
/** Product tour steps — auction model (max 5 per role segment). */
export const COMMODITYBID_TOUR_BUYER = [
    {
        id: "cb-tour-create",
        title: "Create auction",
        body: "Define commodity lots and schedule a reverse auction — no manual supplier comparison.",
        route: "/buyer/commoditybid/new",
    },
    {
        id: "cb-tour-timer",
        title: "Auction timer",
        body: "The platform opens and closes the auction automatically on schedule.",
        route: "/buyer/commoditybid",
    },
    {
        id: "cb-tour-live",
        title: "Live bidding",
        body: "Watch supplier participation and real-time bid activity during the auction window.",
        route: "/buyer/commoditybid",
    },
    {
        id: "cb-tour-winner",
        title: "Automatic winner",
        body: "When the auction closes, the lowest valid bid is identified — no manual award table.",
        route: "/buyer/commoditybid",
    },
    {
        id: "cb-tour-approve",
        title: "Buyer approval",
        body: "Review the winning result and approve execution to start PO / order flow.",
        route: "/buyer/orders",
    },
];
/** Guided onboarding actions (Phase 2 — buyer-facing card). */
export const COMMODITYBID_GUIDED_ACTIONS = [
    { label: "Create auction", detail: "Define commodity lots and schedule a reverse auction." },
    { label: "Monitor supplier participation", detail: "Watch invited suppliers join before and during the live window." },
    { label: "Watch live bidding", detail: "Follow real-time bid activity until the auction closes automatically." },
    { label: "Review winning result", detail: "The lowest valid bid is identified when the auction ends." },
    { label: "Approve order execution", detail: "Confirm the winning supplier and start PO / order flow." },
];
export const COMMODITYBID_TOUR_SUPPLIER = [
    {
        id: "cb-tour-invite",
        title: "Auction invitation",
        body: "Accept invitations to scheduled commodity reverse auctions.",
        route: "/supplier/commoditybid",
    },
    {
        id: "cb-tour-bid",
        title: "Live bidding",
        body: "Submit and revise bids while the auction is live — compete in real time.",
        route: "/supplier/commoditybid",
    },
    {
        id: "cb-tour-result",
        title: "Winning result",
        body: "If your bid is the lowest valid offer when the auction closes, you are identified as the winner.",
        route: "/supplier/orders",
    },
    {
        id: "cb-tour-orders",
        title: "Order execution",
        body: "After buyer approval, manage production and delivery on spawned order workspaces.",
        route: "/supplier/orders",
    },
];
/** Contextual workspace guidance by auction stage (content layer). */
export function commodityBidWorkspaceGuidance(state) {
    const map = {
        BID_DRAFT: {
            headline: "Create your auction",
            body: "Define commodity lots, auction schedule, and suppliers to invite.",
        },
        SCHEDULED: {
            headline: "Auction scheduled",
            body: "Suppliers will be invited automatically before the live window opens.",
        },
        INVITING_SUPPLIERS: {
            headline: "Auction scheduled",
            body: "Suppliers are being invited.",
        },
        READY_TO_START: {
            headline: "Ready to start",
            body: "Invitations are complete. The auction opens automatically at the scheduled time.",
        },
        LIVE: {
            headline: "Auction is live",
            body: "Suppliers are competing in real time. The lowest valid bid updates automatically.",
        },
        CLOSED: {
            headline: "Auction closed",
            body: "Lowest valid bid identified.",
        },
        WINNER_IDENTIFIED: {
            headline: "Winner identified",
            body: "The system selected the lowest valid bid. Awaiting your approval.",
        },
        AWAITING_BUYER_APPROVAL: {
            headline: "Review winning result",
            body: "Approve or reject the automatically identified winning bid.",
        },
        APPROVED: {
            headline: "Approved",
            body: "Start order execution to spawn PO and order workspaces.",
        },
        ORDERS_SPAWNED: {
            headline: "Order execution",
            body: "Order workspaces are active — track production and shipment.",
        },
        REJECTED: {
            headline: "Result rejected",
            body: "You rejected the auction outcome. Schedule a new auction if needed.",
        },
        CANCELLED: {
            headline: "Auction cancelled",
            body: "This CommodityBid was cancelled. Create a new auction if procurement continues.",
        },
        EXPIRED: {
            headline: "Auction expired",
            body: "The auction window ended without a completed flow. Review timeline events for details.",
        },
        CLOSED_NO_AWARD: {
            headline: "Closed without winner",
            body: "No valid winning bid was confirmed. You may schedule a new auction.",
        },
    };
    return map[state] ?? {
        headline: "Monitor auction",
        body: "Track auction milestones and participant activity in this workspace.",
    };
}
/** Map FSM state → checklist steps completed (visual / educational). */
export function commodityBidChecklistProgress(state) {
    const completed = ["create_commoditybid"];
    const s = state;
    if (s !== "BID_DRAFT")
        completed.push("auction_scheduled");
    if (["INVITING_SUPPLIERS", "READY_TO_START", "LIVE", "CLOSED", "WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL", "APPROVED", "ORDERS_SPAWNED"].includes(s)) {
        completed.push("suppliers_invited");
    }
    if (["CLOSED", "WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL", "APPROVED", "ORDERS_SPAWNED"].includes(s)) {
        completed.push("auction_completed");
    }
    if (["WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL", "APPROVED", "ORDERS_SPAWNED"].includes(s)) {
        completed.push("winner_identified");
    }
    if (["APPROVED", "ORDERS_SPAWNED"].includes(s)) {
        completed.push("buyer_approval");
    }
    if (s === "ORDERS_SPAWNED")
        completed.push("order_created");
    return [...new Set(completed)];
}
