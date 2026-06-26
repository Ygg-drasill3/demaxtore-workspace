import { z } from "zod";
import { CommunicationChannel, OfferSource } from "./freight-communications";

export const CreateForwarderPayload = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(64).optional(),
  country: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateForwarderPayload = z.infer<typeof CreateForwarderPayload>;

export const UpdateForwarderPayload = CreateForwarderPayload.partial().extend({
  active: z.boolean().optional(),
});
export type UpdateForwarderPayload = z.infer<typeof UpdateForwarderPayload>;

export const SendFreightCommunicationsPayload = z.object({
  forwarderContactIds: z.array(z.string().uuid()).min(1).max(20),
  channel: z.enum(CommunicationChannel).default("EMAIL"),
  requestedReplyDate: z.string().datetime(),
  incoterm: z.string().max(32).optional(),
});
export type SendFreightCommunicationsPayload = z.infer<typeof SendFreightCommunicationsPayload>;

export const IntakeFreightOfferPayload = z
  .object({
    forwarderContactId: z.string().uuid(),
    offerSource: z.enum(OfferSource),
    carrierName: z.string().min(1).max(200),
    vesselName: z.string().min(1).max(200),
    etd: z.string().datetime(),
    eta: z.string().datetime(),
    transitDays: z.number().int().positive().max(365),
    cutOff: z.string().datetime(),
    /** Legacy: treated as internal cost when internalCostUsd omitted */
    oceanFreight: z.number().positive().optional(),
    internalCostUsd: z.number().nonnegative().optional(),
    freightiqMarginUsd: z.number().nonnegative().optional(),
    currency: z.enum(["USD", "EUR", "GBP"]),
    validUntil: z.string().datetime(),
    remarks: z.string().max(2000).optional(),
    communicationId: z.string().uuid().optional(),
  })
  .refine((d) => new Date(d.eta) > new Date(d.etd), { message: "ETA must be after ETD", path: ["eta"] })
  .refine(
    (d) => (d.internalCostUsd ?? d.oceanFreight) !== undefined,
    { message: "internalCostUsd or oceanFreight required", path: ["internalCostUsd"] },
  );
export type IntakeFreightOfferPayload = z.infer<typeof IntakeFreightOfferPayload>;

export const MarkCommunicationRespondedPayload = z.object({
  communicationId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});
export type MarkCommunicationRespondedPayload = z.infer<typeof MarkCommunicationRespondedPayload>;
