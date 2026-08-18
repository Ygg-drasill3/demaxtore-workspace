export declare const ORDER_COMPLETION_STATUSES: readonly ["OPEN", "READY", "COMPLETED"];
export type OrderCompletionStatus = (typeof ORDER_COMPLETION_STATUSES)[number];
export declare const COMPLETION_CHECK_KEYS: readonly ["SHIPMENT_COMPLETED", "INSPECTION_COMPLETED", "REQUIRED_DOCUMENTS", "CRITICAL_ISSUES_CLOSED", "REQUIRED_TASKS_COMPLETED", "DELIVERY_RECORDED"];
export type CompletionCheckKey = (typeof COMPLETION_CHECK_KEYS)[number];
export declare const COMPLETION_CHECK_LABELS: Record<CompletionCheckKey, string>;
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
