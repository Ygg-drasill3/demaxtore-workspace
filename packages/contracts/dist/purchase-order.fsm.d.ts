/** Canonical lifecycle states (PRR-01). */
export declare const PURCHASE_ORDER_FSM_STATES: readonly ["DRAFT", "SUBMITTED", "APPROVED", "IN_EXECUTION", "COMPLETED", "CLOSED", "CANCELLED"];
export type PurchaseOrderFsmState = (typeof PURCHASE_ORDER_FSM_STATES)[number];
/** Legacy statuses still present in older rows / clients. */
export declare const LEGACY_PURCHASE_ORDER_STATUSES: readonly ["ISSUED", "ACKNOWLEDGED", "AMENDMENT_REQUESTED", "AMENDED"];
export type LegacyPurchaseOrderStatus = (typeof LEGACY_PURCHASE_ORDER_STATUSES)[number];
/**
 * Normalize any stored / inbound status into a canonical FSM state.
 * Unknown values default to SUBMITTED (safe operational default — never throws).
 */
export declare function canonicalizePurchaseOrderStatus(raw: string | null | undefined): PurchaseOrderFsmState;
/** Allowed next states from each state. */
export declare const PO_FSM_TRANSITIONS: Record<PurchaseOrderFsmState, readonly PurchaseOrderFsmState[]>;
export declare function canTransitionPoStatus(from: string | null | undefined, to: string | null | undefined): boolean;
export declare function assertCanTransitionPoStatus(from: string | null | undefined, to: string | null | undefined): void;
export declare const PO_CLOSE_ALLOWED_FROM: readonly PurchaseOrderFsmState[];
export declare const PO_CANCEL_ALLOWED_FROM: readonly PurchaseOrderFsmState[];
export declare const PO_AMENDMENT_ALLOWED_FROM: readonly PurchaseOrderFsmState[];
export declare const PO_ACKNOWLEDGE_ALLOWED_FROM: readonly PurchaseOrderFsmState[];
export declare const PO_SUBMIT_ALLOWED_FROM: readonly PurchaseOrderFsmState[];
export declare const PO_APPROVE_ALLOWED_FROM: readonly PurchaseOrderFsmState[];
export declare const PO_START_EXECUTION_ALLOWED_FROM: readonly PurchaseOrderFsmState[];
export declare const PO_COMPLETE_ALLOWED_FROM: readonly PurchaseOrderFsmState[];
export declare const PO_DRAFT_EDIT_ALLOWED_FROM: readonly PurchaseOrderFsmState[];
export declare function isTerminalPoStatus(status: string | null | undefined): boolean;
export declare function isDraftPoStatus(status: string | null | undefined): boolean;
export declare function isActivePoStatus(status: string | null | undefined): boolean;
/** Standardized timeline / audit event names (new writes only). */
export declare const PO_TIMELINE_EVENTS: readonly ["po.created", "po.updated", "po.submitted", "po.approved", "po.revised", "po.cancelled", "po.completed", "po.closed", "po.acknowledged", "po.amendment.requested", "po.amendment.approved", "po.amendment.rejected", "po.document.uploaded", "po.document.replaced", "po.document.deleted"];
export type PoTimelineEvent = (typeof PO_TIMELINE_EVENTS)[number];
/** Map legacy timeline event types to canonical po.* names for readers. */
export declare function canonicalizePoTimelineEvent(raw: string | null | undefined): string;
