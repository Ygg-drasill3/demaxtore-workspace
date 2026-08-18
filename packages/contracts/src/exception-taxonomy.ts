// =============================================================================
// Faz 1 — Exception taxonomy: Order DISPUTED vs Shipment EXCEPTION
// Decision: keep separate models; explicit cross-entity mapping for Faz 2 orchestrator.
// =============================================================================

/** Commercial dispute categories on Order workspace (`open_dispute`). */
export const ORDER_DISPUTE_CATEGORIES = [
  "QUALITY",
  "DELAY",
  "DAMAGE",
  "DOCUMENT",
  "PAYMENT",
  "OTHER",
] as const;
export type OrderDisputeCategory = (typeof ORDER_DISPUTE_CATEGORIES)[number];

/** Operational exception categories on Shipment workspace (`report_exception`). */
export const SHIPMENT_EXCEPTION_CATEGORIES = [
  "VESSEL_DELAY",
  "CUSTOMS_HOLD",
  "DOCUMENT_MISSING",
  "PORT_CONGESTION",
  "DELIVERY_DELAY",
  "OTHER",
] as const;
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
export const SHIPMENT_EXCEPTION_TO_ORDER_MIRROR: Record<
  ShipmentExceptionCategory,
  "none" | "suggest_dispute"
> = {
  VESSEL_DELAY: "none",
  CUSTOMS_HOLD: "none",
  DOCUMENT_MISSING: "none",
  PORT_CONGESTION: "none",
  DELIVERY_DELAY: "suggest_dispute",
  OTHER: "none",
};

/** Order dispute categories that may correlate with shipment operational issues. */
export const ORDER_DISPUTE_COMMERCIAL_CATEGORIES: OrderDisputeCategory[] = [
  "QUALITY",
  "PAYMENT",
  "DAMAGE",
];

export function shouldSuggestOrderDispute(category: ShipmentExceptionCategory): boolean {
  return SHIPMENT_EXCEPTION_TO_ORDER_MIRROR[category] === "suggest_dispute";
}
