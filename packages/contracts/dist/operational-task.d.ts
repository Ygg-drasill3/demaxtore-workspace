export declare const OPERATIONAL_TASK_STATUSES: readonly ["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
export type OperationalTaskStatus = (typeof OPERATIONAL_TASK_STATUSES)[number];
export declare const OPERATIONAL_TASK_PRIORITIES: readonly ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export type OperationalTaskPriority = (typeof OPERATIONAL_TASK_PRIORITIES)[number];
export declare const OPERATIONAL_TASK_RELATED_TYPES: readonly ["ORDER", "PURCHASE_ORDER", "SHIPMENT", "INSPECTION", "DOCUMENT", "REVISION", "NCR"];
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
export declare const OPERATIONAL_TASK_AUTOMATION_KEYS: {
    readonly ASSIGN_INSPECTOR: "assign_inspector";
    readonly UPLOAD_BILL_OF_LADING: "upload_bill_of_lading";
    readonly RESOLVE_NCR: "resolve_ncr";
    readonly REVIEW_REVISION: "review_revision";
    readonly CREATE_SHIPMENT_BOOKING: "create_shipment_booking";
};
export type OperationalTaskAutomationKey = (typeof OPERATIONAL_TASK_AUTOMATION_KEYS)[keyof typeof OPERATIONAL_TASK_AUTOMATION_KEYS];
