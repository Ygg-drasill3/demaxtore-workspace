export declare const OnboardingRole: readonly ["BUYER", "SUPPLIER", "ADMIN", "SALES_CONTROL"];
export type OnboardingRole = (typeof OnboardingRole)[number];
/** Operator maps to ADMIN in the User.role enum. */
export type OperatorRole = "ADMIN";
export declare const OnboardingStatus: readonly ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "STALLED"];
export type OnboardingStatus = (typeof OnboardingStatus)[number];
export declare const BuyerOnboardingStep: readonly ["create_rfq", "receive_quotation", "select_supplier", "issue_po", "track_shipment", "complete_trade"];
export type BuyerOnboardingStep = (typeof BuyerOnboardingStep)[number];
export declare const BUYER_STEP_LABELS: Record<BuyerOnboardingStep, string>;
export declare const SupplierOnboardingStep: readonly ["receive_invitation", "submit_offer", "accept_order", "upload_documents", "complete_shipment"];
export type SupplierOnboardingStep = (typeof SupplierOnboardingStep)[number];
export declare const SUPPLIER_STEP_LABELS: Record<SupplierOnboardingStep, string>;
export declare const OperatorOnboardingStep: readonly ["monitor_order", "verify_documents", "review_shipment", "close_process"];
export type OperatorOnboardingStep = (typeof OperatorOnboardingStep)[number];
export declare const OPERATOR_STEP_LABELS: Record<OperatorOnboardingStep, string>;
export type OnboardingStep = BuyerOnboardingStep | SupplierOnboardingStep | OperatorOnboardingStep;
export declare const ALL_STEPS_BY_ROLE: Record<OnboardingRole, readonly string[]>;
export declare const TradeMilestone: readonly ["rfq", "po", "production", "shipment", "arrival", "documents", "completed"];
export type TradeMilestone = (typeof TradeMilestone)[number];
export declare const TRADE_MILESTONE_LABELS: Record<TradeMilestone, string>;
export type MilestoneStatus = "done" | "current" | "pending";
export interface TradeMilestoneProgress {
    key: TradeMilestone;
    label: string;
    status: MilestoneStatus;
}
export declare const TOUR_STEPS_BY_ROLE: Record<OnboardingRole, readonly {
    id: string;
    title: string;
    body: string;
    route: string;
}[]>;
export interface LearningCard {
    id: string;
    title: string;
    description: string;
    slug: string;
    videoUrl?: string;
}
export declare const LEARNING_CARDS: LearningCard[];
export interface OnboardingChecklistItem {
    step: string;
    label: string;
    completed: boolean;
    current: boolean;
}
export interface OnboardingNextAction {
    step: string;
    label: string;
    description: string;
    actionLabel: string;
    href: string;
    estimatedMinutes: number;
}
export interface OnboardingProgressDTO {
    userId: string;
    role: OnboardingRole;
    status: OnboardingStatus;
    completedSteps: string[];
    currentStep: string | null;
    completed: boolean;
    firstTradeCompleted: boolean;
    completionPercent: number;
    checklist: OnboardingChecklistItem[];
    nextAction: OnboardingNextAction | null;
    milestones: TradeMilestoneProgress[];
    tourCompleted: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface OnboardingDashboardMetrics {
    usersOnboarded: number;
    usersCompletedOnboarding: number;
    firstTradeCompleted: number;
    averageCompletionHours: number | null;
    roleBreakdown: Record<OnboardingRole, {
        total: number;
        completed: number;
        firstTrade: number;
    }>;
}
export interface WorkspaceGuidanceDTO {
    workspaceType: string;
    workspaceId: string;
    title: string;
    nextLabel: string;
    nextDescription: string;
    actionLabel: string | null;
    actionHref: string | null;
}
export declare const OnboardingAuditAction: {
    readonly STARTED: "onboarding.started";
    readonly STEP_COMPLETED: "onboarding.step.completed";
    readonly COMPLETED: "onboarding.completed";
    readonly FIRST_TRADE: "first_trade.completed";
    readonly TOUR_COMPLETED: "tour.completed";
    readonly LEARNING_OPENED: "learning.content.opened";
};
export declare function stepsForRole(role: OnboardingRole): readonly string[];
export declare function stepLabel(role: OnboardingRole, step: string): string;
export declare function isOperatorOnboardingRole(role: OnboardingRole): boolean;
export declare function computeCompletionPercent(role: OnboardingRole, completedSteps: string[]): number;
export declare function buildChecklist(role: OnboardingRole, completedSteps: string[], currentStep: string | null): OnboardingChecklistItem[];
export interface OnboardingJourneyContext {
    role: OnboardingRole;
    /** Derived from existing workspace data — no FSM reads required by contracts. */
    hasRfq: boolean;
    hasQuotation: boolean;
    hasSupplierSelected: boolean;
    hasPoIssued: boolean;
    hasOrder: boolean;
    hasShipment: boolean;
    hasShipmentDelivered: boolean;
    hasInvitation: boolean;
    hasSubmittedOffer: boolean;
    hasAcceptedOrder: boolean;
    hasUploadedDocument: boolean;
    hasOpenWorkload: boolean;
    hasVerifiedDocument: boolean;
    hasReviewedShipment: boolean;
    hasClosedProcess: boolean;
}
/** Pure journey engine — determines next step from trade signals. */
export declare function computeOnboardingJourney(ctx: OnboardingJourneyContext): {
    completedSteps: string[];
    currentStep: string | null;
    firstTradeCompleted: boolean;
};
export declare function nextActionForStep(_role: OnboardingRole, step: string | null): OnboardingNextAction | null;
/** Visual trade progress bar — derived from milestone signals, no FSM. */
export declare function computeTradeMilestones(signals: {
    hasRfq: boolean;
    hasPo: boolean;
    hasProduction: boolean;
    hasShipment: boolean;
    hasArrival: boolean;
    hasDocuments: boolean;
    isCompleted: boolean;
}): TradeMilestoneProgress[];
