import { z } from "zod";
export declare const CreateForwarderPayload: z.ZodObject<{
    companyName: z.ZodString;
    contactName: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    companyName: string;
    contactName: string;
    phone?: string | undefined;
    notes?: string | undefined;
    country?: string | undefined;
}, {
    email: string;
    companyName: string;
    contactName: string;
    phone?: string | undefined;
    notes?: string | undefined;
    country?: string | undefined;
}>;
export type CreateForwarderPayload = z.infer<typeof CreateForwarderPayload>;
export declare const UpdateForwarderPayload: z.ZodObject<{
    companyName: z.ZodOptional<z.ZodString>;
    contactName: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    country: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
} & {
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
    companyName?: string | undefined;
    active?: boolean | undefined;
    contactName?: string | undefined;
    country?: string | undefined;
}, {
    email?: string | undefined;
    phone?: string | undefined;
    notes?: string | undefined;
    companyName?: string | undefined;
    active?: boolean | undefined;
    contactName?: string | undefined;
    country?: string | undefined;
}>;
export type UpdateForwarderPayload = z.infer<typeof UpdateForwarderPayload>;
export declare const SendFreightCommunicationsPayload: z.ZodObject<{
    forwarderContactIds: z.ZodArray<z.ZodString, "many">;
    channel: z.ZodDefault<z.ZodEnum<["EMAIL", "PHONE", "WHATSAPP", "MANUAL"]>>;
    requestedReplyDate: z.ZodString;
    incoterm: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    forwarderContactIds: string[];
    channel: "MANUAL" | "EMAIL" | "WHATSAPP" | "PHONE";
    requestedReplyDate: string;
    incoterm?: string | undefined;
}, {
    forwarderContactIds: string[];
    requestedReplyDate: string;
    channel?: "MANUAL" | "EMAIL" | "WHATSAPP" | "PHONE" | undefined;
    incoterm?: string | undefined;
}>;
export type SendFreightCommunicationsPayload = z.infer<typeof SendFreightCommunicationsPayload>;
export declare const IntakeFreightOfferPayload: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    forwarderContactId: z.ZodString;
    offerSource: z.ZodEnum<["FORWARDER_EMAIL", "FORWARDER_PHONE", "FORWARDER_WHATSAPP", "MANUAL_ENTRY"]>;
    carrierName: z.ZodString;
    vesselName: z.ZodString;
    etd: z.ZodString;
    eta: z.ZodString;
    transitDays: z.ZodNumber;
    cutOff: z.ZodString;
    /** Legacy: treated as internal cost when internalCostUsd omitted */
    oceanFreight: z.ZodOptional<z.ZodNumber>;
    internalCostUsd: z.ZodOptional<z.ZodNumber>;
    freightiqMarginUsd: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodEnum<["USD", "EUR", "GBP"]>;
    validUntil: z.ZodString;
    remarks: z.ZodOptional<z.ZodString>;
    communicationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    eta: string;
    forwarderContactId: string;
    offerSource: "FORWARDER_EMAIL" | "FORWARDER_PHONE" | "FORWARDER_WHATSAPP" | "MANUAL_ENTRY";
    carrierName: string;
    vesselName: string;
    etd: string;
    transitDays: number;
    cutOff: string;
    internalCostUsd?: number | undefined;
    freightiqMarginUsd?: number | undefined;
    oceanFreight?: number | undefined;
    remarks?: string | undefined;
    communicationId?: string | undefined;
}, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    eta: string;
    forwarderContactId: string;
    offerSource: "FORWARDER_EMAIL" | "FORWARDER_PHONE" | "FORWARDER_WHATSAPP" | "MANUAL_ENTRY";
    carrierName: string;
    vesselName: string;
    etd: string;
    transitDays: number;
    cutOff: string;
    internalCostUsd?: number | undefined;
    freightiqMarginUsd?: number | undefined;
    oceanFreight?: number | undefined;
    remarks?: string | undefined;
    communicationId?: string | undefined;
}>, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    eta: string;
    forwarderContactId: string;
    offerSource: "FORWARDER_EMAIL" | "FORWARDER_PHONE" | "FORWARDER_WHATSAPP" | "MANUAL_ENTRY";
    carrierName: string;
    vesselName: string;
    etd: string;
    transitDays: number;
    cutOff: string;
    internalCostUsd?: number | undefined;
    freightiqMarginUsd?: number | undefined;
    oceanFreight?: number | undefined;
    remarks?: string | undefined;
    communicationId?: string | undefined;
}, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    eta: string;
    forwarderContactId: string;
    offerSource: "FORWARDER_EMAIL" | "FORWARDER_PHONE" | "FORWARDER_WHATSAPP" | "MANUAL_ENTRY";
    carrierName: string;
    vesselName: string;
    etd: string;
    transitDays: number;
    cutOff: string;
    internalCostUsd?: number | undefined;
    freightiqMarginUsd?: number | undefined;
    oceanFreight?: number | undefined;
    remarks?: string | undefined;
    communicationId?: string | undefined;
}>, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    eta: string;
    forwarderContactId: string;
    offerSource: "FORWARDER_EMAIL" | "FORWARDER_PHONE" | "FORWARDER_WHATSAPP" | "MANUAL_ENTRY";
    carrierName: string;
    vesselName: string;
    etd: string;
    transitDays: number;
    cutOff: string;
    internalCostUsd?: number | undefined;
    freightiqMarginUsd?: number | undefined;
    oceanFreight?: number | undefined;
    remarks?: string | undefined;
    communicationId?: string | undefined;
}, {
    currency: "USD" | "EUR" | "GBP";
    validUntil: string;
    eta: string;
    forwarderContactId: string;
    offerSource: "FORWARDER_EMAIL" | "FORWARDER_PHONE" | "FORWARDER_WHATSAPP" | "MANUAL_ENTRY";
    carrierName: string;
    vesselName: string;
    etd: string;
    transitDays: number;
    cutOff: string;
    internalCostUsd?: number | undefined;
    freightiqMarginUsd?: number | undefined;
    oceanFreight?: number | undefined;
    remarks?: string | undefined;
    communicationId?: string | undefined;
}>;
export type IntakeFreightOfferPayload = z.infer<typeof IntakeFreightOfferPayload>;
export declare const MarkCommunicationRespondedPayload: z.ZodObject<{
    communicationId: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    communicationId: string;
    notes?: string | undefined;
}, {
    communicationId: string;
    notes?: string | undefined;
}>;
export type MarkCommunicationRespondedPayload = z.infer<typeof MarkCommunicationRespondedPayload>;
