// =============================================================================
// Sprint 4B — Port-to-port maritime tracking (informational; no FSM)
// =============================================================================

export const TrackingProviderType = ["MANUAL", "MOCK_LIVE", "MARITIME_API"] as const;
export type TrackingProviderType = (typeof TrackingProviderType)[number];

export const TrackingStatus = [
  "NOT_TRACKED",
  "BOOKED",
  "DEPARTED",
  "IN_TRANSIT",
  "DELAYED",
  "ARRIVED_PORT",
  "COMPLETED",
] as const;
export type TrackingStatus = (typeof TrackingStatus)[number];

export const TrackingDelayFlag = ["NONE", "MINOR", "MAJOR"] as const;
export type TrackingDelayFlag = (typeof TrackingDelayFlag)[number];

export const TrackingEventType = [
  "shipment.vessel.departed",
  "shipment.eta.updated",
  "shipment.delay.detected",
  "shipment.arrived.port",
  "shipment.tracking.synced",
  "shipment.tracking.linked",
] as const;
export type TrackingEventType = (typeof TrackingEventType)[number];

export interface TrackingSnapshot {
  id: string;
  shipmentId: string;
  provider: TrackingProviderType;
  vesselName: string | null;
  imo: string | null;
  mmsi: string | null;
  carrier: string | null;
  voyage: string | null;
  pol: string | null;
  pod: string | null;
  etd: string | null;
  eta: string | null;
  lastPositionAt: string | null;
  trackingStatus: TrackingStatus;
  delayFlag: TrackingDelayFlag;
  syncedAt: string;
  createdAt: string;
}

export interface TrackingEvent {
  id: string;
  shipmentId: string;
  eventType: string;
  title: string;
  description: string;
  occurredAt: string;
  createdAt: string;
}

export interface ShipmentTrackingDTO {
  shipmentId: string;
  linked: boolean;
  provider: TrackingProviderType | null;
  latestSnapshot: TrackingSnapshot | null;
  events: TrackingEvent[];
  referenceNumber: string | null;
  containerNumber: string | null;
  bookingNumber: string | null;
  vesselName: string | null;
}

export interface TrackingSyncResult {
  shipmentId: string;
  synced: boolean;
  snapshot: TrackingSnapshot | null;
  eventsCreated: number;
  alertsCreated: number;
  error?: string;
}

export interface ShipmentTrackingOpsRow {
  shipmentId: string;
  externalRef: string;
  trackingStatus: TrackingStatus | null;
  delayFlag: TrackingDelayFlag | null;
  eta: string | null;
  vesselName: string | null;
  lastSyncedAt: string | null;
  syncFailed?: boolean;
}

export interface ShipmentTrackingOpsSummary {
  delayed: ShipmentTrackingOpsRow[];
  etaDrift: ShipmentTrackingOpsRow[];
  trackingFailures: ShipmentTrackingOpsRow[];
  recentlyArrived: ShipmentTrackingOpsRow[];
}
