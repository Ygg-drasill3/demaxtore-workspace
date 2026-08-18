import { z } from "zod";
export declare const PACKING_SEGMENTS: readonly ["RETAIL", "HORECA", "INDUSTRIAL"];
export type PackingSegment = (typeof PACKING_SEGMENTS)[number];
export declare const CATALOG_KIND: readonly ["MIXED_CONTAINER", "BULK_CONTAINER"];
export type CatalogKind = (typeof CATALOG_KIND)[number];
export declare const PackingTypeDTO: z.ZodObject<{
    id: z.ZodString;
    code: z.ZodString;
    name: z.ZodString;
    segment: z.ZodEnum<["RETAIL", "HORECA", "INDUSTRIAL"]>;
    unitWeight: z.ZodNullable<z.ZodNumber>;
    unitWeightUom: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    isActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    code: string;
    id: string;
    name: string;
    segment: "RETAIL" | "HORECA" | "INDUSTRIAL";
    unitWeight: number | null;
    unitWeightUom: string | null;
    description: string | null;
    isActive: boolean;
}, {
    code: string;
    id: string;
    name: string;
    segment: "RETAIL" | "HORECA" | "INDUSTRIAL";
    unitWeight: number | null;
    unitWeightUom: string | null;
    description: string | null;
    isActive: boolean;
}>;
export type PackingTypeDTO = z.infer<typeof PackingTypeDTO>;
export declare const ProductPackingTypeDTO: z.ZodObject<{
    id: z.ZodString;
    catalogKind: z.ZodEnum<["MIXED_CONTAINER", "BULK_CONTAINER"]>;
    productId: z.ZodString;
    packingTypeId: z.ZodString;
    packingType: z.ZodObject<{
        id: z.ZodString;
        code: z.ZodString;
        name: z.ZodString;
        segment: z.ZodEnum<["RETAIL", "HORECA", "INDUSTRIAL"]>;
        unitWeight: z.ZodNullable<z.ZodNumber>;
        unitWeightUom: z.ZodNullable<z.ZodString>;
        description: z.ZodNullable<z.ZodString>;
        isActive: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        code: string;
        id: string;
        name: string;
        segment: "RETAIL" | "HORECA" | "INDUSTRIAL";
        unitWeight: number | null;
        unitWeightUom: string | null;
        description: string | null;
        isActive: boolean;
    }, {
        code: string;
        id: string;
        name: string;
        segment: "RETAIL" | "HORECA" | "INDUSTRIAL";
        unitWeight: number | null;
        unitWeightUom: string | null;
        description: string | null;
        isActive: boolean;
    }>;
    isDefault: z.ZodBoolean;
    isActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    isActive: boolean;
    catalogKind: "MIXED_CONTAINER" | "BULK_CONTAINER";
    productId: string;
    packingTypeId: string;
    packingType: {
        code: string;
        id: string;
        name: string;
        segment: "RETAIL" | "HORECA" | "INDUSTRIAL";
        unitWeight: number | null;
        unitWeightUom: string | null;
        description: string | null;
        isActive: boolean;
    };
    isDefault: boolean;
}, {
    id: string;
    isActive: boolean;
    catalogKind: "MIXED_CONTAINER" | "BULK_CONTAINER";
    productId: string;
    packingTypeId: string;
    packingType: {
        code: string;
        id: string;
        name: string;
        segment: "RETAIL" | "HORECA" | "INDUSTRIAL";
        unitWeight: number | null;
        unitWeightUom: string | null;
        description: string | null;
        isActive: boolean;
    };
    isDefault: boolean;
}>;
export type ProductPackingTypeDTO = z.infer<typeof ProductPackingTypeDTO>;
export declare const PackingTypeSummaryDTO: z.ZodObject<{
    id: z.ZodString;
    code: z.ZodString;
    name: z.ZodString;
    segment: z.ZodEnum<["RETAIL", "HORECA", "INDUSTRIAL"]>;
    unitWeight: z.ZodNullable<z.ZodNumber>;
    unitWeightUom: z.ZodNullable<z.ZodString>;
    isDefault: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    code: string;
    id: string;
    name: string;
    segment: "RETAIL" | "HORECA" | "INDUSTRIAL";
    unitWeight: number | null;
    unitWeightUom: string | null;
    isDefault: boolean;
}, {
    code: string;
    id: string;
    name: string;
    segment: "RETAIL" | "HORECA" | "INDUSTRIAL";
    unitWeight: number | null;
    unitWeightUom: string | null;
    isDefault: boolean;
}>;
export type PackingTypeSummaryDTO = z.infer<typeof PackingTypeSummaryDTO>;
export declare const AdminPackingTypeInput: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    segment: z.ZodEnum<["RETAIL", "HORECA", "INDUSTRIAL"]>;
    unitWeight: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    unitWeightUom: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    segment: "RETAIL" | "HORECA" | "INDUSTRIAL";
    isActive: boolean;
    unitWeight?: number | null | undefined;
    unitWeightUom?: string | null | undefined;
    description?: string | null | undefined;
}, {
    code: string;
    name: string;
    segment: "RETAIL" | "HORECA" | "INDUSTRIAL";
    unitWeight?: number | null | undefined;
    unitWeightUom?: string | null | undefined;
    description?: string | null | undefined;
    isActive?: boolean | undefined;
}>;
export type AdminPackingTypeInput = z.infer<typeof AdminPackingTypeInput>;
export declare const AssignPackingTypeInput: z.ZodObject<{
    catalogKind: z.ZodEnum<["MIXED_CONTAINER", "BULK_CONTAINER"]>;
    productId: z.ZodString;
    packingTypeId: z.ZodString;
    isDefault: z.ZodDefault<z.ZodBoolean>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
    catalogKind: "MIXED_CONTAINER" | "BULK_CONTAINER";
    productId: string;
    packingTypeId: string;
    isDefault: boolean;
}, {
    catalogKind: "MIXED_CONTAINER" | "BULK_CONTAINER";
    productId: string;
    packingTypeId: string;
    isActive?: boolean | undefined;
    isDefault?: boolean | undefined;
}>;
export type AssignPackingTypeInput = z.infer<typeof AssignPackingTypeInput>;
export declare const UpdateProductPackingTypeInput: z.ZodObject<{
    isDefault: z.ZodOptional<z.ZodBoolean>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    isDefault?: boolean | undefined;
}, {
    isActive?: boolean | undefined;
    isDefault?: boolean | undefined;
}>;
export type UpdateProductPackingTypeInput = z.infer<typeof UpdateProductPackingTypeInput>;
