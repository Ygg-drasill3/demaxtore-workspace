/**
 * Sprint 33 — FreightIQ Execution 2.0
 * Derived presentation state from Freight Request + Sprint 32 booking + Shipment FSM.
 * Not a parallel source of truth.
 */
export declare const FREIGHTIQ_EXECUTION_STATES: readonly ["NONE", "REQUESTED", "OFFERS_AVAILABLE", "OFFER_SELECTED", "BOOKING_REQUESTED", "BOOKING_PENDING", "BOOKING_CONFIRMED", "BOOKING_AMENDED", "SHIPMENT_ACTIVE", "IN_TRANSIT", "ARRIVED", "DELIVERED", "CANCELLED"];
export type FreightIqExecutionState = (typeof FREIGHTIQ_EXECUTION_STATES)[number];
export interface FreightIqExecutionInput {
    freightRequestStatus: string | null;
    hasActiveOffers: boolean;
    hasSelection: boolean;
    bookingStatus: string | null;
    shipmentState: string | null;
    trackingLinked: boolean;
    containerCount: number;
}
/** Map canonical entities → one customer-facing execution state. */
export declare function deriveFreightIqExecutionState(input: FreightIqExecutionInput): FreightIqExecutionState;
export interface FreightIqExecutionSummary {
    state: FreightIqExecutionState;
    freightRequestId: string | null;
    selectedOfferId: string | null;
    selectedOfferPrice: number | null;
    selectedOfferCurrency: string | null;
    selectedCarrier: string | null;
    shipmentWorkspaceId: string | null;
    shipmentRef: string | null;
    shipmentState: string | null;
    bookingStatus: string | null;
    bookingReference: string | null;
    /** Planned booking ETD — distinct from maritime ETA */
    bookingEtd: string | null;
    /** Planned booking ETA — distinct from maritime ETA */
    bookingEta: string | null;
    /** Live maritime ETA from tracking snapshot when available */
    maritimeEta: string | null;
    trackingLinked: boolean;
    trackingStatus: string | null;
    containerCount: number;
    /** Suggested next orchestration action key */
    nextAction: "proceed_to_booking" | "open_booking" | "open_shipment" | "await_ops" | "none" | null;
    nextActionLabel: string | null;
    bookingUrl: string | null;
    shipmentUrl: string | null;
}
export declare function nextFreightIqExecutionAction(state: FreightIqExecutionState, shipmentWorkspaceId: string | null): Pick<FreightIqExecutionSummary, "nextAction" | "nextActionLabel" | "bookingUrl" | "shipmentUrl">;
