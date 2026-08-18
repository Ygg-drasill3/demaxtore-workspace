// =============================================================================
// Sprint 30-05 — Operational Issues (business exceptions; not Tasks / not FSM)
// =============================================================================

export const OPERATIONAL_ISSUE_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;
export type OperationalIssueStatus = (typeof OPERATIONAL_ISSUE_STATUSES)[number];

export const OPERATIONAL_ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type OperationalIssueSeverity = (typeof OPERATIONAL_ISSUE_SEVERITIES)[number];

export const OPERATIONAL_ISSUE_CATEGORIES = [
  "SHIPMENT_DELAY",
  "BOOKING_FAILURE",
  "INSPECTION_FAILURE",
  "DOCUMENT_MISSING",
  "DOCUMENT_EXPIRED",
  "SUPPLIER_RESPONSE",
  "QUALITY_ISSUE",
  "OTHER",
] as const;
export type OperationalIssueCategory = (typeof OPERATIONAL_ISSUE_CATEGORIES)[number];

export const OPERATIONAL_ISSUE_RELATED_TYPES = [
  "PURCHASE_ORDER",
  "SHIPMENT",
  "INSPECTION",
  "COMMERCIAL_DOCUMENT",
  "TASK",
] as const;
export type OperationalIssueRelatedType = (typeof OPERATIONAL_ISSUE_RELATED_TYPES)[number];

export const OPERATIONAL_ISSUE_CATEGORY_LABELS: Record<OperationalIssueCategory, string> = {
  SHIPMENT_DELAY: "Shipment Delay",
  BOOKING_FAILURE: "Booking Failure",
  INSPECTION_FAILURE: "Inspection Failure",
  DOCUMENT_MISSING: "Document Missing",
  DOCUMENT_EXPIRED: "Document Expired",
  SUPPLIER_RESPONSE: "Supplier Response",
  QUALITY_ISSUE: "Quality Issue",
  OTHER: "Other",
};

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

export const OPERATIONAL_ISSUE_AUTOMATION_KEYS = {
  INSPECTION_FAILURE: "inspection_failure",
  /** Sprint 34 rule pack (suffix entity id in ensureAutomatedIssue) */
  ETA_DELIVERY_RISK: "ei_eta_delivery_risk",
  BOOKING_STALLED: "ei_booking_stalled",
  BOOKING_CUTOFF_RISK: "ei_booking_cutoff_risk",
  DOCUMENT_MISSING: "ei_document_missing",
  DOCUMENT_REJECTED: "ei_document_rejected",
  MILESTONE_OVERDUE: "ei_milestone_overdue",
  CUSTOMS_BROKER_MISSING: "ei_customs_broker_missing",
  CUSTOMS_ORIGIN_MISSING: "ei_customs_origin_missing",
  CUSTOMS_CLASSIFICATION_MISSING: "ei_customs_classification_missing",
  CUSTOMS_HOLD: "ei_customs_hold",
  CUSTOMS_CLEARANCE_DELAY: "ei_customs_clearance_delay",
  CUSTOMS_DOCUMENT_MISSING: "ei_customs_document_missing",
  CUSTOMS_PREPARATION_AT_RISK: "ei_customs_preparation_at_risk",
  CUSTOMS_BROKER_REVIEW_PENDING: "ei_customs_broker_review_pending",
  CUSTOMS_ARRIVAL_NOT_READY: "ei_customs_arrival_not_ready",
} as const;
