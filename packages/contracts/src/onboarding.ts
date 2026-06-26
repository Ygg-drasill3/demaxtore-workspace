// Sprint 9A — First Trade Success & Guided Onboarding
// Parallel checklist engine. Does NOT modify any workspace FSM.

import { COMMODITYBID_TOUR_BUYER, COMMODITYBID_TOUR_SUPPLIER } from "./commoditybid-learning";

export const OnboardingRole = ["BUYER", "SUPPLIER", "ADMIN", "SALES_CONTROL"] as const;
export type OnboardingRole = (typeof OnboardingRole)[number];

/** Operator maps to ADMIN in the User.role enum. */
export type OperatorRole = "ADMIN";

export const OnboardingStatus = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "STALLED"] as const;
export type OnboardingStatus = (typeof OnboardingStatus)[number];

// ── Buyer first-trade checklist ─────────────────────────────────────────────

export const BuyerOnboardingStep = [
  "create_rfq",
  "receive_quotation",
  "select_supplier",
  "issue_po",
  "track_shipment",
  "complete_trade",
] as const;
export type BuyerOnboardingStep = (typeof BuyerOnboardingStep)[number];

export const BUYER_STEP_LABELS: Record<BuyerOnboardingStep, string> = {
  create_rfq:         "Create RFQ",
  receive_quotation:  "Receive quotation",
  select_supplier:    "Select supplier",
  issue_po:           "Issue PO",
  track_shipment:     "Track shipment",
  complete_trade:     "Complete trade",
};

// ── Supplier first-trade checklist ──────────────────────────────────────────

export const SupplierOnboardingStep = [
  "receive_invitation",
  "submit_offer",
  "accept_order",
  "upload_documents",
  "complete_shipment",
] as const;
export type SupplierOnboardingStep = (typeof SupplierOnboardingStep)[number];

export const SUPPLIER_STEP_LABELS: Record<SupplierOnboardingStep, string> = {
  receive_invitation: "Receive invitation",
  submit_offer:       "Submit offer",
  accept_order:       "Accept order",
  upload_documents:   "Upload documents",
  complete_shipment:  "Complete shipment",
};

// ── Operator (ADMIN) first-trade checklist ──────────────────────────────────

export const OperatorOnboardingStep = [
  "monitor_order",
  "verify_documents",
  "review_shipment",
  "close_process",
] as const;
export type OperatorOnboardingStep = (typeof OperatorOnboardingStep)[number];

export const OPERATOR_STEP_LABELS: Record<OperatorOnboardingStep, string> = {
  monitor_order:     "Monitor order",
  verify_documents:  "Verify documents",
  review_shipment:   "Review shipment",
  close_process:     "Close process",
};

export type OnboardingStep = BuyerOnboardingStep | SupplierOnboardingStep | OperatorOnboardingStep;

export const ALL_STEPS_BY_ROLE: Record<OnboardingRole, readonly string[]> = {
  BUYER:         BuyerOnboardingStep,
  SUPPLIER:      SupplierOnboardingStep,
  ADMIN:         OperatorOnboardingStep,
  SALES_CONTROL: OperatorOnboardingStep,
};

// ── Trade completion milestones (cross-role, visual only) ───────────────────

export const TradeMilestone = [
  "rfq",
  "po",
  "production",
  "shipment",
  "arrival",
  "documents",
  "completed",
] as const;
export type TradeMilestone = (typeof TradeMilestone)[number];

export const TRADE_MILESTONE_LABELS: Record<TradeMilestone, string> = {
  rfq:        "RFQ",
  po:         "PO",
  production: "Production",
  shipment:   "Shipment",
  arrival:    "Arrival",
  documents:  "Documents",
  completed:  "Completed",
};

export type MilestoneStatus = "done" | "current" | "pending";

export interface TradeMilestoneProgress {
  key:    TradeMilestone;
  label:  string;
  status: MilestoneStatus;
}

// ── Product tour (max 5 steps per role) ─────────────────────────────────────

export const TOUR_STEPS_BY_ROLE: Record<OnboardingRole, readonly { id: string; title: string; body: string; route: string }[]> = {
  BUYER: [...COMMODITYBID_TOUR_BUYER],
  SUPPLIER: [...COMMODITYBID_TOUR_SUPPLIER],
  ADMIN: [
    { id: "admin-ct",        title: "Control Tower", body: "Monitor open alerts across all workspaces.", route: "/operations" },
    { id: "admin-ops",       title: "Operations",    body: "Assign suppliers and resolve exceptions.",   route: "/operations" },
    { id: "admin-alerts",    title: "Alerts",        body: "Act on stalled trades and missing docs.",    route: "/operations" },
  ],
  SALES_CONTROL: [
    { id: "sales-customers", title: "Customer accounts", body: "Review buyer organisations and account ownership.", route: "/sales/dashboard" },
    { id: "sales-learning",  title: "Learning Center",   body: "Product guides to support customer onboarding.",    route: "/learning" },
  ],
};

// ── Learning center content ─────────────────────────────────────────────────

export interface LearningCard {
  id:          string;
  title:       string;
  description: string;
  slug:        string;
  videoUrl?:   string;
}

export const LEARNING_CARDS: LearningCard[] = [
  { id: "mixed-container", title: "How Mixed Container Works", description: "Build a multi-product container by pallet — discover, plan, request live pricing.", slug: "mixed-container" },
  { id: "bulk-container", title: "What Is BulkContainer?", description: "Multi-supplier bulk procurement by metric ton and specification — horeca and industrial.", slug: "bulk-container" },
  { id: "bulk-container-procurement", title: "How Bulk Procurement Works", description: "Discover bulk products, build a 25 MT container, submit a procurement request.", slug: "bulk-container-procurement" },
  { id: "bulk-pricing", title: "How Bulk Pricing Works", description: "Operations-led sourcing, manual supplier pricing, and buyer-ready offers.", slug: "bulk-pricing" },
  { id: "bulk-offer-expiry", title: "Why Bulk Offers Expire", description: "72-hour validity, countdown, and what happens when an offer expires.", slug: "bulk-offer-expiry" },
  { id: "bulk-spec-pricing", title: "How Specifications Affect Pricing", description: "Protein, moisture, packing type, and origin drive bulk unit economics.", slug: "bulk-spec-pricing" },
  { id: "bulk-payments", title: "How BulkContainer Payments Work", description: "Direct supplier payments, proforma coordination, and execution-ready workflow.", slug: "bulk-payments" },
  { id: "bulk-supplier-hidden", title: "Why Suppliers Are Hidden", description: "Allocation references replace supplier names — coordination without a supplier portal.", slug: "bulk-supplier-hidden" },
  { id: "bulk-pre-execution", title: "What Happens Before Execution", description: "Allocation, proforma collection, and payment gates before order spawn.", slug: "bulk-pre-execution" },
  { id: "bulk-post-execution-ready", title: "What Happens After Execution Ready?", description: "Master order spawn, supplier orders, and Trade OS execution.", slug: "bulk-post-execution-ready" },
  { id: "bulk-freightiq-connection", title: "How BulkContainer Connects To FreightIQ", description: "Supplier orders use standard FreightIQ eligibility — no parallel freight engine.", slug: "bulk-freightiq-connection" },
  { id: "bulk-execution-understanding", title: "Understanding BulkContainer Execution", description: "One dashboard, document hub, and completion tracking across allocations.", slug: "bulk-execution-understanding" },
  { id: "packing-type", title: "Why Packing Type Matters", description: "Different packaging affects pricing, logistics, container planning, and supplier selection.", slug: "packing-type" },
  { id: "mixed-container-live-pricing", title: "How Live Pricing Works", description: "Indicative catalog pricing vs live offers, 72-hour validity, and revision workflow.", slug: "mixed-container-live-pricing" },
  { id: "mixed-container-payments", title: "How Mixed Container Payments Work", description: "Direct supplier payments, proforma coordination, and execution-ready workflow.", slug: "mixed-container-payments" },
  { id: "mixed-container-execution", title: "What Happens After Approval?", description: "Allocation, payments, order creation, FreightIQ, shipment, and delivery.", slug: "mixed-container-execution" },
  { id: "rfq",          title: "How RFQ Works",              description: "Every sourcing process starts with an RFQ — then choose your procurement strategy.", slug: "rfq" },
  { id: "direct-rfq",   title: "When to Use Direct RFQ",     description: "Relationship-based sourcing: request quotations, compare offers, award to a trusted supplier.", slug: "direct-rfq" },
  { id: "commoditybid", title: "When to Use CommodityBid",   description: "Competitive reverse auction: lowest valid bid wins — ideal for price discovery.", slug: "commoditybid" },
  { id: "freightiq",    title: "How FreightIQ Works",        description: "Request and select freight offers.",                        slug: "freightiq" },
  { id: "tracking",     title: "How Shipment Tracking Works",description: "Monitor vessel position, ETA, and exceptions.",             slug: "tracking" },
  { id: "trade-docs",   title: "How Trade Documents Work",   description: "Upload, review, and approve compliance documents.",       slug: "trade-documents" },
  { id: "full-flow",    title: "Complete Trade Flow",        description: "RFQ → strategy choice → Direct RFQ or CommodityBid → PO → Order → Shipment.", slug: "complete-trade-flow" },
];

// ── DTOs ────────────────────────────────────────────────────────────────────

export interface OnboardingChecklistItem {
  step:      string;
  label:     string;
  completed: boolean;
  current:   boolean;
}

export interface OnboardingNextAction {
  step:        string;
  label:       string;
  description: string;
  actionLabel: string;
  href:        string;
  estimatedMinutes: number;
}

export interface OnboardingProgressDTO {
  userId:               string;
  role:                 OnboardingRole;
  status:               OnboardingStatus;
  completedSteps:       string[];
  currentStep:          string | null;
  completed:            boolean;
  firstTradeCompleted:  boolean;
  completionPercent:    number;
  checklist:            OnboardingChecklistItem[];
  nextAction:           OnboardingNextAction | null;
  milestones:           TradeMilestoneProgress[];
  tourCompleted:        boolean;
  createdAt:            string;
  updatedAt:            string;
}

export interface OnboardingDashboardMetrics {
  usersOnboarded:           number;
  usersCompletedOnboarding: number;
  firstTradeCompleted:      number;
  averageCompletionHours:   number | null;
  roleBreakdown:            Record<OnboardingRole, { total: number; completed: number; firstTrade: number }>;
}

export interface WorkspaceGuidanceDTO {
  workspaceType: string;
  workspaceId:   string;
  title:         string;
  nextLabel:     string;
  nextDescription: string;
  actionLabel:   string | null;
  actionHref:    string | null;
}

// ── Audit action strings ────────────────────────────────────────────────────

export const OnboardingAuditAction = {
  STARTED:              "onboarding.started",
  STEP_COMPLETED:       "onboarding.step.completed",
  COMPLETED:            "onboarding.completed",
  FIRST_TRADE:          "first_trade.completed",
  TOUR_COMPLETED:       "tour.completed",
  LEARNING_OPENED:      "learning.content.opened",
} as const;

// ── Pure helpers ────────────────────────────────────────────────────────────

export function stepsForRole(role: OnboardingRole): readonly string[] {
  return ALL_STEPS_BY_ROLE[role] ?? [];
}

export function stepLabel(role: OnboardingRole, step: string): string {
  if (role === "BUYER")    return BUYER_STEP_LABELS[step as BuyerOnboardingStep] ?? step;
  if (role === "SUPPLIER") return SUPPLIER_STEP_LABELS[step as SupplierOnboardingStep] ?? step;
  return OPERATOR_STEP_LABELS[step as OperatorOnboardingStep] ?? step;
}

export function isOperatorOnboardingRole(role: OnboardingRole): boolean {
  return role === "ADMIN" || role === "SALES_CONTROL";
}

export function computeCompletionPercent(role: OnboardingRole, completedSteps: string[]): number {
  const total = stepsForRole(role).length;
  if (total === 0) return 0;
  return Math.round((completedSteps.length / total) * 100);
}

export function buildChecklist(
  role: OnboardingRole,
  completedSteps: string[],
  currentStep: string | null,
): OnboardingChecklistItem[] {
  return stepsForRole(role).map((step) => ({
    step,
    label: stepLabel(role, step),
    completed: completedSteps.includes(step),
    current: step === currentStep,
  }));
}

export interface OnboardingJourneyContext {
  role: OnboardingRole;
  /** Derived from existing workspace data — no FSM reads required by contracts. */
  hasRfq:              boolean;
  hasQuotation:        boolean;
  hasSupplierSelected: boolean;
  hasPoIssued:         boolean;
  hasOrder:            boolean;
  hasShipment:         boolean;
  hasShipmentDelivered:boolean;
  hasInvitation:       boolean;
  hasSubmittedOffer:   boolean;
  hasAcceptedOrder:    boolean;
  hasUploadedDocument: boolean;
  hasOpenWorkload:     boolean;
  hasVerifiedDocument: boolean;
  hasReviewedShipment: boolean;
  hasClosedProcess:    boolean;
}

/** Pure journey engine — determines next step from trade signals. */
export function computeOnboardingJourney(ctx: OnboardingJourneyContext): {
  completedSteps: string[];
  currentStep:    string | null;
  firstTradeCompleted: boolean;
} {
  const completed: string[] = [];

  if (ctx.role === "BUYER") {
    if (ctx.hasRfq)              completed.push("create_rfq");
    if (ctx.hasQuotation)        completed.push("receive_quotation");
    if (ctx.hasSupplierSelected) completed.push("select_supplier");
    if (ctx.hasPoIssued)         completed.push("issue_po");
    if (ctx.hasShipment)         completed.push("track_shipment");
    if (ctx.hasShipmentDelivered) completed.push("complete_trade");

    const order = BuyerOnboardingStep;
    const current = order.find((s) => !completed.includes(s)) ?? null;
    return {
      completedSteps: completed,
      currentStep: current,
      firstTradeCompleted: completed.includes("complete_trade"),
    };
  }

  if (ctx.role === "SUPPLIER") {
    if (ctx.hasInvitation)       completed.push("receive_invitation");
    if (ctx.hasSubmittedOffer)     completed.push("submit_offer");
    if (ctx.hasAcceptedOrder)      completed.push("accept_order");
    if (ctx.hasUploadedDocument)   completed.push("upload_documents");
    if (ctx.hasShipmentDelivered)  completed.push("complete_shipment");

    const order = SupplierOnboardingStep;
    const current = order.find((s) => !completed.includes(s)) ?? null;
    return {
      completedSteps: completed,
      currentStep: current,
      firstTradeCompleted: completed.includes("complete_shipment"),
    };
  }

  // ADMIN / SALES_CONTROL — shared operator checklist
  if (ctx.hasOpenWorkload)       completed.push("monitor_order");
  if (ctx.hasVerifiedDocument)   completed.push("verify_documents");
  if (ctx.hasReviewedShipment)   completed.push("review_shipment");
  if (ctx.hasClosedProcess)      completed.push("close_process");

  const order = OperatorOnboardingStep;
  const current = order.find((s) => !completed.includes(s)) ?? null;
  return {
    completedSteps: completed,
    currentStep: current,
    firstTradeCompleted: completed.includes("close_process"),
  };
}

export function nextActionForStep(_role: OnboardingRole, step: string | null): OnboardingNextAction | null {
  if (!step) return null;

  const actions: Record<string, OnboardingNextAction> = {
    create_rfq:         { step, label: "Create RFQ",              description: "Start your first sourcing request.",              actionLabel: "Create RFQ",           href: "/buyer/rfq/new",           estimatedMinutes: 10 },
    receive_quotation:  { step, label: "Review quotations",       description: "Compare supplier offers on your RFQ.",            actionLabel: "View RFQs",            href: "/buyer/rfq",               estimatedMinutes: 15 },
    select_supplier:    { step, label: "Select supplier",         description: "Award the best quotation.",                       actionLabel: "Open workspace",       href: "/buyer/rfq",               estimatedMinutes: 10 },
    issue_po:           { step, label: "Issue Purchase Order",    description: "Formalize the award with a PO.",                  actionLabel: "Issue PO",             href: "/buyer/rfq",               estimatedMinutes: 5 },
    track_shipment:     { step, label: "Track shipment",          description: "Monitor vessel departure and ETA.",               actionLabel: "View orders",          href: "/buyer/orders",            estimatedMinutes: 5 },
    complete_trade:     { step, label: "Complete trade",          description: "Confirm delivery and close the trade.",           actionLabel: "View orders",          href: "/buyer/orders",            estimatedMinutes: 5 },
    receive_invitation: { step, label: "Review invitation",       description: "Open your first RFQ invitation.",                 actionLabel: "View RFQs",            href: "/supplier/rfq",            estimatedMinutes: 5 },
    submit_offer:       { step, label: "Submit quotation",        description: "Respond with pricing and lead time.",             actionLabel: "Submit offer",         href: "/supplier/rfq",            estimatedMinutes: 20 },
    accept_order:       { step, label: "Acknowledge order",       description: "Confirm the purchase order.",                     actionLabel: "View orders",          href: "/supplier/orders",         estimatedMinutes: 10 },
    upload_documents:   { step, label: "Upload documents",        description: "Submit proforma and required trade docs.",        actionLabel: "View orders",          href: "/supplier/orders",         estimatedMinutes: 15 },
    complete_shipment:  { step, label: "Complete shipment",       description: "Confirm goods dispatched and delivered.",         actionLabel: "View orders",          href: "/supplier/orders",         estimatedMinutes: 10 },
    monitor_order:      { step, label: "Review open workspaces",  description: "Check assigned RFQs and orders needing action.",  actionLabel: "Open Control Tower",   href: "/operations",            estimatedMinutes: 10 },
    verify_documents:   { step, label: "Resolve compliance",      description: "Review missing or rejected trade documents.",     actionLabel: "Operations",           href: "/operations",            estimatedMinutes: 15 },
    review_shipment:    { step, label: "Review tracking",         description: "Investigate delayed or exception shipments.",     actionLabel: "Operations",           href: "/operations",            estimatedMinutes: 10 },
    close_process:      { step, label: "Close process",           description: "Resolve remaining alerts and close the trade.",   actionLabel: "Operations",           href: "/operations",            estimatedMinutes: 10 },
  };

  return actions[step] ?? null;
}

/** Visual trade progress bar — derived from milestone signals, no FSM. */
export function computeTradeMilestones(signals: {
  hasRfq: boolean;
  hasPo: boolean;
  hasProduction: boolean;
  hasShipment: boolean;
  hasArrival: boolean;
  hasDocuments: boolean;
  isCompleted: boolean;
}): TradeMilestoneProgress[] {
  const flags = [
    signals.hasRfq,
    signals.hasPo,
    signals.hasProduction,
    signals.hasShipment,
    signals.hasArrival,
    signals.hasDocuments,
    signals.isCompleted,
  ];
  const firstPending = flags.findIndex((f) => !f);

  return TradeMilestone.map((key, i) => {
    let status: MilestoneStatus = "pending";
    if (flags[i]) status = "done";
    else if (i === firstPending) status = "current";
    return { key, label: TRADE_MILESTONE_LABELS[key], status };
  });
}
