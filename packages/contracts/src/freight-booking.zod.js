import { z } from "zod";
import { CargoReadyConfidenceLevel } from "./freight-booking.js";
export const CreateFreightBookingPayload = z.object({
    tradeId: z.string().uuid(),
    productionStartDate: z.string().datetime().optional(),
    estimatedProductionFinishDate: z.string().datetime().optional(),
    estimatedCargoReadyDate: z.string().datetime().optional(),
    confidenceLevel: z.enum(CargoReadyConfidenceLevel).optional(),
    notes: z.string().max(2000).optional(),
    /** Admin/ops: generate carrier options and start booking plan. */
    createPlan: z.boolean().optional(),
});
export const SelectCarrierOptionPayload = z.object({
    carrierOptionId: z.string().uuid(),
});
export const ListFreightBookingsQuery = z.object({
    tradeId: z.string().uuid().optional(),
    status: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});
//# sourceMappingURL=freight-booking.zod.js.map