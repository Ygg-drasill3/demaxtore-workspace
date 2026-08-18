/**
 * Sprint 41 — Turkey Inland Execution V1 (operational lifecycle after Customs CLEARED).
 * No marketplace / GPS / D&D / landed cost.
 */
import { z } from "zod";

export const INLAND_DELIVERY_STATUSES = [
  "DRAFT",
  "REQUESTED",
  "TRUCKER_ASSIGNED",
  "PICKUP_SCHEDULED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "GATE_OUT",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;
export type InlandDeliveryStatus = (typeof INLAND_DELIVERY_STATUSES)[number];

export const INLAND_STATUS_SOURCES = [
  "BUYER",
  "DEMAXTORE_OPERATIONS",
  "TRUCKER",
  "SYSTEM",
] as const;

export const INLAND_POD_STATUSES = ["NOT_REQUIRED", "PENDING", "AVAILABLE"] as const;

export const INLAND_TRANSITIONS: Record<InlandDeliveryStatus, InlandDeliveryStatus[]> = {
  DRAFT: ["REQUESTED", "CANCELLED"],
  REQUESTED: ["TRUCKER_ASSIGNED", "CANCELLED"],
  TRUCKER_ASSIGNED: ["PICKUP_SCHEDULED", "CANCELLED"],
  PICKUP_SCHEDULED: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["GATE_OUT", "CANCELLED"],
  GATE_OUT: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Physical release transitions require Customs CLEARED. */
export const INLAND_CUSTOMS_GATED_STATUSES: InlandDeliveryStatus[] = [
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "GATE_OUT",
  "IN_TRANSIT",
  "DELIVERED",
];

export function canTransitionInland(
  from: InlandDeliveryStatus,
  to: InlandDeliveryStatus,
): boolean {
  return (INLAND_TRANSITIONS[from] ?? []).includes(to);
}

export const RequestInlandDeliverySchema = z.object({
  shipmentWorkspaceId: z.string().uuid(),
  deliveryName: z.string().trim().min(1).max(200).optional().nullable(),
  deliveryAddress: z.string().trim().min(3).max(500),
  deliveryCity: z.string().trim().min(1).max(120).optional().nullable(),
  deliveryPostalCode: z.string().trim().max(32).optional().nullable(),
  deliveryContactName: z.string().trim().max(120).optional().nullable(),
  deliveryContactPhone: z.string().trim().max(64).optional().nullable(),
  pickupLocation: z.string().trim().max(500).optional().nullable(),
  preferredPickupAt: z.string().datetime().optional().nullable(),
  instructions: z.string().trim().max(2000).optional().nullable(),
});
export type RequestInlandDeliveryInput = z.infer<typeof RequestInlandDeliverySchema>;

export const SchedulePickupSchema = z.object({
  pickupAt: z.string().datetime(),
  pickupWindow: z.string().trim().max(120).optional().nullable(),
  appointmentRef: z.string().trim().max(120).optional().nullable(),
  pickupLocation: z.string().trim().max(500).optional().nullable(),
  instructions: z.string().trim().max(2000).optional().nullable(),
  driverName: z.string().trim().max(120).optional().nullable(),
  driverPhone: z.string().trim().max(64).optional().nullable(),
  vehiclePlate: z.string().trim().max(64).optional().nullable(),
});
export type SchedulePickupInput = z.infer<typeof SchedulePickupSchema>;

export const InlandConfirmSchema = z.object({
  note: z.string().trim().max(2000).optional().nullable(),
  timestamp: z.string().datetime().optional().nullable(),
});
export type InlandConfirmInput = z.infer<typeof InlandConfirmSchema>;

export const InlandCancelSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
});
export type InlandCancelInput = z.infer<typeof InlandCancelSchema>;

export const InlandCostSchema = z.object({
  amount: z.number().min(0).max(1_000_000_000),
  currency: z.string().trim().min(3).max(3).default("TRY"),
  kind: z.enum(["ESTIMATED", "ACTUAL"]).default("ESTIMATED"),
  source: z.enum(["MANUAL", "BROKER_ENTERED", "SYSTEM"]).default("MANUAL"),
});
export type InlandCostInput = z.infer<typeof InlandCostSchema>;

export const InlandDeliveryDtoSchema = z.object({
  id: z.string().uuid(),
  organisationId: z.string().uuid(),
  shipmentWorkspaceId: z.string().uuid(),
  orderWorkspaceId: z.string().uuid(),
  customsCaseId: z.string().uuid().nullable(),
  status: z.enum(INLAND_DELIVERY_STATUSES),
  statusSource: z.enum(INLAND_STATUS_SOURCES),
  customsCleared: z.boolean(),
  readyForInland: z.boolean(),
  shipmentRef: z.string().nullable().optional(),
  containerNumber: z.string().nullable().optional(),
  destinationPort: z.string().nullable().optional(),
  deliveryName: z.string().nullable().optional(),
  deliveryAddress: z.string().nullable().optional(),
  deliveryCity: z.string().nullable().optional(),
  deliveryPostalCode: z.string().nullable().optional(),
  deliveryContactName: z.string().nullable().optional(),
  deliveryContactPhone: z.string().nullable().optional(),
  pickupLocation: z.string().nullable().optional(),
  pickupAt: z.string().nullable().optional(),
  pickupWindow: z.string().nullable().optional(),
  appointmentRef: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  truckerUserId: z.string().uuid().nullable().optional(),
  truckerAssignmentId: z.string().uuid().nullable().optional(),
  driverName: z.string().nullable().optional(),
  driverPhone: z.string().nullable().optional(),
  vehiclePlate: z.string().nullable().optional(),
  releaseReference: z.string().nullable().optional(),
  pickedUpAt: z.string().nullable().optional(),
  gateOutAt: z.string().nullable().optional(),
  inTransitAt: z.string().nullable().optional(),
  deliveredAt: z.string().nullable().optional(),
  podStatus: z.enum(INLAND_POD_STATUSES),
  podTradeDocumentId: z.string().uuid().nullable().optional(),
  inlandCostAmount: z.number().nullable().optional(),
  inlandCostCurrency: z.string().nullable().optional(),
  inlandCostKind: z.string().nullable().optional(),
  allowedActions: z.array(z.string()).optional(),
  nextAction: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InlandDeliveryDto = z.infer<typeof InlandDeliveryDtoSchema>;

export type InlandPartnerQueueGroup =
  | "ACTION_REQUIRED"
  | "PICKUP_TODAY"
  | "UPCOMING_PICKUPS"
  | "READY_FOR_PICKUP"
  | "IN_TRANSIT"
  | "DELIVERED";
