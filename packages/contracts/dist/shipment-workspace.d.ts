import type { ShipmentState } from "./shipment.fsm";
export declare const SHIPMENT_TRANSPORT_MODES: readonly ["SEA", "AIR", "ROAD", "RAIL"];
export type ShipmentTransportMode = (typeof SHIPMENT_TRANSPORT_MODES)[number];
export declare const SHIPMENT_BADGE_GROUPS: readonly ["DRAFT", "BOOKED", "TRANSIT", "DELIVERED", "CANCELLED"];
export type ShipmentBadgeGroup = (typeof SHIPMENT_BADGE_GROUPS)[number];
export declare const SHIPMENT_CONTAINER_STATUSES: readonly ["PLANNED", "LOADED", "IN_TRANSIT", "ARRIVED", "DELIVERED", "CANCELLED"];
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
export declare function shipmentBadgeGroup(state: ShipmentState): ShipmentBadgeGroup;
/** Convenience status alias → existing FSM action (never invents new states). */
export declare const SHIPMENT_STATUS_ALIAS_ACTIONS: {
    readonly booked: "confirm_booking";
    readonly in_transit: "depart_vessel";
    readonly delivered: "confirm_delivery";
};
export type ShipmentStatusAlias = keyof typeof SHIPMENT_STATUS_ALIAS_ACTIONS;
export declare function buildShipmentOperationalMilestones(input: {
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
}): ShipmentMilestoneDto[];
