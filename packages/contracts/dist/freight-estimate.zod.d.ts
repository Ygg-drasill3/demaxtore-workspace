import { z } from "zod";
export declare const CreateFreightEstimatePayload: z.ZodObject<{
    tradeId: z.ZodString;
    supplierId: z.ZodOptional<z.ZodString>;
    containerType: z.ZodOptional<z.ZodString>;
    originPort: z.ZodOptional<z.ZodString>;
    destinationPort: z.ZodOptional<z.ZodString>;
    fobValue: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    tradeId: string;
    originPort?: string | undefined;
    destinationPort?: string | undefined;
    supplierId?: string | undefined;
    containerType?: string | undefined;
    fobValue?: number | undefined;
}, {
    tradeId: string;
    originPort?: string | undefined;
    destinationPort?: string | undefined;
    supplierId?: string | undefined;
    containerType?: string | undefined;
    fobValue?: number | undefined;
}>;
export type CreateFreightEstimatePayload = z.infer<typeof CreateFreightEstimatePayload>;
export declare const ListFreightEstimatesQuery: z.ZodObject<{
    tradeId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "EXPIRED", "SUPERSEDED"]>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "EXPIRED" | "SUPERSEDED" | undefined;
    limit?: number | undefined;
    tradeId?: string | undefined;
}, {
    status?: "ACTIVE" | "EXPIRED" | "SUPERSEDED" | undefined;
    limit?: number | undefined;
    tradeId?: string | undefined;
}>;
export type ListFreightEstimatesQuery = z.infer<typeof ListFreightEstimatesQuery>;
