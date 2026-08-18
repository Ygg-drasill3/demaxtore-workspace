/**
 * Sprint 40 — Turkey Duty & Tax Engine V1 (estimation only; not official liability).
 */
import { z } from "zod";
export const DUTY_TAX_COMPONENT_TYPES = [
    "CUSTOMS_DUTY",
    "VAT",
    "ADDITIONAL_CUSTOMS_DUTY",
    "SCT_OTV",
    "ANTI_DUMPING",
    "SURVEILLANCE_ADJUSTMENT",
    "SAFEGUARD",
    "OTHER",
];
/** Components V1 may evaluate when a rule exists. Others stay NOT_EVALUATED. */
export const DUTY_TAX_V1_EVALUABLE_COMPONENTS = ["CUSTOMS_DUTY", "VAT"];
export const DUTY_TAX_COMPONENT_STATUSES = [
    "EVALUATED",
    "NOT_EVALUATED",
    "MISSING_INPUT",
    "RULE_MISSING",
    "OVERRIDDEN",
];
export const DUTY_TAX_CALCULATION_STATUSES = [
    "DRAFT",
    "INCOMPLETE",
    "PROVISIONAL",
    "ESTIMATED",
    "BROKER_REVIEWED",
    "SUPERSEDED",
];
export const DUTY_TAX_RULE_SOURCES = [
    "ADMIN_CONFIGURED",
    "CUSTOMS_BROKER_CONFIGURED",
    "OFFICIAL_DATA_IMPORT",
];
export const DUTY_TAX_BASE_FORMULAS = [
    "GOODS_VALUE",
    "GOODS_PLUS_FREIGHT",
    "GOODS_PLUS_FREIGHT_PLUS_DUTY",
];
export const DUTY_TAX_EXCHANGE_RATE_SOURCES = [
    "MANUAL",
    "BROKER_ENTERED",
    "SYSTEM_CONFIGURED",
    "OFFICIAL_RATE_IMPORT",
];
export const DUTY_TAX_FREIGHT_ALLOCATION_METHODS = ["VALUE", "NONE"];
export const DutyTaxCalculateSchema = z.object({
    calculationDate: z.string().datetime().optional().nullable(),
    exchangeRate: z.number().positive().max(1_000_000).optional().nullable(),
    exchangeRateSource: z.enum(DUTY_TAX_EXCHANGE_RATE_SOURCES).optional().nullable(),
    exchangeRateDate: z.string().datetime().optional().nullable(),
    insuranceAmount: z.number().min(0).max(1_000_000_000).optional().nullable(),
    freightAmountOverride: z.number().min(0).max(1_000_000_000).optional().nullable(),
    goodsValueOverride: z.number().min(0).max(1_000_000_000).optional().nullable(),
    freightAllocationMethod: z.enum(DUTY_TAX_FREIGHT_ALLOCATION_METHODS).default("VALUE"),
    targetCurrency: z.string().trim().min(3).max(3).default("TRY"),
    note: z.string().trim().max(2000).optional().nullable(),
});
export const DutyTaxReviewSchema = z.object({
    note: z.string().trim().max(2000).optional().nullable(),
});
export const DutyTaxOverrideSchema = z.object({
    lineId: z.string().uuid(),
    overrideAmount: z.number().min(0).max(1_000_000_000),
    reason: z.string().trim().min(3).max(2000),
});
export const DutyTaxRuleUpsertSchema = z.object({
    componentType: z.enum(["CUSTOMS_DUTY", "VAT"]),
    gtipCode: z.string().trim().min(2).max(32),
    originCountryCode: z.string().trim().min(2).max(3).optional().nullable(),
    ratePercent: z.number().min(0).max(1000),
    baseFormula: z.enum(DUTY_TAX_BASE_FORMULAS),
    effectiveFrom: z.string().datetime(),
    effectiveTo: z.string().datetime().optional().nullable(),
    priority: z.number().int().min(0).max(10_000).default(100),
    source: z.enum(["ADMIN_CONFIGURED", "CUSTOMS_BROKER_CONFIGURED"]).default("ADMIN_CONFIGURED"),
    active: z.boolean().default(true),
    notes: z.string().trim().max(2000).optional().nullable(),
});
export const DutyTaxLineDtoSchema = z.object({
    id: z.string().uuid(),
    purchaseOrderLineId: z.string().uuid().nullable(),
    productId: z.string().uuid().nullable(),
    sku: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    gtipCode: z.string().nullable(),
    classificationStatus: z.string().nullable(),
    classificationSource: z.string().nullable().optional(),
    originCountryCode: z.string().nullable(),
    quantity: z.number(),
    uom: z.string().nullable().optional(),
    goodsValue: z.number().nullable(),
    allocatedFreight: z.number().nullable(),
    customsValue: z.number().nullable(),
    componentType: z.enum(DUTY_TAX_COMPONENT_TYPES),
    componentStatus: z.enum(DUTY_TAX_COMPONENT_STATUSES),
    taxableBase: z.number().nullable(),
    ratePercent: z.number().nullable(),
    amount: z.number().nullable(),
    ruleId: z.string().uuid().nullable().optional(),
    ruleVersion: z.number().nullable().optional(),
    ruleSource: z.string().nullable().optional(),
    warning: z.string().nullable().optional(),
    overrideAmount: z.number().nullable().optional(),
    overrideReason: z.string().nullable().optional(),
});
export const DutyTaxCalculationDtoSchema = z.object({
    id: z.string().uuid(),
    customsCaseId: z.string().uuid(),
    organisationId: z.string().uuid(),
    version: z.number(),
    status: z.enum(DUTY_TAX_CALCULATION_STATUSES),
    calculationDate: z.string(),
    calculationCurrency: z.string(),
    sourceCurrency: z.string().nullable().optional(),
    goodsValueEstimate: z.number().nullable(),
    freightAmount: z.number().nullable(),
    insuranceAmount: z.number().nullable(),
    customsValueEstimate: z.number().nullable(),
    exchangeRate: z.number().nullable(),
    exchangeRateSource: z.string().nullable(),
    exchangeRateDate: z.string().nullable().optional(),
    freightAllocationMethod: z.string(),
    totalEvaluatedAmount: z.number().nullable(),
    provisional: z.boolean(),
    completenessLabel: z.enum(["LOW", "PROVISIONAL", "COMPLETE"]),
    inputHash: z.string(),
    diagnostics: z.array(z.string()),
    disclaimer: z.string().default("Preliminary customs cost estimate — not an official Turkish Customs assessment or tax liability."),
    reviewedAt: z.string().nullable().optional(),
    reviewedById: z.string().uuid().nullable().optional(),
    createdAt: z.string(),
    createdById: z.string().uuid().nullable().optional(),
    lines: z.array(DutyTaxLineDtoSchema),
    totalsByComponent: z.record(z.string(), z.number().nullable()).optional(),
});
export const MATERIAL_ESTIMATE_CHANGE_THRESHOLD = 0.1; // 10%
export function roundMoney(n, decimals = 2) {
    const f = 10 ** decimals;
    return Math.round((n + Number.EPSILON) * f) / f;
}
export function dutyTaxCompletenessLabel(input) {
    if (input.missingCritical || input.status === "INCOMPLETE")
        return "LOW";
    if (input.provisional || input.status === "PROVISIONAL")
        return "PROVISIONAL";
    return "COMPLETE";
}
