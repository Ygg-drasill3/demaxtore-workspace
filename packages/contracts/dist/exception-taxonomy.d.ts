/** Commercial dispute categories on Order workspace (`open_dispute`). */
export declare const ORDER_DISPUTE_CATEGORIES: readonly ["QUALITY", "DELAY", "DAMAGE", "DOCUMENT", "PAYMENT", "OTHER"];
export type OrderDisputeCategory = (typeof ORDER_DISPUTE_CATEGORIES)[number];
/** Operational exception categories on Shipment workspace (`report_exception`). */
export declare const SHIPMENT_EXCEPTION_CATEGORIES: readonly ["VESSEL_DELAY", "CUSTOMS_HOLD", "DOCUMENT_MISSING", "PORT_CONGESTION", "DELIVERY_DELAY", "OTHER"];
export type ShipmentExceptionCategory = (typeof SHIPMENT_EXCEPTION_CATEGORIES)[number];
/**
 * When a shipment EXCEPTION is reported, whether the orchestrator should suggest
 * opening an Order DISPUTED. This only ever produces a recommendation — the order
 * FSM is never mutated from a shipment exception.
 *
 * Only DELIVERY_DELAY mirrors: it is the one operational category with a direct
 * commercial counterpart against the supplier (Order dispute category DELAY).
 * Carrier- or authority-side events (vessel delay, port congestion, customs hold)
 * are not in themselves grounds for a commercial dispute, so they stay "none".
 */
export declare const SHIPMENT_EXCEPTION_TO_ORDER_MIRROR: Record<ShipmentExceptionCategory, "none" | "suggest_dispute">;
/** Order dispute categories that may correlate with shipment operational issues. */
export declare const ORDER_DISPUTE_COMMERCIAL_CATEGORIES: OrderDisputeCategory[];
export declare function shouldSuggestOrderDispute(category: ShipmentExceptionCategory): boolean;
