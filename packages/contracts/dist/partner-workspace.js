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
];
export const PartnerRoleEnum = z.enum(PARTNER_ROLES);
export function isPartnerRole(role) {
    return PARTNER_ROLES.includes(role);
}
/** Narrow a platform user role to a PartnerRole when applicable. */
export function resolvePartnerRole(actor) {
    return isPartnerRole(actor.role) ? actor.role : null;
}
const MATRIX = {
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
export function partnerHasCapability(role, cap) {
    return MATRIX[role].includes(cap);
}
export function partnerCapabilities(role) {
    return [...MATRIX[role]];
}
export const AssignPartnerInput = z.object({
    workspaceId: z.string().uuid(),
    userId: z.string().uuid(),
    partnerRole: PartnerRoleEnum,
    organisationId: z.string().uuid().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
});
export const PartnerConfirmCargoReadyInput = z.object({
    cargoReadyDate: z.string().datetime().optional(),
    note: z.string().max(2000).optional(),
});
export const PartnerConfirmGateInInput = z.object({
    gateInAt: z.string().datetime().optional(),
    note: z.string().max(2000).optional(),
});
