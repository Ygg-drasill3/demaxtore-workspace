/**
 * Sprint 35 — Partner Workspace 2.0
 * One shared external execution workspace; role-based views.
 * Tasks/Documents/Issues remain canonical — no PartnerTask / PartnerDocuments.
 */

import { z } from "zod";

export const PARTNER_ROLES = [
  "SUPPLIER",
  "ORIGIN_AGENT",
  "CUSTOMS_BROKER",
  "TRUCKER",
] as const;
export type PartnerRole = (typeof PARTNER_ROLES)[number];

export const PartnerRoleEnum = z.enum(PARTNER_ROLES);

export function isPartnerRole(role: string): role is PartnerRole {
  return (PARTNER_ROLES as readonly string[]).includes(role);
}

/** Narrow a platform user role to a PartnerRole when applicable. */
export function resolvePartnerRole(actor: { role: string }): PartnerRole | null {
  return isPartnerRole(actor.role) ? actor.role : null;
}

/** Capabilities enforced server-side (see permission matrix). */
export type PartnerCapability =
  | "PO_VIEW"
  | "PO_LINE_VIEW"
  | "BOOKING_VIEW"
  | "SHIPMENT_VIEW"
  | "CONTAINER_VIEW"
  | "DOCUMENT_VIEW"
  | "DOCUMENT_UPLOAD"
  | "TASK_VIEW"
  | "TASK_UPDATE"
  | "ISSUE_VIEW_SAFE"
  | "COMMENT"
  | "TIMELINE_VIEW"
  | "CONFIRM_CARGO_READY"
  | "CONFIRM_GATE_IN"
  | "CONFIRM_PICKUP"
  | "CONFIRM_GATE_OUT"
  | "CONFIRM_INLAND_DELIVERY"
  | "INLAND_VIEW";

const MATRIX: Record<PartnerRole, readonly PartnerCapability[]> = {
  SUPPLIER: [
    "PO_VIEW",
    "PO_LINE_VIEW",
    "DOCUMENT_VIEW",
    "DOCUMENT_UPLOAD",
    "TASK_VIEW",
    "TASK_UPDATE",
    "ISSUE_VIEW_SAFE",
    "COMMENT",
    "TIMELINE_VIEW",
    "CONFIRM_CARGO_READY",
    "SHIPMENT_VIEW",
  ],
  ORIGIN_AGENT: [
    "SHIPMENT_VIEW",
    "BOOKING_VIEW",
    "CONTAINER_VIEW",
    "DOCUMENT_VIEW",
    "DOCUMENT_UPLOAD",
    "TASK_VIEW",
    "TASK_UPDATE",
    "ISSUE_VIEW_SAFE",
    "COMMENT",
    "TIMELINE_VIEW",
    "CONFIRM_GATE_IN",
  ],
  CUSTOMS_BROKER: [
    "SHIPMENT_VIEW",
    "DOCUMENT_VIEW",
    "DOCUMENT_UPLOAD",
    "TASK_VIEW",
    "TASK_UPDATE",
    "ISSUE_VIEW_SAFE",
    "COMMENT",
    "TIMELINE_VIEW",
  ],
  TRUCKER: [
    "SHIPMENT_VIEW",
    "CONTAINER_VIEW",
    "DOCUMENT_VIEW",
    "DOCUMENT_UPLOAD",
    "TASK_VIEW",
    "TASK_UPDATE",
    "ISSUE_VIEW_SAFE",
    "COMMENT",
    "TIMELINE_VIEW",
    "INLAND_VIEW",
    "CONFIRM_PICKUP",
    "CONFIRM_GATE_OUT",
    "CONFIRM_INLAND_DELIVERY",
  ],
};

export function partnerHasCapability(role: PartnerRole, cap: PartnerCapability): boolean {
  return MATRIX[role].includes(cap);
}

export function partnerCapabilities(role: PartnerRole): PartnerCapability[] {
  return [...MATRIX[role]];
}

export interface PartnerCustomsCaseSummaryDto {
  customsCaseId: string;
  shipmentWorkspaceId: string;
  shipmentRef: string | null;
  importerLabel: string | null;
  eta: string | null;
  readinessStatus: string;
  customsStatus: string;
  blockingIssues: number;
  nextAction: string | null;
  /** Sprint 38 */
  daysToArrival?: number | null;
  etaSource?: string | null;
  preArrivalPhase?: string | null;
  urgency?: string | null;
  priority?: string | null;
  /** Sprint 39 — broker execution queue grouping */
  queueGroup?:
    | "ACTION_REQUIRED"
    | "ARRIVING_SOON"
    | "READY_FOR_REVIEW"
    | "UNDER_REVIEW"
    | "DECLARATION_PREPARING"
    | "FILED_PROCESSING"
    | "HOLD"
    | "CLEARED";
  declarationStatus?: string | null;
  destinationPort?: string | null;
}

export interface PartnerInlandDeliverySummaryDto {
  inlandDeliveryId: string;
  shipmentWorkspaceId: string;
  shipmentRef: string | null;
  containerNumber: string | null;
  pickupLocation: string | null;
  deliveryCity: string | null;
  pickupAt: string | null;
  status: string;
  nextAction: string | null;
  queueGroup?:
    | "ACTION_REQUIRED"
    | "PICKUP_TODAY"
    | "UPCOMING_PICKUPS"
    | "READY_FOR_PICKUP"
    | "IN_TRANSIT"
    | "DELIVERED";
}

export interface PartnerHomeDto {
  partnerRole: PartnerRole;
  tasksDueToday: number;
  openTasks: number;
  missingDocuments: number;
  shipmentUpdates: number;
  actionRequired: PartnerActionItemDto[];
  transactions: PartnerTransactionSummaryDto[];
  /** Sprint 37 — CUSTOMS_BROKER assigned cases only */
  customsCases?: PartnerCustomsCaseSummaryDto[];
  /** Sprint 41 — TRUCKER assigned inland deliveries */
  inlandDeliveries?: PartnerInlandDeliverySummaryDto[];
}

export interface PartnerActionItemDto {
  id: string;
  kind: "TASK" | "DOCUMENT" | "EXCEPTION";
  title: string;
  dueAt: string | null;
  workspaceId: string;
  workspaceType: "ORDER" | "SHIPMENT" | string;
  severity: string | null;
}

export interface PartnerTransactionSummaryDto {
  workspaceId: string;
  workspaceType: "ORDER" | "SHIPMENT" | string;
  externalRef: string;
  state: string;
  partnerRole: PartnerRole;
  openTaskCount: number;
}

export interface PartnerTransactionDetailDto {
  workspaceId: string;
  workspaceType: string;
  externalRef: string;
  state: string;
  partnerRole: PartnerRole;
  summary: Record<string, unknown>;
  tasks: PartnerTaskDto[];
  documents: PartnerDocumentDto[];
  milestones: PartnerMilestoneDto[];
  allowedActions: string[];
  issues: PartnerIssueSafeDto[];
}

export interface PartnerTaskDto {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  orderId: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  canComplete: boolean;
}

export interface PartnerDocumentDto {
  id: string;
  documentType: string;
  status: string;
  fileName: string | null;
}

export interface PartnerMilestoneDto {
  label: string;
  at: string | null;
  status: string | null;
}

export interface PartnerIssueSafeDto {
  id: string;
  title: string;
  impactType: string | null;
  recommendedAction: string | null;
  status: string;
  severity: string;
}

export const AssignPartnerInput = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  partnerRole: PartnerRoleEnum,
  organisationId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type AssignPartnerInput = z.infer<typeof AssignPartnerInput>;

/** Admin/Ops dropdown candidates for partner assignment. */
export interface PartnerAssignableUserDto {
  id: string;
  email: string;
  displayName: string;
  role: PartnerRole;
}

/** Active partner assignment on a workspace. */
export interface PartnerAssignmentDto {
  id: string;
  workspaceId: string;
  userId: string;
  partnerRole: PartnerRole;
  email: string;
  displayName: string;
  assignedAt: string;
}

export const PartnerConfirmCargoReadyInput = z.object({
  cargoReadyDate: z.string().datetime().optional(),
  note: z.string().max(2000).optional(),
});
export type PartnerConfirmCargoReadyInput = z.infer<typeof PartnerConfirmCargoReadyInput>;

export const PartnerConfirmGateInInput = z.object({
  gateInAt: z.string().datetime().optional(),
  note: z.string().max(2000).optional(),
});
export type PartnerConfirmGateInInput = z.infer<typeof PartnerConfirmGateInInput>;
