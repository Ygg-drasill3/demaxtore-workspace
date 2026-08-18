// =============================================================================
// Sprint 30-02 — Inspection Workspace cockpit DTOs
// Extends Order inspection fields; no parallel QA FSM / module.
// =============================================================================

export const INSPECTION_TYPES = [
  "INITIAL",
  "DURING_PRODUCTION",
  "FINAL_RANDOM",
  "LOADING",
  "CONTAINER",
  "PRE_SHIPMENT",
] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];

/** Workspace status aliases — mirror Order inspection lifecycle, not a replacement FSM. */
export const INSPECTION_STATUSES = [
  "DRAFT",
  "REQUESTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "APPROVED",
  "REJECTED",
  "REINSPECTION_REQUIRED",
  "CANCELLED",
] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const INSPECTION_SEVERITIES = ["MINOR", "MAJOR", "CRITICAL"] as const;
export type InspectionSeverity = (typeof INSPECTION_SEVERITIES)[number];

export const INSPECTION_DECISIONS = [
  "PASS",
  "CONDITIONAL_PASS",
  "FAIL",
  "REINSPECTION_REQUIRED",
] as const;
export type InspectionDecision = (typeof INSPECTION_DECISIONS)[number];

export const INSPECTION_NCR_STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;
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

export function inspectionDurationHours(
  start: string | null | undefined,
  finish: string | null | undefined,
): number | null {
  if (!start || !finish) return null;
  const a = new Date(start).getTime();
  const b = new Date(finish).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round(((b - a) / 3_600_000) * 10) / 10;
}

/** Map decision → order `inspectionResult` string for legacy Order fields. */
export function decisionToOrderResult(decision: InspectionDecision): string {
  switch (decision) {
    case "PASS":
      return "PASS";
    case "CONDITIONAL_PASS":
      return "CONDITIONAL_PASS";
    case "FAIL":
      return "FAIL";
    case "REINSPECTION_REQUIRED":
      return "REINSPECTION_REQUIRED";
    default:
      return decision;
  }
}
