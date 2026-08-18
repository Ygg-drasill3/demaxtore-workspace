import { z } from "zod";
import { BC_STATE_LABELS } from "./bulk-container.fsm.js";
export { BC_STATE_LABELS };
export declare const CreateBulkContainerInput: z.ZodObject<{
    destinationMarket: z.ZodOptional<z.ZodString>;
    currency: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    destinationMarket?: string | undefined;
}, {
    destinationMarket?: string | undefined;
    currency?: string | undefined;
}>;
export type CreateBulkContainerInput = z.infer<typeof CreateBulkContainerInput>;
export declare const UpdateBulkContainerInput: z.ZodObject<{
    destinationMarket: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    currency: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    destinationMarket?: string | null | undefined;
    currency?: string | undefined;
}, {
    destinationMarket?: string | null | undefined;
    currency?: string | undefined;
}>;
export type UpdateBulkContainerInput = z.infer<typeof UpdateBulkContainerInput>;
export declare const AddBulkContainerLineInput: z.ZodObject<{
    catalogProductId: z.ZodString;
    packingTypeId: z.ZodString;
    quantityMt: z.ZodNumber;
    specValues: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
}, "strip", z.ZodTypeAny, {
    packingTypeId: string;
    catalogProductId: string;
    quantityMt: number;
    specValues: Record<string, string | number>;
}, {
    packingTypeId: string;
    catalogProductId: string;
    quantityMt: number;
    specValues: Record<string, string | number>;
}>;
export type AddBulkContainerLineInput = z.infer<typeof AddBulkContainerLineInput>;
export declare const UpdateBulkContainerLineInput: z.ZodObject<{
    quantityMt: z.ZodNumber;
    specValues: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
}, "strip", z.ZodTypeAny, {
    quantityMt: number;
    specValues?: Record<string, string | number> | undefined;
}, {
    quantityMt: number;
    specValues?: Record<string, string | number> | undefined;
}>;
export type UpdateBulkContainerLineInput = z.infer<typeof UpdateBulkContainerLineInput>;
export declare const AdminBulkCategoryInput: z.ZodObject<{
    slug: z.ZodString;
    name: z.ZodString;
    sortOrder: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "INACTIVE";
    name: string;
    slug: string;
    sortOrder: number;
}, {
    name: string;
    slug: string;
    status?: "ACTIVE" | "INACTIVE" | undefined;
    sortOrder?: number | undefined;
}>;
export type AdminBulkCategoryInput = z.infer<typeof AdminBulkCategoryInput>;
export declare const AdminBulkProductInput: z.ZodObject<{
    productRef: z.ZodString;
    categoryId: z.ZodString;
    name: z.ZodString;
    standardPacking: z.ZodString;
    specTemplateId: z.ZodString;
    marketStatus: z.ZodDefault<z.ZodString>;
    indicativeLow: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    indicativeHigh: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    indicativeCurrency: z.ZodDefault<z.ZodString>;
    minOrderMt: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "INACTIVE";
    name: string;
    productRef: string;
    categoryId: string;
    standardPacking: string;
    specTemplateId: string;
    marketStatus: string;
    indicativeCurrency: string;
    minOrderMt: number;
    indicativeLow?: number | null | undefined;
    indicativeHigh?: number | null | undefined;
}, {
    name: string;
    productRef: string;
    categoryId: string;
    standardPacking: string;
    specTemplateId: string;
    status?: "ACTIVE" | "INACTIVE" | undefined;
    marketStatus?: string | undefined;
    indicativeLow?: number | null | undefined;
    indicativeHigh?: number | null | undefined;
    indicativeCurrency?: string | undefined;
    minOrderMt?: number | undefined;
}>;
export type AdminBulkProductInput = z.infer<typeof AdminBulkProductInput>;
export declare const AdminBulkSpecTemplateInput: z.ZodObject<{
    productType: z.ZodString;
    name: z.ZodString;
    schema: z.ZodObject<{
        productType: z.ZodString;
        parameters: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            label: z.ZodString;
            type: z.ZodEnum<["range", "max", "min", "enum", "text", "year"]>;
            unit: z.ZodOptional<z.ZodString>;
            required: z.ZodDefault<z.ZodBoolean>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            helpText: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "range" | "max" | "min" | "enum" | "text" | "year";
            key: string;
            label: string;
            required: boolean;
            options?: string[] | undefined;
            max?: number | undefined;
            min?: number | undefined;
            unit?: string | undefined;
            helpText?: string | undefined;
        }, {
            type: "range" | "max" | "min" | "enum" | "text" | "year";
            key: string;
            label: string;
            options?: string[] | undefined;
            max?: number | undefined;
            min?: number | undefined;
            unit?: string | undefined;
            required?: boolean | undefined;
            helpText?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        productType: string;
        parameters: {
            type: "range" | "max" | "min" | "enum" | "text" | "year";
            key: string;
            label: string;
            required: boolean;
            options?: string[] | undefined;
            max?: number | undefined;
            min?: number | undefined;
            unit?: string | undefined;
            helpText?: string | undefined;
        }[];
    }, {
        productType: string;
        parameters: {
            type: "range" | "max" | "min" | "enum" | "text" | "year";
            key: string;
            label: string;
            options?: string[] | undefined;
            max?: number | undefined;
            min?: number | undefined;
            unit?: string | undefined;
            required?: boolean | undefined;
            helpText?: string | undefined;
        }[];
    }>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    productType: string;
    schema: {
        productType: string;
        parameters: {
            type: "range" | "max" | "min" | "enum" | "text" | "year";
            key: string;
            label: string;
            required: boolean;
            options?: string[] | undefined;
            max?: number | undefined;
            min?: number | undefined;
            unit?: string | undefined;
            helpText?: string | undefined;
        }[];
    };
}, {
    name: string;
    productType: string;
    schema: {
        productType: string;
        parameters: {
            type: "range" | "max" | "min" | "enum" | "text" | "year";
            key: string;
            label: string;
            options?: string[] | undefined;
            max?: number | undefined;
            min?: number | undefined;
            unit?: string | undefined;
            required?: boolean | undefined;
            helpText?: string | undefined;
        }[];
    };
    isActive?: boolean | undefined;
}>;
export type AdminBulkSpecTemplateInput = z.infer<typeof AdminBulkSpecTemplateInput>;
export declare const BulkContainerLineDTO: z.ZodObject<{
    id: z.ZodString;
    catalogProductId: z.ZodString;
    packingTypeId: z.ZodString;
    packingTypeName: z.ZodString;
    packingTypeCode: z.ZodString;
    productRef: z.ZodString;
    name: z.ZodString;
    category: z.ZodString;
    standardPacking: z.ZodString;
    specValues: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    quantityMt: z.ZodNumber;
    indicativeUnitLow: z.ZodNullable<z.ZodNumber>;
    indicativeUnitHigh: z.ZodNullable<z.ZodNumber>;
    lineValueMin: z.ZodNullable<z.ZodNumber>;
    lineValueMax: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    packingTypeId: string;
    category: string;
    catalogProductId: string;
    quantityMt: number;
    specValues: Record<string, string | number>;
    productRef: string;
    standardPacking: string;
    packingTypeName: string;
    packingTypeCode: string;
    indicativeUnitLow: number | null;
    indicativeUnitHigh: number | null;
    lineValueMin: number | null;
    lineValueMax: number | null;
}, {
    id: string;
    name: string;
    packingTypeId: string;
    category: string;
    catalogProductId: string;
    quantityMt: number;
    specValues: Record<string, string | number>;
    productRef: string;
    standardPacking: string;
    packingTypeName: string;
    packingTypeCode: string;
    indicativeUnitLow: number | null;
    indicativeUnitHigh: number | null;
    lineValueMin: number | null;
    lineValueMax: number | null;
}>;
export declare const BulkContainerDTO: z.ZodObject<{
    id: z.ZodString;
    externalRef: z.ZodString;
    state: z.ZodString;
    maxCapacityMt: z.ZodNumber;
    currentWeightMt: z.ZodNumber;
    remainingMt: z.ZodNumber;
    fillPercent: z.ZodNumber;
    capacityWarnings: z.ZodArray<z.ZodString, "many">;
    destinationMarket: z.ZodNullable<z.ZodString>;
    currency: z.ZodString;
    estValueMin: z.ZodNullable<z.ZodNumber>;
    estValueMax: z.ZodNullable<z.ZodNumber>;
    ownerUserId: z.ZodString;
    ownerName: z.ZodString;
    productCount: z.ZodNumber;
    lines: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        catalogProductId: z.ZodString;
        packingTypeId: z.ZodString;
        packingTypeName: z.ZodString;
        packingTypeCode: z.ZodString;
        productRef: z.ZodString;
        name: z.ZodString;
        category: z.ZodString;
        standardPacking: z.ZodString;
        specValues: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        quantityMt: z.ZodNumber;
        indicativeUnitLow: z.ZodNullable<z.ZodNumber>;
        indicativeUnitHigh: z.ZodNullable<z.ZodNumber>;
        lineValueMin: z.ZodNullable<z.ZodNumber>;
        lineValueMax: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        packingTypeId: string;
        category: string;
        catalogProductId: string;
        quantityMt: number;
        specValues: Record<string, string | number>;
        productRef: string;
        standardPacking: string;
        packingTypeName: string;
        packingTypeCode: string;
        indicativeUnitLow: number | null;
        indicativeUnitHigh: number | null;
        lineValueMin: number | null;
        lineValueMax: number | null;
    }, {
        id: string;
        name: string;
        packingTypeId: string;
        category: string;
        catalogProductId: string;
        quantityMt: number;
        specValues: Record<string, string | number>;
        productRef: string;
        standardPacking: string;
        packingTypeName: string;
        packingTypeCode: string;
        indicativeUnitLow: number | null;
        indicativeUnitHigh: number | null;
        lineValueMin: number | null;
        lineValueMax: number | null;
    }>, "many">;
    submittedAt: z.ZodNullable<z.ZodString>;
    activeOfferId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isFull: z.ZodBoolean;
    canCreateNewContainer: z.ZodBoolean;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    destinationMarket: string | null;
    currency: string;
    externalRef: string;
    state: string;
    maxCapacityMt: number;
    currentWeightMt: number;
    remainingMt: number;
    fillPercent: number;
    capacityWarnings: string[];
    estValueMin: number | null;
    estValueMax: number | null;
    ownerUserId: string;
    ownerName: string;
    productCount: number;
    lines: {
        id: string;
        name: string;
        packingTypeId: string;
        category: string;
        catalogProductId: string;
        quantityMt: number;
        specValues: Record<string, string | number>;
        productRef: string;
        standardPacking: string;
        packingTypeName: string;
        packingTypeCode: string;
        indicativeUnitLow: number | null;
        indicativeUnitHigh: number | null;
        lineValueMin: number | null;
        lineValueMax: number | null;
    }[];
    submittedAt: string | null;
    isFull: boolean;
    canCreateNewContainer: boolean;
    updatedAt: string;
    activeOfferId?: string | null | undefined;
}, {
    id: string;
    createdAt: string;
    destinationMarket: string | null;
    currency: string;
    externalRef: string;
    state: string;
    maxCapacityMt: number;
    currentWeightMt: number;
    remainingMt: number;
    fillPercent: number;
    capacityWarnings: string[];
    estValueMin: number | null;
    estValueMax: number | null;
    ownerUserId: string;
    ownerName: string;
    productCount: number;
    lines: {
        id: string;
        name: string;
        packingTypeId: string;
        category: string;
        catalogProductId: string;
        quantityMt: number;
        specValues: Record<string, string | number>;
        productRef: string;
        standardPacking: string;
        packingTypeName: string;
        packingTypeCode: string;
        indicativeUnitLow: number | null;
        indicativeUnitHigh: number | null;
        lineValueMin: number | null;
        lineValueMax: number | null;
    }[];
    submittedAt: string | null;
    isFull: boolean;
    canCreateNewContainer: boolean;
    updatedAt: string;
    activeOfferId?: string | null | undefined;
}>;
export declare const AdminBcProcurementQuoteInput: z.ZodObject<{
    lineId: z.ZodString;
    supplierCode: z.ZodString;
    unitPrice: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    lineId: string;
    supplierCode: string;
    unitPrice: number;
    notes?: string | undefined;
}, {
    lineId: string;
    supplierCode: string;
    unitPrice: number;
    currency?: string | undefined;
    notes?: string | undefined;
}>;
export type AdminBcProcurementQuoteInput = z.infer<typeof AdminBcProcurementQuoteInput>;
export declare const CreateBcContainerOfferInput: z.ZodObject<{
    offerNotes: z.ZodOptional<z.ZodString>;
    validityHours: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    validityHours: number;
    offerNotes?: string | undefined;
}, {
    offerNotes?: string | undefined;
    validityHours?: number | undefined;
}>;
export type CreateBcContainerOfferInput = z.infer<typeof CreateBcContainerOfferInput>;
export declare const BuyerBcRevisionInput: z.ZodObject<{
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
export type BuyerBcRevisionInput = z.infer<typeof BuyerBcRevisionInput>;
export declare const BcOfferLineDTO: z.ZodObject<{
    id: z.ZodString;
    lineId: z.ZodString;
    productName: z.ZodString;
    packingType: z.ZodString;
    specificationSummary: z.ZodString;
    quantityMt: z.ZodNumber;
    unitPrice: z.ZodNumber;
    lineTotal: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    packingType: string;
    quantityMt: number;
    lineId: string;
    unitPrice: number;
    productName: string;
    specificationSummary: string;
    lineTotal: number;
}, {
    id: string;
    packingType: string;
    quantityMt: number;
    lineId: string;
    unitPrice: number;
    productName: string;
    specificationSummary: string;
    lineTotal: number;
}>;
export type BcOfferLineDTO = z.infer<typeof BcOfferLineDTO>;
export declare const BcContainerOfferDTO: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    externalRef: z.ZodString;
    offerReference: z.ZodString;
    state: z.ZodString;
    version: z.ZodNumber;
    status: z.ZodString;
    currency: z.ZodString;
    lines: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        lineId: z.ZodString;
        productName: z.ZodString;
        packingType: z.ZodString;
        specificationSummary: z.ZodString;
        quantityMt: z.ZodNumber;
        unitPrice: z.ZodNumber;
        lineTotal: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        packingType: string;
        quantityMt: number;
        lineId: string;
        unitPrice: number;
        productName: string;
        specificationSummary: string;
        lineTotal: number;
    }, {
        id: string;
        packingType: string;
        quantityMt: number;
        lineId: string;
        unitPrice: number;
        productName: string;
        specificationSummary: string;
        lineTotal: number;
    }>, "many">;
    offerTotal: z.ZodNumber;
    validUntil: z.ZodNullable<z.ZodString>;
    expiresInSeconds: z.ZodNullable<z.ZodNumber>;
    offerNotes: z.ZodNullable<z.ZodString>;
    sentAt: z.ZodNullable<z.ZodString>;
    viewedAt: z.ZodNullable<z.ZodString>;
    approvedAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    currency: string;
    externalRef: string;
    state: string;
    lines: {
        id: string;
        packingType: string;
        quantityMt: number;
        lineId: string;
        unitPrice: number;
        productName: string;
        specificationSummary: string;
        lineTotal: number;
    }[];
    offerNotes: string | null;
    workspaceId: string;
    offerReference: string;
    version: number;
    offerTotal: number;
    validUntil: string | null;
    expiresInSeconds: number | null;
    sentAt: string | null;
    viewedAt: string | null;
    approvedAt: string | null;
}, {
    status: string;
    id: string;
    currency: string;
    externalRef: string;
    state: string;
    lines: {
        id: string;
        packingType: string;
        quantityMt: number;
        lineId: string;
        unitPrice: number;
        productName: string;
        specificationSummary: string;
        lineTotal: number;
    }[];
    offerNotes: string | null;
    workspaceId: string;
    offerReference: string;
    version: number;
    offerTotal: number;
    validUntil: string | null;
    expiresInSeconds: number | null;
    sentAt: string | null;
    viewedAt: string | null;
    approvedAt: string | null;
}>;
export type BcContainerOfferDTO = z.infer<typeof BcContainerOfferDTO>;
export declare const AdminBcInboxItem: z.ZodObject<{
    id: z.ZodString;
    externalRef: z.ZodString;
    state: z.ZodString;
    buyerName: z.ZodString;
    buyerOrgName: z.ZodNullable<z.ZodString>;
    productCount: z.ZodNumber;
    currentWeightMt: z.ZodNumber;
    estValueMin: z.ZodNullable<z.ZodNumber>;
    estValueMax: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    externalRef: string;
    state: string;
    currentWeightMt: number;
    estValueMin: number | null;
    estValueMax: number | null;
    productCount: number;
    updatedAt: string;
    buyerName: string;
    buyerOrgName: string | null;
}, {
    id: string;
    createdAt: string;
    externalRef: string;
    state: string;
    currentWeightMt: number;
    estValueMin: number | null;
    estValueMax: number | null;
    productCount: number;
    updatedAt: string;
    buyerName: string;
    buyerOrgName: string | null;
}>;
export type AdminBcInboxItem = z.infer<typeof AdminBcInboxItem>;
export declare const BcOpsKpiDTO: z.ZodObject<{
    pricingRequested: z.ZodNumber;
    procurementInProgress: z.ZodNumber;
    offerReady: z.ZodNumber;
    awaitingBuyerReview: z.ZodNumber;
    approved: z.ZodNumber;
    expired: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    pricingRequested: number;
    procurementInProgress: number;
    offerReady: number;
    awaitingBuyerReview: number;
    approved: number;
    expired: number;
}, {
    pricingRequested: number;
    procurementInProgress: number;
    offerReady: number;
    awaitingBuyerReview: number;
    approved: number;
    expired: number;
}>;
export type BcOpsKpiDTO = z.infer<typeof BcOpsKpiDTO>;
export declare const BcPaymentStatus: z.ZodEnum<["PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PAYMENT_REJECTED"]>;
export type BcPaymentStatus = z.infer<typeof BcPaymentStatus>;
export declare const CreateBcAllocationInput: z.ZodObject<{
    lineId: z.ZodString;
    supplierCode: z.ZodString;
    allocatedQuantityMt: z.ZodNumber;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    lineId: string;
    supplierCode: string;
    allocatedQuantityMt: number;
    notes?: string | undefined;
}, {
    lineId: string;
    supplierCode: string;
    allocatedQuantityMt: number;
    notes?: string | undefined;
}>;
export type CreateBcAllocationInput = z.infer<typeof CreateBcAllocationInput>;
export declare const UploadBcProformaInput: z.ZodObject<{
    proformaNumber: z.ZodString;
    proformaFileUrl: z.ZodString;
    amount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: string;
    proformaNumber: string;
    proformaFileUrl: string;
    amount: number;
}, {
    proformaNumber: string;
    proformaFileUrl: string;
    amount: number;
    currency?: string | undefined;
}>;
export type UploadBcProformaInput = z.infer<typeof UploadBcProformaInput>;
export declare const UpdateBcPaymentInput: z.ZodObject<{
    status: z.ZodEnum<["PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PAYMENT_REJECTED"]>;
    paymentReference: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "PAYMENT_PENDING" | "PAYMENT_CONFIRMED" | "PAYMENT_REJECTED";
    paymentReference?: string | undefined;
}, {
    status: "PAYMENT_PENDING" | "PAYMENT_CONFIRMED" | "PAYMENT_REJECTED";
    paymentReference?: string | undefined;
}>;
export type UpdateBcPaymentInput = z.infer<typeof UpdateBcPaymentInput>;
export declare const BcCoordinationTimelineStep: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    completed: z.ZodBoolean;
    completedAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    key: string;
    label: string;
    completed: boolean;
    completedAt: string | null;
}, {
    key: string;
    label: string;
    completed: boolean;
    completedAt: string | null;
}>;
export type BcCoordinationTimelineStep = z.infer<typeof BcCoordinationTimelineStep>;
export declare const BcCoordinationDTO: z.ZodObject<{
    workspaceId: z.ZodString;
    externalRef: z.ZodString;
    state: z.ZodString;
    allocations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        allocationRef: z.ZodString;
        productName: z.ZodString;
        packingType: z.ZodString;
        allocatedQuantityMt: z.ZodNumber;
        allocationStatus: z.ZodString;
        proformaReceived: z.ZodBoolean;
        paymentStatus: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        packingType: string;
        productName: string;
        allocatedQuantityMt: number;
        allocationRef: string;
        allocationStatus: string;
        proformaReceived: boolean;
        paymentStatus: string | null;
    }, {
        id: string;
        packingType: string;
        productName: string;
        allocatedQuantityMt: number;
        allocationRef: string;
        allocationStatus: string;
        proformaReceived: boolean;
        paymentStatus: string | null;
    }>, "many">;
    proformas: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        allocationRef: z.ZodString;
        productName: z.ZodString;
        proformaNumber: z.ZodString;
        amount: z.ZodNumber;
        currency: z.ZodString;
        proformaFileUrl: z.ZodString;
        uploadedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        currency: string;
        productName: string;
        proformaNumber: string;
        proformaFileUrl: string;
        amount: number;
        allocationRef: string;
        uploadedAt: string;
    }, {
        id: string;
        currency: string;
        productName: string;
        proformaNumber: string;
        proformaFileUrl: string;
        amount: number;
        allocationRef: string;
        uploadedAt: string;
    }>, "many">;
    payments: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        allocationRef: z.ZodString;
        productName: z.ZodString;
        amount: z.ZodNumber;
        currency: z.ZodString;
        status: z.ZodString;
        paymentReference: z.ZodNullable<z.ZodString>;
        confirmedAt: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: string;
        id: string;
        currency: string;
        productName: string;
        amount: number;
        paymentReference: string | null;
        allocationRef: string;
        confirmedAt: string | null;
    }, {
        status: string;
        id: string;
        currency: string;
        productName: string;
        amount: number;
        paymentReference: string | null;
        allocationRef: string;
        confirmedAt: string | null;
    }>, "many">;
    timeline: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        completed: z.ZodBoolean;
        completedAt: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label: string;
        completed: boolean;
        completedAt: string | null;
    }, {
        key: string;
        label: string;
        completed: boolean;
        completedAt: string | null;
    }>, "many">;
    executionReady: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    externalRef: string;
    state: string;
    workspaceId: string;
    allocations: {
        id: string;
        packingType: string;
        productName: string;
        allocatedQuantityMt: number;
        allocationRef: string;
        allocationStatus: string;
        proformaReceived: boolean;
        paymentStatus: string | null;
    }[];
    proformas: {
        id: string;
        currency: string;
        productName: string;
        proformaNumber: string;
        proformaFileUrl: string;
        amount: number;
        allocationRef: string;
        uploadedAt: string;
    }[];
    payments: {
        status: string;
        id: string;
        currency: string;
        productName: string;
        amount: number;
        paymentReference: string | null;
        allocationRef: string;
        confirmedAt: string | null;
    }[];
    timeline: {
        key: string;
        label: string;
        completed: boolean;
        completedAt: string | null;
    }[];
    executionReady: boolean;
}, {
    externalRef: string;
    state: string;
    workspaceId: string;
    allocations: {
        id: string;
        packingType: string;
        productName: string;
        allocatedQuantityMt: number;
        allocationRef: string;
        allocationStatus: string;
        proformaReceived: boolean;
        paymentStatus: string | null;
    }[];
    proformas: {
        id: string;
        currency: string;
        productName: string;
        proformaNumber: string;
        proformaFileUrl: string;
        amount: number;
        allocationRef: string;
        uploadedAt: string;
    }[];
    payments: {
        status: string;
        id: string;
        currency: string;
        productName: string;
        amount: number;
        paymentReference: string | null;
        allocationRef: string;
        confirmedAt: string | null;
    }[];
    timeline: {
        key: string;
        label: string;
        completed: boolean;
        completedAt: string | null;
    }[];
    executionReady: boolean;
}>;
export type BcCoordinationDTO = z.infer<typeof BcCoordinationDTO>;
export declare const BcAllocationKpiDTO: z.ZodObject<{
    allocationsPending: z.ZodNumber;
    proformasPending: z.ZodNumber;
    paymentsPending: z.ZodNumber;
    paymentsConfirmed: z.ZodNumber;
    executionReady: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    executionReady: number;
    allocationsPending: number;
    proformasPending: number;
    paymentsPending: number;
    paymentsConfirmed: number;
}, {
    executionReady: number;
    allocationsPending: number;
    proformasPending: number;
    paymentsPending: number;
    paymentsConfirmed: number;
}>;
export type BcAllocationKpiDTO = z.infer<typeof BcAllocationKpiDTO>;
export declare const BcExecutionAllocationStatus: z.ZodObject<{
    allocationRef: z.ZodString;
    productName: z.ZodString;
    orderState: z.ZodNullable<z.ZodString>;
    orderExternalRef: z.ZodNullable<z.ZodString>;
    freightStatus: z.ZodNullable<z.ZodString>;
    shipmentState: z.ZodNullable<z.ZodString>;
    documentCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    productName: string;
    allocationRef: string;
    orderState: string | null;
    orderExternalRef: string | null;
    freightStatus: string | null;
    shipmentState: string | null;
    documentCount: number;
}, {
    productName: string;
    allocationRef: string;
    orderState: string | null;
    orderExternalRef: string | null;
    freightStatus: string | null;
    shipmentState: string | null;
    documentCount: number;
}>;
export type BcExecutionAllocationStatus = z.infer<typeof BcExecutionAllocationStatus>;
export declare const BcExecutionDocument: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    label: z.ZodString;
    source: z.ZodEnum<["PROFORMA", "ORDER", "SHIPMENT", "FREIGHT"]>;
    url: z.ZodNullable<z.ZodString>;
    allocationRef: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    label: string;
    allocationRef: string | null;
    source: "PROFORMA" | "ORDER" | "SHIPMENT" | "FREIGHT";
    url: string | null;
}, {
    type: string;
    id: string;
    label: string;
    allocationRef: string | null;
    source: "PROFORMA" | "ORDER" | "SHIPMENT" | "FREIGHT";
    url: string | null;
}>;
export type BcExecutionDocument = z.infer<typeof BcExecutionDocument>;
export declare const BcExecutionDTO: z.ZodObject<{
    workspaceId: z.ZodString;
    containerExternalRef: z.ZodString;
    state: z.ZodString;
    masterOrderRef: z.ZodNullable<z.ZodString>;
    masterOrderId: z.ZodNullable<z.ZodString>;
    completionPercent: z.ZodNumber;
    allocations: z.ZodArray<z.ZodObject<{
        allocationRef: z.ZodString;
        productName: z.ZodString;
        orderState: z.ZodNullable<z.ZodString>;
        orderExternalRef: z.ZodNullable<z.ZodString>;
        freightStatus: z.ZodNullable<z.ZodString>;
        shipmentState: z.ZodNullable<z.ZodString>;
        documentCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        productName: string;
        allocationRef: string;
        orderState: string | null;
        orderExternalRef: string | null;
        freightStatus: string | null;
        shipmentState: string | null;
        documentCount: number;
    }, {
        productName: string;
        allocationRef: string;
        orderState: string | null;
        orderExternalRef: string | null;
        freightStatus: string | null;
        shipmentState: string | null;
        documentCount: number;
    }>, "many">;
    documents: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        label: z.ZodString;
        source: z.ZodEnum<["PROFORMA", "ORDER", "SHIPMENT", "FREIGHT"]>;
        url: z.ZodNullable<z.ZodString>;
        allocationRef: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        id: string;
        label: string;
        allocationRef: string | null;
        source: "PROFORMA" | "ORDER" | "SHIPMENT" | "FREIGHT";
        url: string | null;
    }, {
        type: string;
        id: string;
        label: string;
        allocationRef: string | null;
        source: "PROFORMA" | "ORDER" | "SHIPMENT" | "FREIGHT";
        url: string | null;
    }>, "many">;
    timeline: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        completed: z.ZodBoolean;
        completedAt: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label: string;
        completed: boolean;
        completedAt: string | null;
    }, {
        key: string;
        label: string;
        completed: boolean;
        completedAt: string | null;
    }>, "many">;
    supplierOrderCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    state: string;
    workspaceId: string;
    allocations: {
        productName: string;
        allocationRef: string;
        orderState: string | null;
        orderExternalRef: string | null;
        freightStatus: string | null;
        shipmentState: string | null;
        documentCount: number;
    }[];
    timeline: {
        key: string;
        label: string;
        completed: boolean;
        completedAt: string | null;
    }[];
    containerExternalRef: string;
    masterOrderRef: string | null;
    masterOrderId: string | null;
    completionPercent: number;
    documents: {
        type: string;
        id: string;
        label: string;
        allocationRef: string | null;
        source: "PROFORMA" | "ORDER" | "SHIPMENT" | "FREIGHT";
        url: string | null;
    }[];
    supplierOrderCount: number;
}, {
    state: string;
    workspaceId: string;
    allocations: {
        productName: string;
        allocationRef: string;
        orderState: string | null;
        orderExternalRef: string | null;
        freightStatus: string | null;
        shipmentState: string | null;
        documentCount: number;
    }[];
    timeline: {
        key: string;
        label: string;
        completed: boolean;
        completedAt: string | null;
    }[];
    containerExternalRef: string;
    masterOrderRef: string | null;
    masterOrderId: string | null;
    completionPercent: number;
    documents: {
        type: string;
        id: string;
        label: string;
        allocationRef: string | null;
        source: "PROFORMA" | "ORDER" | "SHIPMENT" | "FREIGHT";
        url: string | null;
    }[];
    supplierOrderCount: number;
}>;
export type BcExecutionDTO = z.infer<typeof BcExecutionDTO>;
export declare const BcSpawnResultDTO: z.ZodObject<{
    masterOrderRef: z.ZodString;
    masterOrderId: z.ZodString;
    supplierOrders: z.ZodArray<z.ZodObject<{
        allocationRef: z.ZodString;
        orderId: z.ZodString;
        orderExternalRef: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        allocationRef: string;
        orderExternalRef: string;
        orderId: string;
    }, {
        allocationRef: string;
        orderExternalRef: string;
        orderId: string;
    }>, "many">;
    state: z.ZodString;
}, "strip", z.ZodTypeAny, {
    state: string;
    masterOrderRef: string;
    masterOrderId: string;
    supplierOrders: {
        allocationRef: string;
        orderExternalRef: string;
        orderId: string;
    }[];
}, {
    state: string;
    masterOrderRef: string;
    masterOrderId: string;
    supplierOrders: {
        allocationRef: string;
        orderExternalRef: string;
        orderId: string;
    }[];
}>;
export type BcSpawnResultDTO = z.infer<typeof BcSpawnResultDTO>;
