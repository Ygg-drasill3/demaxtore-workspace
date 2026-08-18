// =============================================================================
// Sprint 5D — Purchase Order management (not accounting / ERP / payments)
// Sprint 27 — Dual-entry source taxonomy (RFQ | DIRECT | …)
// PRR-01 — Formal FSM lifecycle statuses
// =============================================================================
export { PURCHASE_ORDER_FSM_STATES, canonicalizePurchaseOrderStatus, canTransitionPoStatus, assertCanTransitionPoStatus, PO_FSM_TRANSITIONS, PO_CLOSE_ALLOWED_FROM, PO_CANCEL_ALLOWED_FROM, PO_AMENDMENT_ALLOWED_FROM, PO_ACKNOWLEDGE_ALLOWED_FROM, PO_TIMELINE_EVENTS, canonicalizePoTimelineEvent, isTerminalPoStatus, isDraftPoStatus, } from "./purchase-order.fsm.js";
/** Canonical PO lifecycle statuses (PRR-01 FSM). */
export const PurchaseOrderStatus = [
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
    "IN_EXECUTION",
    "COMPLETED",
    "CLOSED",
    "CANCELLED",
];
/** @deprecated Legacy statuses — use canonicalizePurchaseOrderStatus(). */
export const LEGACY_PURCHASE_ORDER_STATUS_VALUES = [
    "ISSUED",
    "ACKNOWLEDGED",
    "AMENDMENT_REQUESTED",
    "AMENDED",
];
export const AcknowledgementStatus = ["PENDING", "ACCEPTED", "REJECTED"];
export const AmendmentStatus = ["OPEN", "APPROVED", "DECLINED"];
/** Canonical Purchase Order entry-path sources (Sprint 27 + 36A). */
export const PURCHASE_ORDER_SOURCES = [
    "RFQ",
    "DIRECT",
    "REORDER",
    "API",
    "LEGACY",
    "COMMODITY_BID",
];
/** @deprecated Use PURCHASE_ORDER_SOURCES / PurchaseOrderSource. Kept as alias for gradual migration. */
export const PoSource = PURCHASE_ORDER_SOURCES;
export const PURCHASE_ORDER_SOURCE_LABELS = {
    RFQ: "RFQ",
    DIRECT: "Direct purchase",
    REORDER: "Reorder",
    API: "API",
    LEGACY: "Legacy",
    COMMODITY_BID: "CommodityBid",
};
/**
 * Normalize legacy DB / API values into canonical uppercase sources.
 * Unknown values map to LEGACY (never throw — safe for DTO serialization).
 */
export function canonicalizePurchaseOrderSource(raw) {
    if (raw == null || String(raw).trim() === "")
        return "LEGACY";
    const v = String(raw).trim().toUpperCase();
    if (v === "AUTO" || v === "RFQ")
        return "RFQ";
    if (v === "MANUAL" || v === "DIRECT")
        return "DIRECT";
    if (v === "REORDER")
        return "REORDER";
    if (v === "API")
        return "API";
    if (v === "LEGACY")
        return "LEGACY";
    if (v === "COMMODITY_BID" || v === "COMMODITYBID")
        return "COMMODITY_BID";
    // already-canonical lowercase variants handled by uppercasing above; leftover → LEGACY
    if (PURCHASE_ORDER_SOURCES.includes(v))
        return v;
    return "LEGACY";
}
/** Order Workspace origin — how the operational workspace started (≠ PO source). */
export const ORDER_WORKSPACE_ORIGINS = [
    "RFQ",
    "DIRECT_PO",
    "REORDER",
    "API",
    "LEGACY",
    "COMMODITY_BID",
];
export function canonicalizeOrderWorkspaceOrigin(raw) {
    if (raw == null || String(raw).trim() === "")
        return "LEGACY";
    const v = String(raw).trim().toUpperCase();
    if (v === "RFQ")
        return "RFQ";
    if (v === "DIRECT_PO" || v === "DIRECT")
        return "DIRECT_PO";
    if (v === "REORDER")
        return "REORDER";
    if (v === "API")
        return "API";
    if (v === "LEGACY")
        return "LEGACY";
    if (v === "COMMODITY_BID" || v === "COMMODITYBID")
        return "COMMODITY_BID";
    // Historical parentWorkspaceType values that are not dual-entry origins
    if (v === "MIXED_CONTAINER" || v === "BULK_CONTAINER")
        return "LEGACY";
    return "LEGACY";
}
export const PoAction = [
    "issue_po",
    "submit_po",
    "approve_po",
    "start_execution",
    "complete_po",
    "acknowledge_po",
    "request_amendment",
    "approve_amendment",
    "reject_amendment",
    "close_po",
    "cancel_po",
];
/** Highest revisionNumber wins — no DB isCurrent column. */
export function resolveCurrentRevisionNumber(revisions) {
    if (!revisions.length)
        return null;
    return Math.max(...revisions.map((r) => r.revisionNumber));
}
function asNullableString(v) {
    if (v == null)
        return null;
    if (typeof v === "string")
        return v;
    if (typeof v === "number" || typeof v === "boolean")
        return String(v);
    return null;
}
function asNullableNumber(v) {
    if (v == null || v === "")
        return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}
function parseSnapshotLine(raw) {
    const o = (raw && typeof raw === "object" ? raw : {});
    return {
        sku: asNullableString(o.sku),
        description: asNullableString(o.description),
        quantity: asNullableNumber(o.quantity),
        unitPrice: asNullableNumber(o.unitPrice),
        lineTotal: asNullableNumber(o.lineTotal),
        productName: asNullableString(o.productName),
        productCode: asNullableString(o.productCode),
        specification: asNullableString(o.specification),
        packaging: asNullableString(o.packaging),
        unit: asNullableString(o.unit),
    };
}
/**
 * Best-effort parse of revision snapshotJson into a typed snapshot.
 * Never throws — missing / malformed sections become empty defaults.
 */
export function parsePurchaseOrderRevisionSnapshot(raw) {
    const root = (raw && typeof raw === "object" ? raw : {});
    const headerRaw = (root.header && typeof root.header === "object"
        ? root.header
        : {});
    const linesRaw = Array.isArray(root.lines) ? root.lines : [];
    const headerDirect = Array.isArray(headerRaw.directLines) ? headerRaw.directLines : undefined;
    const rootDirect = Array.isArray(root.directLines) ? root.directLines : undefined;
    return {
        header: {
            poNumber: asNullableString(headerRaw.poNumber),
            currency: asNullableString(headerRaw.currency),
            incoterm: asNullableString(headerRaw.incoterm),
            paymentTerms: asNullableString(headerRaw.paymentTerms),
            deliveryTerms: asNullableString(headerRaw.deliveryTerms),
            status: asNullableString(headerRaw.status),
            source: asNullableString(headerRaw.source),
            expectedDeliveryDate: asNullableString(headerRaw.expectedDeliveryDate),
            buyerReference: asNullableString(headerRaw.buyerReference),
            destinationCountryCode: asNullableString(headerRaw.destinationCountryCode),
            destinationCountry: asNullableString(headerRaw.destinationCountry),
            destinationPort: asNullableString(headerRaw.destinationPort),
            notes: asNullableString(headerRaw.notes),
            parentPurchaseOrderId: asNullableString(headerRaw.parentPurchaseOrderId),
            directLines: headerDirect?.map(parseSnapshotLine),
        },
        lines: linesRaw.map(parseSnapshotLine),
        directLines: rootDirect?.map(parseSnapshotLine),
    };
}
