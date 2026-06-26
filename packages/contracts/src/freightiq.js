// =============================================================================
// Sprint 5A — FreightIQ (freight coordination layer; not a marketplace)
// =============================================================================
export const FreightMode = ["OCEAN_FCL", "OCEAN_LCL", "ROAD", "RAIL", "AIR"];
export const FreightStatus = [
    "REQUESTED",
    "QUOTING",
    "QUOTED",
    "SELECTED",
    "EXPIRED",
    "CANCELLED",
    "CONVERTED_TO_SHIPMENT",
];
export const FreightOfferStatus = ["ACTIVE", "REVISED", "WITHDRAWN", "EXPIRED", "SELECTED"];
export const FreightAction = [
    "create_request",
    "submit_offer",
    "revise_offer",
    "withdraw_offer",
    "select_offer",
    "cancel_request",
];
/** Order states where FreightIQ request creation is allowed (no Order FSM edits). */
export const FREIGHTIQ_ORDER_ELIGIBLE_STATES = [
    "PRODUCTION_COMPLETED",
    "INSPECTION_COMPLETED",
    "FREIGHT_REQUESTED",
];
/** Order states where freight intake must not run (even for admin). */
export const FREIGHTIQ_ORDER_TERMINAL_STATES = ["CLOSED", "CANCELLED", "DISPUTED", "REJECTED"];
/** Buyer/supplier vs admin eligibility for opening a freight request. */
export function isFreightIntakeEligible(state, role = "BUYER") {
    if (FREIGHTIQ_ORDER_TERMINAL_STATES.includes(state))
        return false;
    if (role === "ADMIN" || role === "SYSTEM" || role === "SALES_CONTROL")
        return true;
    return FREIGHTIQ_ORDER_ELIGIBLE_STATES.includes(state);
}
//# sourceMappingURL=freightiq.js.map