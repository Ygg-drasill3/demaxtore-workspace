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
export type RecordDeliveryInput = z.infer<typeof RecordDeliverySchema>;

export const CompleteOrderSchema = z
  .object({
    notes: z.string().trim().max(4000).optional().nullable(),
  })
  .strict();
export type CompleteOrderInput = z.infer<typeof CompleteOrderSchema>;

export const ReopenCompletionSchema = z
  .object({
    notes: z.string().trim().max(4000).optional().nullable(),
  })
  .strict();
export type ReopenCompletionInput = z.infer<typeof ReopenCompletionSchema>;
