export declare const OPERATIONAL_ISSUE_STATUSES: readonly ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
export type OperationalIssueStatus = (typeof OPERATIONAL_ISSUE_STATUSES)[number];
export declare const OPERATIONAL_ISSUE_SEVERITIES: readonly ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export type OperationalIssueSeverity = (typeof OPERATIONAL_ISSUE_SEVERITIES)[number];
export declare const OPERATIONAL_ISSUE_CATEGORIES: readonly ["SHIPMENT_DELAY", "BOOKING_FAILURE", "INSPECTION_FAILURE", "DOCUMENT_MISSING", "DOCUMENT_EXPIRED", "SUPPLIER_RESPONSE", "QUALITY_ISSUE", "OTHER"];
export type OperationalIssueCategory = (typeof OPERATIONAL_ISSUE_CATEGORIES)[number];
export declare const OPERATIONAL_ISSUE_RELATED_TYPES: readonly ["PURCHASE_ORDER", "SHIPMENT", "INSPECTION", "COMMERCIAL_DOCUMENT", "TASK"];
export type OperationalIssueRelatedType = (typeof OPERATIONAL_ISSUE_RELATED_TYPES)[number];
export declare const OPERATIONAL_ISSUE_CATEGORY_LABELS: Record<OperationalIssueCategory, string>;
export interface OperationalIssuePermissions {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canResolve: boolean;
    canClose: boolean;
    canReopen: boolean;
}
export interface OperationalIssueActorDto {
    id: string;
    name: string;
    email?: string | null;
}
export interface OperationalIssueDto {
    id: string;
    orderId: string;
    relatedEntityType: OperationalIssueRelatedType | null;
    relatedEntityId: string | null;
    category: OperationalIssueCategory;
    severity: OperationalIssueSeverity;
    status: OperationalIssueStatus;
    title: string;
    description: string | null;
    assignedTaskId: string | null;
    reportedBy: OperationalIssueActorDto;
    resolvedBy: OperationalIssueActorDto | null;
    resolvedAt: string | null;
    closedAt: string | null;
    resolutionNote: string | null;
    resolutionSuggested: boolean;
    automationKey: string | null;
    /** Sprint 34 — Exception Intelligence (nullable for historical rows) */
    impactType: string | null;
    ownerRole: string | null;
    recommendedAction: string | null;
    sourceEventType: string | null;
    sourceRuleId: string | null;
    sourceAlertId: string | null;
    permissions: OperationalIssuePermissions;
    createdAt: string;
    updatedAt: string;
}
export interface OperationalIssueListResponse {
    items: OperationalIssueDto[];
    page: number;
    pageSize: number;
    total: number;
}
export interface OperationalIssueSummaryCounts {
    open: number;
    critical: number;
    resolvedToday: number;
    inspectionFailures: number;
    shipmentDelays: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
}
export declare const OPERATIONAL_ISSUE_AUTOMATION_KEYS: {
    readonly INSPECTION_FAILURE: "inspection_failure";
    /** Sprint 34 rule pack (suffix entity id in ensureAutomatedIssue) */
    readonly ETA_DELIVERY_RISK: "ei_eta_delivery_risk";
    readonly BOOKING_STALLED: "ei_booking_stalled";
    readonly BOOKING_CUTOFF_RISK: "ei_booking_cutoff_risk";
    readonly DOCUMENT_MISSING: "ei_document_missing";
    readonly DOCUMENT_REJECTED: "ei_document_rejected";
    readonly MILESTONE_OVERDUE: "ei_milestone_overdue";
    readonly CUSTOMS_BROKER_MISSING: "ei_customs_broker_missing";
    readonly CUSTOMS_ORIGIN_MISSING: "ei_customs_origin_missing";
    readonly CUSTOMS_CLASSIFICATION_MISSING: "ei_customs_classification_missing";
    readonly CUSTOMS_HOLD: "ei_customs_hold";
    readonly CUSTOMS_CLEARANCE_DELAY: "ei_customs_clearance_delay";
    readonly CUSTOMS_DOCUMENT_MISSING: "ei_customs_document_missing";
    readonly CUSTOMS_PREPARATION_AT_RISK: "ei_customs_preparation_at_risk";
    readonly CUSTOMS_BROKER_REVIEW_PENDING: "ei_customs_broker_review_pending";
    readonly CUSTOMS_ARRIVAL_NOT_READY: "ei_customs_arrival_not_ready";
};
