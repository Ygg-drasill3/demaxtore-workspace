import { z } from "zod";
export const CreateMarginPolicyPayload = z.object({
    name: z.string().min(1).max(120),
    routePattern: z.string().max(200).optional().nullable(),
    countryFrom: z.string().max(120).optional().nullable(),
    countryTo: z.string().max(120).optional().nullable(),
    defaultMarginUsd: z.number().nonnegative(),
    minMarginUsd: z.number().nonnegative().default(0),
    maxMarginUsd: z.number().positive().default(10000),
    isActive: z.boolean().default(true),
});
export const UpdateMarginPolicyPayload = CreateMarginPolicyPayload.partial();
export const SuggestMarginQuery = z.object({
    pol: z.string().min(2).max(16),
    pod: z.string().min(2).max(16),
});
