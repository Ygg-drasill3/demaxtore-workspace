/** First Trade Success checklist for CommodityBid (content / education only). */
export declare const CommodityBidOnboardingStep: readonly ["create_commoditybid", "auction_scheduled", "suppliers_invited", "auction_completed", "winner_identified", "buyer_approval", "order_created"];
export type CommodityBidOnboardingStep = (typeof CommodityBidOnboardingStep)[number];
export declare const COMMODITYBID_STEP_LABELS: Record<CommodityBidOnboardingStep, string>;
export declare const COMMODITYBID_STEP_DESCRIPTIONS: Record<CommodityBidOnboardingStep, string>;
/** Expanded Learning Center body for CommodityBid. */
export declare const COMMODITYBID_LEARNING: {
    readonly summary: "CommodityBid is a competitive reverse-auction engine for commodity procurement. Buyers schedule auctions; suppliers compete in real time; the lowest valid bid wins after the auction closes.";
    readonly whatIs: "CommodityBid is a competitive reverse-auction engine for commodity procurement.";
    readonly howItWorks: readonly [{
        readonly step: "Create Bid";
        readonly detail: "Buyer defines commodity lots and auction requirements.";
    }, {
        readonly step: "Schedule Auction";
        readonly detail: "The system schedules the auction window.";
    }, {
        readonly step: "Invite Suppliers";
        readonly detail: "Qualified suppliers are invited to participate.";
    }, {
        readonly step: "Live Bidding";
        readonly detail: "Auction opens automatically; suppliers submit live bids.";
    }, {
        readonly step: "Lowest Valid Bid Wins";
        readonly detail: "When the auction closes, the lowest valid bid wins.";
    }, {
        readonly step: "Buyer Approval";
        readonly detail: "Buyer reviews the winning result and approves execution.";
    }, {
        readonly step: "Order Execution";
        readonly detail: "PO and order workspaces begin after approval.";
    }];
    readonly buyerRole: readonly ["Create auction requirements", "Review winning result", "Approve execution"];
    readonly supplierRole: readonly ["Join auction", "Submit bids", "Compete in real time", "Manage awarded orders"];
    readonly automatic: readonly ["Auction scheduling", "Countdown management", "Auction closing", "Winner determination (lowest valid bid)", "Participant notifications"];
};
/** Product tour steps — auction model (max 5 per role segment). */
export declare const COMMODITYBID_TOUR_BUYER: readonly [{
    readonly id: "cb-tour-create";
    readonly title: "Create auction";
    readonly body: "Define commodity lots and schedule a reverse auction — no manual supplier comparison.";
    readonly route: "/buyer/commoditybid/new";
}, {
    readonly id: "cb-tour-timer";
    readonly title: "Auction timer";
    readonly body: "The platform opens and closes the auction automatically on schedule.";
    readonly route: "/buyer/commoditybid";
}, {
    readonly id: "cb-tour-live";
    readonly title: "Live bidding";
    readonly body: "Watch supplier participation and real-time bid activity during the auction window.";
    readonly route: "/buyer/commoditybid";
}, {
    readonly id: "cb-tour-winner";
    readonly title: "Automatic winner";
    readonly body: "When the auction closes, the lowest valid bid is identified — no manual award table.";
    readonly route: "/buyer/commoditybid";
}, {
    readonly id: "cb-tour-approve";
    readonly title: "Buyer approval";
    readonly body: "Review the winning result and approve execution to start PO / order flow.";
    readonly route: "/buyer/orders";
}];
/** Guided onboarding actions (Phase 2 — buyer-facing card). */
export declare const COMMODITYBID_GUIDED_ACTIONS: readonly [{
    readonly label: "Create auction";
    readonly detail: "Define commodity lots and schedule a reverse auction.";
}, {
    readonly label: "Monitor supplier participation";
    readonly detail: "Watch invited suppliers join before and during the live window.";
}, {
    readonly label: "Watch live bidding";
    readonly detail: "Follow real-time bid activity until the auction closes automatically.";
}, {
    readonly label: "Review winning result";
    readonly detail: "The lowest valid bid is identified when the auction ends.";
}, {
    readonly label: "Approve order execution";
    readonly detail: "Confirm the winning supplier and start PO / order flow.";
}];
export declare const COMMODITYBID_TOUR_SUPPLIER: readonly [{
    readonly id: "cb-tour-invite";
    readonly title: "Auction invitation";
    readonly body: "Accept invitations to scheduled commodity reverse auctions.";
    readonly route: "/supplier/commoditybid";
}, {
    readonly id: "cb-tour-bid";
    readonly title: "Live bidding";
    readonly body: "Submit and revise bids while the auction is live — compete in real time.";
    readonly route: "/supplier/commoditybid";
}, {
    readonly id: "cb-tour-result";
    readonly title: "Winning result";
    readonly body: "If your bid is the lowest valid offer when the auction closes, you are identified as the winner.";
    readonly route: "/supplier/orders";
}, {
    readonly id: "cb-tour-orders";
    readonly title: "Order execution";
    readonly body: "After buyer approval, manage production and delivery on spawned order workspaces.";
    readonly route: "/supplier/orders";
}];
export interface CommodityBidStageGuidance {
    headline: string;
    body: string;
}
/** Contextual workspace guidance by auction stage (content layer). */
export declare function commodityBidWorkspaceGuidance(state: string): CommodityBidStageGuidance;
/** Map FSM state → checklist steps completed (visual / educational). */
export declare function commodityBidChecklistProgress(state: string): CommodityBidOnboardingStep[];
