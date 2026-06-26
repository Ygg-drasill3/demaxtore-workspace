import { z } from "zod";
export const CreateFreightShipperPayload = z.object({
    name: z.string().min(1).max(200),
    scacCode: z.string().max(16).optional(),
    country: z.string().max(120).optional(),
    notes: z.string().max(2000).optional(),
});
//# sourceMappingURL=freight-shippers.zod.js.map