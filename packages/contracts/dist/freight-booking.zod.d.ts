import { z } from "zod";
export declare const CreateFreightBookingPayload: z.ZodObject<{
    tradeId: z.ZodString;
    productionStartDate: z.ZodOptional<z.ZodString>;
    estimatedProductionFinishDate: z.ZodOptional<z.ZodString>;
    estimatedCargoReadyDate: z.ZodOptional<z.ZodString>;
    confidenceLevel: z.ZodOptional<z.ZodEnum<["HIGH", "MEDIUM", "LOW"]>>;
    notes: z.ZodOptional<z.ZodString>;
    /** Admin/ops: generate carrier options and start booking plan. */
    createPlan: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tradeId: string;
    notes?: string | undefined;
    productionStartDate?: string | undefined;
    estimatedProductionFinishDate?: string | undefined;
    estimatedCargoReadyDate?: string | undefined;
    confidenceLevel?: "LOW" | "MEDIUM" | "HIGH" | undefined;
    createPlan?: boolean | undefined;
}, {
    tradeId: string;
    notes?: string | undefined;
    productionStartDate?: string | undefined;
    estimatedProductionFinishDate?: string | undefined;
    estimatedCargoReadyDate?: string | undefined;
    confidenceLevel?: "LOW" | "MEDIUM" | "HIGH" | undefined;
    createPlan?: boolean | undefined;
}>;
export type CreateFreightBookingPayload = z.infer<typeof CreateFreightBookingPayload>;
export declare const SelectCarrierOptionPayload: z.ZodObject<{
    carrierOptionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    carrierOptionId: string;
}, {
    carrierOptionId: string;
}>;
export type SelectCarrierOptionPayload = z.infer<typeof SelectCarrierOptionPayload>;
export declare const ListFreightBookingsQuery: z.ZodObject<{
    tradeId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    limit?: number | undefined;
    tradeId?: string | undefined;
}, {
    status?: string | undefined;
    limit?: number | undefined;
    tradeId?: string | undefined;
}>;
export type ListFreightBookingsQuery = z.infer<typeof ListFreightBookingsQuery>;
