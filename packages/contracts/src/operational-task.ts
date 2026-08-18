// =============================================================================
// Sprint 30-03 — Operational Tasks (execution coordination; not a workflow FSM)
// =============================================================================

export const OPERATIONAL_TASK_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OperationalTaskStatus = (typeof OPERATIONAL_TASK_STATUSES)[number];

export const OPERATIONAL_TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type OperationalTaskPriority = (typeof OPERATIONAL_TASK_PRIORITIES)[number];

export const OPERATIONAL_TASK_RELATED_TYPES = [
  "ORDER",
  "PURCHASE_ORDER",
  "SHIPMENT",
  "INSPECTION",
  "DOCUMENT",
  "REVISION",
  "NCR",
] as const;
export type OperationalTaskRelatedType = (typeof OPERATIONAL_TASK_RELATED_TYPES)[number];

export interface OperationalTaskPermissions {
  canView: boolean;
  canCreate: boolean;
  canAssign: boolean;
  canUpdateProgress: boolean;
  canComplete: boolean;
  canComment: boolean;
  canCancel: boolean;
}

export interface OperationalTaskActorDto {
  id: string;
  name: string;
  email?: string | null;
}

export interface OperationalTaskCommentDto {
  id: string;
  author: OperationalTaskActorDto;
  message: string;
  createdAt: string;
}

export interface OperationalTaskDto {
  id: string;
  orderId: string;
  purchaseOrderId: string | null;
  title: string;
  description: string | null;
  status: OperationalTaskStatus;
  priority: OperationalTaskPriority;
  dueDate: string | null;
  assignedTo: OperationalTaskActorDto | null;
  createdBy: OperationalTaskActorDto;
  completedAt: string | null;
  completedBy: OperationalTaskActorDto | null;
  relatedEntityType: OperationalTaskRelatedType | null;
  relatedEntityId: string | null;
  automationKey: string | null;
  commentCount: number;
  permissions: OperationalTaskPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalTaskListResponse {
  items: OperationalTaskDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface OperationalTaskSummaryCounts {
  open: number;
  overdue: number;
  dueToday: number;
  mine: number;
  highPriority: number;
  completedToday: number;
}

/** Built-in automation keys (idempotent via unique orderId+automationKey). */
export const OPERATIONAL_TASK_AUTOMATION_KEYS = {
  ASSIGN_INSPECTOR: "assign_inspector",
  UPLOAD_BILL_OF_LADING: "upload_bill_of_lading",
  RESOLVE_NCR: "resolve_ncr",
  REVIEW_REVISION: "review_revision",
  CREATE_SHIPMENT_BOOKING: "create_shipment_booking",
} as const;
export type OperationalTaskAutomationKey =
  (typeof OPERATIONAL_TASK_AUTOMATION_KEYS)[keyof typeof OPERATIONAL_TASK_AUTOMATION_KEYS];
