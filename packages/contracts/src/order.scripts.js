export const ORDER_SCRIPTS = {
    ORDER_CREATED: {
        mood: "waiting",
        past: "Order workspace created from your award",
        future: "Waiting for the supplier to confirm production timeline and order terms",
        statL: { label: "Your action", value: "None — supplier confirms first" },
        statR: { label: "Contract", value: "{{contractRef}}" },
        primaryAction: null,
    },
    SUPPLIER_CONFIRMED: {
        mood: "waiting",
        past: "Supplier confirmed the order",
        future: "Production will start — you will see progress updates here",
        statL: { label: "Planned completion", value: "{{plannedCompletion}}" },
        statR: { label: "Supplier", value: "{{supplierName}}" },
        primaryAction: null,
    },
    PRODUCTION_STARTED: {
        mood: "waiting",
        past: "Production has started",
        future: "Supplier is manufacturing your goods — track milestones below",
        statL: { label: "Last update", value: "{{lastProductionUpdate}}" },
        statR: { label: "Progress", value: "{{productionPercent}}%" },
        primaryAction: null,
    },
    PRODUCTION_IN_PROGRESS: {
        mood: "waiting",
        past: "Production in progress at {{supplierName}}",
        future: "Supplier must report 100% before the order advances to inspection or freight",
        statL: { label: "Progress", value: "{{productionPercent}}%" },
        statR: { label: "Expected", value: "{{plannedCompletion}}" },
        primaryAction: null,
    },
    PRODUCTION_COMPLETED: {
        mood: "action",
        past: "Production completed — goods are ready",
        future: "Choose inspection or proceed directly to freight coordination",
        statL: { label: "Inspection", value: "Optional quality check" },
        statR: { label: "Next", value: "Freight & shipment" },
        primaryAction: "request_inspection",
        primaryLabel: "Request inspection",
    },
    INSPECTION_REQUESTED: {
        mood: "waiting",
        past: "Inspection requested",
        future: "Inspector will verify quality before freight is arranged",
        statL: { label: "Inspector", value: "{{inspectorName}}" },
        statR: { label: "Status", value: "Awaiting inspection" },
        primaryAction: null,
    },
    INSPECTION_COMPLETED: {
        mood: "action",
        past: "Inspection completed — {{inspectionResult}}",
        future: "Proceed to freight — request quotes and select a carrier",
        statL: { label: "Result", value: "{{inspectionResult}}" },
        statR: { label: "Route", value: "{{originPort}} → {{destinationPort}}" },
        primaryAction: "proceed_to_freight",
        primaryLabel: "Request freight",
    },
    FREIGHT_REQUESTED: {
        mood: "action",
        past: "Freight coordination started",
        future: "Review forwarder offers in FreightIQ and select the best option",
        statL: { label: "Offers", value: "{{offerCount}} received" },
        statR: { label: "Route", value: "{{originPort}} → {{destinationPort}}" },
        primaryAction: null,
        fallbackPrimary: { label: "Open FreightIQ", href: "#order-freightiq-section", tone: "secondary" },
    },
    SHIPMENT_BOOKED: {
        mood: "active",
        past: "Shipment booked with {{carrierName}}",
        future: "Track vessel departure and ETA in the shipment workspace",
        statL: { label: "Vessel", value: "{{vesselName}}" },
        statR: { label: "ETA", value: "{{eta}}" },
        primaryAction: null,
        fallbackPrimary: { label: "Track shipment", href: "{{shipmentUrl}}", tone: "secondary" },
    },
    IN_TRANSIT: {
        mood: "active",
        past: "Cargo in transit — {{originPort}} → {{destinationPort}}",
        future: "Monitor ETA updates and document compliance until arrival",
        statL: { label: "ETA", value: "{{eta}}" },
        statR: { label: "Status", value: "In transit" },
        primaryAction: null,
        fallbackPrimary: { label: "Track shipment", href: "{{shipmentUrl}}", tone: "secondary" },
    },
    DELIVERED: {
        mood: "terminal-plus",
        past: "Delivery confirmed",
        future: "Review documents and close the order when complete",
        statL: { label: "Delivered", value: "{{deliveredAt}}" },
        statR: { label: "Value", value: "{{currency}} {{totalValue}}" },
        primaryAction: "close_order",
        primaryLabel: "Close order",
    },
    CLOSED: {
        mood: "terminal-plus",
        past: "Order closed successfully",
        future: "Full audit trail and documents remain available",
        statL: { label: "Reference", value: "{{externalRef}}" },
        statR: { label: "Status", value: "Completed" },
        primaryAction: null,
    },
    DISPUTED: {
        mood: "returned",
        past: "Dispute opened on this order",
        future: "DeMaxtore operations will coordinate resolution",
        statL: { label: "Status", value: "Under review" },
        statR: { label: "Action", value: "Await ops contact" },
        primaryAction: null,
    },
    CANCELLED: {
        mood: "terminal-minus",
        past: "Order cancelled",
        future: "No further actions available",
        statL: { label: "Reference", value: "{{externalRef}}" },
        statR: { label: "Status", value: "Cancelled" },
        primaryAction: null,
    },
};
const SUPPLIER_ORDER_SCRIPTS = {
    ORDER_CREATED: {
        mood: "action",
        past: "New order received from {{buyerName}}",
        future: "Confirm production timeline and order acceptance",
        statL: { label: "Contract", value: "{{contractRef}}" },
        statR: { label: "Value", value: "{{currency}} {{totalValue}}" },
        primaryAction: "supplier_confirm_order",
        primaryLabel: "Confirm order",
    },
    SUPPLIER_CONFIRMED: {
        mood: "action",
        past: "You confirmed this order",
        future: "Start production and report progress to the buyer",
        statL: { label: "Next", value: "Start production" },
        statR: { label: "Buyer", value: "{{buyerName}}" },
        primaryAction: "start_production",
    },
    PRODUCTION_STARTED: {
        mood: "action",
        past: "Production started",
        future: "Report progress below 100% to keep the order in production; enter 100% when manufacturing is complete",
        statL: { label: "Buyer", value: "{{buyerName}}" },
        statR: { label: "Progress", value: "{{productionPercent}}%" },
        primaryAction: "report_production_progress",
        primaryLabel: "Update production",
    },
    PRODUCTION_IN_PROGRESS: {
        mood: "action",
        past: "Production in progress — {{productionPercent}}% reported",
        future: "Order stays here until you report 100%. Use Update Production and enter 100 when goods are ready",
        statL: { label: "Progress", value: "{{productionPercent}}%" },
        statR: { label: "Buyer waiting", value: "Yes" },
        primaryAction: "report_production_progress",
        primaryLabel: "Update production",
    },
};
export function orderScriptFor(state, role) {
    if (role === "SUPPLIER" && SUPPLIER_ORDER_SCRIPTS[state])
        return SUPPLIER_ORDER_SCRIPTS[state];
    return ORDER_SCRIPTS[state];
}
export function orderMilestones(state) {
    const steps = [
        { key: "confirm", label: "Confirm", states: ["ORDER_CREATED", "SUPPLIER_CONFIRMED"] },
        { key: "production", label: "Production", states: ["PRODUCTION_STARTED", "PRODUCTION_IN_PROGRESS", "PRODUCTION_COMPLETED"] },
        { key: "inspection", label: "Inspection", states: ["INSPECTION_REQUESTED", "INSPECTION_COMPLETED"] },
        { key: "freight", label: "Freight", states: ["FREIGHT_REQUESTED", "SHIPMENT_BOOKED"] },
        { key: "transit", label: "Transit", states: ["DEPARTED", "IN_TRANSIT", "ETA_UPDATED", "ARRIVED_PORT"] },
        { key: "delivery", label: "Delivery", states: ["DELIVERED", "CLOSED"] },
    ];
    const idx = steps.findIndex((s) => s.states.includes(state));
    return steps.map((s, i) => ({
        key: s.key,
        label: s.label,
        status: i < idx ? "done" : i === idx ? "current" : "pending",
    }));
}
//# sourceMappingURL=order.scripts.js.map