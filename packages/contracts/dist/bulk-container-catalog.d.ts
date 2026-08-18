import { z } from "zod";
import type { PackingTypeSummaryDTO } from "./packing-type.js";
export declare const BulkSpecParameterType: z.ZodEnum<["range", "max", "min", "enum", "text", "year"]>;
export type BulkSpecParameterType = z.infer<typeof BulkSpecParameterType>;
export declare const BulkSpecParameterSchema: z.ZodObject<{
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
}>;
export declare const BulkSpecTemplateSchema: z.ZodObject<{
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
export type BulkSpecTemplate = z.infer<typeof BulkSpecTemplateSchema>;
/** Bulk container lines always source from Turkey — buyers cannot pick another origin. */
export declare const BULK_CONTAINER_FIXED_ORIGIN = "Turkey";
export declare function applyBulkContainerFixedOrigin(specValues: Record<string, string | number>, parameters: BulkSpecTemplate["parameters"]): Record<string, string | number>;
export declare const BulkCatalogListQuery: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    category?: string | undefined;
    q?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}, {
    category?: string | undefined;
    q?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type BulkCatalogListQuery = z.infer<typeof BulkCatalogListQuery>;
export declare const BULK_CAPACITY_WARNING_LABELS: Record<string, string>;
export interface BulkCatalogProductCardDTO {
    id: string;
    productRef: string;
    name: string;
    category: string;
    categorySlug: string;
    standardPacking: string;
    marketStatus: string;
    indicativeLow: number | null;
    indicativeHigh: number | null;
    indicativeCurrency: string;
    indicativeRangeLabel: string | null;
    minOrderMt: number;
    packingTypes: PackingTypeSummaryDTO[];
    specTemplate: {
        id: string;
        productType: string;
        name: string;
        schema: BulkSpecTemplate;
    };
    updatedAt: string;
}
