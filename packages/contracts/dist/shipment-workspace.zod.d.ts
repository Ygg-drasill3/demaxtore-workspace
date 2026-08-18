import { z } from "zod";
export declare const UpsertShipmentBookingSchema: z.ZodObject<{
    bookingReference: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    bookingDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    carrier: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    forwarder: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    vesselOrFlight: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    voyage: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    portOfLoading: z.ZodOptional<z.ZodString>;
    portOfDischarge: z.ZodOptional<z.ZodString>;
    etd: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    eta: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    transportMode: z.ZodOptional<z.ZodEnum<["SEA", "AIR", "ROAD", "RAIL"]>>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "REQUESTED", "PENDING", "CONFIRMED", "AMENDED", "CANCELLED"]>>;
    source: z.ZodOptional<z.ZodEnum<["MANUAL", "DEMAXTORE_OPERATIONS", "PARTNER", "CARRIER_API", "EDI", "SYSTEM"]>>;
    carrierBookingNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    cargoReadyDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    siCutoff: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    vgmCutoff: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    cyCutoff: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    documentCutoff: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    freightRequestId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    freightOfferId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    status?: "DRAFT" | "REQUESTED" | "PENDING" | "CONFIRMED" | "AMENDED" | "CANCELLED" | undefined;
    source?: "MANUAL" | "DEMAXTORE_OPERATIONS" | "PARTNER" | "CARRIER_API" | "EDI" | "SYSTEM" | undefined;
    confirm?: boolean | undefined;
    eta?: string | null | undefined;
    etd?: string | null | undefined;
    freightRequestId?: string | null | undefined;
    bookingReference?: string | null | undefined;
    carrier?: string | null | undefined;
    forwarder?: string | null | undefined;
    voyage?: string | null | undefined;
    cargoReadyDate?: string | null | undefined;
    bookingDate?: string | null | undefined;
    vesselOrFlight?: string | null | undefined;
    portOfLoading?: string | undefined;
    portOfDischarge?: string | undefined;
    transportMode?: "ROAD" | "RAIL" | "AIR" | "SEA" | undefined;
    carrierBookingNumber?: string | null | undefined;
    siCutoff?: string | null | undefined;
    vgmCutoff?: string | null | undefined;
    cyCutoff?: string | null | undefined;
    documentCutoff?: string | null | undefined;
    freightOfferId?: string | null | undefined;
}, {
    status?: "DRAFT" | "REQUESTED" | "PENDING" | "CONFIRMED" | "AMENDED" | "CANCELLED" | undefined;
    source?: "MANUAL" | "DEMAXTORE_OPERATIONS" | "PARTNER" | "CARRIER_API" | "EDI" | "SYSTEM" | undefined;
    confirm?: boolean | undefined;
    eta?: string | null | undefined;
    etd?: string | null | undefined;
    freightRequestId?: string | null | undefined;
    bookingReference?: string | null | undefined;
    carrier?: string | null | undefined;
    forwarder?: string | null | undefined;
    voyage?: string | null | undefined;
    cargoReadyDate?: string | null | undefined;
    bookingDate?: string | null | undefined;
    vesselOrFlight?: string | null | undefined;
    portOfLoading?: string | undefined;
    portOfDischarge?: string | undefined;
    transportMode?: "ROAD" | "RAIL" | "AIR" | "SEA" | undefined;
    carrierBookingNumber?: string | null | undefined;
    siCutoff?: string | null | undefined;
    vgmCutoff?: string | null | undefined;
    cyCutoff?: string | null | undefined;
    documentCutoff?: string | null | undefined;
    freightOfferId?: string | null | undefined;
}>;
export type UpsertShipmentBookingInput = z.infer<typeof UpsertShipmentBookingSchema>;
export declare const CancelShipmentBookingSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export type CancelShipmentBookingInput = z.infer<typeof CancelShipmentBookingSchema>;
export declare const PatchShipmentWorkspaceSchema: z.ZodObject<{
    transportMode: z.ZodOptional<z.ZodEnum<["SEA", "AIR", "ROAD", "RAIL"]>>;
    incoterm: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    forwarderName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    airlineName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    flightNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    truckReference: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    trainReference: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    vesselName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    voyageNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    etd: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    eta: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    originPort: z.ZodOptional<z.ZodString>;
    destinationPort: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    eta?: string | null | undefined;
    originPort?: string | undefined;
    destinationPort?: string | undefined;
    incoterm?: string | null | undefined;
    vesselName?: string | null | undefined;
    etd?: string | null | undefined;
    voyageNumber?: string | null | undefined;
    transportMode?: "ROAD" | "RAIL" | "AIR" | "SEA" | undefined;
    forwarderName?: string | null | undefined;
    airlineName?: string | null | undefined;
    flightNumber?: string | null | undefined;
    truckReference?: string | null | undefined;
    trainReference?: string | null | undefined;
}, {
    eta?: string | null | undefined;
    originPort?: string | undefined;
    destinationPort?: string | undefined;
    incoterm?: string | null | undefined;
    vesselName?: string | null | undefined;
    etd?: string | null | undefined;
    voyageNumber?: string | null | undefined;
    transportMode?: "ROAD" | "RAIL" | "AIR" | "SEA" | undefined;
    forwarderName?: string | null | undefined;
    airlineName?: string | null | undefined;
    flightNumber?: string | null | undefined;
    truckReference?: string | null | undefined;
    trainReference?: string | null | undefined;
}>;
export type PatchShipmentWorkspaceInput = z.infer<typeof PatchShipmentWorkspaceSchema>;
export declare const CreateShipmentContainerSchema: z.ZodObject<{
    containerNumber: z.ZodString;
    containerType: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sealNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    grossWeightKg: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    netWeightKg: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    volumeCbm: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    packageCount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodEnum<["PLANNED", "LOADED", "IN_TRANSIT", "ARRIVED", "DELIVERED", "CANCELLED"]>>;
}, "strict", z.ZodTypeAny, {
    containerNumber: string;
    status?: "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "ARRIVED" | "PLANNED" | "LOADED" | undefined;
    containerType?: string | null | undefined;
    sealNumber?: string | null | undefined;
    grossWeightKg?: number | null | undefined;
    netWeightKg?: number | null | undefined;
    volumeCbm?: number | null | undefined;
    packageCount?: number | null | undefined;
}, {
    containerNumber: string;
    status?: "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "ARRIVED" | "PLANNED" | "LOADED" | undefined;
    containerType?: string | null | undefined;
    sealNumber?: string | null | undefined;
    grossWeightKg?: number | null | undefined;
    netWeightKg?: number | null | undefined;
    volumeCbm?: number | null | undefined;
    packageCount?: number | null | undefined;
}>;
export type CreateShipmentContainerInput = z.infer<typeof CreateShipmentContainerSchema>;
export declare const PatchShipmentContainerSchema: z.ZodObject<{
    containerNumber: z.ZodOptional<z.ZodString>;
    containerType: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    sealNumber: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    grossWeightKg: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    netWeightKg: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    volumeCbm: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    packageCount: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<["PLANNED", "LOADED", "IN_TRANSIT", "ARRIVED", "DELIVERED", "CANCELLED"]>>>;
}, "strict", z.ZodTypeAny, {
    status?: "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "ARRIVED" | "PLANNED" | "LOADED" | undefined;
    containerType?: string | null | undefined;
    containerNumber?: string | undefined;
    sealNumber?: string | null | undefined;
    grossWeightKg?: number | null | undefined;
    netWeightKg?: number | null | undefined;
    volumeCbm?: number | null | undefined;
    packageCount?: number | null | undefined;
}, {
    status?: "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "ARRIVED" | "PLANNED" | "LOADED" | undefined;
    containerType?: string | null | undefined;
    containerNumber?: string | undefined;
    sealNumber?: string | null | undefined;
    grossWeightKg?: number | null | undefined;
    netWeightKg?: number | null | undefined;
    volumeCbm?: number | null | undefined;
    packageCount?: number | null | undefined;
}>;
export type PatchShipmentContainerInput = z.infer<typeof PatchShipmentContainerSchema>;
export declare const PatchShipmentStatusAliasSchema: z.ZodObject<{
    status: z.ZodEnum<["booked", "in_transit", "delivered"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    status: "delivered" | "booked" | "in_transit";
    reason?: string | undefined;
}, {
    status: "delivered" | "booked" | "in_transit";
    reason?: string | undefined;
}>;
export type PatchShipmentStatusAliasInput = z.infer<typeof PatchShipmentStatusAliasSchema>;
export declare const CreateShipmentMilestoneSchema: z.ZodObject<{
    type: z.ZodEnum<["BOOKING", "CONTAINER_READY", "CARGO_PICKUP", "PORT_GATE_IN", "EXPORT_CUSTOMS", "LOADED_ON_VESSEL", "DEPARTURE", "TRANSSHIPMENT", "ARRIVAL", "IMPORT_CUSTOMS", "DELIVERY", "COMPLETED"]>;
    plannedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    estimatedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    actualAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "ACTIVE", "COMPLETED", "SKIPPED"]>>;
    sequence: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    type: "BOOKING" | "COMPLETED" | "LOADED_ON_VESSEL" | "DELIVERY" | "CONTAINER_READY" | "CARGO_PICKUP" | "PORT_GATE_IN" | "EXPORT_CUSTOMS" | "DEPARTURE" | "TRANSSHIPMENT" | "ARRIVAL" | "IMPORT_CUSTOMS";
    status?: "PENDING" | "ACTIVE" | "SKIPPED" | "COMPLETED" | undefined;
    sequence?: number | undefined;
    plannedAt?: string | null | undefined;
    estimatedAt?: string | null | undefined;
    actualAt?: string | null | undefined;
}, {
    type: "BOOKING" | "COMPLETED" | "LOADED_ON_VESSEL" | "DELIVERY" | "CONTAINER_READY" | "CARGO_PICKUP" | "PORT_GATE_IN" | "EXPORT_CUSTOMS" | "DEPARTURE" | "TRANSSHIPMENT" | "ARRIVAL" | "IMPORT_CUSTOMS";
    status?: "PENDING" | "ACTIVE" | "SKIPPED" | "COMPLETED" | undefined;
    sequence?: number | undefined;
    plannedAt?: string | null | undefined;
    estimatedAt?: string | null | undefined;
    actualAt?: string | null | undefined;
}>;
export type CreateShipmentMilestoneInput = z.infer<typeof CreateShipmentMilestoneSchema>;
export declare const PatchShipmentMilestoneSchema: z.ZodObject<{
    plannedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    estimatedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    actualAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "ACTIVE", "COMPLETED", "SKIPPED"]>>;
    sequence: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    status?: "PENDING" | "ACTIVE" | "SKIPPED" | "COMPLETED" | undefined;
    sequence?: number | undefined;
    plannedAt?: string | null | undefined;
    estimatedAt?: string | null | undefined;
    actualAt?: string | null | undefined;
}, {
    status?: "PENDING" | "ACTIVE" | "SKIPPED" | "COMPLETED" | undefined;
    sequence?: number | undefined;
    plannedAt?: string | null | undefined;
    estimatedAt?: string | null | undefined;
    actualAt?: string | null | undefined;
}>;
export type PatchShipmentMilestoneInput = z.infer<typeof PatchShipmentMilestoneSchema>;
export declare const CompleteShipmentMilestoneSchema: z.ZodObject<{
    actualAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    actualAt?: string | null | undefined;
}, {
    actualAt?: string | null | undefined;
}>;
export type CompleteShipmentMilestoneInput = z.infer<typeof CompleteShipmentMilestoneSchema>;
export declare const ListDelayedShipmentsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    minDelayMinutes: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    minDelayMinutes: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    minDelayMinutes?: number | undefined;
}>;
export type ListDelayedShipmentsQuery = z.infer<typeof ListDelayedShipmentsQuerySchema>;
export declare const ListUpcomingMilestonesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    withinHours: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    withinHours: number;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    withinHours?: number | undefined;
}>;
export type ListUpcomingMilestonesQuery = z.infer<typeof ListUpcomingMilestonesQuerySchema>;
export declare const TransitionShipmentBookingSchema: z.ZodObject<{
    toStatus: z.ZodEnum<["DRAFT", "REQUESTED", "PENDING", "CONFIRMED", "AMENDED", "CANCELLED"]>;
    reason: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    toStatus: "DRAFT" | "REQUESTED" | "PENDING" | "CONFIRMED" | "AMENDED" | "CANCELLED";
    version?: number | undefined;
    reason?: string | undefined;
}, {
    toStatus: "DRAFT" | "REQUESTED" | "PENDING" | "CONFIRMED" | "AMENDED" | "CANCELLED";
    version?: number | undefined;
    reason?: string | undefined;
}>;
export type TransitionShipmentBookingInput = z.infer<typeof TransitionShipmentBookingSchema>;
