const EVENT_RULES = {
    "rfq.submitted": {
        eventType: "RFQ_SUBMITTED", milestoneType: "RFQ_SUBMITTED",
        eventCategory: "SOURCE", sourceModule: "RFQ", severity: "INFO", title: "RFQ Submitted",
    },
    "rfq.supplier.selected": {
        eventType: "SUPPLIER_SELECTED", milestoneType: "SUPPLIER_SELECTED",
        eventCategory: "PROCUREMENT", sourceModule: "RFQ", severity: "SUCCESS", title: "Supplier Selected",
        visibility: "BUYER",
    },
    "bid.created": {
        eventType: "COMMODITYBID_CREATED",
        eventCategory: "SOURCE", sourceModule: "CommodityBid", severity: "INFO", title: "Commodity Bid Created",
    },
    "freight_estimate.created": {
        eventType: "FREIGHT_ESTIMATE_READY", milestoneType: "FREIGHT_ESTIMATE_READY",
        eventCategory: "FREIGHT", sourceModule: "FreightEstimate", severity: "INFO", title: "Freight Estimate Ready",
        visibility: "BUYER",
    },
    "freight_estimate.updated": {
        eventType: "FREIGHT_ESTIMATE_UPDATED",
        eventCategory: "FREIGHT", sourceModule: "FreightEstimate", severity: "INFO", title: "Freight Estimate Updated",
        visibility: "BUYER",
    },
    "freight_estimate.accepted": {
        eventType: "ESTIMATED_CIF_AVAILABLE", milestoneType: "ESTIMATED_CIF_AVAILABLE",
        eventCategory: "FREIGHT", sourceModule: "FreightEstimate", severity: "SUCCESS", title: "Estimated CIF Available",
        visibility: "BUYER",
    },
    "po.issued": {
        eventType: "PURCHASE_ORDER_ISSUED", milestoneType: "PURCHASE_ORDER_ISSUED",
        eventCategory: "PROCUREMENT", sourceModule: "RFQ", severity: "SUCCESS", title: "Purchase Order Issued",
    },
    "booking.plan_created": {
        eventType: "CARGO_READY_FORECAST_SUBMITTED", milestoneType: "CARGO_READY_FORECAST_SUBMITTED",
        eventCategory: "FREIGHT", sourceModule: "FreightBooking", severity: "INFO", title: "Cargo Ready Forecast Submitted",
    },
    "booking.option_selected": {
        eventType: "CARRIER_SELECTED", milestoneType: "CARRIER_SELECTED",
        eventCategory: "FREIGHT", sourceModule: "FreightBooking", severity: "INFO", title: "Carrier Selected",
    },
    "booking.confirmed": {
        eventType: "BOOKING_CONFIRMED", milestoneType: "BOOKING_CONFIRMED",
        eventCategory: "FREIGHT", sourceModule: "FreightBooking", severity: "SUCCESS", title: "Booking Confirmed",
    },
    "order.production.started": {
        eventType: "PRODUCTION_STARTED", milestoneType: "PRODUCTION_STARTED",
        eventCategory: "PRODUCTION", sourceModule: "RFQ", severity: "INFO", title: "Production Started",
    },
    "order.production.completed": {
        eventType: "PRODUCTION_COMPLETED", milestoneType: "PRODUCTION_COMPLETED",
        eventCategory: "PRODUCTION", sourceModule: "RFQ", severity: "SUCCESS", title: "Production Completed",
    },
    "order.inspection.requested": {
        eventType: "INSPECTION_SCHEDULED", milestoneType: "INSPECTION_SCHEDULED",
        eventCategory: "INSPECTION", sourceModule: "Inspection", severity: "INFO", title: "Inspection Scheduled",
    },
    "order.inspection.completed": {
        eventType: "INSPECTION_PASSED", milestoneType: "INSPECTION_PASSED",
        eventCategory: "INSPECTION", sourceModule: "Inspection", severity: "SUCCESS", title: "Inspection Passed",
    },
    "shipment.loaded_on_vessel": {
        eventType: "CONTAINER_LOADED", milestoneType: "CONTAINER_LOADED",
        eventCategory: "SHIPMENT", sourceModule: "ShipmentTracking", severity: "INFO", title: "Container Loaded",
    },
    "shipment.departed": {
        eventType: "VESSEL_DEPARTED", milestoneType: "VESSEL_DEPARTED",
        eventCategory: "SHIPMENT", sourceModule: "ShipmentTracking", severity: "INFO", title: "Vessel Departed",
    },
    "order.shipment.departed": {
        eventType: "VESSEL_DEPARTED", milestoneType: "VESSEL_DEPARTED",
        eventCategory: "SHIPMENT", sourceModule: "ShipmentTracking", severity: "INFO", title: "Vessel Departed",
    },
    "shipment.eta.updated": {
        eventType: "ETA_UPDATED", milestoneType: "ETA_UPDATED",
        eventCategory: "SHIPMENT", sourceModule: "ShipmentTracking", severity: "INFO", title: "ETA Updated",
    },
    "order.shipment.eta_updated": {
        eventType: "ETA_UPDATED", milestoneType: "ETA_UPDATED",
        eventCategory: "SHIPMENT", sourceModule: "ShipmentTracking", severity: "INFO", title: "ETA Updated",
    },
    "shipment.arrived_destination": {
        eventType: "SHIPMENT_ARRIVED", milestoneType: "SHIPMENT_ARRIVED",
        eventCategory: "SHIPMENT", sourceModule: "ShipmentTracking", severity: "SUCCESS", title: "Shipment Arrived",
    },
    "order.shipment.arrived": {
        eventType: "SHIPMENT_ARRIVED", milestoneType: "SHIPMENT_ARRIVED",
        eventCategory: "SHIPMENT", sourceModule: "ShipmentTracking", severity: "SUCCESS", title: "Shipment Arrived",
    },
    "order.delivered": {
        eventType: "DELIVERED", milestoneType: "DELIVERED",
        eventCategory: "DELIVERY", sourceModule: "ShipmentTracking", severity: "SUCCESS", title: "Delivered",
    },
    "shipment.delivered": {
        eventType: "DELIVERED", milestoneType: "DELIVERED",
        eventCategory: "DELIVERY", sourceModule: "ShipmentTracking", severity: "SUCCESS", title: "Delivered",
    },
    "exception.created": {
        eventType: "EXCEPTION_CREATED",
        eventCategory: "EXCEPTION", sourceModule: "ExceptionHub", severity: "WARNING", title: "Exception Reported",
    },
    "exception.resolved": {
        eventType: "EXCEPTION_RESOLVED",
        eventCategory: "EXCEPTION", sourceModule: "ExceptionHub", severity: "SUCCESS", title: "Exception Resolved",
    },
    "mixed_container.created": {
        eventType: "SMART_CONTAINER_CREATED",
        eventCategory: "SOURCE", sourceModule: "SmartContainer", severity: "INFO", title: "Smart Container Request Created",
    },
    "bulk_container.created": {
        eventType: "BULK_CONTAINER_CREATED",
        eventCategory: "SOURCE", sourceModule: "BulkContainer", severity: "INFO", title: "Bulk Container Request Created",
    },
};
const PREFIX_RULES = [
    { prefix: "rfq.", rule: { eventCategory: "SOURCE", sourceModule: "RFQ", severity: "INFO" } },
    { prefix: "quotation.", rule: { eventCategory: "PROCUREMENT", sourceModule: "RFQ", severity: "INFO", visibility: "BUYER" } },
    { prefix: "proforma.", rule: { eventCategory: "PROCUREMENT", sourceModule: "RFQ", severity: "INFO" } },
    { prefix: "order.", rule: { eventCategory: "PRODUCTION", sourceModule: "RFQ", severity: "INFO" } },
    { prefix: "shipment.", rule: { eventCategory: "SHIPMENT", sourceModule: "ShipmentTracking", severity: "INFO" } },
    { prefix: "booking.", rule: { eventCategory: "FREIGHT", sourceModule: "FreightBooking", severity: "INFO" } },
    { prefix: "freight_estimate.", rule: { eventCategory: "FREIGHT", sourceModule: "FreightEstimate", severity: "INFO", visibility: "BUYER" } },
    { prefix: "exception.", rule: { eventCategory: "EXCEPTION", sourceModule: "ExceptionHub", severity: "WARNING" } },
    { prefix: "document.", rule: { eventCategory: "DOCUMENT", sourceModule: "DocumentCenter", severity: "INFO" } },
    { prefix: "payment.", rule: { eventCategory: "PROCUREMENT", sourceModule: "RFQ", severity: "INFO", visibility: "BUYER" } },
    { prefix: "carrier.", rule: { eventCategory: "SHIPMENT", sourceModule: "ShipmentTracking", severity: "INFO" } },
    { prefix: "mixed_container.", rule: { eventCategory: "SOURCE", sourceModule: "SmartContainer", severity: "INFO" } },
    { prefix: "bulk_container.", rule: { eventCategory: "SOURCE", sourceModule: "BulkContainer", severity: "INFO" } },
    { prefix: "bid.", rule: { eventCategory: "SOURCE", sourceModule: "CommodityBid", severity: "INFO" } },
];
function formatLabel(eventType) {
    return eventType.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function resolveRule(rawEventType) {
    const exact = EVENT_RULES[rawEventType];
    if (exact)
        return exact;
    for (const { prefix, rule } of PREFIX_RULES) {
        if (rawEventType.startsWith(prefix)) {
            return {
                eventType: rawEventType.replace(/\./g, "_").toUpperCase(),
                eventCategory: rule.eventCategory ?? "SOURCE",
                sourceModule: rule.sourceModule ?? "RFQ",
                severity: rule.severity ?? "INFO",
                title: formatLabel(rawEventType),
                visibility: rule.visibility ?? "ALL",
            };
        }
    }
    return {
        eventType: rawEventType.replace(/\./g, "_").toUpperCase(),
        eventCategory: "SOURCE",
        sourceModule: "RFQ",
        severity: "INFO",
        title: formatLabel(rawEventType),
        visibility: "ALL",
    };
}
export function buildTimelineEvents(inputs, graph) {
    const wsTypeMap = new Map();
    wsTypeMap.set(graph.root.id, graph.root.type);
    for (const id of graph.orderIds)
        wsTypeMap.set(id, "ORDER");
    for (const id of graph.shipmentIds)
        wsTypeMap.set(id, "SHIPMENT");
    return inputs.map((input) => {
        const rule = resolveRule(input.eventType);
        const description = input.actorName
            ? `Recorded by ${input.actorName}`
            : null;
        return {
            sourceEventId: input.id,
            eventType: rule.eventType,
            milestoneType: rule.milestoneType ?? null,
            eventCategory: rule.eventCategory,
            title: rule.title,
            description,
            sourceModule: rule.sourceModule,
            severity: rule.severity,
            occurredAt: input.createdAt,
            metadata: {
                rawEventType: input.eventType,
                workspaceId: input.workspaceId,
                workspaceType: wsTypeMap.get(input.workspaceId) ?? graph.root.type,
                payload: input.payload,
            },
            visibility: rule.visibility ?? "ALL",
        };
    });
}
export async function collectSourceEvents(db, graph) {
    const rows = await db.timelineEvent.findMany({
        where: { workspaceId: { in: graph.allWorkspaceIds } },
        orderBy: { createdAt: "asc" },
        take: 500,
        include: { actor: { select: { displayName: true } } },
    });
    return rows.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        workspaceId: r.workspaceId,
        createdAt: r.createdAt,
        payload: (r.payload ?? {}),
        actorName: r.actor?.displayName ?? null,
    }));
}
//# sourceMappingURL=trade-timeline-builder.js.map