export declare const BULK_POST_EXECUTION_READY_LEARNING: {
    readonly summary: string;
    readonly topics: readonly ["Execution Ready means all allocations, proformas, and payments are confirmed", "Operations spawns the master order and supplier orders — you see one execution dashboard", "Each allocation becomes a standard Order workspace in Trade OS", "Supplier identities remain hidden — you see Allocation 1, 2, 3 progress", "No parallel engines — existing Order, FreightIQ, and Shipment FSMs handle fulfillment"];
};
export declare const BULK_FREIGHTIQ_CONNECTION_LEARNING: {
    readonly summary: "BulkContainer supplier orders use the same FreightIQ eligibility rules as RFQ and SmartContainer orders. No separate freight workflow exists.";
    readonly topics: readonly ["Orders progress through production and inspection using the standard Order FSM", "FreightIQ becomes available when orders reach PRODUCTION_COMPLETED, INSPECTION_COMPLETED, or FREIGHT_REQUESTED", "Operations or admin creates freight requests via existing FreightIQ API", "Freight status appears on your BulkContainer execution dashboard per allocation", "Shipment workspaces spawn automatically from orders via existing side effects"];
};
export declare const BULK_EXECUTION_UNDERSTANDING_LEARNING: {
    readonly summary: "BulkContainer execution is coordination-only until spawn. After spawn, Trade OS runs fulfillment while you monitor one unified dashboard.";
    readonly topics: readonly ["Document Hub aggregates proformas, order docs, inspection docs, shipment docs, and freight docs", "Completion % reflects order, freight, and shipment progress across all allocations", "Execution completes when all linked shipments are delivered", "Master order reference BC-EXEC-* is your single buyer-facing execution identity", "Sprint 13E bridge — no new order, freight, or shipment engines"];
};
