// =============================================================================
// Sprint 5D — Purchase Order management (not accounting / ERP / payments)
// =============================================================================
export const PurchaseOrderStatus = [
    "DRAFT",
    "ISSUED",
    "ACKNOWLEDGED",
    "AMENDMENT_REQUESTED",
    "AMENDED",
    "CLOSED",
    "CANCELLED",
];
export const AcknowledgementStatus = ["PENDING", "ACCEPTED", "REJECTED"];
export const AmendmentStatus = ["OPEN", "APPROVED", "DECLINED"];
export const PoSource = ["auto", "manual"];
export const PoAction = [
    "issue_po",
    "acknowledge_po",
    "request_amendment",
    "approve_amendment",
    "reject_amendment",
    "close_po",
    "cancel_po",
];
//# sourceMappingURL=purchase-order.js.map