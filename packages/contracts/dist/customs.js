/**
 * Sprint 37 — Turkish Customs Control Center (operational orchestration).
 * Not a government filing system. No BİLGE / duty / inland.
 */
import { z } from "zod";
export const CUSTOMS_CASE_STATUSES = [
    "DRAFT",
    "PREPARING",
    "READY_FOR_BROKER",
    "BROKER_REVIEW",
    "DECLARATION_PREPARING",
    "DECLARATION_FILED",
    "CUSTOMS_PROCESSING",
    "CLEARANCE_PENDING",
    "CLEARED",
    "HOLD",
    "CANCELLED",
];
export const CUSTOMS_STATUS_SOURCES = [
    "BUYER",
    "CUSTOMS_BROKER",
    "DEMAXTORE_OPERATIONS",
    "SYSTEM_DERIVED",
];
export const CUSTOMS_HOLD_CATEGORIES = [
    "DOCUMENT",
    "CLASSIFICATION",
    "BROKER_REVIEW",
    "CUSTOMS_QUERY",
    "PAYMENT",
    "OTHER",
];
export const CUSTOMS_READINESS_STATUSES = [
    "NOT_READY",
    "PARTIALLY_READY",
    "READY_FOR_BROKER",
];
export const CUSTOMS_READINESS_CHECK_STATUSES = ["PASS", "WARNING", "FAIL"];
/** Active → HOLD allowed from these. */
const HOLDABLE = [
    "DRAFT",
    "PREPARING",
    "READY_FOR_BROKER",
    "BROKER_REVIEW",
    "DECLARATION_PREPARING",
    "DECLARATION_FILED",
    "CUSTOMS_PROCESSING",
    "CLEARANCE_PENDING",
];
const FORWARD = {
    DRAFT: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY_FOR_BROKER", "CANCELLED"],
    READY_FOR_BROKER: ["BROKER_REVIEW", "PREPARING", "CANCELLED"],
    BROKER_REVIEW: ["DECLARATION_PREPARING", "READY_FOR_BROKER", "CANCELLED"],
    DECLARATION_PREPARING: ["DECLARATION_FILED", "BROKER_REVIEW", "CANCELLED"],
    DECLARATION_FILED: ["CUSTOMS_PROCESSING", "CANCELLED"],
    CUSTOMS_PROCESSING: ["CLEARANCE_PENDING", "CANCELLED"],
    CLEARANCE_PENDING: ["CLEARED", "CANCELLED"],
    HOLD: [], // resume via resolve_hold
    CLEARED: [],
    CANCELLED: [],
};
export function canTransitionCustomsStatus(from, to) {
    if (from === to)
        return false;
    if (to === "HOLD")
        return HOLDABLE.includes(from);
    if (from === "HOLD")
        return false; // use resolveHold
    return (FORWARD[from] ?? []).includes(to);
}
export function assertCanTransitionCustomsStatus(from, to) {
    if (!canTransitionCustomsStatus(from, to)) {
        throw new Error(`INVALID_CUSTOMS_TRANSITION:${from}->${to}`);
    }
}
export const CustomsReadinessCheckSchema = z.object({
    code: z.string(),
    status: z.enum(CUSTOMS_READINESS_CHECK_STATUSES),
    reason: z.string().nullable().optional(),
    label: z.string().optional(),
});
export const CustomsReadinessDtoSchema = z.object({
    status: z.enum(CUSTOMS_READINESS_STATUSES),
    checks: z.array(CustomsReadinessCheckSchema),
    blockingCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
});
export function summarizeReadiness(checks) {
    const blockingCount = checks.filter((c) => c.status === "FAIL").length;
    const warningCount = checks.filter((c) => c.status === "WARNING").length;
    const status = blockingCount > 0 ? "NOT_READY" : warningCount > 0 ? "PARTIALLY_READY" : "READY_FOR_BROKER";
    return { status, checks, blockingCount, warningCount };
}
export const CustomsProductLineSchema = z.object({
    purchaseOrderLineId: z.string().uuid(),
    purchaseOrderId: z.string().uuid(),
    poNumber: z.string().nullable().optional(),
    productId: z.string().uuid().nullable(),
    sku: z.string().nullable(),
    description: z.string(),
    quantity: z.number(),
    allocatedQuantity: z.number().optional(),
    countryOfOrigin: z.string().nullable().optional(),
    gtipCode: z.string().nullable().optional(),
    classificationStatus: z.string().nullable().optional(),
    classificationSource: z.string().nullable().optional(),
    customsDescription: z.string().nullable().optional(),
});
export const CustomsCaseDtoSchema = z.object({
    id: z.string().uuid(),
    organisationId: z.string().uuid(),
    shipmentWorkspaceId: z.string().uuid(),
    orderWorkspaceId: z.string().uuid(),
    status: z.enum(CUSTOMS_CASE_STATUSES),
    readinessStatus: z.enum(CUSTOMS_READINESS_STATUSES),
    destinationCountryCode: z.string().nullable().optional(),
    brokerUserId: z.string().uuid().nullable().optional(),
    brokerAssignmentId: z.string().uuid().nullable().optional(),
    declarationReference: z.string().nullable().optional(),
    declarationDate: z.string().nullable().optional(),
    customsOffice: z.string().nullable().optional(),
    statusSource: z.enum(CUSTOMS_STATUS_SOURCES),
    holdCategory: z.enum(CUSTOMS_HOLD_CATEGORIES).nullable().optional(),
    holdReason: z.string().nullable().optional(),
    holdAt: z.string().nullable().optional(),
    clearedAt: z.string().nullable().optional(),
    cancelledAt: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    shipmentRef: z.string().nullable().optional(),
    eta: z.string().nullable().optional(),
    ata: z.string().nullable().optional(),
    originPort: z.string().nullable().optional(),
    destinationPort: z.string().nullable().optional(),
    readiness: CustomsReadinessDtoSchema.optional(),
    products: z.array(CustomsProductLineSchema).optional(),
    preArrival: z.object({
        phase: z.string(),
        daysToArrival: z.number().nullable(),
        eta: z.string().nullable(),
        etaSource: z.enum(["MARITIME", "BOOKING", "NONE"]),
        bookingEta: z.string().nullable(),
        maritimeEta: z.string().nullable(),
        ata: z.string().nullable(),
        readinessStatus: z.string().nullable(),
        blockingCount: z.number(),
        warningCount: z.number(),
        urgency: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        label: z.string(),
        nextAction: z.string().nullable(),
    }).optional(),
    allowedActions: z.array(z.string()).optional(),
});
export const EnsureCustomsCaseSchema = z.object({
    shipmentWorkspaceId: z.string().uuid(),
});
export const TransitionCustomsCaseSchema = z.object({
    toStatus: z.enum(CUSTOMS_CASE_STATUSES),
    reason: z.string().trim().max(2000).optional().nullable(),
    source: z.enum(CUSTOMS_STATUS_SOURCES).optional(),
});
export const RecordDeclarationSchema = z.object({
    declarationReference: z.string().trim().min(1).max(128),
    declarationDate: z.string().datetime().optional().nullable(),
    customsOffice: z.string().trim().max(200).optional().nullable(),
    reason: z.string().trim().max(2000).optional().nullable(),
});
export const PlaceCustomsHoldSchema = z.object({
    category: z.enum(CUSTOMS_HOLD_CATEGORIES).default("OTHER"),
    reason: z.string().trim().min(3).max(2000),
});
export const ResolveCustomsHoldSchema = z.object({
    resumeStatus: z.enum(CUSTOMS_CASE_STATUSES).optional(),
    reason: z.string().trim().max(2000).optional().nullable(),
});
export const CustomsCaseListQuerySchema = z.object({
    status: z.enum(CUSTOMS_CASE_STATUSES).optional(),
    readiness: z.enum(CUSTOMS_READINESS_STATUSES).optional(),
    attention: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
});
/** Turkey eligibility helpers */
export function isTurkeyCountryCode(raw) {
    if (!raw)
        return false;
    const v = raw.trim().toUpperCase();
    return (v === "TR" ||
        v === "TUR" ||
        v === "TURKEY" ||
        v === "TÜRKİYE" ||
        v === "TURKIYE" ||
        v.includes("TURKEY") ||
        v.includes("TURKIYE"));
}
