import { z } from "zod";
export declare const CreateFreightRequestPayload: z.ZodObject<{
    mode: z.ZodEnum<["OCEAN_FCL", "OCEAN_LCL", "ROAD", "RAIL", "AIR"]>;
    pol: z.ZodString;
    pod: z.ZodString;
    cargoDescription: z.ZodString;
    containerType: z.ZodOptional<z.ZodString>;
    readyDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pol: string;
    pod: string;
    mode: "OCEAN_FCL" | "OCEAN_LCL" | "ROAD" | "RAIL" | "AIR";
    cargoDescription: string;
    containerType?: string | undefined;
    readyDate?: string | undefined;
}, {
    pol: string;
    pod: string;
    mode: "OCEAN_FCL" | "OCEAN_LCL" | "ROAD" | "RAIL" | "AIR";
    cargoDescription: string;
    containerType?: string | undefined;
    readyDate?: string | undefined;
}>;
export type CreateFreightRequestPayload = z.infer<typeof CreateFreightRequestPayload>;
export declare const SubmitFreightOfferPayload: z.ZodEffects<z.ZodObject<{
    providerName: z.ZodString;
    carrierName: z.ZodString;
    price: z.ZodNumber;
    currency: z.ZodEnum<["USD", "EUR", "GBP"]>;
    transitDays: z.ZodNumber;
    validUntil: z.ZodString;
    remarks: z.ZodOptional<z.ZodString>;
    vesselName: z.ZodOptional<z.ZodString>;
    etd: z.ZodOptional<z.ZodString>;
    eta: z.ZodOptional<z.ZodString>;
    cutOff: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    carrierName: string;
    transitDays: number;
    providerName: string;
    price: number;
    eta?: string | undefined;
    vesselName?: string | undefined;
    etd?: string | undefined;
    cutOff?: string | undefined;
    remarks?: string | undefined;
}, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    carrierName: string;
    transitDays: number;
    providerName: string;
    price: number;
    eta?: string | undefined;
    vesselName?: string | undefined;
    etd?: string | undefined;
    cutOff?: string | undefined;
    remarks?: string | undefined;
}>, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    carrierName: string;
    transitDays: number;
    providerName: string;
    price: number;
    eta?: string | undefined;
    vesselName?: string | undefined;
    etd?: string | undefined;
    cutOff?: string | undefined;
    remarks?: string | undefined;
}, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    carrierName: string;
    transitDays: number;
    providerName: string;
    price: number;
    eta?: string | undefined;
    vesselName?: string | undefined;
    etd?: string | undefined;
    cutOff?: string | undefined;
    remarks?: string | undefined;
}>;
export type SubmitFreightOfferPayload = z.infer<typeof SubmitFreightOfferPayload>;
export declare const ReviseFreightOfferPayload: z.ZodEffects<z.ZodObject<{
    providerName: z.ZodString;
    carrierName: z.ZodString;
    price: z.ZodNumber;
    currency: z.ZodEnum<["USD", "EUR", "GBP"]>;
    transitDays: z.ZodNumber;
    validUntil: z.ZodString;
    remarks: z.ZodOptional<z.ZodString>;
    vesselName: z.ZodOptional<z.ZodString>;
    etd: z.ZodOptional<z.ZodString>;
    eta: z.ZodOptional<z.ZodString>;
    cutOff: z.ZodOptional<z.ZodString>;
} & {
    offerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    carrierName: string;
    transitDays: number;
    providerName: string;
    price: number;
    offerId: string;
    eta?: string | undefined;
    vesselName?: string | undefined;
    etd?: string | undefined;
    cutOff?: string | undefined;
    remarks?: string | undefined;
}, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    carrierName: string;
    transitDays: number;
    providerName: string;
    price: number;
    offerId: string;
    eta?: string | undefined;
    vesselName?: string | undefined;
    etd?: string | undefined;
    cutOff?: string | undefined;
    remarks?: string | undefined;
}>, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    carrierName: string;
    transitDays: number;
    providerName: string;
    price: number;
    offerId: string;
    eta?: string | undefined;
    vesselName?: string | undefined;
    etd?: string | undefined;
    cutOff?: string | undefined;
    remarks?: string | undefined;
}, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    carrierName: string;
    transitDays: number;
    providerName: string;
    price: number;
    offerId: string;
    eta?: string | undefined;
    vesselName?: string | undefined;
    etd?: string | undefined;
    cutOff?: string | undefined;
    remarks?: string | undefined;
}>;
export type ReviseFreightOfferPayload = z.infer<typeof ReviseFreightOfferPayload>;
export declare const WithdrawFreightOfferPayload: z.ZodObject<{
    offerId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    offerId: string;
    reason?: string | undefined;
}, {
    offerId: string;
    reason?: string | undefined;
}>;
export type WithdrawFreightOfferPayload = z.infer<typeof WithdrawFreightOfferPayload>;
export declare const SelectFreightOfferPayload: z.ZodObject<{
    offerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    offerId: string;
}, {
    offerId: string;
}>;
export type SelectFreightOfferPayload = z.infer<typeof SelectFreightOfferPayload>;
export declare const CancelFreightRequestPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export type CancelFreightRequestPayload = z.infer<typeof CancelFreightRequestPayload>;
export declare const FreightActionEnvelope: z.ZodObject<{
    action: z.ZodEnum<["create_request", "submit_offer", "revise_offer", "withdraw_offer", "select_offer", "cancel_request"]>;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    action: "create_request" | "submit_offer" | "revise_offer" | "withdraw_offer" | "select_offer" | "cancel_request";
    payload?: Record<string, unknown> | undefined;
}, {
    action: "create_request" | "submit_offer" | "revise_offer" | "withdraw_offer" | "select_offer" | "cancel_request";
    payload?: Record<string, unknown> | undefined;
}>;
export type FreightActionEnvelope = z.infer<typeof FreightActionEnvelope>;
