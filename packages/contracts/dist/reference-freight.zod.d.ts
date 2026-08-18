import { z } from "zod";
export declare const CreateReferenceFreightRatePayload: z.ZodObject<{
    originPort: z.ZodString;
    destinationPort: z.ZodString;
    containerType: z.ZodString;
    referenceFreight: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    validFrom: z.ZodString;
    validUntil: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: string;
    validUntil: string;
    originPort: string;
    destinationPort: string;
    containerType: string;
    referenceFreight: number;
    validFrom: string;
}, {
    validUntil: string;
    originPort: string;
    destinationPort: string;
    containerType: string;
    referenceFreight: number;
    validFrom: string;
    currency?: string | undefined;
}>;
export type CreateReferenceFreightRatePayload = z.infer<typeof CreateReferenceFreightRatePayload>;
export declare const UpdateReferenceFreightRatePayload: z.ZodObject<{
    originPort: z.ZodOptional<z.ZodString>;
    destinationPort: z.ZodOptional<z.ZodString>;
    containerType: z.ZodOptional<z.ZodString>;
    referenceFreight: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    validFrom: z.ZodOptional<z.ZodString>;
    validUntil: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency?: string | undefined;
    validUntil?: string | undefined;
    originPort?: string | undefined;
    destinationPort?: string | undefined;
    containerType?: string | undefined;
    referenceFreight?: number | undefined;
    validFrom?: string | undefined;
}, {
    currency?: string | undefined;
    validUntil?: string | undefined;
    originPort?: string | undefined;
    destinationPort?: string | undefined;
    containerType?: string | undefined;
    referenceFreight?: number | undefined;
    validFrom?: string | undefined;
}>;
export type UpdateReferenceFreightRatePayload = z.infer<typeof UpdateReferenceFreightRatePayload>;
/** @deprecated Use CreateReferenceFreightRatePayload */
export declare const UpsertReferenceFreightRatePayload: z.ZodObject<{
    originPort: z.ZodString;
    destinationPort: z.ZodString;
    containerType: z.ZodString;
    referenceFreight: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    validFrom: z.ZodString;
    validUntil: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: string;
    validUntil: string;
    originPort: string;
    destinationPort: string;
    containerType: string;
    referenceFreight: number;
    validFrom: string;
}, {
    validUntil: string;
    originPort: string;
    destinationPort: string;
    containerType: string;
    referenceFreight: number;
    validFrom: string;
    currency?: string | undefined;
}>;
export type UpsertReferenceFreightRatePayload = CreateReferenceFreightRatePayload;
export declare const ListReferenceFreightRatesQuery: z.ZodObject<{
    originPort: z.ZodOptional<z.ZodString>;
    destinationPort: z.ZodOptional<z.ZodString>;
    containerType: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
    lifecycle: z.ZodOptional<z.ZodEnum<["ACTIVE", "EXPIRING_SOON", "EXPIRED", "INACTIVE"]>>;
    activeOnly: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodOptional<z.ZodNumber>;
    pageSize: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "INACTIVE" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    pageSize?: number | undefined;
    originPort?: string | undefined;
    destinationPort?: string | undefined;
    containerType?: string | undefined;
    lifecycle?: "ACTIVE" | "INACTIVE" | "EXPIRED" | "EXPIRING_SOON" | undefined;
    activeOnly?: boolean | undefined;
}, {
    status?: "ACTIVE" | "INACTIVE" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    pageSize?: number | undefined;
    originPort?: string | undefined;
    destinationPort?: string | undefined;
    containerType?: string | undefined;
    lifecycle?: "ACTIVE" | "INACTIVE" | "EXPIRED" | "EXPIRING_SOON" | undefined;
    activeOnly?: boolean | undefined;
}>;
export type ListReferenceFreightRatesQuery = z.infer<typeof ListReferenceFreightRatesQuery>;
export declare const CopyReferenceFreightMonthPayload: z.ZodObject<{
    targetMonth: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    targetMonth?: string | undefined;
}, {
    targetMonth?: string | undefined;
}>;
export type CopyReferenceFreightMonthPayload = z.infer<typeof CopyReferenceFreightMonthPayload>;
export declare const ImportReferenceFreightCsvPayload: z.ZodObject<{
    csv: z.ZodString;
}, "strip", z.ZodTypeAny, {
    csv: string;
}, {
    csv: string;
}>;
export type ImportReferenceFreightCsvPayload = z.infer<typeof ImportReferenceFreightCsvPayload>;
