import { z } from "zod";
export const PaymentIntentStatus = ["pending", "processing", "succeeded", "failed", "cancelled"];
export const CreatePaymentIntentPayload = z.object({
    amount: z.number().positive(),
    currency: z.enum(["USD", "EUR", "GBP"]),
    description: z.string().max(500).optional(),
});
//# sourceMappingURL=payments.js.map