import { z } from "zod";

export const ImportControlTowerQuerySchema = z.object({
  scope: z.enum(["all", "mine"]).optional(),
  country: z.string().optional(),
  supplier: z.string().optional(),
  carrier: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  q: z.string().optional(),
});
