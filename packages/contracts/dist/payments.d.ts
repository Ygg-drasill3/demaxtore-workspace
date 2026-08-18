import { z } from "zod";
export declare const PaymentIntentStatus: readonly ["pending", "processing", "succeeded", "failed", "cancelled"];
export type PaymentIntentStatus = (typeof PaymentIntentStatus)[number];
export declare const CreatePaymentIntentPayload: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodEnum<["USD", "EUR", "GBP"]>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: "USD" | "EUR" | "GBP";
    amount: number;
    description?: string | undefined;
}, {
    currency: "USD" | "EUR" | "GBP";
    amount: number;
    description?: string | undefined;
}>;
export type CreatePaymentIntentPayload = z.infer<typeof CreatePaymentIntentPayload>;
