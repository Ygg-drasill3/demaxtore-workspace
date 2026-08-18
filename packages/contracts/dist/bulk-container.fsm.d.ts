export type BulkContainerState = "BC_DRAFT" | "BC_BUILDING" | "BC_SUBMITTED" | "BC_PROCUREMENT_IN_PROGRESS" | "BC_OFFER_READY" | "BC_BUYER_REVIEW" | "BC_APPROVED" | "BC_REVISION_REQUESTED" | "BC_EXPIRED" | "BC_ALLOCATION_IN_PROGRESS" | "BC_PROFORMA_PENDING" | "BC_PAYMENT_TRACKING" | "BC_EXECUTION_READY" | "BC_EXECUTION_ACTIVE" | "BC_EXECUTION_COMPLETE" | "BC_CANCELLED";
export type BulkContainerAction = "create_container" | "edit_container" | "add_product" | "update_product_quantity" | "remove_product" | "submit_request" | "cancel_container" | "start_procurement" | "create_offer" | "send_offer" | "approve_offer" | "request_revision" | "expire_offer" | "regenerate_offer" | "resume_procurement" | "start_allocation" | "create_allocation" | "complete_allocations" | "upload_proforma" | "begin_payment_tracking" | "create_payment_record" | "confirm_payment" | "reject_payment" | "mark_execution_ready" | "spawn_execution_orders" | "mark_execution_complete";
export type BcActorRole = "BUYER" | "ADMIN" | "SYSTEM";
export interface BulkContainerTransition {
    from: BulkContainerState | "*";
    to: BulkContainerState;
    action: BulkContainerAction;
    allowedRoles: BcActorRole[];
    auditEvent: string;
}
export declare const BC_TRANSITIONS: BulkContainerTransition[];
export declare const BC_TERMINAL_STATES: BulkContainerState[];
export declare const BC_OFFER_VALIDITY_HOURS = 72;
/** Fixed 25 MT container capacity for Sprint 13B MVP */
export declare const BC_MAX_CAPACITY_MT = 25;
/** Below this threshold → partial container warning */
export declare const BC_PARTIAL_THRESHOLD_MT = 20;
export declare const BC_STATE_LABELS: Record<BulkContainerState, string>;
export declare function findBcTransition(from: BulkContainerState, action: BulkContainerAction): BulkContainerTransition | undefined;
export declare function isBcTerminal(state: BulkContainerState): boolean;
export type BcCapacityWarning = "partial_container" | "over_capacity";
export declare function computeBcCapacityWarnings(currentMt: number): BcCapacityWarning[];
export declare function isBcContainerFull(currentMt: number, maxMt?: number): boolean;
/** Throws when a line would exceed fixed container capacity or container is already full. */
export declare function assertBcLineFitsCapacity(currentMt: number, addMt: number, maxMt?: number): void;
