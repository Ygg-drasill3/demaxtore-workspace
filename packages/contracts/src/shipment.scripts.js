export const SHIPMENT_SCRIPTS = {
    SHIPMENT_CREATED: {
        mood: "waiting",
        past: "Shipment workspace created from order",
        future: "Booking confirmation pending — carrier details will appear here",
        statL: { label: "Route", value: "{{originPort}} → {{destinationPort}}" },
        statR: { label: "Status", value: "Created" },
        primaryAction: null,
    },
    BOOKING_PENDING: {
        mood: "waiting",
        past: "Booking request submitted",
        future: "Forwarder will confirm vessel and sailing schedule",
        statL: { label: "Carrier", value: "{{carrierName}}" },
        statR: { label: "Expected", value: "Within 48 hours" },
        primaryAction: null,
    },
    BOOKING_CONFIRMED: {
        mood: "active",
        past: "Booking confirmed — {{carrierName}}",
        future: "Container assignment and pickup scheduling next",
        statL: { label: "Vessel", value: "{{vesselName}}" },
        statR: { label: "ETD", value: "{{etd}}" },
        primaryAction: null,
    },
    LOADED_ON_VESSEL: {
        mood: "active",
        past: "Cargo loaded on vessel",
        future: "Track in-transit position and ETA updates",
        statL: { label: "Vessel", value: "{{vesselName}}" },
        statR: { label: "ETA", value: "{{eta}}" },
        primaryAction: null,
    },
    IN_TRANSIT: {
        mood: "active",
        past: "Shipment in transit — {{progressPercent}}% of journey",
        future: "Monitor ETA and prepare import documents for arrival",
        statL: { label: "ETA", value: "{{eta}}" },
        statR: { label: "Port", value: "{{destinationPort}}" },
        primaryAction: null,
    },
    ARRIVED_DESTINATION_PORT: {
        mood: "action",
        past: "Vessel arrived at {{destinationPort}}",
        future: "Customs clearance and final delivery coordination",
        statL: { label: "Arrived", value: "{{arrivedAt}}" },
        statR: { label: "Next", value: "Customs clearance" },
        primaryAction: null,
    },
    DELIVERED: {
        mood: "terminal-plus",
        past: "Delivery confirmed",
        future: "Complete shipment and archive documents",
        statL: { label: "Delivered", value: "{{deliveredAt}}" },
        statR: { label: "Reference", value: "{{externalRef}}" },
        primaryAction: "complete_shipment",
        primaryLabel: "Complete shipment",
    },
    COMPLETED: {
        mood: "terminal-plus",
        past: "Shipment completed",
        future: "Full tracking history and documents remain available",
        statL: { label: "Reference", value: "{{externalRef}}" },
        statR: { label: "Status", value: "Completed" },
        primaryAction: null,
    },
    EXCEPTION: {
        mood: "returned",
        past: "Exception reported — {{exceptionType}}",
        future: "DeMaxtore operations is coordinating resolution",
        statL: { label: "Impact", value: "{{delayDays}} day delay" },
        statR: { label: "ETA", value: "{{eta}}" },
        primaryAction: null,
    },
    CANCELLED: {
        mood: "terminal-minus",
        past: "Shipment cancelled",
        future: "No further tracking updates",
        statL: { label: "Reference", value: "{{externalRef}}" },
        statR: { label: "Status", value: "Cancelled" },
        primaryAction: null,
    },
};
export function shipmentScriptFor(state, _role) {
    return SHIPMENT_SCRIPTS[state];
}
export function shipmentMilestones(state) {
    const steps = [
        { key: "booking", label: "Booking", states: ["SHIPMENT_CREATED", "BOOKING_PENDING", "BOOKING_CONFIRMED"] },
        { key: "pickup", label: "Pickup", states: ["CONTAINER_ASSIGNED", "READY_FOR_PICKUP", "PICKED_UP", "AT_ORIGIN_PORT"] },
        { key: "transit", label: "In transit", states: ["LOADED_ON_VESSEL", "IN_TRANSIT"] },
        { key: "arrival", label: "Arrival", states: ["ARRIVED_DESTINATION_PORT", "CUSTOMS_CLEARANCE", "READY_FOR_DELIVERY"] },
        { key: "delivery", label: "Delivered", states: ["DELIVERED", "COMPLETED"] },
    ];
    const idx = steps.findIndex((s) => s.states.includes(state));
    if (state === "EXCEPTION") {
        return steps.map((s, i) => ({ ...s, status: i <= 2 ? "done" : i === 2 ? "current" : "pending" }));
    }
    return steps.map((s, i) => ({
        key: s.key,
        label: s.label,
        status: i < idx ? "done" : i === idx ? "current" : "pending",
    }));
}
export function shipmentProgressPercent(state) {
    const map = {
        SHIPMENT_CREATED: 5, BOOKING_PENDING: 10, BOOKING_CONFIRMED: 15,
        CONTAINER_ASSIGNED: 20, READY_FOR_PICKUP: 25, PICKED_UP: 30,
        AT_ORIGIN_PORT: 35, LOADED_ON_VESSEL: 45, IN_TRANSIT: 60,
        ARRIVED_DESTINATION_PORT: 80, CUSTOMS_CLEARANCE: 85,
        READY_FOR_DELIVERY: 90, DELIVERED: 95, COMPLETED: 100,
        EXCEPTION: 50,
    };
    return map[state] ?? 0;
}
//# sourceMappingURL=shipment.scripts.js.map