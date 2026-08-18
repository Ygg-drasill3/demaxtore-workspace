/**
 * Sprint 35 — Partner Workspace 2.0
 * One shared external execution workspace; role-based views.
 * Tasks/Documents/Issues remain canonical — no PartnerTask / PartnerDocuments.
 */
import { z } from "zod";
export declare const PARTNER_ROLES: readonly ["SUPPLIER", "ORIGIN_AGENT", "CUSTOMS_BROKER", "TRUCKER"];
export type PartnerRole = (typeof PARTNER_ROLES)[number];
export declare const PartnerRoleEnum: z.ZodEnum<["SUPPLIER", "ORIGIN_AGENT", "CUSTOMS_BROKER", "TRUCKER"]>;
export declare function isPartnerRole(role: string): role is PartnerRole;
/** Narrow a platform user role to a PartnerRole when applicable. */
export declare function resolvePartnerRole(actor: {
    role: string;
}): PartnerRole | null;
/** Capabilities enforced server-side (see permission matrix). */
export type PartnerCapability = "PO_VIEW" | "PO_LINE_VIEW" | "BOOKING_VIEW" | "SHIPMENT_VIEW" | "CONTAINER_VIEW" | "DOCUMENT_VIEW" | "DOCUMENT_UPLOAD" | "TASK_VIEW" | "TASK_UPDATE" | "ISSUE_VIEW_SAFE" | "COMMENT" | "TIMELINE_VIEW" | "CONFIRM_CARGO_READY" | "CONFIRM_GATE_IN" | "CONFIRM_PICKUP" | "CONFIRM_GATE_OUT" | "CONFIRM_INLAND_DELIVERY" | "INLAND_VIEW";
export declare function partnerHasCapability(role: PartnerRole, cap: PartnerCapability): boolean;
export declare function partnerCapabilities(role: PartnerRole): PartnerCapability[];
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
    queueGroup?: "ACTION_REQUIRED" | "ARRIVING_SOON" | "READY_FOR_REVIEW" | "UNDER_REVIEW" | "DECLARATION_PREPARING" | "FILED_PROCESSING" | "HOLD" | "CLEARED";
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
    queueGroup?: "ACTION_REQUIRED" | "PICKUP_TODAY" | "UPCOMING_PICKUPS" | "READY_FOR_PICKUP" | "IN_TRANSIT" | "DELIVERED";
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
export declare const AssignPartnerInput: z.ZodObject<{
    workspaceId: z.ZodString;
    userId: z.ZodString;
    partnerRole: z.ZodEnum<["SUPPLIER", "ORIGIN_AGENT", "CUSTOMS_BROKER", "TRUCKER"]>;
    organisationId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    userId: string;
    partnerRole: "SUPPLIER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
    notes?: string | null | undefined;
    organisationId?: string | null | undefined;
}, {
    workspaceId: string;
    userId: string;
    partnerRole: "SUPPLIER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
    notes?: string | null | undefined;
    organisationId?: string | null | undefined;
}>;
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
export declare const PartnerConfirmCargoReadyInput: z.ZodObject<{
    cargoReadyDate: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
    cargoReadyDate?: string | undefined;
}, {
    note?: string | undefined;
    cargoReadyDate?: string | undefined;
}>;
export type PartnerConfirmCargoReadyInput = z.infer<typeof PartnerConfirmCargoReadyInput>;
export declare const PartnerConfirmGateInInput: z.ZodObject<{
    gateInAt: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
    gateInAt?: string | undefined;
}, {
    note?: string | undefined;
    gateInAt?: string | undefined;
}>;
export type PartnerConfirmGateInInput = z.infer<typeof PartnerConfirmGateInInput>;
