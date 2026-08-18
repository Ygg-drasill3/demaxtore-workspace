import { z } from "zod";
export const AssignAccountOwnershipPayload = z.object({
    operationsUserId: z.string().uuid().optional().nullable(),
    salesUserId: z.string().uuid().optional().nullable(),
});
export const ForecastHorizonQuery = z.object({
    days: z.coerce.number().refine((d) => d === 30 || d === 60 || d === 90, "days must be 30, 60, or 90").default(30),
});
