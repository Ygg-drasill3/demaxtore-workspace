// =============================================================================
// @dmx/contracts — Turkey Importer customer-facing stage normalization
// =============================================================================
// PRESENTATION LAYER ONLY. Maps detailed backend FSM / customs / inland states
// into a small, understandable customer lifecycle. Backend state machines are
// NOT changed and remain the source of truth. This helper derives from real
// state — it never invents a stage.

export const CUSTOMER_IMPORT_STAGES = [
  "Preparing",
  "Freight",
  "Booking",
  "In Transit",
  "Customs",
  "Delivery",
  "Completed",
] as const;

export type CustomerImportStage = (typeof CUSTOMER_IMPORT_STAGES)[number];

export interface CustomerStageInput {
  /** Shipment FSM state (e.g. IN_TRANSIT, ARRIVED_DESTINATION_PORT, EXCEPTION). */
  shipmentState?: string | null;
  /** Customs case status (e.g. OPEN, IN_PROGRESS, CLEARED, CANCELLED). */
  customsStatus?: string | null;
  /** Inland delivery status (e.g. READY_FOR_PICKUP, IN_TRANSIT, DELIVERED). */
  inlandStatus?: string | null;
  /** Freight/booking hint when no shipment exists yet. */
  freightStatus?: string | null;
  /** Whether an unresolved exception exists for the import. */
  hasOpenException?: boolean | null;
}

export interface CustomerStageResult {
  stage: CustomerImportStage;
  /** Zero-based index within CUSTOMER_IMPORT_STAGES for progress bars. */
  index: number;
  /** True when the import needs customer attention (overlay badge). */
  actionRequired: boolean;
}

const norm = (v?: string | null) => (v ?? "").toUpperCase();

const IN_TRANSIT_STATES = new Set([
  "LOADED_ON_VESSEL",
  "DEPARTED_ORIGIN_PORT",
  "IN_TRANSIT",
  "DEPARTED",
]);

const BOOKING_STATES = new Set([
  "SELECTED",
  "BOOKING_PENDING",
  "BOOKING_CONFIRMED",
  "BOOKED",
]);

const FREIGHT_STATES = new Set([
  "REQUESTED",
  "QUOTE_REQUESTED",
  "OFFER_PENDING",
  "OFFER_AVAILABLE",
]);

/** Derive the customer-facing lifecycle stage from real backend state. */
export function toCustomerStage(input: CustomerStageInput): CustomerStageResult {
  const shipment = norm(input.shipmentState);
  const customs = norm(input.customsStatus);
  const inland = norm(input.inlandStatus);
  const freight = norm(input.freightStatus);
  const actionRequired = !!input.hasOpenException || shipment === "EXCEPTION";

  const result = (stage: CustomerImportStage): CustomerStageResult => ({
    stage,
    index: CUSTOMER_IMPORT_STAGES.indexOf(stage),
    actionRequired,
  });

  // Completed
  if (inland === "DELIVERED" || shipment === "COMPLETED" || shipment === "DELIVERED") {
    return result("Completed");
  }
  // Delivery (customs cleared → pickup → inland)
  if (
    (inland && inland !== "CANCELLED") ||
    customs === "CLEARED" ||
    shipment === "READY_FOR_DELIVERY" ||
    shipment === "READY_FOR_PICKUP"
  ) {
    return result("Delivery");
  }
  // Customs
  if (
    (customs && customs !== "CANCELLED") ||
    shipment === "ARRIVED_DESTINATION_PORT" ||
    shipment === "ARRIVED"
  ) {
    return result("Customs");
  }
  // In transit
  if (IN_TRANSIT_STATES.has(shipment)) {
    return result("In Transit");
  }
  // Booking
  if (BOOKING_STATES.has(shipment) || BOOKING_STATES.has(freight)) {
    return result("Booking");
  }
  // Freight
  if (FREIGHT_STATES.has(shipment) || FREIGHT_STATES.has(freight)) {
    return result("Freight");
  }
  // Default — preparing (PO / draft / cargo readiness)
  return result("Preparing");
}

/** Overall customer status label (stage + attention overlay). */
export function customerStatusLabel(input: CustomerStageInput): string {
  const { stage, actionRequired } = toCustomerStage(input);
  return actionRequired ? "Action Required" : stage;
}
