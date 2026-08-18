/**
 * Sprint 37 — Turkish Customs Control Center (operational orchestration).
 * Not a government filing system. No BİLGE / duty / inland.
 */
import { z } from "zod";
export declare const CUSTOMS_CASE_STATUSES: readonly ["DRAFT", "PREPARING", "READY_FOR_BROKER", "BROKER_REVIEW", "DECLARATION_PREPARING", "DECLARATION_FILED", "CUSTOMS_PROCESSING", "CLEARANCE_PENDING", "CLEARED", "HOLD", "CANCELLED"];
export type CustomsCaseStatus = (typeof CUSTOMS_CASE_STATUSES)[number];
export declare const CUSTOMS_STATUS_SOURCES: readonly ["BUYER", "CUSTOMS_BROKER", "DEMAXTORE_OPERATIONS", "SYSTEM_DERIVED"];
export type CustomsStatusSource = (typeof CUSTOMS_STATUS_SOURCES)[number];
export declare const CUSTOMS_HOLD_CATEGORIES: readonly ["DOCUMENT", "CLASSIFICATION", "BROKER_REVIEW", "CUSTOMS_QUERY", "PAYMENT", "OTHER"];
export type CustomsHoldCategory = (typeof CUSTOMS_HOLD_CATEGORIES)[number];
export declare const CUSTOMS_READINESS_STATUSES: readonly ["NOT_READY", "PARTIALLY_READY", "READY_FOR_BROKER"];
export type CustomsReadinessStatus = (typeof CUSTOMS_READINESS_STATUSES)[number];
export declare const CUSTOMS_READINESS_CHECK_STATUSES: readonly ["PASS", "WARNING", "FAIL"];
export type CustomsReadinessCheckStatus = (typeof CUSTOMS_READINESS_CHECK_STATUSES)[number];
export declare function canTransitionCustomsStatus(from: CustomsCaseStatus, to: CustomsCaseStatus): boolean;
export declare function assertCanTransitionCustomsStatus(from: CustomsCaseStatus, to: CustomsCaseStatus): void;
export declare const CustomsReadinessCheckSchema: z.ZodObject<{
    code: z.ZodString;
    status: z.ZodEnum<["PASS", "WARNING", "FAIL"]>;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    label: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    status: "WARNING" | "PASS" | "FAIL";
    label?: string | undefined;
    reason?: string | null | undefined;
}, {
    code: string;
    status: "WARNING" | "PASS" | "FAIL";
    label?: string | undefined;
    reason?: string | null | undefined;
}>;
export type CustomsReadinessCheck = z.infer<typeof CustomsReadinessCheckSchema>;
export declare const CustomsReadinessDtoSchema: z.ZodObject<{
    status: z.ZodEnum<["NOT_READY", "PARTIALLY_READY", "READY_FOR_BROKER"]>;
    checks: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        status: z.ZodEnum<["PASS", "WARNING", "FAIL"]>;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        status: "WARNING" | "PASS" | "FAIL";
        label?: string | undefined;
        reason?: string | null | undefined;
    }, {
        code: string;
        status: "WARNING" | "PASS" | "FAIL";
        label?: string | undefined;
        reason?: string | null | undefined;
    }>, "many">;
    blockingCount: z.ZodNumber;
    warningCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: "READY_FOR_BROKER" | "NOT_READY" | "PARTIALLY_READY";
    checks: {
        code: string;
        status: "WARNING" | "PASS" | "FAIL";
        label?: string | undefined;
        reason?: string | null | undefined;
    }[];
    blockingCount: number;
    warningCount: number;
}, {
    status: "READY_FOR_BROKER" | "NOT_READY" | "PARTIALLY_READY";
    checks: {
        code: string;
        status: "WARNING" | "PASS" | "FAIL";
        label?: string | undefined;
        reason?: string | null | undefined;
    }[];
    blockingCount: number;
    warningCount: number;
}>;
export type CustomsReadinessDto = z.infer<typeof CustomsReadinessDtoSchema>;
export declare function summarizeReadiness(checks: CustomsReadinessCheck[]): CustomsReadinessDto;
export declare const CustomsProductLineSchema: z.ZodObject<{
    purchaseOrderLineId: z.ZodString;
    purchaseOrderId: z.ZodString;
    poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    productId: z.ZodNullable<z.ZodString>;
    sku: z.ZodNullable<z.ZodString>;
    description: z.ZodString;
    quantity: z.ZodNumber;
    allocatedQuantity: z.ZodOptional<z.ZodNumber>;
    countryOfOrigin: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    gtipCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    classificationStatus: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    classificationSource: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customsDescription: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    productId: string | null;
    quantity: number;
    purchaseOrderId: string;
    purchaseOrderLineId: string;
    sku: string | null;
    poNumber?: string | null | undefined;
    allocatedQuantity?: number | undefined;
    countryOfOrigin?: string | null | undefined;
    gtipCode?: string | null | undefined;
    classificationStatus?: string | null | undefined;
    classificationSource?: string | null | undefined;
    customsDescription?: string | null | undefined;
}, {
    description: string;
    productId: string | null;
    quantity: number;
    purchaseOrderId: string;
    purchaseOrderLineId: string;
    sku: string | null;
    poNumber?: string | null | undefined;
    allocatedQuantity?: number | undefined;
    countryOfOrigin?: string | null | undefined;
    gtipCode?: string | null | undefined;
    classificationStatus?: string | null | undefined;
    classificationSource?: string | null | undefined;
    customsDescription?: string | null | undefined;
}>;
export type CustomsProductLine = z.infer<typeof CustomsProductLineSchema>;
export declare const CustomsCaseDtoSchema: z.ZodObject<{
    id: z.ZodString;
    organisationId: z.ZodString;
    shipmentWorkspaceId: z.ZodString;
    orderWorkspaceId: z.ZodString;
    status: z.ZodEnum<["DRAFT", "PREPARING", "READY_FOR_BROKER", "BROKER_REVIEW", "DECLARATION_PREPARING", "DECLARATION_FILED", "CUSTOMS_PROCESSING", "CLEARANCE_PENDING", "CLEARED", "HOLD", "CANCELLED"]>;
    readinessStatus: z.ZodEnum<["NOT_READY", "PARTIALLY_READY", "READY_FOR_BROKER"]>;
    destinationCountryCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    brokerUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    brokerAssignmentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    declarationReference: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    declarationDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customsOffice: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    statusSource: z.ZodEnum<["BUYER", "CUSTOMS_BROKER", "DEMAXTORE_OPERATIONS", "SYSTEM_DERIVED"]>;
    holdCategory: z.ZodOptional<z.ZodNullable<z.ZodEnum<["DOCUMENT", "CLASSIFICATION", "BROKER_REVIEW", "CUSTOMS_QUERY", "PAYMENT", "OTHER"]>>>;
    holdReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    holdAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clearedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cancelledAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    shipmentRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    eta: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ata: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    originPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    destinationPort: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    readiness: z.ZodOptional<z.ZodObject<{
        status: z.ZodEnum<["NOT_READY", "PARTIALLY_READY", "READY_FOR_BROKER"]>;
        checks: z.ZodArray<z.ZodObject<{
            code: z.ZodString;
            status: z.ZodEnum<["PASS", "WARNING", "FAIL"]>;
            reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            label: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            code: string;
            status: "WARNING" | "PASS" | "FAIL";
            label?: string | undefined;
            reason?: string | null | undefined;
        }, {
            code: string;
            status: "WARNING" | "PASS" | "FAIL";
            label?: string | undefined;
            reason?: string | null | undefined;
        }>, "many">;
        blockingCount: z.ZodNumber;
        warningCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        status: "READY_FOR_BROKER" | "NOT_READY" | "PARTIALLY_READY";
        checks: {
            code: string;
            status: "WARNING" | "PASS" | "FAIL";
            label?: string | undefined;
            reason?: string | null | undefined;
        }[];
        blockingCount: number;
        warningCount: number;
    }, {
        status: "READY_FOR_BROKER" | "NOT_READY" | "PARTIALLY_READY";
        checks: {
            code: string;
            status: "WARNING" | "PASS" | "FAIL";
            label?: string | undefined;
            reason?: string | null | undefined;
        }[];
        blockingCount: number;
        warningCount: number;
    }>>;
    products: z.ZodOptional<z.ZodArray<z.ZodObject<{
        purchaseOrderLineId: z.ZodString;
        purchaseOrderId: z.ZodString;
        poNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        productId: z.ZodNullable<z.ZodString>;
        sku: z.ZodNullable<z.ZodString>;
        description: z.ZodString;
        quantity: z.ZodNumber;
        allocatedQuantity: z.ZodOptional<z.ZodNumber>;
        countryOfOrigin: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        gtipCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        classificationStatus: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        classificationSource: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        customsDescription: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        productId: string | null;
        quantity: number;
        purchaseOrderId: string;
        purchaseOrderLineId: string;
        sku: string | null;
        poNumber?: string | null | undefined;
        allocatedQuantity?: number | undefined;
        countryOfOrigin?: string | null | undefined;
        gtipCode?: string | null | undefined;
        classificationStatus?: string | null | undefined;
        classificationSource?: string | null | undefined;
        customsDescription?: string | null | undefined;
    }, {
        description: string;
        productId: string | null;
        quantity: number;
        purchaseOrderId: string;
        purchaseOrderLineId: string;
        sku: string | null;
        poNumber?: string | null | undefined;
        allocatedQuantity?: number | undefined;
        countryOfOrigin?: string | null | undefined;
        gtipCode?: string | null | undefined;
        classificationStatus?: string | null | undefined;
        classificationSource?: string | null | undefined;
        customsDescription?: string | null | undefined;
    }>, "many">>;
    preArrival: z.ZodOptional<z.ZodObject<{
        phase: z.ZodString;
        daysToArrival: z.ZodNullable<z.ZodNumber>;
        eta: z.ZodNullable<z.ZodString>;
        etaSource: z.ZodEnum<["MARITIME", "BOOKING", "NONE"]>;
        bookingEta: z.ZodNullable<z.ZodString>;
        maritimeEta: z.ZodNullable<z.ZodString>;
        ata: z.ZodNullable<z.ZodString>;
        readinessStatus: z.ZodNullable<z.ZodString>;
        blockingCount: z.ZodNumber;
        warningCount: z.ZodNumber;
        urgency: z.ZodEnum<["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
        label: z.ZodString;
        nextAction: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        blockingCount: number;
        warningCount: number;
        readinessStatus: string | null;
        eta: string | null;
        ata: string | null;
        phase: string;
        daysToArrival: number | null;
        etaSource: "MARITIME" | "BOOKING" | "NONE";
        bookingEta: string | null;
        maritimeEta: string | null;
        urgency: "CRITICAL" | "NONE" | "LOW" | "MEDIUM" | "HIGH";
        nextAction: string | null;
    }, {
        label: string;
        blockingCount: number;
        warningCount: number;
        readinessStatus: string | null;
        eta: string | null;
        ata: string | null;
        phase: string;
        daysToArrival: number | null;
        etaSource: "MARITIME" | "BOOKING" | "NONE";
        bookingEta: string | null;
        maritimeEta: string | null;
        urgency: "CRITICAL" | "NONE" | "LOW" | "MEDIUM" | "HIGH";
        nextAction: string | null;
    }>>;
    allowedActions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "DRAFT" | "CANCELLED" | "PREPARING" | "READY_FOR_BROKER" | "BROKER_REVIEW" | "DECLARATION_PREPARING" | "DECLARATION_FILED" | "CUSTOMS_PROCESSING" | "CLEARANCE_PENDING" | "CLEARED" | "HOLD";
    id: string;
    createdAt: string;
    updatedAt: string;
    organisationId: string;
    shipmentWorkspaceId: string;
    orderWorkspaceId: string;
    readinessStatus: "READY_FOR_BROKER" | "NOT_READY" | "PARTIALLY_READY";
    statusSource: "BUYER" | "CUSTOMS_BROKER" | "DEMAXTORE_OPERATIONS" | "SYSTEM_DERIVED";
    notes?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    brokerUserId?: string | null | undefined;
    brokerAssignmentId?: string | null | undefined;
    declarationReference?: string | null | undefined;
    declarationDate?: string | null | undefined;
    customsOffice?: string | null | undefined;
    holdCategory?: "OTHER" | "DOCUMENT" | "BROKER_REVIEW" | "CLASSIFICATION" | "CUSTOMS_QUERY" | "PAYMENT" | null | undefined;
    holdReason?: string | null | undefined;
    holdAt?: string | null | undefined;
    clearedAt?: string | null | undefined;
    cancelledAt?: string | null | undefined;
    shipmentRef?: string | null | undefined;
    eta?: string | null | undefined;
    ata?: string | null | undefined;
    originPort?: string | null | undefined;
    destinationPort?: string | null | undefined;
    readiness?: {
        status: "READY_FOR_BROKER" | "NOT_READY" | "PARTIALLY_READY";
        checks: {
            code: string;
            status: "WARNING" | "PASS" | "FAIL";
            label?: string | undefined;
            reason?: string | null | undefined;
        }[];
        blockingCount: number;
        warningCount: number;
    } | undefined;
    products?: {
        description: string;
        productId: string | null;
        quantity: number;
        purchaseOrderId: string;
        purchaseOrderLineId: string;
        sku: string | null;
        poNumber?: string | null | undefined;
        allocatedQuantity?: number | undefined;
        countryOfOrigin?: string | null | undefined;
        gtipCode?: string | null | undefined;
        classificationStatus?: string | null | undefined;
        classificationSource?: string | null | undefined;
        customsDescription?: string | null | undefined;
    }[] | undefined;
    preArrival?: {
        label: string;
        blockingCount: number;
        warningCount: number;
        readinessStatus: string | null;
        eta: string | null;
        ata: string | null;
        phase: string;
        daysToArrival: number | null;
        etaSource: "MARITIME" | "BOOKING" | "NONE";
        bookingEta: string | null;
        maritimeEta: string | null;
        urgency: "CRITICAL" | "NONE" | "LOW" | "MEDIUM" | "HIGH";
        nextAction: string | null;
    } | undefined;
    allowedActions?: string[] | undefined;
}, {
    status: "DRAFT" | "CANCELLED" | "PREPARING" | "READY_FOR_BROKER" | "BROKER_REVIEW" | "DECLARATION_PREPARING" | "DECLARATION_FILED" | "CUSTOMS_PROCESSING" | "CLEARANCE_PENDING" | "CLEARED" | "HOLD";
    id: string;
    createdAt: string;
    updatedAt: string;
    organisationId: string;
    shipmentWorkspaceId: string;
    orderWorkspaceId: string;
    readinessStatus: "READY_FOR_BROKER" | "NOT_READY" | "PARTIALLY_READY";
    statusSource: "BUYER" | "CUSTOMS_BROKER" | "DEMAXTORE_OPERATIONS" | "SYSTEM_DERIVED";
    notes?: string | null | undefined;
    destinationCountryCode?: string | null | undefined;
    brokerUserId?: string | null | undefined;
    brokerAssignmentId?: string | null | undefined;
    declarationReference?: string | null | undefined;
    declarationDate?: string | null | undefined;
    customsOffice?: string | null | undefined;
    holdCategory?: "OTHER" | "DOCUMENT" | "BROKER_REVIEW" | "CLASSIFICATION" | "CUSTOMS_QUERY" | "PAYMENT" | null | undefined;
    holdReason?: string | null | undefined;
    holdAt?: string | null | undefined;
    clearedAt?: string | null | undefined;
    cancelledAt?: string | null | undefined;
    shipmentRef?: string | null | undefined;
    eta?: string | null | undefined;
    ata?: string | null | undefined;
    originPort?: string | null | undefined;
    destinationPort?: string | null | undefined;
    readiness?: {
        status: "READY_FOR_BROKER" | "NOT_READY" | "PARTIALLY_READY";
        checks: {
            code: string;
            status: "WARNING" | "PASS" | "FAIL";
            label?: string | undefined;
            reason?: string | null | undefined;
        }[];
        blockingCount: number;
        warningCount: number;
    } | undefined;
    products?: {
        description: string;
        productId: string | null;
        quantity: number;
        purchaseOrderId: string;
        purchaseOrderLineId: string;
        sku: string | null;
        poNumber?: string | null | undefined;
        allocatedQuantity?: number | undefined;
        countryOfOrigin?: string | null | undefined;
        gtipCode?: string | null | undefined;
        classificationStatus?: string | null | undefined;
        classificationSource?: string | null | undefined;
        customsDescription?: string | null | undefined;
    }[] | undefined;
    preArrival?: {
        label: string;
        blockingCount: number;
        warningCount: number;
        readinessStatus: string | null;
        eta: string | null;
        ata: string | null;
        phase: string;
        daysToArrival: number | null;
        etaSource: "MARITIME" | "BOOKING" | "NONE";
        bookingEta: string | null;
        maritimeEta: string | null;
        urgency: "CRITICAL" | "NONE" | "LOW" | "MEDIUM" | "HIGH";
        nextAction: string | null;
    } | undefined;
    allowedActions?: string[] | undefined;
}>;
export type CustomsCaseDto = z.infer<typeof CustomsCaseDtoSchema>;
export declare const EnsureCustomsCaseSchema: z.ZodObject<{
    shipmentWorkspaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    shipmentWorkspaceId: string;
}, {
    shipmentWorkspaceId: string;
}>;
export type EnsureCustomsCaseInput = z.infer<typeof EnsureCustomsCaseSchema>;
export declare const TransitionCustomsCaseSchema: z.ZodObject<{
    toStatus: z.ZodEnum<["DRAFT", "PREPARING", "READY_FOR_BROKER", "BROKER_REVIEW", "DECLARATION_PREPARING", "DECLARATION_FILED", "CUSTOMS_PROCESSING", "CLEARANCE_PENDING", "CLEARED", "HOLD", "CANCELLED"]>;
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    source: z.ZodOptional<z.ZodEnum<["BUYER", "CUSTOMS_BROKER", "DEMAXTORE_OPERATIONS", "SYSTEM_DERIVED"]>>;
}, "strip", z.ZodTypeAny, {
    toStatus: "DRAFT" | "CANCELLED" | "PREPARING" | "READY_FOR_BROKER" | "BROKER_REVIEW" | "DECLARATION_PREPARING" | "DECLARATION_FILED" | "CUSTOMS_PROCESSING" | "CLEARANCE_PENDING" | "CLEARED" | "HOLD";
    source?: "BUYER" | "CUSTOMS_BROKER" | "DEMAXTORE_OPERATIONS" | "SYSTEM_DERIVED" | undefined;
    reason?: string | null | undefined;
}, {
    toStatus: "DRAFT" | "CANCELLED" | "PREPARING" | "READY_FOR_BROKER" | "BROKER_REVIEW" | "DECLARATION_PREPARING" | "DECLARATION_FILED" | "CUSTOMS_PROCESSING" | "CLEARANCE_PENDING" | "CLEARED" | "HOLD";
    source?: "BUYER" | "CUSTOMS_BROKER" | "DEMAXTORE_OPERATIONS" | "SYSTEM_DERIVED" | undefined;
    reason?: string | null | undefined;
}>;
export type TransitionCustomsCaseInput = z.infer<typeof TransitionCustomsCaseSchema>;
export declare const RecordDeclarationSchema: z.ZodObject<{
    declarationReference: z.ZodString;
    declarationDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    customsOffice: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    declarationReference: string;
    reason?: string | null | undefined;
    declarationDate?: string | null | undefined;
    customsOffice?: string | null | undefined;
}, {
    declarationReference: string;
    reason?: string | null | undefined;
    declarationDate?: string | null | undefined;
    customsOffice?: string | null | undefined;
}>;
export type RecordDeclarationInput = z.infer<typeof RecordDeclarationSchema>;
export declare const PlaceCustomsHoldSchema: z.ZodObject<{
    category: z.ZodDefault<z.ZodEnum<["DOCUMENT", "CLASSIFICATION", "BROKER_REVIEW", "CUSTOMS_QUERY", "PAYMENT", "OTHER"]>>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    category: "OTHER" | "DOCUMENT" | "BROKER_REVIEW" | "CLASSIFICATION" | "CUSTOMS_QUERY" | "PAYMENT";
    reason: string;
}, {
    reason: string;
    category?: "OTHER" | "DOCUMENT" | "BROKER_REVIEW" | "CLASSIFICATION" | "CUSTOMS_QUERY" | "PAYMENT" | undefined;
}>;
export type PlaceCustomsHoldInput = z.infer<typeof PlaceCustomsHoldSchema>;
export declare const ResolveCustomsHoldSchema: z.ZodObject<{
    resumeStatus: z.ZodOptional<z.ZodEnum<["DRAFT", "PREPARING", "READY_FOR_BROKER", "BROKER_REVIEW", "DECLARATION_PREPARING", "DECLARATION_FILED", "CUSTOMS_PROCESSING", "CLEARANCE_PENDING", "CLEARED", "HOLD", "CANCELLED"]>>;
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reason?: string | null | undefined;
    resumeStatus?: "DRAFT" | "CANCELLED" | "PREPARING" | "READY_FOR_BROKER" | "BROKER_REVIEW" | "DECLARATION_PREPARING" | "DECLARATION_FILED" | "CUSTOMS_PROCESSING" | "CLEARANCE_PENDING" | "CLEARED" | "HOLD" | undefined;
}, {
    reason?: string | null | undefined;
    resumeStatus?: "DRAFT" | "CANCELLED" | "PREPARING" | "READY_FOR_BROKER" | "BROKER_REVIEW" | "DECLARATION_PREPARING" | "DECLARATION_FILED" | "CUSTOMS_PROCESSING" | "CLEARANCE_PENDING" | "CLEARED" | "HOLD" | undefined;
}>;
export type ResolveCustomsHoldInput = z.infer<typeof ResolveCustomsHoldSchema>;
export declare const CustomsCaseListQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "PREPARING", "READY_FOR_BROKER", "BROKER_REVIEW", "DECLARATION_PREPARING", "DECLARATION_FILED", "CUSTOMS_PROCESSING", "CLEARANCE_PENDING", "CLEARED", "HOLD", "CANCELLED"]>>;
    readiness: z.ZodOptional<z.ZodEnum<["NOT_READY", "PARTIALLY_READY", "READY_FOR_BROKER"]>>;
    attention: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "DRAFT" | "CANCELLED" | "PREPARING" | "READY_FOR_BROKER" | "BROKER_REVIEW" | "DECLARATION_PREPARING" | "DECLARATION_FILED" | "CUSTOMS_PROCESSING" | "CLEARANCE_PENDING" | "CLEARED" | "HOLD" | undefined;
    readiness?: "READY_FOR_BROKER" | "NOT_READY" | "PARTIALLY_READY" | undefined;
    attention?: boolean | undefined;
}, {
    status?: "DRAFT" | "CANCELLED" | "PREPARING" | "READY_FOR_BROKER" | "BROKER_REVIEW" | "DECLARATION_PREPARING" | "DECLARATION_FILED" | "CUSTOMS_PROCESSING" | "CLEARANCE_PENDING" | "CLEARED" | "HOLD" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    readiness?: "READY_FOR_BROKER" | "NOT_READY" | "PARTIALLY_READY" | undefined;
    attention?: boolean | undefined;
}>;
export type CustomsCaseListQuery = z.infer<typeof CustomsCaseListQuerySchema>;
/** Turkey eligibility helpers */
export declare function isTurkeyCountryCode(raw: string | null | undefined): boolean;
