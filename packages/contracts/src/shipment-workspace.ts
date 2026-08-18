// =============================================================================
// Sprint 30-01 — Shipment Workspace cockpit DTOs (extends existing Shipment FSM)
// =============================================================================

import type { ShipmentState } from "./shipment.fsm";

export const SHIPMENT_TRANSPORT_MODES = ["SEA", "AIR", "ROAD", "RAIL"] as const;
export type ShipmentTransportMode = (typeof SHIPMENT_TRANSPORT_MODES)[number];

export const SHIPMENT_BADGE_GROUPS = [
  "DRAFT",
  "BOOKED",
  "TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;
export type ShipmentBadgeGroup = (typeof SHIPMENT_BADGE_GROUPS)[number];

export const SHIPMENT_CONTAINER_STATUSES = [
  "PLANNED",
  "LOADED",
  "IN_TRANSIT",
  "ARRIVED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type ShipmentContainerStatus = (typeof SHIPMENT_CONTAINER_STATUSES)[number];

export interface ShipmentPermissions {
  canView: boolean;
  canEditBooking: boolean;
  canManageContainers: boolean;
  canTransitionStatus: boolean;
  canManageMilestones: boolean;
  canUpdateMilestones: boolean;
}

export interface ShipmentSummaryDto {
  shipmentNumber: string;
  status: ShipmentState;
  badgeGroup: ShipmentBadgeGroup;
  mode: ShipmentTransportMode;
  carrier: string | null;
  forwarder: string | null;
  etd: string | null;
  eta: string | null;
  actualDeparture: string | null;
  actualArrival: string | null;
  origin: string;
  destination: string;
  incoterm: string | null;
  containerCount: number;
  totalGrossWeightKg: number | null;
  totalVolumeCbm: number | null;
}

export interface ShipmentBookingDto {
  bookingReference: string | null;
  bookingDate: string | null;
  carrier: string | null;
  forwarder: string | null;
  vesselOrFlight: string | null;
  voyage: string | null;
  portOfLoading: string;
  portOfDischarge: string;
  etd: string | null;
  eta: string | null;
  confirmedAt: string | null;
  hasBooking: boolean;
  status: string | null;
  source: string | null;
  requestedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  carrierBookingNumber: string | null;
  cargoReadyDate: string | null;
  siCutoff: string | null;
  vgmCutoff: string | null;
  cyCutoff: string | null;
  documentCutoff: string | null;
  freightRequestId: string | null;
  freightOfferId: string | null;
}

export interface ShipmentContainerDto {
  id: string;
  containerNumber: string;
  containerType: string | null;
  sealNumber: string | null;
  grossWeightKg: number | null;
  netWeightKg: number | null;
  volumeCbm: number | null;
  packageCount: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type ShipmentMilestoneStatus = "pending" | "planned" | "done" | "current";

export interface ShipmentMilestoneDto {
  key: string;
  label: string;
  planned: string | null;
  actual: string | null;
  status: ShipmentMilestoneStatus;
}

/** Map FSM state → UI badge group (no parallel status machine). */
export function shipmentBadgeGroup(state: ShipmentState): ShipmentBadgeGroup {
  switch (state) {
    case "SHIPMENT_CREATED":
    case "BOOKING_PENDING":
      return "DRAFT";
    case "BOOKING_CONFIRMED":
    case "CONTAINER_ASSIGNED":
    case "READY_FOR_PICKUP":
    case "PICKED_UP":
    case "AT_ORIGIN_PORT":
      return "BOOKED";
    case "LOADED_ON_VESSEL":
    case "IN_TRANSIT":
    case "ARRIVED_DESTINATION_PORT":
    case "CUSTOMS_CLEARANCE":
    case "READY_FOR_DELIVERY":
    case "PARTIALLY_DELIVERED":
      return "TRANSIT";
    case "DELIVERED":
    case "COMPLETED":
      return "DELIVERED";
    case "CANCELLED":
    case "REJECTED":
    case "EXCEPTION":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
}

/** Convenience status alias → existing FSM action (never invents new states). */
export const SHIPMENT_STATUS_ALIAS_ACTIONS = {
  booked: "confirm_booking",
  in_transit: "depart_vessel",
  delivered: "confirm_delivery",
} as const;
export type ShipmentStatusAlias = keyof typeof SHIPMENT_STATUS_ALIAS_ACTIONS;

export function buildShipmentOperationalMilestones(input: {
  state: ShipmentState;
  etd?: string | null;
  eta?: string | null;
  bookingConfirmedAt?: string | null;
  containerAssignedAt?: string | null;
  pickedUpAt?: string | null;
  loadedAt?: string | null;
  departedAt?: string | null;
  arrivedAt?: string | null;
  deliveredAt?: string | null;
}): ShipmentMilestoneDto[] {
  const badge = shipmentBadgeGroup(input.state);
  const order: Array<{
    key: string;
    label: string;
    planned: string | null;
    actual: string | null;
    doneWhen: boolean;
  }> = [
    {
      key: "booking_confirmed",
      label: "Booking Confirmed",
      planned: null,
      actual: input.bookingConfirmedAt ?? null,
      doneWhen: !!input.bookingConfirmedAt || ["BOOKED", "TRANSIT", "DELIVERED"].includes(badge),
    },
    {
      key: "cargo_ready",
      label: "Cargo Ready",
      planned: null,
      actual: input.containerAssignedAt ?? input.pickedUpAt ?? null,
      doneWhen:
        !!input.containerAssignedAt
        || !!input.pickedUpAt
        || ["TRANSIT", "DELIVERED"].includes(badge)
        || ["CONTAINER_ASSIGNED", "READY_FOR_PICKUP", "PICKED_UP", "AT_ORIGIN_PORT"].includes(
          input.state,
        ),
    },
    {
      key: "loaded",
      label: "Loaded",
      planned: input.etd ?? null,
      actual: input.loadedAt ?? null,
      doneWhen: !!input.loadedAt || ["TRANSIT", "DELIVERED"].includes(badge),
    },
    {
      key: "departed",
      label: "Departed",
      planned: input.etd ?? null,
      actual: input.departedAt ?? null,
      doneWhen: !!input.departedAt || input.state === "IN_TRANSIT" || ["DELIVERED"].includes(badge)
        || ["ARRIVED_DESTINATION_PORT", "CUSTOMS_CLEARANCE", "READY_FOR_DELIVERY", "PARTIALLY_DELIVERED"].includes(input.state),
    },
    {
      key: "arrived",
      label: "Arrived",
      planned: input.eta ?? null,
      actual: input.arrivedAt ?? null,
      doneWhen:
        !!input.arrivedAt
        || ["DELIVERED"].includes(badge)
        || ["ARRIVED_DESTINATION_PORT", "CUSTOMS_CLEARANCE", "READY_FOR_DELIVERY", "PARTIALLY_DELIVERED"].includes(
          input.state,
        ),
    },
    {
      key: "delivered",
      label: "Delivered",
      planned: null,
      actual: input.deliveredAt ?? null,
      doneWhen: !!input.deliveredAt || badge === "DELIVERED",
    },
  ];

  let foundCurrent = false;
  return order.map((m) => {
    if (m.doneWhen) {
      return { key: m.key, label: m.label, planned: m.planned, actual: m.actual, status: "done" as const };
    }
    if (!foundCurrent) {
      foundCurrent = true;
      return {
        key: m.key,
        label: m.label,
        planned: m.planned,
        actual: m.actual,
        status: "current" as const,
      };
    }
    return {
      key: m.key,
      label: m.label,
      planned: m.planned,
      actual: m.actual,
      status: m.planned ? ("planned" as const) : ("pending" as const),
    };
  });
}
