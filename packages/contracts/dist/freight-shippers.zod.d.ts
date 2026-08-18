import { z } from "zod";
export declare const CreateFreightShipperPayload: z.ZodObject<{
    name: z.ZodString;
    scacCode: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    notes?: string | undefined;
    country?: string | undefined;
    scacCode?: string | undefined;
}, {
    name: string;
    notes?: string | undefined;
    country?: string | undefined;
    scacCode?: string | undefined;
}>;
export type CreateFreightShipperPayload = z.infer<typeof CreateFreightShipperPayload>;
