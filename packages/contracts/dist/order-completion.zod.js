import { z } from "zod";
export const RecordDeliverySchema = z
    .object({
    shipmentId: z.string().uuid().optional().nullable(),
    deliveredAt: z.string().datetime().optional(),
    deliveredBy: z.string().trim().max(200).optional().nullable(),
    receivedBy: z.string().trim().max(200).optional().nullable(),
    proofDocumentId: z.string().trim().max(200).optional().nullable(),
    remarks: z.string().max(4000).optional().nullable(),
})
    .strict();
export const CompleteOrderSchema = z
    .object({
    notes: z.string().trim().max(4000).optional().nullable(),
})
    .strict();
export const ReopenCompletionSchema = z
    .object({
    notes: z.string().trim().max(4000).optional().nullable(),
})
    .strict();
