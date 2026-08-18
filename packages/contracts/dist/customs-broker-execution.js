/**
 * Sprint 39 — Customs Broker Execution 2.0 (thin action contracts).
 * Legal: broker-attributed orchestration; not government filing.
 */
import { z } from "zod";
import { CUSTOMS_HOLD_CATEGORIES } from "./customs.js";
export const CUSTOMS_BROKER_ACTIONS = [
    "START_REVIEW",
    "REQUEST_DOCUMENT",
    "REQUEST_INFORMATION",
    "VERIFY_CLASSIFICATION",
    "START_DECLARATION_PREPARATION",
    "RECORD_DECLARATION",
    "START_CUSTOMS_PROCESSING",
    "PLACE_HOLD",
    "RESOLVE_HOLD",
    "MARK_CLEARANCE_PENDING",
    "MARK_CLEARED",
];
export const CUSTOMS_INFO_REQUEST_CATEGORIES = [
    "DOCUMENT",
    "PRODUCT_INFORMATION",
    "ORIGIN",
    "CLASSIFICATION",
    "INVOICE",
    "QUANTITY",
    "OTHER",
];
export const VerifyClassificationSchema = z.object({
    productId: z.string().uuid(),
    gtipCode: z.string().trim().min(2).max(32),
    customsDescription: z.string().trim().max(2000).optional().nullable(),
    reviewNote: z.string().trim().max(2000).optional().nullable(),
});
export const RequestCustomsDocumentSchema = z.object({
    documentType: z.string().trim().min(2).max(64),
    reason: z.string().trim().min(3).max(2000),
    ownerRole: z.enum(["BUYER", "OPERATIONS", "SUPPLIER", "DOCUMENTATION"]).default("BUYER"),
});
export const RequestCustomsInformationSchema = z.object({
    category: z.enum(CUSTOMS_INFO_REQUEST_CATEGORIES).default("OTHER"),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(3).max(2000),
    ownerRole: z.enum(["BUYER", "OPERATIONS", "SUPPLIER", "DOCUMENTATION", "CUSTOMER"]).default("BUYER"),
    productId: z.string().uuid().optional().nullable(),
});
export const StartBrokerReviewSchema = z.object({
    reason: z.string().trim().max(2000).optional().nullable(),
});
export const BrokerHoldSchema = z.object({
    category: z.enum(CUSTOMS_HOLD_CATEGORIES).default("OTHER"),
    reason: z.string().trim().min(3).max(2000),
    recommendedAction: z.string().trim().max(2000).optional().nullable(),
    ownerRole: z.enum(["BUYER", "OPERATIONS", "SUPPLIER", "DOCUMENTATION", "CUSTOMER"]).optional(),
});
/** Hard-block FAIL codes for declaration transitions. */
export const DECLARATION_HARD_BLOCK_FAIL_CODES = [
    "PRODUCT_LINKED",
    "ORIGIN",
    "GTIP_CLASSIFICATION",
    "BROKER_ASSIGNMENT",
    "COMMERCIAL_INVOICE",
    "PACKING_LIST",
];
export function computeCustomsBrokerAllowedActions(input) {
    const actions = [];
    const s = input.status;
    if (s === "READY_FOR_BROKER" || s === "PREPARING" || s === "DRAFT") {
        actions.push("START_REVIEW");
    }
    if (["BROKER_REVIEW", "DECLARATION_PREPARING", "READY_FOR_BROKER", "PREPARING"].includes(s)) {
        actions.push("REQUEST_DOCUMENT", "REQUEST_INFORMATION", "VERIFY_CLASSIFICATION");
    }
    if (s === "BROKER_REVIEW") {
        actions.push("START_DECLARATION_PREPARATION");
    }
    if (["DECLARATION_PREPARING", "BROKER_REVIEW", "DECLARATION_FILED"].includes(s)) {
        actions.push("RECORD_DECLARATION");
    }
    if (s === "DECLARATION_FILED") {
        actions.push("START_CUSTOMS_PROCESSING");
    }
    if (s === "CUSTOMS_PROCESSING") {
        actions.push("MARK_CLEARANCE_PENDING");
    }
    if (s === "CLEARANCE_PENDING" || s === "CUSTOMS_PROCESSING") {
        actions.push("MARK_CLEARED");
    }
    if (s !== "CLEARED" && s !== "CANCELLED" && s !== "HOLD") {
        actions.push("PLACE_HOLD");
    }
    if (s === "HOLD") {
        actions.push("RESOLVE_HOLD");
    }
    return actions;
}
