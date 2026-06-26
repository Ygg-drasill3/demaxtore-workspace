// =============================================================================
// Sprint 4B — Port-to-port maritime tracking (informational; no FSM)
// =============================================================================
export const TrackingProviderType = ["MANUAL", "MOCK_LIVE", "MARITIME_API"];
export const TrackingStatus = [
    "NOT_TRACKED",
    "BOOKED",
    "DEPARTED",
    "IN_TRANSIT",
    "DELAYED",
    "ARRIVED_PORT",
    "COMPLETED",
];
export const TrackingDelayFlag = ["NONE", "MINOR", "MAJOR"];
export const TrackingEventType = [
    "shipment.vessel.departed",
    "shipment.eta.updated",
    "shipment.delay.detected",
    "shipment.arrived.port",
    "shipment.tracking.synced",
    "shipment.tracking.linked",
];
//# sourceMappingURL=shipment-tracking.js.map