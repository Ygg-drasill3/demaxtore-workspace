export function freightPhase(eligible, status) {
    if (!eligible && !status)
        return "not_eligible";
    if (!status)
        return "empty";
    return status;
}
export const FREIGHTIQ_SCRIPTS = {
    not_eligible: {
        mood: "waiting",
        past: "Order not yet ready for freight",
        future: "Freight quotes unlock after production completes or freight is requested on the order",
        statL: { label: "Requirement", value: "Production complete" },
        statR: { label: "Route", value: "{{originPort}} → {{destinationPort}}" },
        primaryAction: null,
    },
    empty: {
        mood: "action",
        past: "No freight quote requested yet",
        future: "Create a freight quote — DeMaxtore will source forwarder offers for your route",
        statL: { label: "Route", value: "{{pol}} → {{pod}}" },
        statR: { label: "Mode", value: "{{mode}}" },
        primaryAction: "create_freight_request",
        primaryLabel: "Create freight quote",
    },
    REQUESTED: {
        mood: "waiting",
        past: "Freight quote requested for {{pol}} → {{pod}}",
        future: "DeMaxtore is contacting forwarders — offers will appear here",
        statL: { label: "Forwarders", value: "{{contactedCount}} contacted" },
        statR: { label: "Typical response", value: "24–72 hours" },
        primaryAction: null,
    },
    QUOTING: {
        mood: "waiting",
        past: "{{contactedCount}} forwarders contacted",
        future: "Waiting for forwarder responses — first offers arriving soon",
        statL: { label: "Responded", value: "{{respondedCount}} of {{contactedCount}}" },
        statR: { label: "Offers", value: "{{offerCount}} received" },
        primaryAction: null,
    },
    QUOTED: {
        mood: "action",
        past: "{{offerCount}} freight offers received",
        future: "Compare forwarder prices, then choose the vessel and sailing schedule that fits your cargo",
        statL: { label: "Lowest", value: "{{lowestPrice}}" },
        statR: { label: "Fastest", value: "{{fastestTransit}} days" },
        primaryAction: "select_freight_offer",
        primaryLabel: "Compare & select vessel",
    },
    SELECTED: {
        mood: "terminal-plus",
        past: "Carrier selected — {{selectedCarrier}}",
        future: "Shipment workspace will track booking and transit",
        statL: { label: "Freight", value: "{{selectedPrice}}" },
        statR: { label: "Transit", value: "{{selectedTransit}} days" },
        primaryAction: null,
        fallbackPrimary: { label: "Open shipment", href: "{{shipmentUrl}}", tone: "secondary" },
    },
    CONVERTED_TO_SHIPMENT: {
        mood: "terminal-plus",
        past: "Freight linked to shipment workspace",
        future: "Track vessel, ETA, and documents in the shipment workspace",
        statL: { label: "Carrier", value: "{{selectedCarrier}}" },
        statR: { label: "Shipment", value: "{{shipmentRef}}" },
        primaryAction: null,
        fallbackPrimary: { label: "Track shipment", href: "{{shipmentUrl}}", tone: "secondary" },
    },
    CANCELLED: {
        mood: "terminal-minus",
        past: "Freight request cancelled",
        future: "Create a new quote when ready",
        statL: { label: "Status", value: "Cancelled" },
        statR: { label: "Action", value: "New request available" },
        primaryAction: "create_freight_request",
        primaryLabel: "Create new quote",
    },
    EXPIRED: {
        mood: "returned",
        past: "Previous freight quotes expired",
        future: "Create a fresh quote request to source new offers",
        statL: { label: "Status", value: "Expired" },
        statR: { label: "Action", value: "Re-request quotes" },
        primaryAction: "create_freight_request",
        primaryLabel: "Request new quotes",
    },
};
export function freightiqScriptFor(phase, _role) {
    return FREIGHTIQ_SCRIPTS[phase];
}
export function freightMilestones(phase) {
    const steps = [
        { key: "request", label: "Request", phases: ["empty", "not_eligible"] },
        { key: "sourcing", label: "Sourcing", phases: ["REQUESTED", "QUOTING"] },
        { key: "quotes", label: "Quotes", phases: ["QUOTED"] },
        { key: "selection", label: "Selection", phases: ["SELECTED"] },
        { key: "shipment", label: "Shipment", phases: ["CONVERTED_TO_SHIPMENT"] },
    ];
    const idx = steps.findIndex((s) => s.phases.includes(phase));
    const current = idx < 0 ? (phase === "empty" || phase === "not_eligible" ? 0 : 4) : idx;
    return steps.map((s, i) => ({
        key: s.key,
        label: s.label,
        status: i < current ? "done" : i === current ? "current" : "pending",
    }));
}
//# sourceMappingURL=freightiq.scripts.js.map