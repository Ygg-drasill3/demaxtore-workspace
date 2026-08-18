export declare const INSPECTION_TYPES: readonly ["INITIAL", "DURING_PRODUCTION", "FINAL_RANDOM", "LOADING", "CONTAINER", "PRE_SHIPMENT"];
export type InspectionType = (typeof INSPECTION_TYPES)[number];
/** Workspace status aliases — mirror Order inspection lifecycle, not a replacement FSM. */
export declare const INSPECTION_STATUSES: readonly ["DRAFT", "REQUESTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "APPROVED", "REJECTED", "REINSPECTION_REQUIRED", "CANCELLED"];
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];
export declare const INSPECTION_SEVERITIES: readonly ["MINOR", "MAJOR", "CRITICAL"];
export type InspectionSeverity = (typeof INSPECTION_SEVERITIES)[number];
export declare const INSPECTION_DECISIONS: readonly ["PASS", "CONDITIONAL_PASS", "FAIL", "REINSPECTION_REQUIRED"];
export type InspectionDecision = (typeof INSPECTION_DECISIONS)[number];
export declare const INSPECTION_NCR_STATUSES: readonly ["OPEN", "IN_PROGRESS", "CLOSED"];
export type InspectionNcrStatus = (typeof INSPECTION_NCR_STATUSES)[number];
export interface InspectionPermissions {
    canView: boolean;
    canEditRequest: boolean;
    canAssign: boolean;
    canSchedule: boolean;
    canManageFindings: boolean;
    canDecide: boolean;
    canManageNcr: boolean;
}
export interface InspectionSummaryDto {
    inspectionNumber: string;
    inspectionType: string;
    status: string;
    inspectionCompany: string | null;
    inspector: string | null;
    shipmentNumber: string | null;
    shipmentWorkspaceId: string | null;
    purchaseOrderNumber: string | null;
    purchaseOrderId: string | null;
    factory: string | null;
    plannedDate: string | null;
    actualDate: string | null;
    decision: string | null;
    decisionLocked: boolean;
    defectCount: number;
    ncrCount: number;
    findingCount: number;
}
export interface InspectionRequestDto {
    requestNumber: string;
    requestedByUserId: string | null;
    requestedAt: string | null;
    factory: string | null;
    supplier: string | null;
    purchaseOrderId: string | null;
    purchaseOrderNumber: string | null;
    shipmentWorkspaceId: string | null;
    shipmentNumber: string | null;
}
export interface InspectionAssignmentDto {
    inspector: string | null;
    organization: string | null;
    contact: string | null;
    assignedAt: string | null;
}
export interface InspectionScheduleDto {
    plannedDate: string | null;
    actualStart: string | null;
    actualFinish: string | null;
    durationHours: number | null;
}
export interface InspectionFindingDto {
    id: string;
    category: string;
    severity: string;
    description: string;
    quantity: number | null;
    status: string;
    createdAt: string;
    updatedAt: string;
}
export interface InspectionDefectDto {
    id: string;
    code: string | null;
    description: string;
    severity: string;
    quantity: number;
    resolution: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface InspectionNcrDto {
    id: string;
    ncrNumber: string;
    reason: string;
    status: string;
    ownerName: string | null;
    dueDate: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface InspectionShipmentLinkDto {
    shipmentWorkspaceId: string;
    shipmentNumber: string;
    status: string;
    etd: string | null;
    eta: string | null;
}
export interface InspectionPurchaseOrderLinkDto {
    purchaseOrderId: string;
    poNumber: string;
    supplierName: string | null;
    buyerName: string | null;
}
export interface InspectionWorkspaceDto {
    id: string;
    orderWorkspaceId: string;
    summary: InspectionSummaryDto;
    request: InspectionRequestDto;
    assignment: InspectionAssignmentDto;
    schedule: InspectionScheduleDto;
    findings: InspectionFindingDto[];
    defects: InspectionDefectDto[];
    ncrs: InspectionNcrDto[];
    decision: string | null;
    decisionNotes: string | null;
    decisionAt: string | null;
    decisionLocked: boolean;
    shipment: InspectionShipmentLinkDto | null;
    purchaseOrder: InspectionPurchaseOrderLinkDto | null;
    permissions: InspectionPermissions;
    createdAt: string;
    updatedAt: string;
}
export declare function inspectionDurationHours(start: string | null | undefined, finish: string | null | undefined): number | null;
/** Map decision → order `inspectionResult` string for legacy Order fields. */
export declare function decisionToOrderResult(decision: InspectionDecision): string;
