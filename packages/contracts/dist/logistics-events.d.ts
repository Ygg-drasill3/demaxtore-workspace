export declare const CARRIER_EVENT_TYPES: readonly ["CARRIER_BOOKING_CONFIRMED", "CONTAINER_ASSIGNED", "CARGO_PICKED_UP", "ARRIVED_ORIGIN_PORT", "LOADED_ON_VESSEL", "VESSEL_DEPARTED", "IN_TRANSIT", "ARRIVED_DESTINATION_PORT", "CUSTOMS_STARTED", "CUSTOMS_CLEARED", "READY_FOR_DELIVERY", "DELIVERED"];
export type CarrierEventType = (typeof CARRIER_EVENT_TYPES)[number];
export declare const EVENT_CONFIDENCE_LEVELS: readonly ["low", "medium", "high"];
export type EventConfidence = (typeof EVENT_CONFIDENCE_LEVELS)[number];
/** Carrier event → shipment FSM action (high confidence auto-apply only). */
export declare const CARRIER_EVENT_TO_SHIPMENT_ACTION: Partial<Record<CarrierEventType, string>>;
export interface NormalizedCarrierEvent {
    provider: string;
    externalEventId: string;
    eventType: CarrierEventType;
    shipmentId?: string;
    occurredAt: string;
    confidence: EventConfidence;
    rawPayload: Record<string, unknown>;
}
