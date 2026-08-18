import { z } from "zod";
export declare const AssignAccountOwnershipPayload: z.ZodObject<{
    operationsUserId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    salesUserId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    operationsUserId?: string | null | undefined;
    salesUserId?: string | null | undefined;
}, {
    operationsUserId?: string | null | undefined;
    salesUserId?: string | null | undefined;
}>;
export type AssignAccountOwnershipPayload = z.infer<typeof AssignAccountOwnershipPayload>;
export declare const ForecastHorizonQuery: z.ZodObject<{
    days: z.ZodDefault<z.ZodEffects<z.ZodNumber, 30 | 90 | 60, number>>;
}, "strip", z.ZodTypeAny, {
    days: 30 | 90 | 60;
}, {
    days?: number | undefined;
}>;
export type ForecastHorizonQuery = z.infer<typeof ForecastHorizonQuery>;
