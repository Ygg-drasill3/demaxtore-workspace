import { z } from "zod";

export const ConfirmBookingPayload = z.object({
  carrierName: z.string().min(1).max(200).optional(),
  bookingRef: z.string().max(200).optional(),
}).strict();

export const AssignContainerPayload = z.object({
  containerNumber: z.string().min(1).max(50),
}).strict();

export const PickupCargoPayload = z.object({
  pickupLocation: z.string().max(500).optional(),
  pickedUpAt: z.string().datetime().optional(),
}).strict();

export const ArriveOriginPortPayload = z.object({
  portCode: z.string().max(20).optional(),
  arrivedAt: z.string().datetime().optional(),
}).strict();

export const LoadVesselPayload = z.object({
  vesselName: z.string().min(1).max(200),
  voyageNumber: z.string().max(100).optional(),
}).strict();

export const DepartVesselPayload = z.object({
  departedAt: z.string().datetime().optional(),
}).strict();

export const ArriveDestinationPayload = z.object({
  arrivedAt: z.string().datetime().optional(),
}).strict();

export const StartCustomsPayload = z.object({
  customsBroker: z.string().max(200).optional(),
}).strict();

export const CompleteCustomsPayload = z.object({
  clearanceRef: z.string().max(200).optional(),
}).strict();

export const ReadyDeliveryPayload = z.object({}).strict();

export const ConfirmDeliveryPayload = z.object({
  deliveryConfirmationRef: z.string().max(200).optional(),
}).strict();

export const ConfirmPartialDeliveryPayload = z.object({
  partialDeliveryNote: z.string().min(1).max(2000),
  deliveredQuantity: z.number().positive().optional(),
  remainingQuantity: z.number().nonnegative().optional(),
}).strict();

export const RejectShipmentPayload = z.object({
  reason: z.string().min(3).max(2000),
}).strict();

export const CompleteShipmentPayload = z.object({
  notes: z.string().max(2000).optional(),
  /** Sprint 5C — ADMIN may complete without all trade documents approved */
  complianceOverride: z.boolean().optional(),
}).strict();

export const ReportExceptionPayload = z.object({
  category: z.enum([
    "VESSEL_DELAY",
    "CUSTOMS_HOLD",
    "DOCUMENT_MISSING",
    "PORT_CONGESTION",
    "DELIVERY_DELAY",
    "OTHER",
  ]),
  reason: z.string().min(3).max(2000),
  details: z.string().max(5000).optional(),
}).strict();

export const ResolveExceptionPayload = z.object({
  resolution: z.string().min(3).max(2000),
  resumeState: z.enum([
    "BOOKING_CONFIRMED",
    "CONTAINER_ASSIGNED",
    "IN_TRANSIT",
    "ARRIVED_DESTINATION_PORT",
    "CUSTOMS_CLEARANCE",
    "READY_FOR_DELIVERY",
    "PARTIALLY_DELIVERED",
  ]).optional(),
}).strict();

export const CancelShipmentPayload = z.object({
  reason: z.string().min(3).max(2000),
}).strict();

export const UploadShipmentDocumentPayload = z.object({
  documentType: z.enum([
    "BOOKING_CONFIRMATION",
    "BL_DRAFT",
    "BL_FINAL",
    "PACKING_LIST",
    "CUSTOMS_DOC",
    "DELIVERY_PROOF",
    "OTHER",
  ]),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(100),
  storageKey: z.string().min(1).max(500),
  fileSizeBytes: z.number().int().positive(),
});
