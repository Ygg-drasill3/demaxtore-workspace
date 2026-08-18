import { z } from "zod";
export declare const ImportControlTowerQuerySchema: z.ZodObject<{
    scope: z.ZodOptional<z.ZodEnum<["all", "mine"]>>;
    country: z.ZodOptional<z.ZodString>;
    supplier: z.ZodOptional<z.ZodString>;
    carrier: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    q?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    country?: string | undefined;
    scope?: "all" | "mine" | undefined;
    supplier?: string | undefined;
    carrier?: string | undefined;
}, {
    status?: string | undefined;
    q?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    country?: string | undefined;
    scope?: "all" | "mine" | undefined;
    supplier?: string | undefined;
    carrier?: string | undefined;
}>;
