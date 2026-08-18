import { z } from "zod";
export declare const SupplierEngagementStage: z.ZodEnum<["INVITED", "VIEWED", "RETURNED", "QUOTED", "DECLINED"]>;
export type SupplierEngagementStage = z.infer<typeof SupplierEngagementStage>;
/** Aggregate counts surfaced in the strip. Server computes; client renders. */
export declare const SupplierActivitySummary: z.ZodObject<{
    invited: z.ZodNumber;
    viewed: z.ZodNumber;
    quoted: z.ZodNumber;
    declined: z.ZodNumber;
    silent: z.ZodNumber;
    /** ISO datetime — last update emitted. Drives the "updated 12s ago" badge. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    updatedAt: string;
    invited: number;
    viewed: number;
    quoted: number;
    declined: number;
    silent: number;
}, {
    updatedAt: string;
    invited: number;
    viewed: number;
    quoted: number;
    declined: number;
    silent: number;
}>;
export type SupplierActivitySummary = z.infer<typeof SupplierActivitySummary>;
/** Detail row in the drawer. Trust micro-cells live here. */
export declare const SupplierActivityRow: z.ZodObject<{
    supplierId: z.ZodString;
    supplierName: z.ZodString;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    verifiedSince: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pastPoCount: z.ZodNumber;
    stage: z.ZodEnum<["INVITED", "VIEWED", "RETURNED", "QUOTED", "DECLINED"]>;
    /** How filled the 4-dot engagement ladder appears: 1..4 */
    engagementDots: z.ZodNumber;
    lastActivityAt: z.ZodNullable<z.ZodString>;
    quotedTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    declineReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    nudgedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    canNudge: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    supplierId: string;
    supplierName: string;
    lastActivityAt: string | null;
    pastPoCount: number;
    stage: "QUOTED" | "INVITED" | "VIEWED" | "RETURNED" | "DECLINED";
    engagementDots: number;
    canNudge: boolean;
    location?: string | null | undefined;
    verifiedSince?: string | null | undefined;
    quotedTotal?: number | null | undefined;
    declineReason?: string | null | undefined;
    nudgedAt?: string | null | undefined;
}, {
    supplierId: string;
    supplierName: string;
    lastActivityAt: string | null;
    pastPoCount: number;
    stage: "QUOTED" | "INVITED" | "VIEWED" | "RETURNED" | "DECLINED";
    engagementDots: number;
    canNudge: boolean;
    location?: string | null | undefined;
    verifiedSince?: string | null | undefined;
    quotedTotal?: number | null | undefined;
    declineReason?: string | null | undefined;
    nudgedAt?: string | null | undefined;
}>;
export type SupplierActivityRow = z.infer<typeof SupplierActivityRow>;
export declare const SupplierActivityDetail: z.ZodObject<{
    summary: z.ZodObject<{
        invited: z.ZodNumber;
        viewed: z.ZodNumber;
        quoted: z.ZodNumber;
        declined: z.ZodNumber;
        silent: z.ZodNumber;
        /** ISO datetime — last update emitted. Drives the "updated 12s ago" badge. */
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        updatedAt: string;
        invited: number;
        viewed: number;
        quoted: number;
        declined: number;
        silent: number;
    }, {
        updatedAt: string;
        invited: number;
        viewed: number;
        quoted: number;
        declined: number;
        silent: number;
    }>;
    rows: z.ZodArray<z.ZodObject<{
        supplierId: z.ZodString;
        supplierName: z.ZodString;
        location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        verifiedSince: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        pastPoCount: z.ZodNumber;
        stage: z.ZodEnum<["INVITED", "VIEWED", "RETURNED", "QUOTED", "DECLINED"]>;
        /** How filled the 4-dot engagement ladder appears: 1..4 */
        engagementDots: z.ZodNumber;
        lastActivityAt: z.ZodNullable<z.ZodString>;
        quotedTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        declineReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        nudgedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        canNudge: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        supplierId: string;
        supplierName: string;
        lastActivityAt: string | null;
        pastPoCount: number;
        stage: "QUOTED" | "INVITED" | "VIEWED" | "RETURNED" | "DECLINED";
        engagementDots: number;
        canNudge: boolean;
        location?: string | null | undefined;
        verifiedSince?: string | null | undefined;
        quotedTotal?: number | null | undefined;
        declineReason?: string | null | undefined;
        nudgedAt?: string | null | undefined;
    }, {
        supplierId: string;
        supplierName: string;
        lastActivityAt: string | null;
        pastPoCount: number;
        stage: "QUOTED" | "INVITED" | "VIEWED" | "RETURNED" | "DECLINED";
        engagementDots: number;
        canNudge: boolean;
        location?: string | null | undefined;
        verifiedSince?: string | null | undefined;
        quotedTotal?: number | null | undefined;
        declineReason?: string | null | undefined;
        nudgedAt?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    summary: {
        updatedAt: string;
        invited: number;
        viewed: number;
        quoted: number;
        declined: number;
        silent: number;
    };
    rows: {
        supplierId: string;
        supplierName: string;
        lastActivityAt: string | null;
        pastPoCount: number;
        stage: "QUOTED" | "INVITED" | "VIEWED" | "RETURNED" | "DECLINED";
        engagementDots: number;
        canNudge: boolean;
        location?: string | null | undefined;
        verifiedSince?: string | null | undefined;
        quotedTotal?: number | null | undefined;
        declineReason?: string | null | undefined;
        nudgedAt?: string | null | undefined;
    }[];
}, {
    summary: {
        updatedAt: string;
        invited: number;
        viewed: number;
        quoted: number;
        declined: number;
        silent: number;
    };
    rows: {
        supplierId: string;
        supplierName: string;
        lastActivityAt: string | null;
        pastPoCount: number;
        stage: "QUOTED" | "INVITED" | "VIEWED" | "RETURNED" | "DECLINED";
        engagementDots: number;
        canNudge: boolean;
        location?: string | null | undefined;
        verifiedSince?: string | null | undefined;
        quotedTotal?: number | null | undefined;
        declineReason?: string | null | undefined;
        nudgedAt?: string | null | undefined;
    }[];
}>;
export type SupplierActivityDetail = z.infer<typeof SupplierActivityDetail>;
/** Compact quotation projection (used in money summary + comparison panel). */
export declare const QuotationRowDTO: z.ZodObject<{
    id: z.ZodString;
    supplierId: z.ZodString;
    supplierName: z.ZodString;
    supplierLogoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    supplierCatalogUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    total: z.ZodNumber;
    currency: z.ZodString;
    unitPriceAvg: z.ZodNullable<z.ZodNumber>;
    leadTimeDays: z.ZodNullable<z.ZodNumber>;
    moq: z.ZodNullable<z.ZodNumber>;
    incoterm: z.ZodNullable<z.ZodString>;
    paymentTerms: z.ZodNullable<z.ZodString>;
    sampleAvail: z.ZodNullable<z.ZodBoolean>;
    validUntil: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["SUBMITTED", "REVISED", "WITHDRAWN"]>;
    submittedAt: z.ZodString;
    lineItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        rfqLineItemId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        position: z.ZodNumber;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        total: z.ZodNumber;
        packing: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        priceUnit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        moq: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        total: number;
        moq?: number | null | undefined;
        rfqLineItemId?: string | null | undefined;
        packing?: string | null | undefined;
        priceUnit?: string | null | undefined;
    }, {
        id: string;
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        total: number;
        moq?: number | null | undefined;
        rfqLineItemId?: string | null | undefined;
        packing?: string | null | undefined;
        priceUnit?: string | null | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "REVISED" | "WITHDRAWN" | "SUBMITTED";
    id: string;
    currency: string;
    submittedAt: string;
    validUntil: string | null;
    leadTimeDays: number | null;
    moq: number | null;
    paymentTerms: string | null;
    supplierId: string;
    incoterm: string | null;
    sampleAvail: boolean | null;
    supplierName: string;
    total: number;
    unitPriceAvg: number | null;
    lineItems?: {
        id: string;
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        total: number;
        moq?: number | null | undefined;
        rfqLineItemId?: string | null | undefined;
        packing?: string | null | undefined;
        priceUnit?: string | null | undefined;
    }[] | undefined;
    supplierLogoUrl?: string | null | undefined;
    supplierCatalogUrl?: string | null | undefined;
}, {
    status: "REVISED" | "WITHDRAWN" | "SUBMITTED";
    id: string;
    currency: string;
    submittedAt: string;
    validUntil: string | null;
    leadTimeDays: number | null;
    moq: number | null;
    paymentTerms: string | null;
    supplierId: string;
    incoterm: string | null;
    sampleAvail: boolean | null;
    supplierName: string;
    total: number;
    unitPriceAvg: number | null;
    lineItems?: {
        id: string;
        description: string;
        unitPrice: number;
        quantity: number;
        position: number;
        total: number;
        moq?: number | null | undefined;
        rfqLineItemId?: string | null | undefined;
        packing?: string | null | undefined;
        priceUnit?: string | null | undefined;
    }[] | undefined;
    supplierLogoUrl?: string | null | undefined;
    supplierCatalogUrl?: string | null | undefined;
}>;
export type QuotationRowDTO = z.infer<typeof QuotationRowDTO>;
