import { z } from "zod";

export const PaymentIntentStatus = ["pending", "processing", "succeeded", "failed", "cancelled"] as const;
export type PaymentIntentStatus = (typeof PaymentIntentStatus)[number];

export const CreatePaymentIntentPayload = z.object({
  amount: z.number().positive(),
  currency: z.enum(["USD", "EUR", "GBP"]),
  description: z.string().max(500).optional(),
});
export type CreatePaymentIntentPayload = z.infer<typeof CreatePaymentIntentPayload>;
