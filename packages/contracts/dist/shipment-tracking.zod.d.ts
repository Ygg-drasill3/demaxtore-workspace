import { z } from "zod";
export declare const LinkTrackingPayload: z.ZodEffects<z.ZodObject<{
    containerNumber: z.ZodOptional<z.ZodString>;
    bookingNumber: z.ZodOptional<z.ZodString>;
    vesselReference: z.ZodOptional<z.ZodString>;
    referenceNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    referenceNumber?: string | undefined;
    containerNumber?: string | undefined;
    bookingNumber?: string | undefined;
    vesselReference?: string | undefined;
}, {
    referenceNumber?: string | undefined;
    containerNumber?: string | undefined;
    bookingNumber?: string | undefined;
    vesselReference?: string | undefined;
}>, {
    referenceNumber?: string | undefined;
    containerNumber?: string | undefined;
    bookingNumber?: string | undefined;
    vesselReference?: string | undefined;
}, {
    referenceNumber?: string | undefined;
    containerNumber?: string | undefined;
    bookingNumber?: string | undefined;
    vesselReference?: string | undefined;
}>;
export type LinkTrackingPayload = z.infer<typeof LinkTrackingPayload>;
