// =============================================================================
// DeMaxtore — RFQ zod schemas (input/output contracts)
// Destination: packages/contracts/src/rfq.zod.ts
// =============================================================================
import { z } from "zod";
import { RFQ_STATES } from "./rfq.fsm.js";
import { DateTimeInput } from "./datetime-input.js";
import { CatalogIntakeDTO } from "./catalog-rfq-intake.js";
/** Allowed RFQ / quotation incoterms (EXW + FOB only). */
export const INCOTERM_VALUES = ["EXW", "FOB"];
export const Incoterm = z.enum(INCOTERM_VALUES);
export const Currency = z.enum(["USD", "EUR", "GBP"]); // FSM Decision #11
/** Sprint 11A — buyer-selected procurement strategy (required after RFQ creation). */
export const PROCUREMENT_METHOD_VALUES = ["DIRECT_RFQ", "COMMODITYBID_AUCTION"];
export const ProcurementMethod = z.enum(PROCUREMENT_METHOD_VALUES);
export const SelectProcurementStrategyInput = z.object({
    procurementMethod: ProcurementMethod,
});
/** Auction config when spawning CommodityBid from an RFQ (Sprint 11A). */
export const SpawnCommodityBidFromRfqInput = z.object({
    auctionStartsAt: DateTimeInput,
    auctionDurationMinutes: z.coerce.number().int().min(1).max(120).default(30),
    invitationDeadlineMinutes: z.number().int().positive().max(10080).default(60),
    supplierUserIds: z.array(z.string().uuid()).min(1).max(50),
});
export const LineItemInput = z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    uom: z.string().min(1).max(16),
    notes: z.string().max(1000).optional(),
});
export const CreateRfqDraftInput = z.object({
    title: z.string().min(3).max(200),
    productCategory: z.string().min(1).max(120),
    productDescription: z.string().min(10).max(5000),
    targetMarket: z.string().min(1).max(120),
    incoterm: Incoterm,
    currency: Currency,
    deadlineAt: DateTimeInput,
    lineItems: z.array(LineItemInput).min(1),
    attachmentIds: z.array(z.string().uuid()).optional(),
});
export const EditRfqDraftInput = CreateRfqDraftInput.partial();
// ── Quotation submission (Sprint 2.7 — Quotation Submission Runtime) ─────────
const optionalInt = (max) => z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v) => {
    if (v == null || v === "")
        return undefined;
    const n = typeof v === "number" ? v : Math.round(Number(String(v).replace(",", ".")));
    if (!Number.isFinite(n) || n <= 0)
        return undefined;
    return Math.trunc(n);
})
    .pipe(z.number().int().positive().max(max).optional());
export const QuotationLineItemInput = z.object({
    rfqLineItemId: z
        .union([z.string().uuid(), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v && v !== "" ? v : undefined)),
    position: z.number().int().positive(),
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    packing: z.string().max(200).nullish().transform((v) => (v && String(v).trim() ? String(v).trim() : undefined)),
    priceUnit: z.string().max(50).nullish().transform((v) => (v && String(v).trim() ? String(v).trim() : undefined)),
    moq: optionalInt(1_000_000),
});
export const SubmitQuotationPayload = z.object({
    currency: z.union([Currency, z.string()]).transform((c) => {
        const u = String(c).trim().toUpperCase();
        if (u === "USD" || u === "EUR" || u === "GBP")
            return u;
        return "USD";
    }),
    leadTimeDays: optionalInt(365),
    moq: optionalInt(1_000_000),
    incoterm: z
        .union([Incoterm, z.literal(""), z.null()])
        .optional()
        .transform((v) => (v == null || v === "" ? undefined : v)),
    paymentTerms: z
        .union([z.string().max(200), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v && String(v).trim() ? String(v).trim() : undefined)),
    sampleAvail: z.boolean().nullish().transform((v) => v ?? undefined),
    validUntil: z
        .union([z.string().datetime(), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v && v !== "" ? v : undefined)),
    notes: z
        .union([z.string().max(2000), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v && String(v).trim() ? String(v).trim() : undefined)),
    lineItems: z.array(QuotationLineItemInput).min(1),
});
/** Admin submits or revises a quotation on behalf of an assigned supplier. */
export const AdminSubmitQuotationPayload = SubmitQuotationPayload.extend({
    supplierUserId: z.string().uuid(),
});
export const ReviseQuotationPayload = SubmitQuotationPayload;
export const WithdrawQuotationPayload = z.object({
    reason: z.string().min(3).max(2000),
});
// Per-action payload schemas — used by controllers + service
export const SupplierAssignmentInput = z.object({
    supplierUserId: z.string().uuid(),
    rfqLineItemIds: z.array(z.string().uuid()).min(1).max(50),
});
export const AssignSuppliersPayload = z.object({
    supplierUserIds: z.array(z.string().uuid()).min(1).max(50).optional(),
    assignments: z.array(SupplierAssignmentInput).min(1).max(50).optional(),
}).superRefine((v, ctx) => {
    if (!v.supplierUserIds?.length && !v.assignments?.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "supplierUserIds or assignments is required",
            path: ["supplierUserIds"],
        });
    }
});
export const RemoveSupplierPayload = z.object({
    supplierUserId: z.string().uuid(),
});
export const RejectRfqPayload = z.object({ reason: z.string().min(3).max(2000) });
export const PublishRfqPayload = z.object({}).strict();
export const ExtendDeadlinePayload = z.object({
    newDeadline: z.string().datetime(),
});
export const ReopenQuotationsPayload = z.object({
    reason: z.string().min(3).max(2000),
    newDeadline: z.string().datetime(),
});
export const SelectSupplierPayload = z.object({
    supplierUserId: z.string().uuid(),
    quotationId: z.string().uuid(),
    rationale: z.string().max(2000).optional(),
});
export const RevertSelectionPayload = z.object({ reason: z.string().min(3).max(2000) });
/** Admin workflow rollback actions (return to review, unpublish, revert evaluation). */
export const AdminWorkflowRevertPayload = RevertSelectionPayload;
export const AdminSetStatePayload = z.object({
    targetState: z.enum(RFQ_STATES),
});
export const CloseWithoutAwardPayload = z.object({ reason: z.string().min(3).max(2000) });
export const RfqLineAwardStatusSchema = z.enum([
    "OPEN", "AWARDED", "NO_AWARD", "CANCELLED",
]);
export const AwardLineItemPayload = z.object({
    rfqLineItemId: z.string().uuid(),
    quotationId: z.string().uuid(),
    rationale: z.string().max(2000).optional(),
});
export const RevertLineAwardPayload = z.object({
    rfqLineItemId: z.string().uuid(),
    reason: z.string().min(3).max(2000),
});
export const MarkLineNoAwardPayload = z.object({
    rfqLineItemId: z.string().uuid(),
    reason: z.string().max(2000).optional(),
});
export const IssueSupplierPoPayload = z
    .object({
    supplierUserId: z.string().uuid(),
    mode: z.enum(["auto", "manual"]).default("auto"),
    poFileUrl: z.string().url().optional(),
})
    .superRefine((v, ctx) => {
    if (v.mode === "manual" && !v.poFileUrl) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "PO file is required for manual upload",
            path: ["poFileUrl"],
        });
    }
});
export const CloseRfqAwardsPayload = z.object({
    reason: z.string().min(3).max(2000),
    /** When true, remaining OPEN lines are marked NO_AWARD before close. */
    markRemainingNoAward: z.boolean().default(true),
});
export const RequestProformaPayload = z.object({}).strict();
export const SubmitProformaPayload = z.object({
    proformaFileUrl: z.string().url(),
});
export const DeclineProformaPayload = z.object({ reason: z.string().min(3).max(2000) });
export const ApproveProformaPayload = z.object({}).strict();
export const RejectProformaPayload = z.object({ reason: z.string().min(3).max(2000) });
/** Actions with no payload beyond ActionEnvelope.reason */
export const EmptyActionPayload = z.object({}).strict();
export const SubmitRfqPayload = EmptyActionPayload;
export const StartEvaluationPayload = EmptyActionPayload;
export const CloseQuotationsEarlyPayload = EmptyActionPayload;
export const WithdrawRfqPayload = z.object({ reason: z.string().min(3).max(2000) });
export const ReviseRejectedRfqPayload = EmptyActionPayload;
export const DeadlineReachedPayload = EmptyActionPayload;
export const DeadlineReachedNoBidsPayload = EmptyActionPayload;
export const ProformaSlaExpiredPayload = EmptyActionPayload;
export const SyncOrderClosedPayload = EmptyActionPayload;
/** PO: auto-generated by system (default) or buyer-uploaded document. */
export const IssuePoPayload = z
    .object({
    mode: z.enum(["auto", "manual"]).default("auto"),
    poFileUrl: z.string().url().optional(),
})
    .superRefine((v, ctx) => {
    if (v.mode === "manual" && !v.poFileUrl) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "PO file is required for manual upload",
            path: ["poFileUrl"],
        });
    }
});
export const CancelRfqPayload = z.object({ reason: z.string().min(3).max(2000) });
export const PostClarificationPayload = z.object({
    message: z.string().min(1).max(4000),
    replyToMessageId: z.string().uuid().optional(),
    visibility: z.enum(["ALL", "ADMIN_ONLY"]).optional(),
    mentionedUserIds: z.array(z.string().uuid()).max(20).optional(),
    attachmentIds: z.array(z.string().uuid()).max(10).optional(),
});
export const ActionEnvelope = z.object({
    idempotencyKey: z.string().uuid().optional(),
    payload: z.record(z.unknown()).optional(),
    reason: z.string().optional(),
});
// Output DTOs
export const RfqLineItemDTO = z.object({
    id: z.string().uuid(),
    position: z.number().int(),
    description: z.string(),
    quantity: z.number(),
    uom: z.string(),
    notes: z.string().nullable(),
    imageUrl: z.string().nullable().optional(),
    awardStatus: RfqLineAwardStatusSchema.default("OPEN"),
    award: z.object({
        quotationId: z.string().uuid(),
        supplierUserId: z.string().uuid(),
        supplierName: z.string().optional(),
        awardedAt: z.string().datetime(),
        rationale: z.string().nullable().optional(),
        poIssued: z.boolean().default(false),
        orderWorkspaceId: z.string().uuid().nullable().optional(),
    }).nullable().optional(),
});
export const RfqSupplierProductScopeDTO = z.object({
    supplierUserId: z.string().uuid(),
    supplierName: z.string().optional(),
    supplierEmail: z.string().optional(),
    rfqLineItemIds: z.array(z.string().uuid()),
});
export const RfqSupplierPoSpawnDTO = z.object({
    id: z.string().uuid(),
    supplierUserId: z.string().uuid(),
    supplierName: z.string().optional(),
    poNumber: z.string(),
    orderWorkspaceId: z.string().uuid(),
    issuedAt: z.string().datetime(),
    lineItemIds: z.array(z.string().uuid()),
});
export const RfqDTO = z.object({
    id: z.string().uuid(),
    externalRef: z.string(),
    /** Public URL slug when set (e.g. rawabifood → /workspace/rfq/rawabifood). */
    slug: z.string().nullable().optional(),
    state: z.string(),
    currency: Currency.nullable(),
    title: z.string(),
    productCategory: z.string(),
    productDescription: z.string(),
    targetMarket: z.string(),
    incoterm: Incoterm,
    deadlineAt: z.string().datetime().nullable(),
    deadlineExtensionCount: z.number().int(),
    deadlineExtensionTotalDays: z.number().int(),
    ownerUserId: z.string().uuid(),
    ownerName: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    lineItems: z.array(RfqLineItemDTO),
    /** Supplier-only: allowed RFQ line IDs; null/omitted = all lines. */
    allowedQuoteLineItemIds: z.array(z.string().uuid()).nullable().optional(),
    /** Admin-only: per-supplier product quote scopes. */
    supplierProductScopes: z.array(RfqSupplierProductScopeDTO).optional(),
    selectedSupplierUserId: z.string().uuid().nullable().optional(),
    poNumber: z.string().nullable().optional(),
    procurementMethod: ProcurementMethod.nullable().optional(),
    linkedCommoditybidId: z.string().uuid().nullable().optional(),
    catalogIntake: CatalogIntakeDTO.optional(),
    /** Resolved product hero image (demaxtore.com catalog or mixed-container). */
    productImageUrl: z.string().nullable().optional(),
    trashedAt: z.string().datetime().nullable().optional(),
});
export const RfqListItem = z.object({
    id: z.string().uuid(),
    externalRef: z.string(),
    slug: z.string().nullable().optional(),
    title: z.string(),
    state: z.string(),
    createdAt: z.string().datetime(),
    deadlineAt: z.string().datetime().nullable(),
    lastActivityAt: z.string().datetime(),
    ownerName: z.string(),
    currency: Currency.nullable().optional(),
    productCategory: z.string().optional(),
    lineItemCount: z.number().int().optional(),
    procurementMethod: ProcurementMethod.nullable().optional(),
    linkedCommoditybidId: z.string().uuid().nullable().optional(),
    trashedAt: z.string().datetime().nullable().optional(),
});
export const ListRfqQuery = z.object({
    state: z.string().optional(),
    view: z.enum(["active", "trash", "all"]).default("active"),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    q: z.string().max(200).optional(),
    sort: z.enum(["newest", "oldest", "deadline"]).default("newest"),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const AddObserverPayload = z.object({
    observerUserId: z.string().uuid(),
});
export const RemoveObserverPayload = z.object({
    observerUserId: z.string().uuid(),
});
