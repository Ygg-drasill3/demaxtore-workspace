import { z } from "zod";
export declare const CreateMarginPolicyPayload: z.ZodObject<{
    name: z.ZodString;
    routePattern: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    countryFrom: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    countryTo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    defaultMarginUsd: z.ZodNumber;
    minMarginUsd: z.ZodDefault<z.ZodNumber>;
    maxMarginUsd: z.ZodDefault<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    defaultMarginUsd: number;
    minMarginUsd: number;
    maxMarginUsd: number;
    routePattern?: string | null | undefined;
    countryFrom?: string | null | undefined;
    countryTo?: string | null | undefined;
}, {
    name: string;
    defaultMarginUsd: number;
    isActive?: boolean | undefined;
    routePattern?: string | null | undefined;
    countryFrom?: string | null | undefined;
    countryTo?: string | null | undefined;
    minMarginUsd?: number | undefined;
    maxMarginUsd?: number | undefined;
}>;
export type CreateMarginPolicyPayload = z.infer<typeof CreateMarginPolicyPayload>;
export declare const UpdateMarginPolicyPayload: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    routePattern: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    countryFrom: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    countryTo: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    defaultMarginUsd: z.ZodOptional<z.ZodNumber>;
    minMarginUsd: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    maxMarginUsd: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    routePattern?: string | null | undefined;
    countryFrom?: string | null | undefined;
    countryTo?: string | null | undefined;
    defaultMarginUsd?: number | undefined;
    minMarginUsd?: number | undefined;
    maxMarginUsd?: number | undefined;
}, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    routePattern?: string | null | undefined;
    countryFrom?: string | null | undefined;
    countryTo?: string | null | undefined;
    defaultMarginUsd?: number | undefined;
    minMarginUsd?: number | undefined;
    maxMarginUsd?: number | undefined;
}>;
export type UpdateMarginPolicyPayload = z.infer<typeof UpdateMarginPolicyPayload>;
export declare const SuggestMarginQuery: z.ZodObject<{
    pol: z.ZodString;
    pod: z.ZodString;
}, "strip", z.ZodTypeAny, {
    pol: string;
    pod: string;
}, {
    pol: string;
    pod: string;
}>;
export type SuggestMarginQuery = z.infer<typeof SuggestMarginQuery>;
