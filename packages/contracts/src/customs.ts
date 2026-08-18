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
] as const;
export type CustomsCaseStatus = (typeof CUSTOMS_CASE_STATUSES)[number];

export const CUSTOMS_STATUS_SOURCES = [
  "BUYER",
  "CUSTOMS_BROKER",
  "DEMAXTORE_OPERATIONS",
  "SYSTEM_DERIVED",
] as const;
export type CustomsStatusSource = (typeof CUSTOMS_STATUS_SOURCES)[number];

export const CUSTOMS_HOLD_CATEGORIES = [
  "DOCUMENT",
  "CLASSIFICATION",
  "BROKER_REVIEW",
  "CUSTOMS_QUERY",
  "PAYMENT",
  "OTHER",
] as const;
export type CustomsHoldCategory = (typeof CUSTOMS_HOLD_CATEGORIES)[number];

export const CUSTOMS_READINESS_STATUSES = [
  "NOT_READY",
  "PARTIALLY_READY",
  "READY_FOR_BROKER",
] as const;
export type CustomsReadinessStatus = (typeof CUSTOMS_READINESS_STATUSES)[number];

export const CUSTOMS_READINESS_CHECK_STATUSES = ["PASS", "WARNING", "FAIL"] as const;
export type CustomsReadinessCheckStatus = (typeof CUSTOMS_READINESS_CHECK_STATUSES)[number];

/** Active → HOLD allowed from these. */
const HOLDABLE: CustomsCaseStatus[] = [
  "DRAFT",
  "PREPARING",
  "READY_FOR_BROKER",
  "BROKER_REVIEW",
  "DECLARATION_PREPARING",
  "DECLARATION_FILED",
  "CUSTOMS_PROCESSING",
  "CLEARANCE_PENDING",
];

const FORWARD: Record<string, CustomsCaseStatus[]> = {
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

export function canTransitionCustomsStatus(
  from: CustomsCaseStatus,
  to: CustomsCaseStatus,
): boolean {
  if (from === to) return false;
  if (to === "HOLD") return HOLDABLE.includes(from);
  if (from === "HOLD") return false; // use resolveHold
  return (FORWARD[from] ?? []).includes(to);
}

export function assertCanTransitionCustomsStatus(
  from: CustomsCaseStatus,
  to: CustomsCaseStatus,
): void {
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
export type CustomsReadinessCheck = z.infer<typeof CustomsReadinessCheckSchema>;

export const CustomsReadinessDtoSchema = z.object({
  status: z.enum(CUSTOMS_READINESS_STATUSES),
  checks: z.array(CustomsReadinessCheckSchema),
  blockingCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
});
export type CustomsReadinessDto = z.infer<typeof CustomsReadinessDtoSchema>;

export function summarizeReadiness(checks: CustomsReadinessCheck[]): CustomsReadinessDto {
  const blockingCount = checks.filter((c) => c.status === "FAIL").length;
  const warningCount = checks.filter((c) => c.status === "WARNING").length;
  const status: CustomsReadinessStatus =
    blockingCount > 0 ? "NOT_READY" : warningCount > 0 ? "PARTIALLY_READY" : "READY_FOR_BROKER";
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
export type CustomsProductLine = z.infer<typeof CustomsProductLineSchema>;

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
export type CustomsCaseDto = z.infer<typeof CustomsCaseDtoSchema>;

export const EnsureCustomsCaseSchema = z.object({
  shipmentWorkspaceId: z.string().uuid(),
});
export type EnsureCustomsCaseInput = z.infer<typeof EnsureCustomsCaseSchema>;

export const TransitionCustomsCaseSchema = z.object({
  toStatus: z.enum(CUSTOMS_CASE_STATUSES),
  reason: z.string().trim().max(2000).optional().nullable(),
  source: z.enum(CUSTOMS_STATUS_SOURCES).optional(),
});
export type TransitionCustomsCaseInput = z.infer<typeof TransitionCustomsCaseSchema>;

export const RecordDeclarationSchema = z.object({
  declarationReference: z.string().trim().min(1).max(128),
  declarationDate: z.string().datetime().optional().nullable(),
  customsOffice: z.string().trim().max(200).optional().nullable(),
  reason: z.string().trim().max(2000).optional().nullable(),
});
export type RecordDeclarationInput = z.infer<typeof RecordDeclarationSchema>;

export const PlaceCustomsHoldSchema = z.object({
  category: z.enum(CUSTOMS_HOLD_CATEGORIES).default("OTHER"),
  reason: z.string().trim().min(3).max(2000),
});
export type PlaceCustomsHoldInput = z.infer<typeof PlaceCustomsHoldSchema>;

export const ResolveCustomsHoldSchema = z.object({
  resumeStatus: z.enum(CUSTOMS_CASE_STATUSES).optional(),
  reason: z.string().trim().max(2000).optional().nullable(),
});
export type ResolveCustomsHoldInput = z.infer<typeof ResolveCustomsHoldSchema>;

export const CustomsCaseListQuerySchema = z.object({
  status: z.enum(CUSTOMS_CASE_STATUSES).optional(),
  readiness: z.enum(CUSTOMS_READINESS_STATUSES).optional(),
  attention: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});
export type CustomsCaseListQuery = z.infer<typeof CustomsCaseListQuerySchema>;

/** Turkey eligibility helpers */
export function isTurkeyCountryCode(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toUpperCase();
  return (
    v === "TR" ||
    v === "TUR" ||
    v === "TURKEY" ||
    v === "TÜRKİYE" ||
    v === "TURKIYE" ||
    v.includes("TURKEY") ||
    v.includes("TURKIYE")
  );
}
