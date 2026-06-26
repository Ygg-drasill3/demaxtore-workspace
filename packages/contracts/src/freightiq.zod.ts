import { z } from "zod";
import { FreightMode } from "./freightiq";

export const CreateFreightRequestPayload = z.object({
  mode: z.enum(FreightMode),
  pol: z.string().min(1).max(120),
  pod: z.string().min(1).max(120),
  cargoDescription: z.string().min(3).max(2000),
  containerType: z.string().max(64).optional(),
  readyDate: z.string().datetime().optional(),
});
export type CreateFreightRequestPayload = z.infer<typeof CreateFreightRequestPayload>;

const SubmitFreightOfferPayloadBase = z.object({
  providerName: z.string().min(1).max(200),
  carrierName: z.string().min(1).max(200),
  price: z.number().positive(),
  currency: z.enum(["USD", "EUR", "GBP"]),
  transitDays: z.number().int().positive().max(365),
  validUntil: z.string().datetime(),
  remarks: z.string().max(2000).optional(),
  vesselName: z.string().min(1).max(200).optional(),
  etd: z.string().datetime().optional(),
  eta: z.string().datetime().optional(),
  cutOff: z.string().datetime().optional(),
});

export const SubmitFreightOfferPayload = SubmitFreightOfferPayloadBase.refine(
  (d) => !d.etd || !d.eta || new Date(d.eta) > new Date(d.etd),
  { message: "ETA must be after ETD", path: ["eta"] },
);
export type SubmitFreightOfferPayload = z.infer<typeof SubmitFreightOfferPayload>;

export const ReviseFreightOfferPayload = SubmitFreightOfferPayloadBase.extend({
  offerId: z.string().uuid(),
}).refine(
  (d) => !d.etd || !d.eta || new Date(d.eta) > new Date(d.etd),
  { message: "ETA must be after ETD", path: ["eta"] },
);
export type ReviseFreightOfferPayload = z.infer<typeof ReviseFreightOfferPayload>;

export const WithdrawFreightOfferPayload = z.object({
  offerId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
export type WithdrawFreightOfferPayload = z.infer<typeof WithdrawFreightOfferPayload>;

export const SelectFreightOfferPayload = z.object({
  offerId: z.string().uuid(),
});
export type SelectFreightOfferPayload = z.infer<typeof SelectFreightOfferPayload>;

export const CancelFreightRequestPayload = z.object({
  reason: z.string().min(3).max(2000),
});
export type CancelFreightRequestPayload = z.infer<typeof CancelFreightRequestPayload>;

export const FreightActionEnvelope = z.object({
  action: z.enum([
    "create_request",
    "submit_offer",
    "revise_offer",
    "withdraw_offer",
    "select_offer",
    "cancel_request",
  ]),
  payload: z.record(z.unknown()).optional(),
});
export type FreightActionEnvelope = z.infer<typeof FreightActionEnvelope>;
