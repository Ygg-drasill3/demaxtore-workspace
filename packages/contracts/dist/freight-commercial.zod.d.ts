import { z } from "zod";
export declare const SetFreightMarginPayload: z.ZodObject<{
    internalCostUsd: z.ZodNumber;
    freightiqMarginUsd: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    internalCostUsd: number;
    freightiqMarginUsd: number;
}, {
    internalCostUsd: number;
    freightiqMarginUsd: number;
}>;
export type SetFreightMarginPayload = z.infer<typeof SetFreightMarginPayload>;
