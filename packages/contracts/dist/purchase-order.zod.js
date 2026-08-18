import { z } from "zod";
import { AcknowledgementStatus, PURCHASE_ORDER_SOURCES } from "./purchase-order.js";
import { Incoterm } from "./rfq.zod.js";
/** Sprint 29-01 — typed revision snapshot (lenient; historical JSON varies). */
export const RevisionSnapshotLineSchema = z.object({
    sku: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    quantity: z.number().finite().nullable().optional(),
    unitPrice: z.number().finite().nullable().optional(),
    lineTotal: z.number().finite().nullable().optional(),
    productName: z.string().nullable().optional(),
    productCode: z.string().nullable().optional(),
    specification: z.string().nullable().optional(),
    packaging: z.string().nullable().optional(),
    unit: z.string().nullable().optional(),
});
export const PurchaseOrderRevisionSnapshotSchema = z.object({
    header: z.object({
        poNumber: z.string().nullable().optional(),
        currency: z.string().nullable().optional(),
        incoterm: z.string().nullable().optional(),
        paymentTerms: z.string().nullable().optional(),
        deliveryTerms: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        source: z.string().nullable().optional(),
        expectedDeliveryDate: z.string().nullable().optional(),
        buyerReference: z.string().nullable().optional(),
        destinationCountryCode: z.string().nullable().optional(),
        destinationCountry: z.string().nullable().optional(),
        destinationPort: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        parentPurchaseOrderId: z.string().nullable().optional(),
        directLines: z.array(RevisionSnapshotLineSchema).optional(),
    }).passthrough().default({}),
    lines: z.array(RevisionSnapshotLineSchema).default([]),
    directLines: z.array(RevisionSnapshotLineSchema).optional(),
}).passthrough();
export const PurchaseOrderRevisionActorSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
});
export const PurchaseOrderRevisionDtoSchema = z.object({
    id: z.string().uuid(),
    purchaseOrderId: z.string().uuid(),
    revisionNumber: z.number().int().positive(),
    createdById: z.string().uuid(),
    reason: z.string(),
    snapshotJson: z.record(z.unknown()),
    createdAt: z.string(),
    createdBy: PurchaseOrderRevisionActorSchema.nullable().optional(),
    isCurrent: z.boolean().optional(),
});
export const PurchaseOrderSourceSchema = z.enum(PURCHASE_ORDER_SOURCES);
export const PoLineInput = z.object({
    sku: z.string().max(64).optional(),
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
});
export const IssuePoRecordPayload = z.object({
    poNumber: z.string().min(1).max(64),
    currency: z.enum(["USD", "EUR", "GBP"]),
    incoterm: z.string().max(32).optional(),
    paymentTerms: z.string().max(200).optional(),
    deliveryTerms: z.string().max(200).optional(),
    lines: z.array(PoLineInput).min(1),
});
export const AcknowledgePoPayload = z.object({
    status: z.enum(AcknowledgementStatus),
    notes: z.string().max(2000).optional(),
    version: z.number().int().positive().optional(),
});
export const RequestAmendmentPayload = z.object({
    reason: z.string().min(3).max(2000),
    proposedLines: z.array(PoLineInput.extend({
        reason: z.string().max(500).optional(),
    })).optional(),
    version: z.number().int().positive().optional(),
});
export const ApproveAmendmentPayload = z.object({
    amendmentId: z.string().uuid(),
    reason: z.string().min(3).max(2000),
    lines: z.array(PoLineInput).min(1).optional(),
    version: z.number().int().positive(),
});
export const RejectAmendmentPayload = z.object({
    amendmentId: z.string().uuid(),
    reason: z.string().min(3).max(2000),
    version: z.number().int().positive().optional(),
});
export const ClosePoPayload = z.object({
    reason: z.string().max(2000).optional(),
    version: z.number().int().positive(),
});
export const CancelPoPayload = z.object({
    reason: z.string().min(3).max(2000),
    version: z.number().int().positive(),
});
export const SubmitPoPayload = z.object({
    reason: z.string().max(2000).optional(),
    version: z.number().int().positive(),
});
export const ApprovePoPayload = z.object({
    reason: z.string().max(2000).optional(),
    version: z.number().int().positive(),
});
export const StartExecutionPayload = z.object({
    reason: z.string().max(2000).optional(),
    version: z.number().int().positive(),
});
export const CompletePoPayload = z.object({
    reason: z.string().max(2000).optional(),
    version: z.number().int().positive(),
});
/**
 * Sprint 27 — internal / future public direct-entry line schema.
 * Persists onto existing PurchaseOrderLine columns:
 *   productName (+ optional description/spec/packaging) → description
 *   unit → sku (when sku omitted)
 *   quantity / unitPrice → quantity / unitPrice (unitPrice defaults to 0)
 */
export const DirectPurchaseOrderLineSchema = z.object({
    productName: z.string().trim().min(1).max(250),
    productCode: z.string().trim().max(100).optional().nullable(),
    description: z.string().trim().max(5000).optional().nullable(),
    specification: z.string().trim().max(5000).optional().nullable(),
    packaging: z.string().trim().max(500).optional().nullable(),
    quantity: z.number().positive().finite(),
    unit: z.string().trim().min(1).max(50),
    unitPrice: z.number().nonnegative().finite().optional().nullable(),
    /** @deprecated Prefer productCode — persisted as sku when productCode is absent. */
    sku: z.string().trim().max(64).optional().nullable(),
    /** Sprint 36B — optional Product Master reference (same-tenant validated server-side). */
    productId: z.string().uuid().optional().nullable(),
    /**
     * Sprint 36B — optional lightweight Product Master create during Direct PO.
     * When present, server creates/reuses Product and sets productId.
     */
    quickCreateProduct: z
        .object({
        sku: z.string().trim().min(1).max(64),
        name: z.string().trim().min(1).max(250).optional(),
        unitOfMeasure: z.string().trim().min(1).max(32).optional(),
        countryOfOrigin: z.string().trim().max(100).optional().nullable(),
        supplierSku: z.string().trim().max(100).optional().nullable(),
        description: z.string().trim().max(5000).optional().nullable(),
    })
        .optional()
        .nullable(),
});
export const UpdateDraftPurchaseOrderSchema = z.object({
    version: z.number().int().positive(),
    currency: z
        .string()
        .trim()
        .length(3)
        .transform((value) => value.toUpperCase())
        .optional(),
    incoterm: Incoterm.optional().nullable(),
    paymentTerms: z.string().trim().max(1000).optional().nullable(),
    deliveryTerms: z.string().trim().max(2000).optional().nullable(),
    expectedDeliveryDate: z.string().date().optional().nullable(),
    destinationCountryCode: z.string().trim().max(100).optional().nullable(),
    destinationPort: z.string().trim().max(250).optional().nullable(),
    buyerReference: z.string().trim().max(250).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
    lines: z.array(DirectPurchaseOrderLineSchema).min(1).max(200).optional(),
});
export const PoNumberModeSchema = z.enum(["AUTO", "CUSTOM"]);
const PO_NUMBER_CONTROL = /[\x00-\x1f\x7f]/;
const CreateDirectPurchaseOrderBodySchema = z.object({
    supplierId: z.string().uuid(),
    poNumberMode: PoNumberModeSchema.default("AUTO"),
    poNumber: z.string().trim().min(1).max(100).optional().nullable(),
    currency: z
        .string()
        .trim()
        .length(3)
        .transform((value) => value.toUpperCase()),
    incoterm: Incoterm.optional().nullable(),
    paymentTerms: z.string().trim().max(1000).optional().nullable(),
    deliveryTerms: z.string().trim().max(2000).optional().nullable(),
    expectedDeliveryDate: z.string().date().optional().nullable(),
    destinationCountryCode: z.string().trim().max(100).optional().nullable(),
    destinationPort: z.string().trim().max(250).optional().nullable(),
    originPort: z.string().trim().max(32).optional().nullable(),
    buyerReference: z.string().trim().max(250).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
    documentUrl: z.string().url().optional().nullable(),
    documentFileName: z.string().trim().max(255).optional().nullable(),
    lines: z.array(DirectPurchaseOrderLineSchema).min(1).max(200),
});
function refineDirectPurchaseOrderBody(data, ctx) {
    if (data.poNumberMode === "CUSTOM") {
        if (!data.poNumber?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "poNumber is required when poNumberMode is CUSTOM",
                path: ["poNumber"],
            });
        }
        else if (PO_NUMBER_CONTROL.test(data.poNumber)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "poNumber contains invalid control characters",
                path: ["poNumber"],
            });
        }
    }
    if (data.poNumberMode === "AUTO" && data.poNumber?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "poNumber must not be supplied when poNumberMode is AUTO",
            path: ["poNumber"],
        });
    }
    if (data.documentUrl && !data.documentFileName?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "documentFileName is required when documentUrl is provided",
            path: ["documentFileName"],
        });
    }
}
/** Sprint 28 — buyer-facing request body (no trusted context fields). */
export const CreateDirectPurchaseOrderPublicSchema = CreateDirectPurchaseOrderBodySchema.superRefine(refineDirectPurchaseOrderBody);
/** Sprint 27/28 — internal orchestration input (trusted context + validated body). */
export const CreateDirectPurchaseOrderSchema = CreateDirectPurchaseOrderBodySchema.extend({
    organizationWorkspaceId: z.string().uuid().optional().nullable(),
    buyerId: z.string().uuid(),
}).superRefine(refineDirectPurchaseOrderBody);
export const CreateDirectPurchaseOrderResponseSchema = z.object({
    orderId: z.string().uuid(),
    purchaseOrderId: z.string().uuid(),
    poNumber: z.string(),
    source: z.literal("DIRECT"),
    orderOrigin: z.literal("DIRECT_PO"),
    purchaseOrderStatus: z.string(),
    orderStatus: z.string(),
    documentUrl: z.string().url().optional().nullable(),
    createdAt: z.string(),
    issuedAt: z.string(),
});
export const SupplierSearchQuerySchema = z
    .object({
    search: z.string().trim().max(200).optional(),
    q: z.string().trim().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().uuid().optional(),
})
    .transform((data) => ({
    search: data.search ?? data.q,
    limit: data.limit,
    cursor: data.cursor,
}));
export const SupplierSearchItemSchema = z.object({
    id: z.string().uuid(),
    companyName: z.string(),
    countryCode: z.string().nullable().optional(),
    countryName: z.string().nullable().optional(),
    primaryContactName: z.string().nullable().optional(),
    primaryContactEmail: z.string().nullable().optional(),
    supplierCode: z.string().nullable().optional(),
});
export const CreateMinimalSupplierSchema = z.object({
    companyName: z.string().trim().min(2).max(250),
    countryCode: z
        .string()
        .trim()
        .min(2)
        .max(100),
    contactName: z.string().trim().max(250).optional().nullable(),
    email: z.string().trim().email().optional().nullable(),
    phone: z.string().trim().max(50).optional().nullable(),
    registrationNumber: z.string().trim().max(100).optional().nullable(),
    address: z.string().trim().max(2000).optional().nullable(),
    website: z.string().trim().url().optional().nullable(),
    supplierReferenceCode: z.string().trim().max(100).optional().nullable(),
});
export const PurchaseOrderSortFieldSchema = z.enum([
    "issuedAt",
    "createdAt",
    "poNumber",
    "expectedDeliveryDate",
    "supplier",
    "status",
    "total",
]);
export const PurchaseOrderListQuerySchema = z
    .object({
    search: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    source: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(["RFQ", "DIRECT", "REORDER", "API", "LEGACY"]).optional()),
    status: z.preprocess((v) => (v === "" || v == null ? undefined : v), z
        .enum([
        "DRAFT",
        "SUBMITTED",
        "APPROVED",
        "IN_EXECUTION",
        "COMPLETED",
        "CLOSED",
        "CANCELLED",
        // legacy aliases (list filters still accept them)
        "ISSUED",
        "ACKNOWLEDGED",
        "AMENDMENT_REQUESTED",
        "AMENDED",
    ])
        .optional()),
    supplierId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().uuid().optional()),
    dateFrom: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    dateTo: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    sort: PurchaseOrderSortFieldSchema.default("issuedAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
})
    .superRefine((data, ctx) => {
    if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Start date cannot be later than end date",
            path: ["dateFrom"],
        });
    }
})
    .transform((data) => ({
    ...data,
    search: data.search?.trim() ? data.search.trim() : undefined,
}));
/** Build a persistable PurchaseOrderLine.description from direct-entry fields. */
export function composeDirectPoLineDescription(line) {
    const parts = [line.productName];
    if (line.description?.trim())
        parts.push(line.description.trim());
    if (line.specification?.trim())
        parts.push(`Spec: ${line.specification.trim()}`);
    if (line.packaging?.trim())
        parts.push(`Pack: ${line.packaging.trim()}`);
    if (line.unit?.trim())
        parts.push(`Unit: ${line.unit.trim()}`);
    return parts.join(" — ").slice(0, 500);
}
