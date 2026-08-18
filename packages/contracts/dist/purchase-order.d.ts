export { PURCHASE_ORDER_FSM_STATES, canonicalizePurchaseOrderStatus, canTransitionPoStatus, assertCanTransitionPoStatus, PO_FSM_TRANSITIONS, PO_CLOSE_ALLOWED_FROM, PO_CANCEL_ALLOWED_FROM, PO_AMENDMENT_ALLOWED_FROM, PO_ACKNOWLEDGE_ALLOWED_FROM, PO_TIMELINE_EVENTS, canonicalizePoTimelineEvent, isTerminalPoStatus, isDraftPoStatus, type PurchaseOrderFsmState, type PoTimelineEvent, } from "./purchase-order.fsm";
/** Canonical PO lifecycle statuses (PRR-01 FSM). */
export declare const PurchaseOrderStatus: readonly ["DRAFT", "SUBMITTED", "APPROVED", "IN_EXECUTION", "COMPLETED", "CLOSED", "CANCELLED"];
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[number];
/** @deprecated Legacy statuses — use canonicalizePurchaseOrderStatus(). */
export declare const LEGACY_PURCHASE_ORDER_STATUS_VALUES: readonly ["ISSUED", "ACKNOWLEDGED", "AMENDMENT_REQUESTED", "AMENDED"];
export type LegacyPurchaseOrderStatusValue = (typeof LEGACY_PURCHASE_ORDER_STATUS_VALUES)[number];
export declare const AcknowledgementStatus: readonly ["PENDING", "ACCEPTED", "REJECTED"];
export type AcknowledgementStatus = (typeof AcknowledgementStatus)[number];
export declare const AmendmentStatus: readonly ["OPEN", "APPROVED", "DECLINED"];
export type AmendmentStatus = (typeof AmendmentStatus)[number];
/** Canonical Purchase Order entry-path sources (Sprint 27 + 36A). */
export declare const PURCHASE_ORDER_SOURCES: readonly ["RFQ", "DIRECT", "REORDER", "API", "LEGACY", "COMMODITY_BID"];
export type PurchaseOrderSource = (typeof PURCHASE_ORDER_SOURCES)[number];
/** @deprecated Use PURCHASE_ORDER_SOURCES / PurchaseOrderSource. Kept as alias for gradual migration. */
export declare const PoSource: readonly ["RFQ", "DIRECT", "REORDER", "API", "LEGACY", "COMMODITY_BID"];
export type PoSource = PurchaseOrderSource;
export declare const PURCHASE_ORDER_SOURCE_LABELS: Record<PurchaseOrderSource, string>;
/**
 * Normalize legacy DB / API values into canonical uppercase sources.
 * Unknown values map to LEGACY (never throw — safe for DTO serialization).
 */
export declare function canonicalizePurchaseOrderSource(raw: string | null | undefined): PurchaseOrderSource;
/** Order Workspace origin — how the operational workspace started (≠ PO source). */
export declare const ORDER_WORKSPACE_ORIGINS: readonly ["RFQ", "DIRECT_PO", "REORDER", "API", "LEGACY", "COMMODITY_BID"];
export type OrderWorkspaceOrigin = (typeof ORDER_WORKSPACE_ORIGINS)[number];
export declare function canonicalizeOrderWorkspaceOrigin(raw: string | null | undefined): OrderWorkspaceOrigin;
export declare const PoAction: readonly ["issue_po", "submit_po", "approve_po", "start_execution", "complete_po", "acknowledge_po", "request_amendment", "approve_amendment", "reject_amendment", "close_po", "cancel_po"];
export type PoAction = (typeof PoAction)[number];
export interface PurchaseOrderLine {
    id: string;
    purchaseOrderId: string;
    sku: string | null;
    description: string;
    quantity: number;
    /** Null when the commercial line has no unit price (Direct PO optional pricing). */
    unitPrice: number | null;
    /** Null when unit price is absent — do not treat as zero. */
    lineTotal: number | null;
    createdAt: string;
    /** Sprint 28-02 additive — structured Direct PO fields when available. */
    productName?: string | null;
    productCode?: string | null;
    specification?: string | null;
    packaging?: string | null;
    unit?: string | null;
    /** Sprint 36B — optional Product Master reference (snapshot fields above remain authoritative). */
    productId?: string | null;
}
export interface PurchaseOrderDocument {
    id: string;
    fileName: string;
    documentUrl: string;
    mimeType?: string | null;
    uploadedAt?: string | null;
}
/** Actor enrichment for revision history (no Prisma User relation on revision row). */
export interface PurchaseOrderRevisionActor {
    id: string;
    name: string;
}
/**
 * Structured product line inside a revision snapshot.
 * Snapshots do not preserve PurchaseOrderLine UUIDs — see Sprint 29-01.
 */
export interface RevisionSnapshotLine {
    sku?: string | null;
    description?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    lineTotal?: number | null;
    productName?: string | null;
    productCode?: string | null;
    specification?: string | null;
    packaging?: string | null;
    unit?: string | null;
}
/**
 * Typed commercial snapshot stored in PurchaseOrderRevision.snapshotJson.
 * Writers historically nest Direct PO extras under header (and sometimes top-level).
 */
export interface PurchaseOrderRevisionSnapshot {
    header: {
        poNumber?: string | null;
        currency?: string | null;
        incoterm?: string | null;
        paymentTerms?: string | null;
        deliveryTerms?: string | null;
        status?: string | null;
        source?: string | null;
        expectedDeliveryDate?: string | null;
        buyerReference?: string | null;
        destinationCountryCode?: string | null;
        destinationCountry?: string | null;
        destinationPort?: string | null;
        notes?: string | null;
        parentPurchaseOrderId?: string | null;
        /** Direct PO structured lines when stored on header (create path). */
        directLines?: RevisionSnapshotLine[];
    };
    lines: RevisionSnapshotLine[];
    /** Alternate location for Direct structured lines (defensive readers). */
    directLines?: RevisionSnapshotLine[];
}
export interface PurchaseOrderRevision {
    id: string;
    purchaseOrderId: string;
    revisionNumber: number;
    createdById: string;
    reason: string;
    snapshotJson: Record<string, unknown>;
    createdAt: string;
    /** Sprint 29-01 — enriched display actor (optional for backward compatibility). */
    createdBy?: PurchaseOrderRevisionActor | null;
    /**
     * Sprint 29-01 — derived: highest revisionNumber on the PO.
     * Not persisted; computed in mapper / client.
     */
    isCurrent?: boolean;
}
/** Highest revisionNumber wins — no DB isCurrent column. */
export declare function resolveCurrentRevisionNumber(revisions: ReadonlyArray<{
    revisionNumber: number;
}>): number | null;
/**
 * Best-effort parse of revision snapshotJson into a typed snapshot.
 * Never throws — missing / malformed sections become empty defaults.
 */
export declare function parsePurchaseOrderRevisionSnapshot(raw: unknown): PurchaseOrderRevisionSnapshot;
export interface PurchaseOrderAcknowledgement {
    id: string;
    purchaseOrderId: string;
    supplierUserId: string;
    status: AcknowledgementStatus;
    notes: string | null;
    createdAt: string;
}
export interface PurchaseOrderAmendment {
    id: string;
    purchaseOrderId: string;
    requestedById: string;
    reason: string;
    status: AmendmentStatus;
    createdAt: string;
}
export interface PurchaseOrder {
    id: string;
    orderId: string;
    orderRef: string | null;
    poNumber: string;
    buyerId: string;
    supplierId: string;
    buyerName?: string | null;
    supplierName?: string | null;
    buyerEmail?: string | null;
    supplierEmail?: string | null;
    /** Sprint 28-02 additive party enrichment. */
    buyerContactName?: string | null;
    supplierContactName?: string | null;
    supplierCountry?: string | null;
    currency: string;
    incoterm: string | null;
    paymentTerms: string | null;
    deliveryTerms: string | null;
    status: PurchaseOrderStatus;
    source: PurchaseOrderSource;
    /** PRR-01 optimistic lock — increments on every mutating write. */
    version: number;
    documentUrl: string | null;
    documentFileName: string | null;
    issuedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    /** Sprint 28-02 additive commercial / dual-entry context (optional). */
    buyerReference?: string | null;
    notes?: string | null;
    expectedDeliveryDate?: string | null;
    destinationCountry?: string | null;
    destinationPort?: string | null;
    /** Present for RFQ-origin when parent RFQ workspace is known. */
    rfqWorkspaceId?: string | null;
    /** Present for CommodityBid-origin when parent CB workspace is known (Sprint 36A). */
    commodityBidWorkspaceId?: string | null;
    /** Present for REORDER when parent PO id is known. */
    parentPurchaseOrderId?: string | null;
    documents?: PurchaseOrderDocument[];
}
export interface PurchaseOrderSummary {
    purchaseOrder: PurchaseOrder;
    lines: PurchaseOrderLine[];
    revisions: PurchaseOrderRevision[];
    acknowledgements: PurchaseOrderAcknowledgement[];
    amendments: PurchaseOrderAmendment[];
    pendingAcknowledgement: boolean;
    openAmendments: number;
}
export type PurchaseOrderPricingState = "COMPLETE" | "PARTIAL" | "UNPRICED";
export type PurchaseOrderSortField = "issuedAt" | "createdAt" | "poNumber" | "expectedDeliveryDate" | "supplier" | "status" | "total";
export interface PurchaseOrderListItem {
    id: string;
    orderId: string | null;
    orderRef?: string | null;
    poNumber: string;
    source: PurchaseOrderSource;
    status: PurchaseOrderStatus;
    supplier: {
        id: string;
        companyName: string;
        supplierCode?: string | null;
        country?: string | null;
    };
    buyer?: {
        id: string;
        companyName: string;
    } | null;
    currency: string;
    totalAmount: number | null;
    pricingState: PurchaseOrderPricingState;
    lineCount: number;
    issuedAt: string | null;
    expectedDeliveryDate?: string | null;
    createdAt: string;
    updatedAt: string;
    buyerReference?: string | null;
    rfqId?: string | null;
    parentPurchaseOrderId?: string | null;
    pendingAcknowledgement?: boolean;
    openAmendments?: number;
}
export interface PurchaseOrderListPagination {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
export interface PurchaseOrderListResponse {
    items: PurchaseOrderListItem[];
    pagination: PurchaseOrderListPagination;
}
export interface PoDashboardCurrencyValue {
    currency: string;
    openTotal: number;
    closedTotal: number;
}
export interface PoDashboardMetrics {
    openPoCount: number;
    acknowledgementPending: number;
    amendmentsOpen: number;
    /** @deprecated Mixed-currency sum — prefer valueByCurrency. Kept for backward compatibility. */
    poValueOpen: number;
    /** @deprecated Mixed-currency sum — prefer valueByCurrency. */
    closedPoValue: number;
    bySource?: Record<PurchaseOrderSource, number>;
    /** Sprint 28-03 additive status totals. */
    totals?: {
        all: number;
        draft: number;
        issued: number;
        acknowledged: number;
        amendmentRequested: number;
        amended: number;
        closed: number;
        cancelled: number;
    };
    operational?: {
        active: number;
        awaitingAcknowledgement: number;
        expectedWithin30Days: number;
    };
    /** Monetary totals grouped by currency — never mix currencies. */
    valueByCurrency?: PoDashboardCurrencyValue[];
    recent?: PurchaseOrderListItem[];
}
