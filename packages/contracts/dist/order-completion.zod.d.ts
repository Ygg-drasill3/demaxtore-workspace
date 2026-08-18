import { z } from "zod";
export declare const RecordDeliverySchema: z.ZodObject<{
    shipmentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    deliveredAt: z.ZodOptional<z.ZodString>;
    deliveredBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    receivedBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    proofDocumentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    remarks: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    shipmentId?: string | null | undefined;
    remarks?: string | null | undefined;
    deliveredAt?: string | undefined;
    deliveredBy?: string | null | undefined;
    receivedBy?: string | null | undefined;
    proofDocumentId?: string | null | undefined;
}, {
    shipmentId?: string | null | undefined;
    remarks?: string | null | undefined;
    deliveredAt?: string | undefined;
    deliveredBy?: string | null | undefined;
    receivedBy?: string | null | undefined;
    proofDocumentId?: string | null | undefined;
}>;
export type RecordDeliveryInput = z.infer<typeof RecordDeliverySchema>;
export declare const CompleteOrderSchema: z.ZodObject<{
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    notes?: string | null | undefined;
}, {
    notes?: string | null | undefined;
}>;
export type CompleteOrderInput = z.infer<typeof CompleteOrderSchema>;
export declare const ReopenCompletionSchema: z.ZodObject<{
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    notes?: string | null | undefined;
}, {
    notes?: string | null | undefined;
}>;
export type ReopenCompletionInput = z.infer<typeof ReopenCompletionSchema>;
