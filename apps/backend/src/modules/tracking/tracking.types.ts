import type {
  TrackingDelayFlag,
  TrackingProviderType,
  TrackingStatus,
} from "@dmx/contracts/shipment-tracking";

export interface TrackingContext {
  shipmentId: string;
  externalRef: string;
  containerNumber: string | null;
  bookingNumber: string | null;
  vesselName: string | null;
  referenceNumber: string | null;
  originPort: string;
  destinationPort: string;
  syncGeneration: number;
}

export interface ProviderSnapshot {
  provider: TrackingProviderType;
  vesselName: string | null;
  imo: string | null;
  mmsi: string | null;
  carrier: string | null;
  voyage: string | null;
  pol: string;
  pod: string;
  etd: Date;
  eta: Date;
  lastPositionAt: Date;
  trackingStatus: TrackingStatus;
  delayFlag: TrackingDelayFlag;
  raw?: Record<string, unknown>;
}

export interface ProviderTrackingEvent {
  eventType: string;
  title: string;
  description: string;
  occurredAt: Date;
  rawPayload?: Record<string, unknown>;
}

export interface TrackingProvider {
  readonly name: TrackingProviderType;
  syncShipment(ctx: TrackingContext): Promise<ProviderSnapshot>;
  fetchTracking(ctx: TrackingContext): Promise<ProviderSnapshot>;
  fetchEvents(ctx: TrackingContext, snapshot: ProviderSnapshot): Promise<ProviderTrackingEvent[]>;
}
