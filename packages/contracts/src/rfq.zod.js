// =============================================================================
// DeMaxtore — RFQ zod schemas (input/output contracts)
// Destination: packages/contracts/src/rfq.zod.ts
// =============================================================================
import { z } from "zod";
import { DateTimeInput } from "./datetime-input";
import { CatalogIntakeDTO } from "./catalog-rfq-intake";
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
export const QuotationLineItemInput = z.object({
    rfqLineItemId: z
        .union([z.string().uuid(), z.literal(""), z.null()])
        .optional()
        .transform((v) => (v && v !== "" ? v : undefined)),
    position: z.number().int().positive(),
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
});
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
export const ReviseQuotationPayload = SubmitQuotationPayload;
export const WithdrawQuotationPayload = z.object({
    reason: z.string().min(3).max(2000),
});
// Per-action payload schemas — used by controllers + service
export const AssignSuppliersPayload = z.object({
    supplierUserIds: z.array(z.string().uuid()).min(1).max(50),
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
export const CloseWithoutAwardPayload = z.object({ reason: z.string().min(3).max(2000) });
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
});
export const RfqDTO = z.object({
    id: z.string().uuid(),
    externalRef: z.string(),
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
    selectedSupplierUserId: z.string().uuid().nullable().optional(),
    poNumber: z.string().nullable().optional(),
    procurementMethod: ProcurementMethod.nullable().optional(),
    linkedCommoditybidId: z.string().uuid().nullable().optional(),
    catalogIntake: CatalogIntakeDTO.optional(),
});
export const RfqListItem = z.object({
    id: z.string().uuid(),
    externalRef: z.string(),
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
});
export const ListRfqQuery = z.object({
    state: z.string().optional(),
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
//# sourceMappingURL=rfq.zod.js.map