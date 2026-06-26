import { z } from "zod";

export const LinkTrackingPayload = z
  .object({
    containerNumber: z.string().min(1).max(50).optional(),
    bookingNumber: z.string().min(1).max(200).optional(),
    vesselReference: z.string().min(1).max(200).optional(),
    referenceNumber: z.string().max(200).optional(),
  })
  .refine(
    (v) => !!(v.containerNumber || v.bookingNumber || v.vesselReference),
    { message: "Provide container number, booking number, or vessel reference" },
  );
export type LinkTrackingPayload = z.infer<typeof LinkTrackingPayload>;
