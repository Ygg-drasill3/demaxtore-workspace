import { z } from "zod";
export declare const ConfirmBookingPayload: z.ZodObject<{
    carrierName: z.ZodOptional<z.ZodString>;
    bookingRef: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    carrierName?: string | undefined;
    bookingRef?: string | undefined;
}, {
    carrierName?: string | undefined;
    bookingRef?: string | undefined;
}>;
export declare const AssignContainerPayload: z.ZodObject<{
    containerNumber: z.ZodString;
}, "strict", z.ZodTypeAny, {
    containerNumber: string;
}, {
    containerNumber: string;
}>;
export declare const PickupCargoPayload: z.ZodObject<{
    pickupLocation: z.ZodOptional<z.ZodString>;
    pickedUpAt: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    pickupLocation?: string | undefined;
    pickedUpAt?: string | undefined;
}, {
    pickupLocation?: string | undefined;
    pickedUpAt?: string | undefined;
}>;
export declare const ArriveOriginPortPayload: z.ZodObject<{
    portCode: z.ZodOptional<z.ZodString>;
    arrivedAt: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    portCode?: string | undefined;
    arrivedAt?: string | undefined;
}, {
    portCode?: string | undefined;
    arrivedAt?: string | undefined;
}>;
export declare const LoadVesselPayload: z.ZodObject<{
    vesselName: z.ZodString;
    voyageNumber: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    vesselName: string;
    voyageNumber?: string | undefined;
}, {
    vesselName: string;
    voyageNumber?: string | undefined;
}>;
export declare const DepartVesselPayload: z.ZodObject<{
    departedAt: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    departedAt?: string | undefined;
}, {
    departedAt?: string | undefined;
}>;
export declare const ArriveDestinationPayload: z.ZodObject<{
    arrivedAt: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    arrivedAt?: string | undefined;
}, {
    arrivedAt?: string | undefined;
}>;
export declare const StartCustomsPayload: z.ZodObject<{
    customsBroker: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    customsBroker?: string | undefined;
}, {
    customsBroker?: string | undefined;
}>;
export declare const CompleteCustomsPayload: z.ZodObject<{
    clearanceRef: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    clearanceRef?: string | undefined;
}, {
    clearanceRef?: string | undefined;
}>;
export declare const ReadyDeliveryPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const ConfirmDeliveryPayload: z.ZodObject<{
    deliveryConfirmationRef: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    deliveryConfirmationRef?: string | undefined;
}, {
    deliveryConfirmationRef?: string | undefined;
}>;
export declare const ConfirmPartialDeliveryPayload: z.ZodObject<{
    partialDeliveryNote: z.ZodString;
    deliveredQuantity: z.ZodOptional<z.ZodNumber>;
    remainingQuantity: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    partialDeliveryNote: string;
    deliveredQuantity?: number | undefined;
    remainingQuantity?: number | undefined;
}, {
    partialDeliveryNote: string;
    deliveredQuantity?: number | undefined;
    remainingQuantity?: number | undefined;
}>;
export declare const RejectShipmentPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const CompleteShipmentPayload: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
    /** Sprint 5C — ADMIN may complete without all trade documents approved */
    complianceOverride: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    notes?: string | undefined;
    complianceOverride?: boolean | undefined;
}, {
    notes?: string | undefined;
    complianceOverride?: boolean | undefined;
}>;
export declare const ReportExceptionPayload: z.ZodObject<{
    category: z.ZodEnum<["VESSEL_DELAY", "CUSTOMS_HOLD", "DOCUMENT_MISSING", "PORT_CONGESTION", "DELIVERY_DELAY", "OTHER"]>;
    reason: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    category: "OTHER" | "DOCUMENT_MISSING" | "CUSTOMS_HOLD" | "VESSEL_DELAY" | "PORT_CONGESTION" | "DELIVERY_DELAY";
    reason: string;
    details?: string | undefined;
}, {
    category: "OTHER" | "DOCUMENT_MISSING" | "CUSTOMS_HOLD" | "VESSEL_DELAY" | "PORT_CONGESTION" | "DELIVERY_DELAY";
    reason: string;
    details?: string | undefined;
}>;
export declare const ResolveExceptionPayload: z.ZodObject<{
    resolution: z.ZodString;
    resumeState: z.ZodOptional<z.ZodEnum<["BOOKING_CONFIRMED", "CONTAINER_ASSIGNED", "IN_TRANSIT", "ARRIVED_DESTINATION_PORT", "CUSTOMS_CLEARANCE", "READY_FOR_DELIVERY", "PARTIALLY_DELIVERED"]>>;
}, "strict", z.ZodTypeAny, {
    resolution: string;
    resumeState?: "BOOKING_CONFIRMED" | "IN_TRANSIT" | "ARRIVED_DESTINATION_PORT" | "READY_FOR_DELIVERY" | "CONTAINER_ASSIGNED" | "PARTIALLY_DELIVERED" | "CUSTOMS_CLEARANCE" | undefined;
}, {
    resolution: string;
    resumeState?: "BOOKING_CONFIRMED" | "IN_TRANSIT" | "ARRIVED_DESTINATION_PORT" | "READY_FOR_DELIVERY" | "CONTAINER_ASSIGNED" | "PARTIALLY_DELIVERED" | "CUSTOMS_CLEARANCE" | undefined;
}>;
export declare const CancelShipmentPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strict", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const UploadShipmentDocumentPayload: z.ZodObject<{
    documentType: z.ZodEnum<["BOOKING_CONFIRMATION", "BL_DRAFT", "BL_FINAL", "PACKING_LIST", "CUSTOMS_DOC", "DELIVERY_PROOF", "OTHER"]>;
    fileName: z.ZodString;
    mimeType: z.ZodString;
    storageKey: z.ZodString;
    fileSizeBytes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    mimeType: string;
    documentType: "PACKING_LIST" | "OTHER" | "BOOKING_CONFIRMATION" | "BL_DRAFT" | "BL_FINAL" | "CUSTOMS_DOC" | "DELIVERY_PROOF";
    storageKey: string;
    fileSizeBytes: number;
}, {
    fileName: string;
    mimeType: string;
    documentType: "PACKING_LIST" | "OTHER" | "BOOKING_CONFIRMATION" | "BL_DRAFT" | "BL_FINAL" | "CUSTOMS_DOC" | "DELIVERY_PROOF";
    storageKey: string;
    fileSizeBytes: number;
}>;
