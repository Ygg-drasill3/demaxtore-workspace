// =============================================================================
// Sprint 30-06 — Delivery & Order Completion (closure evidence; not FSM)
//
// RETIRED for the Turkey pilot — do not re-wire without a product decision.
//
// No backend module implements these shapes and no UI renders them. Order closure
// is canonical through the Order FSM (`mark_delivered` / `mark_partially_delivered`
// / `close_order`) evidenced by Inland DELIVERED, POD and Landed Cost; completion
// KPIs are served by the operational-analytics module. Building the mutation side
// (`/delivery`, `/complete`, `/reopen`) would duplicate that FSM closure.
//
// The `delivery_records` and `order_completions` tables and their rows are left
// intact, so these types are kept as the record of the intended shape.
// =============================================================================

export const ORDER_COMPLETION_STATUSES = ["OPEN", "READY", "COMPLETED"] as const;
export type OrderCompletionStatus = (typeof ORDER_COMPLETION_STATUSES)[number];

export const COMPLETION_CHECK_KEYS = [
  "SHIPMENT_COMPLETED",
  "INSPECTION_COMPLETED",
  "REQUIRED_DOCUMENTS",
  "CRITICAL_ISSUES_CLOSED",
  "REQUIRED_TASKS_COMPLETED",
  "DELIVERY_RECORDED",
] as const;
export type CompletionCheckKey = (typeof COMPLETION_CHECK_KEYS)[number];

export const COMPLETION_CHECK_LABELS: Record<CompletionCheckKey, string> = {
  SHIPMENT_COMPLETED: "Shipment completed / delivered",
  INSPECTION_COMPLETED: "Inspection completed (if required)",
  REQUIRED_DOCUMENTS: "Required documents uploaded",
  CRITICAL_ISSUES_CLOSED: "Critical issues closed",
  REQUIRED_TASKS_COMPLETED: "Required tasks completed",
  DELIVERY_RECORDED: "Delivery recorded",
};

export interface CompletionChecklistItemDto {
  key: CompletionCheckKey;
  label: string;
  passed: boolean;
  required: boolean;
  detail: string | null;
}

export interface DeliveryRecordDto {
  id: string;
  orderId: string;
  shipmentId: string | null;
  deliveredAt: string;
  deliveredBy: string | null;
  receivedBy: string | null;
  proofDocumentId: string | null;
  remarks: string | null;
  recordedById: string;
  createdAt: string;
}

export interface OrderCompletionPermissions {
  canView: boolean;
  canRecordDelivery: boolean;
  canComplete: boolean;
  canReopen: boolean;
}

export interface OrderCompletionDto {
  orderId: string;
  status: OrderCompletionStatus;
  checklist: CompletionChecklistItemDto[];
  allRequiredPassed: boolean;
  deliveries: DeliveryRecordDto[];
  completedAt: string | null;
  completedById: string | null;
  reopenedAt: string | null;
  notes: string | null;
  permissions: OrderCompletionPermissions;
  updatedAt: string | null;
}

export interface OrderCompletionSummaryCounts {
  readyToComplete: number;
  completedToday: number;
  waitingForDelivery: number;
  completionRate: number;
}
