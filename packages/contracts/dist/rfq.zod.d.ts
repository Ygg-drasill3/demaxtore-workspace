import { z } from "zod";
/** Allowed RFQ / quotation incoterms (EXW + FOB only). */
export declare const INCOTERM_VALUES: readonly ["EXW", "FOB"];
export declare const Incoterm: z.ZodEnum<["EXW", "FOB"]>;
export declare const Currency: z.ZodEnum<["USD", "EUR", "GBP"]>;
/** Sprint 11A — buyer-selected procurement strategy (required after RFQ creation). */
export declare const PROCUREMENT_METHOD_VALUES: readonly ["DIRECT_RFQ", "COMMODITYBID_AUCTION"];
export declare const ProcurementMethod: z.ZodEnum<["DIRECT_RFQ", "COMMODITYBID_AUCTION"]>;
export type ProcurementMethod = z.infer<typeof ProcurementMethod>;
export declare const SelectProcurementStrategyInput: z.ZodObject<{
    procurementMethod: z.ZodEnum<["DIRECT_RFQ", "COMMODITYBID_AUCTION"]>;
}, "strip", z.ZodTypeAny, {
    procurementMethod: "DIRECT_RFQ" | "COMMODITYBID_AUCTION";
}, {
    procurementMethod: "DIRECT_RFQ" | "COMMODITYBID_AUCTION";
}>;
export type SelectProcurementStrategyInput = z.infer<typeof SelectProcurementStrategyInput>;
/** Auction config when spawning CommodityBid from an RFQ (Sprint 11A). */
export declare const SpawnCommodityBidFromRfqInput: z.ZodObject<{
    auctionStartsAt: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    auctionDurationMinutes: z.ZodDefault<z.ZodNumber>;
    invitationDeadlineMinutes: z.ZodDefault<z.ZodNumber>;
    supplierUserIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    auctionStartsAt: string;
    auctionDurationMinutes: number;
    invitationDeadlineMinutes: number;
    supplierUserIds: string[];
}, {
    auctionStartsAt: string;
    supplierUserIds: string[];
    auctionDurationMinutes?: number | undefined;
    invitationDeadlineMinutes?: number | undefined;
}>;
export type SpawnCommodityBidFromRfqInput = z.infer<typeof SpawnCommodityBidFromRfqInput>;
export declare const LineItemInput: z.ZodObject<{
    description: z.ZodString;
    quantity: z.ZodNumber;
    uom: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    quantity: number;
    uom: string;
    notes?: string | undefined;
}, {
    description: string;
    quantity: number;
    uom: string;
    notes?: string | undefined;
}>;
export declare const CreateRfqDraftInput: z.ZodObject<{
    title: z.ZodString;
    productCategory: z.ZodString;
    productDescription: z.ZodString;
    targetMarket: z.ZodString;
    incoterm: z.ZodEnum<["EXW", "FOB"]>;
    currency: z.ZodEnum<["USD", "EUR", "GBP"]>;
    deadlineAt: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    lineItems: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        quantity: z.ZodNumber;
        uom: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        uom: string;
        notes?: string | undefined;
    }, {
        description: string;
        quantity: number;
        uom: string;
        notes?: string | undefined;
    }>, "many">;
    attachmentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    currency: "USD" | "EUR" | "GBP";
    title: string;
    productCategory: string;
    targetMarket: string;
    incoterm: "EXW" | "FOB";
    productDescription: string;
    deadlineAt: string;
    lineItems: {
        description: string;
        quantity: number;
        uom: string;
        notes?: string | undefined;
    }[];
    attachmentIds?: string[] | undefined;
}, {
    currency: "USD" | "EUR" | "GBP";
    title: string;
    productCategory: string;
    targetMarket: string;
    incoterm: "EXW" | "FOB";
    productDescription: string;
    deadlineAt: string;
    lineItems: {
        description: string;
        quantity: number;
        uom: string;
        notes?: string | undefined;
    }[];
    attachmentIds?: string[] | undefined;
}>;
export type CreateRfqDraftInput = z.infer<typeof CreateRfqDraftInput>;
export declare const EditRfqDraftInput: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    productCategory: z.ZodOptional<z.ZodString>;
    productDescription: z.ZodOptional<z.ZodString>;
    targetMarket: z.ZodOptional<z.ZodString>;
    incoterm: z.ZodOptional<z.ZodEnum<["EXW", "FOB"]>>;
    currency: z.ZodOptional<z.ZodEnum<["USD", "EUR", "GBP"]>>;
    deadlineAt: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    lineItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        quantity: z.ZodNumber;
        uom: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        quantity: number;
        uom: string;
        notes?: string | undefined;
    }, {
        description: string;
        quantity: number;
        uom: string;
        notes?: string | undefined;
    }>, "many">>;
    attachmentIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    currency?: "USD" | "EUR" | "GBP" | undefined;
    title?: string | undefined;
    productCategory?: string | undefined;
    targetMarket?: string | undefined;
    attachmentIds?: string[] | undefined;
    incoterm?: "EXW" | "FOB" | undefined;
    productDescription?: string | undefined;
    deadlineAt?: string | undefined;
    lineItems?: {
        description: string;
        quantity: number;
        uom: string;
        notes?: string | undefined;
    }[] | undefined;
}, {
    currency?: "USD" | "EUR" | "GBP" | undefined;
    title?: string | undefined;
    productCategory?: string | undefined;
    targetMarket?: string | undefined;
    attachmentIds?: string[] | undefined;
    incoterm?: "EXW" | "FOB" | undefined;
    productDescription?: string | undefined;
    deadlineAt?: string | undefined;
    lineItems?: {
        description: string;
        quantity: number;
        uom: string;
        notes?: string | undefined;
    }[] | undefined;
}>;
export declare const QuotationLineItemInput: z.ZodObject<{
    rfqLineItemId: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
    position: z.ZodNumber;
    description: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    packing: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
    priceUnit: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
    moq: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>, number | undefined, string | number | null | undefined>, z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    unitPrice: number;
    quantity: number;
    position: number;
    moq?: number | undefined;
    rfqLineItemId?: string | undefined;
    packing?: string | undefined;
    priceUnit?: string | undefined;
}, {
    description: string;
    unitPrice: number;
    quantity: number;
    position: number;
    moq?: string | number | null | undefined;
    rfqLineItemId?: string | null | undefined;
    packing?: string | null | undefined;
    priceUnit?: string | null | undefined;
}>;
export type QuotationLineItemInput = z.infer<typeof QuotationLineItemInput>;
export declare const SubmitQuotationPayload: z.ZodObject<{
    currency: z.ZodEffects<z.ZodUnion<[z.ZodEnum<["USD", "EUR", "GBP"]>, z.ZodString]>, "USD" | "EUR" | "GBP", string>;
    leadTimeDays: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>, number | undefined, string | number | null | undefined>, z.ZodOptional<z.ZodNumber>>;
    moq: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>, number | undefined, string | number | null | undefined>, z.ZodOptional<z.ZodNumber>>;
    incoterm: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodEnum<["EXW", "FOB"]>, z.ZodLiteral<"">, z.ZodNull]>>, "EXW" | "FOB" | undefined, "" | "EXW" | "FOB" | null | undefined>;
    paymentTerms: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
    sampleAvail: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>, boolean | undefined, boolean | null | undefined>;
    validUntil: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
    notes: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
    lineItems: z.ZodArray<z.ZodObject<{
        rfqLineItemId: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
        position: z.ZodNumber;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        packing: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
        priceUnit: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
        moq: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>, number | undefined, string | number | null | undefined>, z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: number | undefined;
        rfqLineItemId?: string | undefined;
        packing?: string | undefined;
        priceUnit?: string | undefined;
    }, {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: string | number | null | undefined;
        rfqLineItemId?: string | null | undefined;
        packing?: string | null | undefined;
        priceUnit?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    currency: "USD" | "EUR" | "GBP";
    lineItems: {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: number | undefined;
        rfqLineItemId?: string | undefined;
        packing?: string | undefined;
        priceUnit?: string | undefined;
    }[];
    notes?: string | undefined;
    validUntil?: string | undefined;
    leadTimeDays?: number | undefined;
    moq?: number | undefined;
    paymentTerms?: string | undefined;
    incoterm?: "EXW" | "FOB" | undefined;
    sampleAvail?: boolean | undefined;
}, {
    currency: string;
    lineItems: {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: string | number | null | undefined;
        rfqLineItemId?: string | null | undefined;
        packing?: string | null | undefined;
        priceUnit?: string | null | undefined;
    }[];
    notes?: string | null | undefined;
    validUntil?: string | null | undefined;
    leadTimeDays?: string | number | null | undefined;
    moq?: string | number | null | undefined;
    paymentTerms?: string | null | undefined;
    incoterm?: "" | "EXW" | "FOB" | null | undefined;
    sampleAvail?: boolean | null | undefined;
}>;
export type SubmitQuotationPayload = z.infer<typeof SubmitQuotationPayload>;
/** Admin submits or revises a quotation on behalf of an assigned supplier. */
export declare const AdminSubmitQuotationPayload: z.ZodObject<{
    currency: z.ZodEffects<z.ZodUnion<[z.ZodEnum<["USD", "EUR", "GBP"]>, z.ZodString]>, "USD" | "EUR" | "GBP", string>;
    leadTimeDays: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>, number | undefined, string | number | null | undefined>, z.ZodOptional<z.ZodNumber>>;
    moq: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>, number | undefined, string | number | null | undefined>, z.ZodOptional<z.ZodNumber>>;
    incoterm: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodEnum<["EXW", "FOB"]>, z.ZodLiteral<"">, z.ZodNull]>>, "EXW" | "FOB" | undefined, "" | "EXW" | "FOB" | null | undefined>;
    paymentTerms: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
    sampleAvail: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>, boolean | undefined, boolean | null | undefined>;
    validUntil: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
    notes: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
    lineItems: z.ZodArray<z.ZodObject<{
        rfqLineItemId: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
        position: z.ZodNumber;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        packing: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
        priceUnit: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
        moq: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>, number | undefined, string | number | null | undefined>, z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: number | undefined;
        rfqLineItemId?: string | undefined;
        packing?: string | undefined;
        priceUnit?: string | undefined;
    }, {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: string | number | null | undefined;
        rfqLineItemId?: string | null | undefined;
        packing?: string | null | undefined;
        priceUnit?: string | null | undefined;
    }>, "many">;
} & {
    supplierUserId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: "USD" | "EUR" | "GBP";
    supplierUserId: string;
    lineItems: {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: number | undefined;
        rfqLineItemId?: string | undefined;
        packing?: string | undefined;
        priceUnit?: string | undefined;
    }[];
    notes?: string | undefined;
    validUntil?: string | undefined;
    leadTimeDays?: number | undefined;
    moq?: number | undefined;
    paymentTerms?: string | undefined;
    incoterm?: "EXW" | "FOB" | undefined;
    sampleAvail?: boolean | undefined;
}, {
    currency: string;
    supplierUserId: string;
    lineItems: {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: string | number | null | undefined;
        rfqLineItemId?: string | null | undefined;
        packing?: string | null | undefined;
        priceUnit?: string | null | undefined;
    }[];
    notes?: string | null | undefined;
    validUntil?: string | null | undefined;
    leadTimeDays?: string | number | null | undefined;
    moq?: string | number | null | undefined;
    paymentTerms?: string | null | undefined;
    incoterm?: "" | "EXW" | "FOB" | null | undefined;
    sampleAvail?: boolean | null | undefined;
}>;
export type AdminSubmitQuotationPayload = z.infer<typeof AdminSubmitQuotationPayload>;
export declare const ReviseQuotationPayload: z.ZodObject<{
    currency: z.ZodEffects<z.ZodUnion<[z.ZodEnum<["USD", "EUR", "GBP"]>, z.ZodString]>, "USD" | "EUR" | "GBP", string>;
    leadTimeDays: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>, number | undefined, string | number | null | undefined>, z.ZodOptional<z.ZodNumber>>;
    moq: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>, number | undefined, string | number | null | undefined>, z.ZodOptional<z.ZodNumber>>;
    incoterm: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodEnum<["EXW", "FOB"]>, z.ZodLiteral<"">, z.ZodNull]>>, "EXW" | "FOB" | undefined, "" | "EXW" | "FOB" | null | undefined>;
    paymentTerms: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
    sampleAvail: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>, boolean | undefined, boolean | null | undefined>;
    validUntil: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
    notes: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
    lineItems: z.ZodArray<z.ZodObject<{
        rfqLineItemId: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">, z.ZodNull]>>, string | undefined, string | null | undefined>;
        position: z.ZodNumber;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        packing: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
        priceUnit: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
        moq: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodNull]>>, number | undefined, string | number | null | undefined>, z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: number | undefined;
        rfqLineItemId?: string | undefined;
        packing?: string | undefined;
        priceUnit?: string | undefined;
    }, {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: string | number | null | undefined;
        rfqLineItemId?: string | null | undefined;
        packing?: string | null | undefined;
        priceUnit?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    currency: "USD" | "EUR" | "GBP";
    lineItems: {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: number | undefined;
        rfqLineItemId?: string | undefined;
        packing?: string | undefined;
        priceUnit?: string | undefined;
    }[];
    notes?: string | undefined;
    validUntil?: string | undefined;
    leadTimeDays?: number | undefined;
    moq?: number | undefined;
    paymentTerms?: string | undefined;
    incoterm?: "EXW" | "FOB" | undefined;
    sampleAvail?: boolean | undefined;
}, {
    currency: string;
    lineItems: {
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        moq?: string | number | null | undefined;
        rfqLineItemId?: string | null | undefined;
        packing?: string | null | undefined;
        priceUnit?: string | null | undefined;
    }[];
    notes?: string | null | undefined;
    validUntil?: string | null | undefined;
    leadTimeDays?: string | number | null | undefined;
    moq?: string | number | null | undefined;
    paymentTerms?: string | null | undefined;
    incoterm?: "" | "EXW" | "FOB" | null | undefined;
    sampleAvail?: boolean | null | undefined;
}>;
export type ReviseQuotationPayload = z.infer<typeof ReviseQuotationPayload>;
export declare const WithdrawQuotationPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type WithdrawQuotationPayload = z.infer<typeof WithdrawQuotationPayload>;
export type EditRfqDraftInput = z.infer<typeof EditRfqDraftInput>;
export declare const SupplierAssignmentInput: z.ZodObject<{
    supplierUserId: z.ZodString;
    rfqLineItemIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    supplierUserId: string;
    rfqLineItemIds: string[];
}, {
    supplierUserId: string;
    rfqLineItemIds: string[];
}>;
export declare const AssignSuppliersPayload: z.ZodEffects<z.ZodObject<{
    supplierUserIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    assignments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        supplierUserId: z.ZodString;
        rfqLineItemIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        supplierUserId: string;
        rfqLineItemIds: string[];
    }, {
        supplierUserId: string;
        rfqLineItemIds: string[];
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    supplierUserIds?: string[] | undefined;
    assignments?: {
        supplierUserId: string;
        rfqLineItemIds: string[];
    }[] | undefined;
}, {
    supplierUserIds?: string[] | undefined;
    assignments?: {
        supplierUserId: string;
        rfqLineItemIds: string[];
    }[] | undefined;
}>, {
    supplierUserIds?: string[] | undefined;
    assignments?: {
        supplierUserId: string;
        rfqLineItemIds: string[];
    }[] | undefined;
}, {
    supplierUserIds?: string[] | undefined;
    assignments?: {
        supplierUserId: string;
        rfqLineItemIds: string[];
    }[] | undefined;
}>;
export declare const RemoveSupplierPayload: z.ZodObject<{
    supplierUserId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    supplierUserId: string;
}, {
    supplierUserId: string;
}>;
export declare const RejectRfqPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const PublishRfqPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const ExtendDeadlinePayload: z.ZodObject<{
    newDeadline: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newDeadline: string;
}, {
    newDeadline: string;
}>;
export declare const ReopenQuotationsPayload: z.ZodObject<{
    reason: z.ZodString;
    newDeadline: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    newDeadline: string;
}, {
    reason: string;
    newDeadline: string;
}>;
export declare const SelectSupplierPayload: z.ZodObject<{
    supplierUserId: z.ZodString;
    quotationId: z.ZodString;
    rationale: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    supplierUserId: string;
    quotationId: string;
    rationale?: string | undefined;
}, {
    supplierUserId: string;
    quotationId: string;
    rationale?: string | undefined;
}>;
export declare const RevertSelectionPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type RevertSelectionPayload = z.infer<typeof RevertSelectionPayload>;
/** Admin workflow rollback actions (return to review, unpublish, revert evaluation). */
export declare const AdminWorkflowRevertPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type AdminWorkflowRevertPayload = z.infer<typeof AdminWorkflowRevertPayload>;
export declare const AdminSetStatePayload: z.ZodObject<{
    targetState: z.ZodEnum<["RFQ_DRAFT", "RFQ_SUBMITTED", "REJECTED_BY_ADMIN", "SUPPLIERS_ASSIGNED", "RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION", "PARTIALLY_AWARDED", "FULLY_AWARDED", "SUPPLIER_SELECTED", "PROFORMA_REQUESTED", "PROFORMA_RECEIVED", "PROFORMA_APPROVED", "PO_ISSUED", "CLOSED", "CANCELLED", "EXPIRED", "CLOSED_NO_AWARD"]>;
}, "strip", z.ZodTypeAny, {
    targetState: "CANCELLED" | "CLOSED" | "EXPIRED" | "CLOSED_NO_AWARD" | "SUPPLIER_SELECTED" | "RFQ_OPEN" | "RFQ_DRAFT" | "RFQ_SUBMITTED" | "REJECTED_BY_ADMIN" | "SUPPLIERS_ASSIGNED" | "QUOTATIONS_CLOSED" | "UNDER_EVALUATION" | "PARTIALLY_AWARDED" | "FULLY_AWARDED" | "PROFORMA_REQUESTED" | "PROFORMA_RECEIVED" | "PROFORMA_APPROVED" | "PO_ISSUED";
}, {
    targetState: "CANCELLED" | "CLOSED" | "EXPIRED" | "CLOSED_NO_AWARD" | "SUPPLIER_SELECTED" | "RFQ_OPEN" | "RFQ_DRAFT" | "RFQ_SUBMITTED" | "REJECTED_BY_ADMIN" | "SUPPLIERS_ASSIGNED" | "QUOTATIONS_CLOSED" | "UNDER_EVALUATION" | "PARTIALLY_AWARDED" | "FULLY_AWARDED" | "PROFORMA_REQUESTED" | "PROFORMA_RECEIVED" | "PROFORMA_APPROVED" | "PO_ISSUED";
}>;
export type AdminSetStatePayload = z.infer<typeof AdminSetStatePayload>;
export declare const CloseWithoutAwardPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const RfqLineAwardStatusSchema: z.ZodEnum<["OPEN", "AWARDED", "NO_AWARD", "CANCELLED"]>;
export declare const AwardLineItemPayload: z.ZodObject<{
    rfqLineItemId: z.ZodString;
    quotationId: z.ZodString;
    rationale: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rfqLineItemId: string;
    quotationId: string;
    rationale?: string | undefined;
}, {
    rfqLineItemId: string;
    quotationId: string;
    rationale?: string | undefined;
}>;
export declare const RevertLineAwardPayload: z.ZodObject<{
    rfqLineItemId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    rfqLineItemId: string;
}, {
    reason: string;
    rfqLineItemId: string;
}>;
export declare const MarkLineNoAwardPayload: z.ZodObject<{
    rfqLineItemId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rfqLineItemId: string;
    reason?: string | undefined;
}, {
    rfqLineItemId: string;
    reason?: string | undefined;
}>;
export declare const IssueSupplierPoPayload: z.ZodEffects<z.ZodObject<{
    supplierUserId: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<["auto", "manual"]>>;
    poFileUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    supplierUserId: string;
    mode: "auto" | "manual";
    poFileUrl?: string | undefined;
}, {
    supplierUserId: string;
    mode?: "auto" | "manual" | undefined;
    poFileUrl?: string | undefined;
}>, {
    supplierUserId: string;
    mode: "auto" | "manual";
    poFileUrl?: string | undefined;
}, {
    supplierUserId: string;
    mode?: "auto" | "manual" | undefined;
    poFileUrl?: string | undefined;
}>;
export declare const CloseRfqAwardsPayload: z.ZodObject<{
    reason: z.ZodString;
    /** When true, remaining OPEN lines are marked NO_AWARD before close. */
    markRemainingNoAward: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    markRemainingNoAward: boolean;
}, {
    reason: string;
    markRemainingNoAward?: boolean | undefined;
}>;
export declare const RequestProformaPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const SubmitProformaPayload: z.ZodObject<{
    proformaFileUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    proformaFileUrl: string;
}, {
    proformaFileUrl: string;
}>;
export declare const DeclineProformaPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const ApproveProformaPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const RejectProformaPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
/** Actions with no payload beyond ActionEnvelope.reason */
export declare const EmptyActionPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const SubmitRfqPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const StartEvaluationPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const CloseQuotationsEarlyPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const WithdrawRfqPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const ReviseRejectedRfqPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const DeadlineReachedPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const DeadlineReachedNoBidsPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const ProformaSlaExpiredPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const SyncOrderClosedPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
/** PO: auto-generated by system (default) or buyer-uploaded document. */
export declare const IssuePoPayload: z.ZodEffects<z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["auto", "manual"]>>;
    poFileUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mode: "auto" | "manual";
    poFileUrl?: string | undefined;
}, {
    mode?: "auto" | "manual" | undefined;
    poFileUrl?: string | undefined;
}>, {
    mode: "auto" | "manual";
    poFileUrl?: string | undefined;
}, {
    mode?: "auto" | "manual" | undefined;
    poFileUrl?: string | undefined;
}>;
export declare const CancelRfqPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const PostClarificationPayload: z.ZodObject<{
    message: z.ZodString;
    replyToMessageId: z.ZodOptional<z.ZodString>;
    visibility: z.ZodOptional<z.ZodEnum<["ALL", "ADMIN_ONLY"]>>;
    mentionedUserIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    attachmentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    message: string;
    visibility?: "ADMIN_ONLY" | "ALL" | undefined;
    attachmentIds?: string[] | undefined;
    mentionedUserIds?: string[] | undefined;
    replyToMessageId?: string | undefined;
}, {
    message: string;
    visibility?: "ADMIN_ONLY" | "ALL" | undefined;
    attachmentIds?: string[] | undefined;
    mentionedUserIds?: string[] | undefined;
    replyToMessageId?: string | undefined;
}>;
export declare const ActionEnvelope: z.ZodObject<{
    idempotencyKey: z.ZodOptional<z.ZodString>;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
    payload?: Record<string, unknown> | undefined;
    idempotencyKey?: string | undefined;
}, {
    reason?: string | undefined;
    payload?: Record<string, unknown> | undefined;
    idempotencyKey?: string | undefined;
}>;
export declare const RfqLineItemDTO: z.ZodObject<{
    id: z.ZodString;
    position: z.ZodNumber;
    description: z.ZodString;
    quantity: z.ZodNumber;
    uom: z.ZodString;
    notes: z.ZodNullable<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    awardStatus: z.ZodDefault<z.ZodEnum<["OPEN", "AWARDED", "NO_AWARD", "CANCELLED"]>>;
    award: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        quotationId: z.ZodString;
        supplierUserId: z.ZodString;
        supplierName: z.ZodOptional<z.ZodString>;
        awardedAt: z.ZodString;
        rationale: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        poIssued: z.ZodDefault<z.ZodBoolean>;
        orderWorkspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        supplierUserId: string;
        quotationId: string;
        awardedAt: string;
        poIssued: boolean;
        orderWorkspaceId?: string | null | undefined;
        rationale?: string | null | undefined;
        supplierName?: string | undefined;
    }, {
        supplierUserId: string;
        quotationId: string;
        awardedAt: string;
        orderWorkspaceId?: string | null | undefined;
        rationale?: string | null | undefined;
        supplierName?: string | undefined;
        poIssued?: boolean | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    notes: string | null;
    quantity: number;
    uom: string;
    position: number;
    awardStatus: "CANCELLED" | "OPEN" | "AWARDED" | "NO_AWARD";
    imageUrl?: string | null | undefined;
    award?: {
        supplierUserId: string;
        quotationId: string;
        awardedAt: string;
        poIssued: boolean;
        orderWorkspaceId?: string | null | undefined;
        rationale?: string | null | undefined;
        supplierName?: string | undefined;
    } | null | undefined;
}, {
    id: string;
    description: string;
    notes: string | null;
    quantity: number;
    uom: string;
    position: number;
    imageUrl?: string | null | undefined;
    awardStatus?: "CANCELLED" | "OPEN" | "AWARDED" | "NO_AWARD" | undefined;
    award?: {
        supplierUserId: string;
        quotationId: string;
        awardedAt: string;
        orderWorkspaceId?: string | null | undefined;
        rationale?: string | null | undefined;
        supplierName?: string | undefined;
        poIssued?: boolean | undefined;
    } | null | undefined;
}>;
export declare const RfqSupplierProductScopeDTO: z.ZodObject<{
    supplierUserId: z.ZodString;
    supplierName: z.ZodOptional<z.ZodString>;
    supplierEmail: z.ZodOptional<z.ZodString>;
    rfqLineItemIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    supplierUserId: string;
    rfqLineItemIds: string[];
    supplierName?: string | undefined;
    supplierEmail?: string | undefined;
}, {
    supplierUserId: string;
    rfqLineItemIds: string[];
    supplierName?: string | undefined;
    supplierEmail?: string | undefined;
}>;
export declare const RfqSupplierPoSpawnDTO: z.ZodObject<{
    id: z.ZodString;
    supplierUserId: z.ZodString;
    supplierName: z.ZodOptional<z.ZodString>;
    poNumber: z.ZodString;
    orderWorkspaceId: z.ZodString;
    issuedAt: z.ZodString;
    lineItemIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    supplierUserId: string;
    poNumber: string;
    orderWorkspaceId: string;
    issuedAt: string;
    lineItemIds: string[];
    supplierName?: string | undefined;
}, {
    id: string;
    supplierUserId: string;
    poNumber: string;
    orderWorkspaceId: string;
    issuedAt: string;
    lineItemIds: string[];
    supplierName?: string | undefined;
}>;
export declare const RfqDTO: z.ZodObject<{
    id: z.ZodString;
    externalRef: z.ZodString;
    /** Public URL slug when set (e.g. rawabifood → /workspace/rfq/rawabifood). */
    slug: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    state: z.ZodString;
    currency: z.ZodNullable<z.ZodEnum<["USD", "EUR", "GBP"]>>;
    title: z.ZodString;
    productCategory: z.ZodString;
    productDescription: z.ZodString;
    targetMarket: z.ZodString;
    incoterm: z.ZodEnum<["EXW", "FOB"]>;
    deadlineAt: z.ZodNullable<z.ZodString>;
    deadlineExtensionCount: z.ZodNumber;
    deadlineExtensionTotalDays: z.ZodNumber;
    ownerUserId: z.ZodString;
    ownerName: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    lineItems: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        position: z.ZodNumber;
        description: z.ZodString;
        quantity: z.ZodNumber;
        uom: z.ZodString;
        notes: z.ZodNullable<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        awardStatus: z.ZodDefault<z.ZodEnum<["OPEN", "AWARDED", "NO_AWARD", "CANCELLED"]>>;
        award: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            quotationId: z.ZodString;
            supplierUserId: z.ZodString;
            supplierName: z.ZodOptional<z.ZodString>;
            awardedAt: z.ZodString;
            rationale: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            poIssued: z.ZodDefault<z.ZodBoolean>;
            orderWorkspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            supplierUserId: string;
            quotationId: string;
            awardedAt: string;
            poIssued: boolean;
            orderWorkspaceId?: string | null | undefined;
            rationale?: string | null | undefined;
            supplierName?: string | undefined;
        }, {
            supplierUserId: string;
            quotationId: string;
            awardedAt: string;
            orderWorkspaceId?: string | null | undefined;
            rationale?: string | null | undefined;
            supplierName?: string | undefined;
            poIssued?: boolean | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        notes: string | null;
        quantity: number;
        uom: string;
        position: number;
        awardStatus: "CANCELLED" | "OPEN" | "AWARDED" | "NO_AWARD";
        imageUrl?: string | null | undefined;
        award?: {
            supplierUserId: string;
            quotationId: string;
            awardedAt: string;
            poIssued: boolean;
            orderWorkspaceId?: string | null | undefined;
            rationale?: string | null | undefined;
            supplierName?: string | undefined;
        } | null | undefined;
    }, {
        id: string;
        description: string;
        notes: string | null;
        quantity: number;
        uom: string;
        position: number;
        imageUrl?: string | null | undefined;
        awardStatus?: "CANCELLED" | "OPEN" | "AWARDED" | "NO_AWARD" | undefined;
        award?: {
            supplierUserId: string;
            quotationId: string;
            awardedAt: string;
            orderWorkspaceId?: string | null | undefined;
            rationale?: string | null | undefined;
            supplierName?: string | undefined;
            poIssued?: boolean | undefined;
        } | null | undefined;
    }>, "many">;
    /** Supplier-only: allowed RFQ line IDs; null/omitted = all lines. */
    allowedQuoteLineItemIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    /** Admin-only: per-supplier product quote scopes. */
    supplierProductScopes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        supplierUserId: z.ZodString;
        supplierName: z.ZodOptional<z.ZodString>;
        supplierEmail: z.ZodOptional<z.ZodString>;
        rfqLineItemIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        supplierUserId: string;
        rfqLineItemIds: string[];
        supplierName?: string | undefined;
        supplierEmail?: string | undefined;
    }, {
        supplierUserId: string;
        rfqLineItemIds: string[];
        supplierName?: string | undefined;
        supplierEmail?: string | undefined;
    }>, "many">>;
    selectedSupplierUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    procurementMethod: z.ZodOptional<z.ZodNullable<z.ZodEnum<["DIRECT_RFQ", "COMMODITYBID_AUCTION"]>>>;
    linkedCommoditybidId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    catalogIntake: z.ZodOptional<z.ZodObject<{
        productOrService: z.ZodOptional<z.ZodString>;
        deliveryLocation: z.ZodOptional<z.ZodString>;
        quantity: z.ZodOptional<z.ZodString>;
        supplierType: z.ZodOptional<z.ZodString>;
        requestDetails: z.ZodOptional<z.ZodString>;
        businessEmail: z.ZodOptional<z.ZodString>;
        companyName: z.ZodOptional<z.ZodString>;
        contactPerson: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        sessionId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        phone?: string | undefined;
        productOrService?: string | undefined;
        deliveryLocation?: string | undefined;
        quantity?: string | undefined;
        supplierType?: string | undefined;
        requestDetails?: string | undefined;
        businessEmail?: string | undefined;
        companyName?: string | undefined;
        contactPerson?: string | undefined;
        sessionId?: string | undefined;
    }, {
        phone?: string | undefined;
        productOrService?: string | undefined;
        deliveryLocation?: string | undefined;
        quantity?: string | undefined;
        supplierType?: string | undefined;
        requestDetails?: string | undefined;
        businessEmail?: string | undefined;
        companyName?: string | undefined;
        contactPerson?: string | undefined;
        sessionId?: string | undefined;
    }>>;
    /** Resolved product hero image (demaxtore.com catalog or mixed-container). */
    productImageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    trashedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    currency: "USD" | "EUR" | "GBP" | null;
    externalRef: string;
    state: string;
    ownerUserId: string;
    ownerName: string;
    updatedAt: string;
    title: string;
    productCategory: string;
    targetMarket: string;
    incoterm: "EXW" | "FOB";
    productDescription: string;
    deadlineAt: string | null;
    lineItems: {
        id: string;
        description: string;
        notes: string | null;
        quantity: number;
        uom: string;
        position: number;
        awardStatus: "CANCELLED" | "OPEN" | "AWARDED" | "NO_AWARD";
        imageUrl?: string | null | undefined;
        award?: {
            supplierUserId: string;
            quotationId: string;
            awardedAt: string;
            poIssued: boolean;
            orderWorkspaceId?: string | null | undefined;
            rationale?: string | null | undefined;
            supplierName?: string | undefined;
        } | null | undefined;
    }[];
    deadlineExtensionCount: number;
    deadlineExtensionTotalDays: number;
    slug?: string | null | undefined;
    poNumber?: string | null | undefined;
    procurementMethod?: "DIRECT_RFQ" | "COMMODITYBID_AUCTION" | null | undefined;
    allowedQuoteLineItemIds?: string[] | null | undefined;
    supplierProductScopes?: {
        supplierUserId: string;
        rfqLineItemIds: string[];
        supplierName?: string | undefined;
        supplierEmail?: string | undefined;
    }[] | undefined;
    selectedSupplierUserId?: string | null | undefined;
    linkedCommoditybidId?: string | null | undefined;
    catalogIntake?: {
        phone?: string | undefined;
        productOrService?: string | undefined;
        deliveryLocation?: string | undefined;
        quantity?: string | undefined;
        supplierType?: string | undefined;
        requestDetails?: string | undefined;
        businessEmail?: string | undefined;
        companyName?: string | undefined;
        contactPerson?: string | undefined;
        sessionId?: string | undefined;
    } | undefined;
    productImageUrl?: string | null | undefined;
    trashedAt?: string | null | undefined;
}, {
    id: string;
    createdAt: string;
    currency: "USD" | "EUR" | "GBP" | null;
    externalRef: string;
    state: string;
    ownerUserId: string;
    ownerName: string;
    updatedAt: string;
    title: string;
    productCategory: string;
    targetMarket: string;
    incoterm: "EXW" | "FOB";
    productDescription: string;
    deadlineAt: string | null;
    lineItems: {
        id: string;
        description: string;
        notes: string | null;
        quantity: number;
        uom: string;
        position: number;
        imageUrl?: string | null | undefined;
        awardStatus?: "CANCELLED" | "OPEN" | "AWARDED" | "NO_AWARD" | undefined;
        award?: {
            supplierUserId: string;
            quotationId: string;
            awardedAt: string;
            orderWorkspaceId?: string | null | undefined;
            rationale?: string | null | undefined;
            supplierName?: string | undefined;
            poIssued?: boolean | undefined;
        } | null | undefined;
    }[];
    deadlineExtensionCount: number;
    deadlineExtensionTotalDays: number;
    slug?: string | null | undefined;
    poNumber?: string | null | undefined;
    procurementMethod?: "DIRECT_RFQ" | "COMMODITYBID_AUCTION" | null | undefined;
    allowedQuoteLineItemIds?: string[] | null | undefined;
    supplierProductScopes?: {
        supplierUserId: string;
        rfqLineItemIds: string[];
        supplierName?: string | undefined;
        supplierEmail?: string | undefined;
    }[] | undefined;
    selectedSupplierUserId?: string | null | undefined;
    linkedCommoditybidId?: string | null | undefined;
    catalogIntake?: {
        phone?: string | undefined;
        productOrService?: string | undefined;
        deliveryLocation?: string | undefined;
        quantity?: string | undefined;
        supplierType?: string | undefined;
        requestDetails?: string | undefined;
        businessEmail?: string | undefined;
        companyName?: string | undefined;
        contactPerson?: string | undefined;
        sessionId?: string | undefined;
    } | undefined;
    productImageUrl?: string | null | undefined;
    trashedAt?: string | null | undefined;
}>;
export type RfqDTO = z.infer<typeof RfqDTO>;
export declare const RfqListItem: z.ZodObject<{
    id: z.ZodString;
    externalRef: z.ZodString;
    slug: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title: z.ZodString;
    state: z.ZodString;
    createdAt: z.ZodString;
    deadlineAt: z.ZodNullable<z.ZodString>;
    lastActivityAt: z.ZodString;
    ownerName: z.ZodString;
    currency: z.ZodOptional<z.ZodNullable<z.ZodEnum<["USD", "EUR", "GBP"]>>>;
    productCategory: z.ZodOptional<z.ZodString>;
    lineItemCount: z.ZodOptional<z.ZodNumber>;
    procurementMethod: z.ZodOptional<z.ZodNullable<z.ZodEnum<["DIRECT_RFQ", "COMMODITYBID_AUCTION"]>>>;
    linkedCommoditybidId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    trashedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    externalRef: string;
    state: string;
    ownerName: string;
    title: string;
    deadlineAt: string | null;
    lastActivityAt: string;
    currency?: "USD" | "EUR" | "GBP" | null | undefined;
    slug?: string | null | undefined;
    productCategory?: string | undefined;
    procurementMethod?: "DIRECT_RFQ" | "COMMODITYBID_AUCTION" | null | undefined;
    linkedCommoditybidId?: string | null | undefined;
    trashedAt?: string | null | undefined;
    lineItemCount?: number | undefined;
}, {
    id: string;
    createdAt: string;
    externalRef: string;
    state: string;
    ownerName: string;
    title: string;
    deadlineAt: string | null;
    lastActivityAt: string;
    currency?: "USD" | "EUR" | "GBP" | null | undefined;
    slug?: string | null | undefined;
    productCategory?: string | undefined;
    procurementMethod?: "DIRECT_RFQ" | "COMMODITYBID_AUCTION" | null | undefined;
    linkedCommoditybidId?: string | null | undefined;
    trashedAt?: string | null | undefined;
    lineItemCount?: number | undefined;
}>;
export declare const ListRfqQuery: z.ZodObject<{
    state: z.ZodOptional<z.ZodString>;
    view: z.ZodDefault<z.ZodEnum<["active", "trash", "all"]>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
    sort: z.ZodDefault<z.ZodEnum<["newest", "oldest", "deadline"]>>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort: "newest" | "oldest" | "deadline";
    limit: number;
    view: "active" | "all" | "trash";
    q?: string | undefined;
    state?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    cursor?: string | undefined;
}, {
    sort?: "newest" | "oldest" | "deadline" | undefined;
    q?: string | undefined;
    limit?: number | undefined;
    state?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    cursor?: string | undefined;
    view?: "active" | "all" | "trash" | undefined;
}>;
export type ListRfqQuery = z.infer<typeof ListRfqQuery>;
export type RfqListItem = z.infer<typeof RfqListItem>;
export declare const AddObserverPayload: z.ZodObject<{
    observerUserId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    observerUserId: string;
}, {
    observerUserId: string;
}>;
export declare const RemoveObserverPayload: z.ZodObject<{
    observerUserId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    observerUserId: string;
}, {
    observerUserId: string;
}>;
