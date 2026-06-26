import { z } from "zod";

export const SetFreightMarginPayload = z.object({
  internalCostUsd: z.number().nonnegative(),
  freightiqMarginUsd: z.number(),
});
export type SetFreightMarginPayload = z.infer<typeof SetFreightMarginPayload>;
