/**
 * Sprint 39 — Customs Broker Execution 2.0 (thin action contracts).
 * Legal: broker-attributed orchestration; not government filing.
 */
import { z } from "zod";
export declare const CUSTOMS_BROKER_ACTIONS: readonly ["START_REVIEW", "REQUEST_DOCUMENT", "REQUEST_INFORMATION", "VERIFY_CLASSIFICATION", "START_DECLARATION_PREPARATION", "RECORD_DECLARATION", "START_CUSTOMS_PROCESSING", "PLACE_HOLD", "RESOLVE_HOLD", "MARK_CLEARANCE_PENDING", "MARK_CLEARED"];
export type CustomsBrokerAction = (typeof CUSTOMS_BROKER_ACTIONS)[number];
export declare const CUSTOMS_INFO_REQUEST_CATEGORIES: readonly ["DOCUMENT", "PRODUCT_INFORMATION", "ORIGIN", "CLASSIFICATION", "INVOICE", "QUANTITY", "OTHER"];
export declare const VerifyClassificationSchema: z.ZodObject<{
    productId: z.ZodString;
    gtipCode: z.ZodString;
    customsDescription: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reviewNote: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    productId: string;
    gtipCode: string;
    customsDescription?: string | null | undefined;
    reviewNote?: string | null | undefined;
}, {
    productId: string;
    gtipCode: string;
    customsDescription?: string | null | undefined;
    reviewNote?: string | null | undefined;
}>;
export type VerifyClassificationInput = z.infer<typeof VerifyClassificationSchema>;
export declare const RequestCustomsDocumentSchema: z.ZodObject<{
    documentType: z.ZodString;
    reason: z.ZodString;
    ownerRole: z.ZodDefault<z.ZodEnum<["BUYER", "OPERATIONS", "SUPPLIER", "DOCUMENTATION"]>>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    documentType: string;
    ownerRole: "BUYER" | "SUPPLIER" | "OPERATIONS" | "DOCUMENTATION";
}, {
    reason: string;
    documentType: string;
    ownerRole?: "BUYER" | "SUPPLIER" | "OPERATIONS" | "DOCUMENTATION" | undefined;
}>;
export type RequestCustomsDocumentInput = z.infer<typeof RequestCustomsDocumentSchema>;
export declare const RequestCustomsInformationSchema: z.ZodObject<{
    category: z.ZodDefault<z.ZodEnum<["DOCUMENT", "PRODUCT_INFORMATION", "ORIGIN", "CLASSIFICATION", "INVOICE", "QUANTITY", "OTHER"]>>;
    title: z.ZodString;
    description: z.ZodString;
    ownerRole: z.ZodDefault<z.ZodEnum<["BUYER", "OPERATIONS", "SUPPLIER", "DOCUMENTATION", "CUSTOMER"]>>;
    productId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    category: "OTHER" | "INVOICE" | "DOCUMENT" | "CLASSIFICATION" | "PRODUCT_INFORMATION" | "ORIGIN" | "QUANTITY";
    title: string;
    ownerRole: "BUYER" | "SUPPLIER" | "OPERATIONS" | "DOCUMENTATION" | "CUSTOMER";
    productId?: string | null | undefined;
}, {
    description: string;
    title: string;
    productId?: string | null | undefined;
    category?: "OTHER" | "INVOICE" | "DOCUMENT" | "CLASSIFICATION" | "PRODUCT_INFORMATION" | "ORIGIN" | "QUANTITY" | undefined;
    ownerRole?: "BUYER" | "SUPPLIER" | "OPERATIONS" | "DOCUMENTATION" | "CUSTOMER" | undefined;
}>;
export type RequestCustomsInformationInput = z.infer<typeof RequestCustomsInformationSchema>;
export declare const StartBrokerReviewSchema: z.ZodObject<{
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reason?: string | null | undefined;
}, {
    reason?: string | null | undefined;
}>;
export type StartBrokerReviewInput = z.infer<typeof StartBrokerReviewSchema>;
export declare const BrokerHoldSchema: z.ZodObject<{
    category: z.ZodDefault<z.ZodEnum<["DOCUMENT", "CLASSIFICATION", "BROKER_REVIEW", "CUSTOMS_QUERY", "PAYMENT", "OTHER"]>>;
    reason: z.ZodString;
    recommendedAction: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    ownerRole: z.ZodOptional<z.ZodEnum<["BUYER", "OPERATIONS", "SUPPLIER", "DOCUMENTATION", "CUSTOMER"]>>;
}, "strip", z.ZodTypeAny, {
    category: "OTHER" | "DOCUMENT" | "BROKER_REVIEW" | "CLASSIFICATION" | "CUSTOMS_QUERY" | "PAYMENT";
    reason: string;
    ownerRole?: "BUYER" | "SUPPLIER" | "OPERATIONS" | "DOCUMENTATION" | "CUSTOMER" | undefined;
    recommendedAction?: string | null | undefined;
}, {
    reason: string;
    category?: "OTHER" | "DOCUMENT" | "BROKER_REVIEW" | "CLASSIFICATION" | "CUSTOMS_QUERY" | "PAYMENT" | undefined;
    ownerRole?: "BUYER" | "SUPPLIER" | "OPERATIONS" | "DOCUMENTATION" | "CUSTOMER" | undefined;
    recommendedAction?: string | null | undefined;
}>;
export type BrokerHoldInput = z.infer<typeof BrokerHoldSchema>;
/** Hard-block FAIL codes for declaration transitions. */
export declare const DECLARATION_HARD_BLOCK_FAIL_CODES: readonly ["PRODUCT_LINKED", "ORIGIN", "GTIP_CLASSIFICATION", "BROKER_ASSIGNMENT", "COMMERCIAL_INVOICE", "PACKING_LIST"];
export declare function computeCustomsBrokerAllowedActions(input: {
    status: string;
    readinessStatus: string;
    blockingCount: number;
    hasDeclarationRef: boolean;
}): CustomsBrokerAction[];
