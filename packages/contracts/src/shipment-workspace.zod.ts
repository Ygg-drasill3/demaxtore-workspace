import { z } from "zod";
import {
  SHIPMENT_CONTAINER_STATUSES,
  SHIPMENT_TRANSPORT_MODES,
} from "./shipment-workspace";
import {
  SHIPMENT_MILESTONE_STATUSES,
  SHIPMENT_MILESTONE_TYPES,
} from "./shipment-milestones";
import { BOOKING_SOURCES, BOOKING_STATUSES } from "./booking-lifecycle";

export const UpsertShipmentBookingSchema = z
  .object({
    bookingReference: z.string().max(200).optional().nullable(),
    bookingDate: z.string().datetime().optional().nullable(),
    carrier: z.string().max(200).optional().nullable(),
    forwarder: z.string().max(200).optional().nullable(),
    vesselOrFlight: z.string().max(200).optional().nullable(),
    voyage: z.string().max(100).optional().nullable(),
    portOfLoading: z.string().max(200).optional(),
    portOfDischarge: z.string().max(200).optional(),
    etd: z.string().datetime().optional().nullable(),
    eta: z.string().datetime().optional().nullable(),
    transportMode: z.enum(SHIPMENT_TRANSPORT_MODES).optional(),
    confirm: z.boolean().optional(),
    status: z.enum(BOOKING_STATUSES).optional(),
    source: z.enum(BOOKING_SOURCES).optional(),
    carrierBookingNumber: z.string().max(200).optional().nullable(),
    cargoReadyDate: z.string().datetime().optional().nullable(),
    siCutoff: z.string().datetime().optional().nullable(),
    vgmCutoff: z.string().datetime().optional().nullable(),
    cyCutoff: z.string().datetime().optional().nullable(),
    documentCutoff: z.string().datetime().optional().nullable(),
    freightRequestId: z.string().uuid().optional().nullable(),
    freightOfferId: z.string().uuid().optional().nullable(),
  })
  .strict();
export type UpsertShipmentBookingInput = z.infer<typeof UpsertShipmentBookingSchema>;

export const CancelShipmentBookingSchema = z
  .object({
    reason: z.string().min(3).max(2000).optional(),
  })
  .strict();
export type CancelShipmentBookingInput = z.infer<typeof CancelShipmentBookingSchema>;

export const PatchShipmentWorkspaceSchema = z
  .object({
    transportMode: z.enum(SHIPMENT_TRANSPORT_MODES).optional(),
    incoterm: z.string().max(20).optional().nullable(),
    forwarderName: z.string().max(200).optional().nullable(),
    airlineName: z.string().max(200).optional().nullable(),
    flightNumber: z.string().max(100).optional().nullable(),
    truckReference: z.string().max(100).optional().nullable(),
    trainReference: z.string().max(100).optional().nullable(),
    vesselName: z.string().max(200).optional().nullable(),
    voyageNumber: z.string().max(100).optional().nullable(),
    etd: z.string().datetime().optional().nullable(),
    eta: z.string().datetime().optional().nullable(),
    originPort: z.string().max(200).optional(),
    destinationPort: z.string().max(200).optional(),
  })
  .strict();
export type PatchShipmentWorkspaceInput = z.infer<typeof PatchShipmentWorkspaceSchema>;

export const CreateShipmentContainerSchema = z
  .object({
    containerNumber: z.string().min(1).max(50),
    containerType: z.string().max(50).optional().nullable(),
    sealNumber: z.string().max(50).optional().nullable(),
    grossWeightKg: z.number().nonnegative().optional().nullable(),
    netWeightKg: z.number().nonnegative().optional().nullable(),
    volumeCbm: z.number().nonnegative().optional().nullable(),
    packageCount: z.number().int().nonnegative().optional().nullable(),
    status: z.enum(SHIPMENT_CONTAINER_STATUSES).optional(),
  })
  .strict();
export type CreateShipmentContainerInput = z.infer<typeof CreateShipmentContainerSchema>;

export const PatchShipmentContainerSchema = CreateShipmentContainerSchema.partial().strict();
export type PatchShipmentContainerInput = z.infer<typeof PatchShipmentContainerSchema>;

export const PatchShipmentStatusAliasSchema = z
  .object({
    status: z.enum(["booked", "in_transit", "delivered"]),
    reason: z.string().max(2000).optional(),
  })
  .strict();
export type PatchShipmentStatusAliasInput = z.infer<typeof PatchShipmentStatusAliasSchema>;

export const CreateShipmentMilestoneSchema = z
  .object({
    type: z.enum(SHIPMENT_MILESTONE_TYPES),
    plannedAt: z.string().datetime().optional().nullable(),
    estimatedAt: z.string().datetime().optional().nullable(),
    actualAt: z.string().datetime().optional().nullable(),
    status: z.enum(SHIPMENT_MILESTONE_STATUSES).optional(),
    sequence: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();
export type CreateShipmentMilestoneInput = z.infer<typeof CreateShipmentMilestoneSchema>;

export const PatchShipmentMilestoneSchema = z
  .object({
    plannedAt: z.string().datetime().optional().nullable(),
    estimatedAt: z.string().datetime().optional().nullable(),
    actualAt: z.string().datetime().optional().nullable(),
    status: z.enum(SHIPMENT_MILESTONE_STATUSES).optional(),
    sequence: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();
export type PatchShipmentMilestoneInput = z.infer<typeof PatchShipmentMilestoneSchema>;

export const CompleteShipmentMilestoneSchema = z
  .object({
    actualAt: z.string().datetime().optional().nullable(),
  })
  .strict();
export type CompleteShipmentMilestoneInput = z.infer<typeof CompleteShipmentMilestoneSchema>;

export const ListDelayedShipmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  minDelayMinutes: z.coerce.number().int().optional().default(1),
});
export type ListDelayedShipmentsQuery = z.infer<typeof ListDelayedShipmentsQuerySchema>;

export const ListUpcomingMilestonesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  withinHours: z.coerce.number().int().min(1).max(720).optional().default(72),
});
export type ListUpcomingMilestonesQuery = z.infer<typeof ListUpcomingMilestonesQuerySchema>;


export const TransitionShipmentBookingSchema = z.object({
  toStatus: z.enum(BOOKING_STATUSES),
  reason: z.string().max(2000).optional(),
  version: z.number().int().positive().optional(),
});
export type TransitionShipmentBookingInput = z.infer<typeof TransitionShipmentBookingSchema>;
