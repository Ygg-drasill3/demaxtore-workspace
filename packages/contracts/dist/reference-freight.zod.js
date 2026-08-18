import { z } from "zod";
import { ReferenceFreightRateStatus } from "./reference-freight.js";
const portField = z.string().min(1).max(40);
const containerField = z.string().min(1).max(20);
export const CreateReferenceFreightRatePayload = z.object({
    originPort: portField,
    destinationPort: portField,
    containerType: containerField,
    referenceFreight: z.number().positive(),
    currency: z.string().length(3).default("USD"),
    validFrom: z.string().datetime(),
    validUntil: z.string().datetime(),
});
export const UpdateReferenceFreightRatePayload = z.object({
    originPort: portField.optional(),
    destinationPort: portField.optional(),
    containerType: containerField.optional(),
    referenceFreight: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
});
/** @deprecated Use CreateReferenceFreightRatePayload */
export const UpsertReferenceFreightRatePayload = CreateReferenceFreightRatePayload;
export const ListReferenceFreightRatesQuery = z.object({
    originPort: z.string().optional(),
    destinationPort: z.string().optional(),
    containerType: z.string().optional(),
    status: z.enum(ReferenceFreightRateStatus).optional(),
    lifecycle: z.enum(["ACTIVE", "EXPIRING_SOON", "EXPIRED", "INACTIVE"]).optional(),
    activeOnly: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
});
export const CopyReferenceFreightMonthPayload = z.object({
    targetMonth: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
});
export const ImportReferenceFreightCsvPayload = z.object({
    csv: z.string().min(1),
});
