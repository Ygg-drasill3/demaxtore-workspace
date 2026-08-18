import { z } from "zod";
export const PROCUREMENT_REQUEST_STATUSES = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_PROCUREMENT",
    "COMMERCIAL_PROPOSAL_READY",
    "BUYER_REVIEW",
    "REVISION_REQUESTED",
    "APPROVED",
    "PAYMENTS_PENDING",
    "PAYMENTS_VERIFIED",
    "ORGANIZATION_STARTED",
    "COMPLETED",
];
export const PROCUREMENT_STATUS_LABELS = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    UNDER_PROCUREMENT: "Under Procurement",
    COMMERCIAL_PROPOSAL_READY: "Commercial Proposal Ready",
    BUYER_REVIEW: "Buyer Review",
    REVISION_REQUESTED: "Revision Requested",
    APPROVED: "Approved",
    PAYMENTS_PENDING: "Payments Pending",
    PAYMENTS_VERIFIED: "Payments Verified",
    ORGANIZATION_STARTED: "Organization Started",
    COMPLETED: "Completed",
};
export const MC_PROGRESS_STEPS = [
    { key: "SUBMITTED", label: "Submitted" },
    { key: "UNDER_PROCUREMENT", label: "Under Procurement" },
    { key: "COMMERCIAL_PROPOSAL_READY", label: "Commercial Proposal Ready" },
    { key: "BUYER_REVIEW", label: "Buyer Review" },
    { key: "APPROVED", label: "Approved" },
    { key: "ORGANIZATION_STARTED", label: "Organization Started" },
];
const STATUS_ORDER = {
    DRAFT: 0,
    SUBMITTED: 1,
    UNDER_PROCUREMENT: 2,
    COMMERCIAL_PROPOSAL_READY: 3,
    BUYER_REVIEW: 4,
    REVISION_REQUESTED: 4,
    APPROVED: 5,
    PAYMENTS_PENDING: 5,
    PAYMENTS_VERIFIED: 5,
    ORGANIZATION_STARTED: 6,
    COMPLETED: 7,
};
export function mcStateToProcurementStatus(state) {
    switch (state) {
        case "MC_DRAFT":
        case "MC_BUILDING":
            return "DRAFT";
        case "MC_PRICING_REQUESTED":
            return "SUBMITTED";
        case "MC_PROCUREMENT_IN_PROGRESS":
            return "UNDER_PROCUREMENT";
        case "MC_OFFER_READY":
            return "COMMERCIAL_PROPOSAL_READY";
        case "MC_BUYER_REVIEW":
            return "BUYER_REVIEW";
        case "MC_REVISION_REQUESTED":
            return "REVISION_REQUESTED";
        case "MC_APPROVED":
            return "APPROVED";
        case "MC_ALLOCATION_IN_PROGRESS":
        case "MC_PROFORMA_PENDING":
            return "PAYMENTS_PENDING";
        case "MC_PAYMENT_TRACKING":
            return "PAYMENTS_VERIFIED";
        case "MC_EXECUTION_READY":
        case "MC_EXECUTION_ACTIVE":
            return "ORGANIZATION_STARTED";
        case "MC_EXECUTION_COMPLETE":
            return "COMPLETED";
        case "MC_CANCELLED":
            return "DRAFT";
        default:
            return "DRAFT";
    }
}
export function procurementStatusIndex(status) {
    return STATUS_ORDER[status] ?? 0;
}
export function isProgressStepComplete(step, current) {
    return procurementStatusIndex(current) >= procurementStatusIndex(step);
}
export const TIMELINE_EVENT_LABELS = {
    "mixed_container.created": "Container created",
    "mixed_container.updated": "Container updated",
    "mixed_container.product_added": "Product added",
    "mixed_container.quantity_updated": "Quantity updated",
    "mixed_container.product_removed": "Product removed",
    "mixed_container.pricing_requested": "Procurement request submitted",
    "mixed_container.procurement_started": "Procurement started",
    "mixed_container.manager_assigned": "Procurement manager assigned",
    "mixed_container.offer_created": "Commercial proposal prepared",
    "mixed_container.offer_sent": "Commercial proposal published",
    "mixed_container.offer_viewed": "Commercial proposal viewed",
    "mixed_container.offer_approved": "Proposal approved",
    "mixed_container.revision_requested": "Buyer requested revision",
    "mixed_container.offer_expired": "Offer expired",
    "mixed_container.cancelled": "Container cancelled",
    "mixed_container.status_updated": "Status updated",
    "mixed_container.internal_note_added": "Internal note added",
};
export const SubmitProcurementRequestInput = z.object({
    buyerNotes: z.string().max(4000).optional(),
    destinationMarket: z.string().min(2).max(64).optional(),
});
export const McInternalNoteInput = z.object({
    body: z.string().min(1).max(8000),
});
export const McProcurementStatusHistoryDTO = z.object({
    id: z.string().uuid(),
    fromStatus: z.string().nullable(),
    toStatus: z.string(),
    workspaceState: z.string(),
    actorUserId: z.string().uuid().nullable(),
    actorName: z.string().nullable(),
    note: z.string().nullable(),
    createdAt: z.string().datetime(),
});
export const McInternalNoteDTO = z.object({
    id: z.string().uuid(),
    authorId: z.string().uuid(),
    authorName: z.string(),
    body: z.string(),
    createdAt: z.string().datetime(),
});
export const McActivityTimelineItemDTO = z.object({
    id: z.string().uuid(),
    eventType: z.string(),
    label: z.string(),
    actorUserId: z.string().uuid().nullable(),
    payload: z.record(z.unknown()),
    createdAt: z.string().datetime(),
});
export const ProcurementRequestDetailDTO = z.object({
    id: z.string().uuid(),
    procurementRequestRef: z.string().nullable(),
    externalRef: z.string(),
    state: z.string(),
    procurementStatus: z.enum(PROCUREMENT_REQUEST_STATUSES),
    buyerName: z.string(),
    buyerOrgName: z.string().nullable(),
    destinationPort: z.string().nullable(),
    containerType: z.string(),
    productCount: z.number().int(),
    totalPallets: z.number().int(),
    maxPalletCapacity: z.number().int(),
    fillPercent: z.number(),
    submissionDate: z.string().datetime().nullable(),
    assignedManagerId: z.string().uuid().nullable(),
    assignedManagerName: z.string().nullable(),
    buyerNotes: z.string().nullable(),
    lines: z.array(z.object({
        id: z.string().uuid(),
        productRef: z.string(),
        name: z.string(),
        category: z.string(),
        packaging: z.string(),
        palletCount: z.number().int(),
    })),
    statusHistory: z.array(McProcurementStatusHistoryDTO),
    activityTimeline: z.array(McActivityTimelineItemDTO),
    internalNotes: z.array(McInternalNoteDTO).optional(),
});
export const McBuyerDashboardWidgetsDTO = z.object({
    draftRequests: z.number().int(),
    underProcurement: z.number().int(),
    commercialProposalReady: z.number().int(),
    organizationStarted: z.number().int(),
});
export const McProcurementDashboardWidgetsDTO = z.object({
    newRequests: z.number().int(),
    assignedRequests: z.number().int(),
    waitingForReview: z.number().int(),
    proposalPreparationQueue: z.number().int(),
});
export const McProcurementInboxFilters = z.object({
    status: z.string().optional(),
    managerId: z.string().uuid().optional(),
    submittedFrom: z.string().datetime().optional(),
    submittedTo: z.string().datetime().optional(),
});
