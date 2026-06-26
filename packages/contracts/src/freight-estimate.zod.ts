import { z } from "zod";
import { FreightEstimateStatus } from "./freight-estimate.js";

export const CreateFreightEstimatePayload = z.object({
  tradeId: z.string().uuid(),
  supplierId: z.string().uuid().optional(),
  containerType: z.string().min(1).optional(),
  originPort: z.string().min(1).optional(),
  destinationPort: z.string().min(1).optional(),
  fobValue: z.number().nonnegative().optional(),
});
export type CreateFreightEstimatePayload = z.infer<typeof CreateFreightEstimatePayload>;

export const ListFreightEstimatesQuery = z.object({
  tradeId: z.string().uuid().optional(),
  status: z.enum(FreightEstimateStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ListFreightEstimatesQuery = z.infer<typeof ListFreightEstimatesQuery>;
