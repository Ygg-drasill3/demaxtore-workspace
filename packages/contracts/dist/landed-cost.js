/**
 * Sprint 42 — True Landed Cost Engine V1 (GLOBAL CORE).
 * Customer transaction costs only. Unknown ≠ 0. No SKU allocation / variance dashboard.
 */
import { z } from "zod";
export const LANDED_COST_COMPONENT_TYPES = [
    "GOODS",
    "FREIGHT",
    "INSURANCE",
    "CUSTOMS_DUTY",
    "VAT",
    "ADDITIONAL_CUSTOMS_DUTY",
    "SCT_OTV",
    "ANTI_DUMPING",
    "OTHER_TAX",
    "CUSTOMS_BROKERAGE",
    "PORT_LOCAL",
    "TERMINAL",
    "DOCUMENTATION",
    "STORAGE",
    "DEMURRAGE",
    "DETENTION",
    "INLAND_TRANSPORT",
    "OTHER",
];
export const LANDED_COST_NATURES = ["ESTIMATED", "ACTUAL"];
export const LANDED_COST_SOURCE_TYPES = [
    "PURCHASE_ORDER",
    "COMMERCIAL_INVOICE",
    "FREIGHTIQ",
    "CUSTOMS_DUTY_TAX_ENGINE",
    "CUSTOMS_BROKER",
    "INLAND_EXECUTION",
    "TRADE_DOCUMENT",
    "BUYER_MANUAL",
    "SYSTEM_CONFIG",
    "OTHER",
];
export const LANDED_COST_STATUSES = [
    "DRAFT",
    "INCOMPLETE",
    "ESTIMATED",
    "MIXED",
    "ACTUAL",
    "SUPERSEDED",
];
export const LANDED_COST_SCOPES = ["SHIPMENT", "PO"];
export const LANDED_COST_FX_SOURCES = [
    "MANUAL",
    "BROKER_ENTERED",
    "SYSTEM_CONFIGURED",
    "DUTY_TAX_SNAPSHOT",
    "IDENTITY",
];
/** V1 required components for a shipment when Turkey customs path is active. */
export const LANDED_COST_REQUIRED_DEFAULT = ["GOODS", "FREIGHT"];
export const LANDED_COST_REQUIRED_TURKEY = [
    "GOODS",
    "FREIGHT",
    "CUSTOMS_DUTY",
    "INLAND_TRANSPORT",
];
export function roundMoney(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
export const LandedCostCalculateSchema = z.object({
    shipmentWorkspaceId: z.string().uuid(),
    calculationCurrency: z.string().trim().min(3).max(3).default("USD"),
    exchangeRate: z.number().positive().max(1_000_000).optional().nullable(),
    exchangeRateSource: z.enum(LANDED_COST_FX_SOURCES).optional().nullable(),
    exchangeRateDate: z.string().datetime().optional().nullable(),
    /** Map: originalCurrency → rate into calculationCurrency (1 original = rate calc). */
    fxRates: z
        .record(z.string().trim().min(3).max(3), z.number().positive().max(1_000_000))
        .optional()
        .nullable(),
    note: z.string().trim().max(2000).optional().nullable(),
});
export const TransactionCostCreateSchema = z.object({
    shipmentWorkspaceId: z.string().uuid(),
    componentType: z.enum(LANDED_COST_COMPONENT_TYPES),
    amount: z.number().min(0).max(1_000_000_000),
    currency: z.string().trim().min(3).max(3),
    costNature: z.enum(LANDED_COST_NATURES).default("ACTUAL"),
    sourceType: z
        .enum(["BUYER_MANUAL", "CUSTOMS_BROKER", "INLAND_EXECUTION", "OTHER", "TRADE_DOCUMENT"])
        .default("BUYER_MANUAL"),
    description: z.string().trim().min(3).max(2000),
    documentId: z.string().uuid().optional().nullable(),
    incurredAt: z.string().datetime().optional().nullable(),
    customsCaseId: z.string().uuid().optional().nullable(),
    inlandDeliveryId: z.string().uuid().optional().nullable(),
});
export const LandedCostComponentDtoSchema = z.object({
    id: z.string().uuid(),
    componentType: z.enum(LANDED_COST_COMPONENT_TYPES),
    sourceType: z.enum(LANDED_COST_SOURCE_TYPES),
    sourceId: z.string().nullable(),
    amountOriginal: z.number().nullable(),
    currencyOriginal: z.string().nullable(),
    fxRate: z.number().nullable(),
    amountCalculationCurrency: z.number().nullable(),
    costNature: z.enum(LANDED_COST_NATURES),
    inclusion: z.enum(["INCLUDED", "MISSING", "OPTIONAL_ABSENT", "EXCLUDED"]),
    description: z.string().nullable().optional(),
    allocationMethod: z.string().nullable().optional(),
    provenance: z.record(z.unknown()).optional(),
});
export const LandedCostCalculationDtoSchema = z.object({
    id: z.string().uuid(),
    organisationId: z.string().uuid(),
    scopeType: z.enum(LANDED_COST_SCOPES),
    scopeId: z.string().uuid(),
    shipmentWorkspaceId: z.string().uuid().nullable(),
    orderWorkspaceId: z.string().uuid().nullable(),
    version: z.number().int(),
    status: z.enum(LANDED_COST_STATUSES),
    displayLabel: z.string(),
    calculationCurrency: z.string(),
    exchangeRate: z.number().nullable().optional(),
    exchangeRateSource: z.string().nullable().optional(),
    exchangeRateDate: z.string().nullable().optional(),
    goodsCost: z.number().nullable(),
    freightCost: z.number().nullable(),
    insuranceCost: z.number().nullable(),
    dutyTaxCost: z.number().nullable(),
    customsLocalCost: z.number().nullable(),
    inlandCost: z.number().nullable(),
    otherCost: z.number().nullable(),
    knownSubtotal: z.number(),
    totalLandedCost: z.number().nullable(),
    estimatedAmount: z.number(),
    actualAmount: z.number(),
    missingComponentCount: z.number().int(),
    completeness: z.enum(["COMPLETE", "PARTIAL", "INCOMPLETE"]),
    diagnostics: z.array(z.string()),
    inputHash: z.string(),
    components: z.array(LandedCostComponentDtoSchema),
    calculatedAt: z.string(),
    createdAt: z.string(),
    supersededAt: z.string().nullable().optional(),
});
export function landedCostDisplayLabel(status) {
    switch (status) {
        case "ACTUAL":
            return "ACTUAL LANDED COST";
        case "MIXED":
            return "CURRENT LANDED COST (MIXED)";
        case "ESTIMATED":
            return "ESTIMATED LANDED COST";
        case "INCOMPLETE":
            return "INCOMPLETE LANDED COST";
        case "DRAFT":
            return "DRAFT LANDED COST";
        case "SUPERSEDED":
            return "SUPERSEDED LANDED COST";
        default:
            return "LANDED COST";
    }
}
