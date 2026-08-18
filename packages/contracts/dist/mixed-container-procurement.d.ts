import { z } from "zod";
export declare const PROCUREMENT_REQUEST_STATUSES: readonly ["DRAFT", "SUBMITTED", "UNDER_PROCUREMENT", "COMMERCIAL_PROPOSAL_READY", "BUYER_REVIEW", "REVISION_REQUESTED", "APPROVED", "PAYMENTS_PENDING", "PAYMENTS_VERIFIED", "ORGANIZATION_STARTED", "COMPLETED"];
export type ProcurementRequestStatus = (typeof PROCUREMENT_REQUEST_STATUSES)[number];
export declare const PROCUREMENT_STATUS_LABELS: Record<ProcurementRequestStatus, string>;
export declare const MC_PROGRESS_STEPS: Array<{
    key: ProcurementRequestStatus;
    label: string;
}>;
export declare function mcStateToProcurementStatus(state: string): ProcurementRequestStatus;
export declare function procurementStatusIndex(status: ProcurementRequestStatus): number;
export declare function isProgressStepComplete(step: ProcurementRequestStatus, current: ProcurementRequestStatus): boolean;
export declare const TIMELINE_EVENT_LABELS: Record<string, string>;
export declare const SubmitProcurementRequestInput: z.ZodObject<{
    buyerNotes: z.ZodOptional<z.ZodString>;
    destinationMarket: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    destinationMarket?: string | undefined;
    buyerNotes?: string | undefined;
}, {
    destinationMarket?: string | undefined;
    buyerNotes?: string | undefined;
}>;
export type SubmitProcurementRequestInput = z.infer<typeof SubmitProcurementRequestInput>;
export declare const McInternalNoteInput: z.ZodObject<{
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    body: string;
}, {
    body: string;
}>;
export type McInternalNoteInput = z.infer<typeof McInternalNoteInput>;
export declare const McProcurementStatusHistoryDTO: z.ZodObject<{
    id: z.ZodString;
    fromStatus: z.ZodNullable<z.ZodString>;
    toStatus: z.ZodString;
    workspaceState: z.ZodString;
    actorUserId: z.ZodNullable<z.ZodString>;
    actorName: z.ZodNullable<z.ZodString>;
    note: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    note: string | null;
    toStatus: string;
    fromStatus: string | null;
    actorUserId: string | null;
    actorName: string | null;
    workspaceState: string;
}, {
    id: string;
    createdAt: string;
    note: string | null;
    toStatus: string;
    fromStatus: string | null;
    actorUserId: string | null;
    actorName: string | null;
    workspaceState: string;
}>;
export type McProcurementStatusHistoryDTO = z.infer<typeof McProcurementStatusHistoryDTO>;
export declare const McInternalNoteDTO: z.ZodObject<{
    id: z.ZodString;
    authorId: z.ZodString;
    authorName: z.ZodString;
    body: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    body: string;
    authorName: string;
    authorId: string;
}, {
    id: string;
    createdAt: string;
    body: string;
    authorName: string;
    authorId: string;
}>;
export type McInternalNoteDTO = z.infer<typeof McInternalNoteDTO>;
export declare const McActivityTimelineItemDTO: z.ZodObject<{
    id: z.ZodString;
    eventType: z.ZodString;
    label: z.ZodString;
    actorUserId: z.ZodNullable<z.ZodString>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    label: string;
    payload: Record<string, unknown>;
    eventType: string;
    actorUserId: string | null;
}, {
    id: string;
    createdAt: string;
    label: string;
    payload: Record<string, unknown>;
    eventType: string;
    actorUserId: string | null;
}>;
export type McActivityTimelineItemDTO = z.infer<typeof McActivityTimelineItemDTO>;
export declare const ProcurementRequestDetailDTO: z.ZodObject<{
    id: z.ZodString;
    procurementRequestRef: z.ZodNullable<z.ZodString>;
    externalRef: z.ZodString;
    state: z.ZodString;
    procurementStatus: z.ZodEnum<["DRAFT", "SUBMITTED", "UNDER_PROCUREMENT", "COMMERCIAL_PROPOSAL_READY", "BUYER_REVIEW", "REVISION_REQUESTED", "APPROVED", "PAYMENTS_PENDING", "PAYMENTS_VERIFIED", "ORGANIZATION_STARTED", "COMPLETED"]>;
    buyerName: z.ZodString;
    buyerOrgName: z.ZodNullable<z.ZodString>;
    destinationPort: z.ZodNullable<z.ZodString>;
    containerType: z.ZodString;
    productCount: z.ZodNumber;
    totalPallets: z.ZodNumber;
    maxPalletCapacity: z.ZodNumber;
    fillPercent: z.ZodNumber;
    submissionDate: z.ZodNullable<z.ZodString>;
    assignedManagerId: z.ZodNullable<z.ZodString>;
    assignedManagerName: z.ZodNullable<z.ZodString>;
    buyerNotes: z.ZodNullable<z.ZodString>;
    lines: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        productRef: z.ZodString;
        name: z.ZodString;
        category: z.ZodString;
        packaging: z.ZodString;
        palletCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        category: string;
        productRef: string;
        packaging: string;
        palletCount: number;
    }, {
        id: string;
        name: string;
        category: string;
        productRef: string;
        packaging: string;
        palletCount: number;
    }>, "many">;
    statusHistory: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        fromStatus: z.ZodNullable<z.ZodString>;
        toStatus: z.ZodString;
        workspaceState: z.ZodString;
        actorUserId: z.ZodNullable<z.ZodString>;
        actorName: z.ZodNullable<z.ZodString>;
        note: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        note: string | null;
        toStatus: string;
        fromStatus: string | null;
        actorUserId: string | null;
        actorName: string | null;
        workspaceState: string;
    }, {
        id: string;
        createdAt: string;
        note: string | null;
        toStatus: string;
        fromStatus: string | null;
        actorUserId: string | null;
        actorName: string | null;
        workspaceState: string;
    }>, "many">;
    activityTimeline: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        eventType: z.ZodString;
        label: z.ZodString;
        actorUserId: z.ZodNullable<z.ZodString>;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        label: string;
        payload: Record<string, unknown>;
        eventType: string;
        actorUserId: string | null;
    }, {
        id: string;
        createdAt: string;
        label: string;
        payload: Record<string, unknown>;
        eventType: string;
        actorUserId: string | null;
    }>, "many">;
    internalNotes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        authorId: z.ZodString;
        authorName: z.ZodString;
        body: z.ZodString;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        body: string;
        authorName: string;
        authorId: string;
    }, {
        id: string;
        createdAt: string;
        body: string;
        authorName: string;
        authorId: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    externalRef: string;
    state: string;
    fillPercent: number;
    productCount: number;
    lines: {
        id: string;
        name: string;
        category: string;
        productRef: string;
        packaging: string;
        palletCount: number;
    }[];
    buyerName: string;
    buyerOrgName: string | null;
    destinationPort: string | null;
    containerType: string;
    procurementRequestRef: string | null;
    statusHistory: {
        id: string;
        createdAt: string;
        note: string | null;
        toStatus: string;
        fromStatus: string | null;
        actorUserId: string | null;
        actorName: string | null;
        workspaceState: string;
    }[];
    activityTimeline: {
        id: string;
        createdAt: string;
        label: string;
        payload: Record<string, unknown>;
        eventType: string;
        actorUserId: string | null;
    }[];
    buyerNotes: string | null;
    procurementStatus: "DRAFT" | "APPROVED" | "COMPLETED" | "SUBMITTED" | "ORGANIZATION_STARTED" | "UNDER_PROCUREMENT" | "COMMERCIAL_PROPOSAL_READY" | "BUYER_REVIEW" | "REVISION_REQUESTED" | "PAYMENTS_PENDING" | "PAYMENTS_VERIFIED";
    totalPallets: number;
    maxPalletCapacity: number;
    submissionDate: string | null;
    assignedManagerId: string | null;
    assignedManagerName: string | null;
    internalNotes?: {
        id: string;
        createdAt: string;
        body: string;
        authorName: string;
        authorId: string;
    }[] | undefined;
}, {
    id: string;
    externalRef: string;
    state: string;
    fillPercent: number;
    productCount: number;
    lines: {
        id: string;
        name: string;
        category: string;
        productRef: string;
        packaging: string;
        palletCount: number;
    }[];
    buyerName: string;
    buyerOrgName: string | null;
    destinationPort: string | null;
    containerType: string;
    procurementRequestRef: string | null;
    statusHistory: {
        id: string;
        createdAt: string;
        note: string | null;
        toStatus: string;
        fromStatus: string | null;
        actorUserId: string | null;
        actorName: string | null;
        workspaceState: string;
    }[];
    activityTimeline: {
        id: string;
        createdAt: string;
        label: string;
        payload: Record<string, unknown>;
        eventType: string;
        actorUserId: string | null;
    }[];
    buyerNotes: string | null;
    procurementStatus: "DRAFT" | "APPROVED" | "COMPLETED" | "SUBMITTED" | "ORGANIZATION_STARTED" | "UNDER_PROCUREMENT" | "COMMERCIAL_PROPOSAL_READY" | "BUYER_REVIEW" | "REVISION_REQUESTED" | "PAYMENTS_PENDING" | "PAYMENTS_VERIFIED";
    totalPallets: number;
    maxPalletCapacity: number;
    submissionDate: string | null;
    assignedManagerId: string | null;
    assignedManagerName: string | null;
    internalNotes?: {
        id: string;
        createdAt: string;
        body: string;
        authorName: string;
        authorId: string;
    }[] | undefined;
}>;
export type ProcurementRequestDetailDTO = z.infer<typeof ProcurementRequestDetailDTO>;
export declare const McBuyerDashboardWidgetsDTO: z.ZodObject<{
    draftRequests: z.ZodNumber;
    underProcurement: z.ZodNumber;
    commercialProposalReady: z.ZodNumber;
    organizationStarted: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    draftRequests: number;
    underProcurement: number;
    commercialProposalReady: number;
    organizationStarted: number;
}, {
    draftRequests: number;
    underProcurement: number;
    commercialProposalReady: number;
    organizationStarted: number;
}>;
export type McBuyerDashboardWidgetsDTO = z.infer<typeof McBuyerDashboardWidgetsDTO>;
export declare const McProcurementDashboardWidgetsDTO: z.ZodObject<{
    newRequests: z.ZodNumber;
    assignedRequests: z.ZodNumber;
    waitingForReview: z.ZodNumber;
    proposalPreparationQueue: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    newRequests: number;
    assignedRequests: number;
    waitingForReview: number;
    proposalPreparationQueue: number;
}, {
    newRequests: number;
    assignedRequests: number;
    waitingForReview: number;
    proposalPreparationQueue: number;
}>;
export type McProcurementDashboardWidgetsDTO = z.infer<typeof McProcurementDashboardWidgetsDTO>;
export declare const McProcurementInboxFilters: z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
    managerId: z.ZodOptional<z.ZodString>;
    submittedFrom: z.ZodOptional<z.ZodString>;
    submittedTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    managerId?: string | undefined;
    submittedFrom?: string | undefined;
    submittedTo?: string | undefined;
}, {
    status?: string | undefined;
    managerId?: string | undefined;
    submittedFrom?: string | undefined;
    submittedTo?: string | undefined;
}>;
export type McProcurementInboxFilters = z.infer<typeof McProcurementInboxFilters>;
