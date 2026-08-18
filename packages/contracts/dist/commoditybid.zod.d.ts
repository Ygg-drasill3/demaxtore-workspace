import { z } from "zod";
export declare const Currency: z.ZodEnum<["USD", "EUR", "GBP"]>;
export declare const LotInput: z.ZodObject<{
    commodity: z.ZodString;
    quantity: z.ZodNumber;
    uom: z.ZodString;
    specs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    incoterms: z.ZodOptional<z.ZodString>;
    deliveryWindow: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    commodity: string;
    uom: string;
    notes?: string | undefined;
    specs?: Record<string, unknown> | undefined;
    incoterms?: string | undefined;
    deliveryWindow?: string | undefined;
}, {
    quantity: number;
    commodity: string;
    uom: string;
    notes?: string | undefined;
    specs?: Record<string, unknown> | undefined;
    incoterms?: string | undefined;
    deliveryWindow?: string | undefined;
}>;
export declare const AuctionDurationMinutes: z.ZodNumber;
export declare const CreateCommodityBidDraftInput: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    productCategory: z.ZodOptional<z.ZodString>;
    targetMarket: z.ZodOptional<z.ZodString>;
    currency: z.ZodEnum<["USD", "EUR", "GBP"]>;
    auctionStartsAt: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    auctionDurationMinutes: z.ZodDefault<z.ZodNumber>;
    invitationDeadlineMinutes: z.ZodDefault<z.ZodNumber>;
    supplierUserIds: z.ZodArray<z.ZodString, "many">;
    lots: z.ZodArray<z.ZodObject<{
        commodity: z.ZodString;
        quantity: z.ZodNumber;
        uom: z.ZodString;
        specs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        incoterms: z.ZodOptional<z.ZodString>;
        deliveryWindow: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        commodity: string;
        uom: string;
        notes?: string | undefined;
        specs?: Record<string, unknown> | undefined;
        incoterms?: string | undefined;
        deliveryWindow?: string | undefined;
    }, {
        quantity: number;
        commodity: string;
        uom: string;
        notes?: string | undefined;
        specs?: Record<string, unknown> | undefined;
        incoterms?: string | undefined;
        deliveryWindow?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    description: string;
    currency: "USD" | "EUR" | "GBP";
    title: string;
    auctionStartsAt: string;
    auctionDurationMinutes: number;
    invitationDeadlineMinutes: number;
    supplierUserIds: string[];
    lots: {
        quantity: number;
        commodity: string;
        uom: string;
        notes?: string | undefined;
        specs?: Record<string, unknown> | undefined;
        incoterms?: string | undefined;
        deliveryWindow?: string | undefined;
    }[];
    productCategory?: string | undefined;
    targetMarket?: string | undefined;
}, {
    description: string;
    currency: "USD" | "EUR" | "GBP";
    title: string;
    auctionStartsAt: string;
    supplierUserIds: string[];
    lots: {
        quantity: number;
        commodity: string;
        uom: string;
        notes?: string | undefined;
        specs?: Record<string, unknown> | undefined;
        incoterms?: string | undefined;
        deliveryWindow?: string | undefined;
    }[];
    productCategory?: string | undefined;
    targetMarket?: string | undefined;
    auctionDurationMinutes?: number | undefined;
    invitationDeadlineMinutes?: number | undefined;
}>;
export declare const ScheduleAuctionPayload: z.ZodObject<{
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
export type CreateCommodityBidDraftInput = z.infer<typeof CreateCommodityBidDraftInput>;
export declare const EditCommodityBidDraftInput: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    productCategory: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    targetMarket: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    currency: z.ZodOptional<z.ZodEnum<["USD", "EUR", "GBP"]>>;
    auctionStartsAt: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    auctionDurationMinutes: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    invitationDeadlineMinutes: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    supplierUserIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    lots: z.ZodOptional<z.ZodArray<z.ZodObject<{
        commodity: z.ZodString;
        quantity: z.ZodNumber;
        uom: z.ZodString;
        specs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        incoterms: z.ZodOptional<z.ZodString>;
        deliveryWindow: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        commodity: string;
        uom: string;
        notes?: string | undefined;
        specs?: Record<string, unknown> | undefined;
        incoterms?: string | undefined;
        deliveryWindow?: string | undefined;
    }, {
        quantity: number;
        commodity: string;
        uom: string;
        notes?: string | undefined;
        specs?: Record<string, unknown> | undefined;
        incoterms?: string | undefined;
        deliveryWindow?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    currency?: "USD" | "EUR" | "GBP" | undefined;
    title?: string | undefined;
    productCategory?: string | undefined;
    targetMarket?: string | undefined;
    auctionStartsAt?: string | undefined;
    auctionDurationMinutes?: number | undefined;
    invitationDeadlineMinutes?: number | undefined;
    supplierUserIds?: string[] | undefined;
    lots?: {
        quantity: number;
        commodity: string;
        uom: string;
        notes?: string | undefined;
        specs?: Record<string, unknown> | undefined;
        incoterms?: string | undefined;
        deliveryWindow?: string | undefined;
    }[] | undefined;
}, {
    description?: string | undefined;
    currency?: "USD" | "EUR" | "GBP" | undefined;
    title?: string | undefined;
    productCategory?: string | undefined;
    targetMarket?: string | undefined;
    auctionStartsAt?: string | undefined;
    auctionDurationMinutes?: number | undefined;
    invitationDeadlineMinutes?: number | undefined;
    supplierUserIds?: string[] | undefined;
    lots?: {
        quantity: number;
        commodity: string;
        uom: string;
        notes?: string | undefined;
        specs?: Record<string, unknown> | undefined;
        incoterms?: string | undefined;
        deliveryWindow?: string | undefined;
    }[] | undefined;
}>;
export declare const InviteSuppliersPayload: z.ZodObject<{
    supplierUserIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    supplierUserIds: string[];
}, {
    supplierUserIds: string[];
}>;
export declare const AddSupplierPayload: z.ZodObject<{
    supplierUserIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    supplierUserIds: string[];
}, {
    supplierUserIds: string[];
}>;
export declare const RemoveSupplierPayload: z.ZodObject<{
    supplierUserId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    supplierUserId: string;
}, {
    supplierUserId: string;
}>;
export declare const RejectBidPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const PublishBidPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const ExtendDeadlinePayload: z.ZodObject<{
    newDeadline: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newDeadline: string;
}, {
    newDeadline: string;
}>;
export declare const ReopenBidsPayload: z.ZodObject<{
    reason: z.ZodString;
    newDeadline: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    newDeadline: string;
}, {
    reason: string;
    newDeadline: string;
}>;
export declare const CloseBidsEarlyPayload: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export declare const DraftAwardLotPayload: z.ZodObject<{
    lotId: z.ZodString;
    submissionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lotId: string;
    submissionId: string;
}, {
    lotId: string;
    submissionId: string;
}>;
export declare const MarkLotNoAwardPayload: z.ZodObject<{
    lotId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    lotId: string;
}, {
    reason: string;
    lotId: string;
}>;
export declare const PublishAwardsPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const CloseWithoutAwardPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const AcceptAwardLotPayload: z.ZodObject<{
    lotId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lotId: string;
}, {
    lotId: string;
}>;
export declare const DeclineAwardLotPayload: z.ZodObject<{
    lotId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    lotId: string;
}, {
    reason: string;
    lotId: string;
}>;
export declare const WithdrawAwardLotPayload: z.ZodObject<{
    lotId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    lotId: string;
}, {
    reason: string;
    lotId: string;
}>;
export declare const ReAwardLotPayload: z.ZodObject<{
    lotId: z.ZodString;
    submissionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lotId: string;
    submissionId: string;
}, {
    lotId: string;
    submissionId: string;
}>;
export declare const IssueContractsPayload: z.ZodObject<{
    contractRefs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    contractRefs?: Record<string, string> | undefined;
}, {
    contractRefs?: Record<string, string> | undefined;
}>;
export declare const CancelBidPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const SubmitBidLotPayload: z.ZodObject<{
    unitPrice: z.ZodNumber;
    leadTimeDays: z.ZodOptional<z.ZodNumber>;
    moq: z.ZodOptional<z.ZodNumber>;
    paymentTerms: z.ZodOptional<z.ZodString>;
    deliveryTerms: z.ZodOptional<z.ZodString>;
    validUntil: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    unitPrice: number;
    validUntil: string;
    notes?: string | undefined;
    leadTimeDays?: number | undefined;
    moq?: number | undefined;
    paymentTerms?: string | undefined;
    deliveryTerms?: string | undefined;
}, {
    unitPrice: number;
    validUntil: string;
    notes?: string | undefined;
    leadTimeDays?: number | undefined;
    moq?: number | undefined;
    paymentTerms?: string | undefined;
    deliveryTerms?: string | undefined;
}>;
export declare const ReviseBidLotPayload: z.ZodObject<{
    unitPrice: z.ZodNumber;
    leadTimeDays: z.ZodOptional<z.ZodNumber>;
    moq: z.ZodOptional<z.ZodNumber>;
    paymentTerms: z.ZodOptional<z.ZodString>;
    deliveryTerms: z.ZodOptional<z.ZodString>;
    validUntil: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    unitPrice: number;
    validUntil: string;
    notes?: string | undefined;
    leadTimeDays?: number | undefined;
    moq?: number | undefined;
    paymentTerms?: string | undefined;
    deliveryTerms?: string | undefined;
}, {
    unitPrice: number;
    validUntil: string;
    notes?: string | undefined;
    leadTimeDays?: number | undefined;
    moq?: number | undefined;
    paymentTerms?: string | undefined;
    deliveryTerms?: string | undefined;
}>;
export declare const WithdrawBidLotPayload: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export declare const ActionEnvelope: z.ZodObject<{
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    reason: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
    payload?: Record<string, unknown> | undefined;
    idempotencyKey?: string | undefined;
}, {
    reason?: string | undefined;
    payload?: Record<string, unknown> | undefined;
    idempotencyKey?: string | undefined;
}>;
export declare const ListCommodityBidQuery: z.ZodObject<{
    state: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    state?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    limit?: number | undefined;
    state?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    offset?: number | undefined;
}>;
