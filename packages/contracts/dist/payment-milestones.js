// Faz 3 — Payment milestones and financial gates
export const PAYMENT_MILESTONE_KINDS = [
    "DEPOSIT_REQUIRED",
    "DEPOSIT_PAID",
    "PRODUCTION_PAYMENT_REQUIRED",
    "BALANCE_REQUIRED",
    "BALANCE_PAID",
    "PAYMENT_OVERDUE",
    "PAYMENT_DISPUTED",
    "PAYMENT_CONFIRMED",
];
export const PAYMENT_PLAN_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
export const PAYMENT_HOLD_REASONS = [
    "DEPOSIT_UNPAID",
    "BALANCE_UNPAID",
    "PAYMENT_DISPUTE",
    "MANUAL_HOLD",
];
/** Order actions gated by payment milestones when PAYMENT_GATES_ENABLED. */
export const PAYMENT_GATED_ORDER_ACTIONS = {
    start_production: "DEPOSIT_PAID",
    book_shipment: "DEPOSIT_PAID",
    mark_delivered: "BALANCE_PAID",
};
