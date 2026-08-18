export type MixedContainerState = "MC_DRAFT" | "MC_BUILDING" | "MC_PRICING_REQUESTED" | "MC_PROCUREMENT_IN_PROGRESS" | "MC_OFFER_READY" | "MC_BUYER_REVIEW" | "MC_APPROVED" | "MC_ALLOCATION_IN_PROGRESS" | "MC_PROFORMA_PENDING" | "MC_PAYMENT_TRACKING" | "MC_EXECUTION_READY" | "MC_EXECUTION_ACTIVE" | "MC_EXECUTION_COMPLETE" | "MC_REVISION_REQUESTED" | "MC_EXPIRED" | "MC_CANCELLED";
export type MixedContainerAction = "create_container" | "edit_container" | "add_product" | "update_product_quantity" | "remove_product" | "request_live_pricing" | "cancel_container" | "start_procurement" | "assign_buyer_manager" | "create_offer" | "send_offer" | "approve_offer" | "request_revision" | "expire_offer" | "regenerate_offer" | "resume_procurement" | "begin_organization" | "start_allocation" | "create_allocation" | "complete_allocations" | "upload_proforma" | "begin_payment_tracking" | "record_payment_sent" | "confirm_payment" | "mark_execution_ready" | "spawn_execution_orders" | "mark_execution_complete";
export type McActorRole = "BUYER" | "ADMIN" | "SYSTEM";
export interface MixedContainerTransition {
    from: MixedContainerState | "*";
    to: MixedContainerState;
    action: MixedContainerAction;
    allowedRoles: McActorRole[];
    auditEvent: string;
}
export declare const MC_TRANSITIONS: MixedContainerTransition[];
export declare const MC_TERMINAL_STATES: MixedContainerState[];
export declare const MC_OFFER_VALIDITY_HOURS = 72;
export declare const MC_CONTAINER_CAPACITIES: Record<string, number>;
export declare function findMcTransition(from: MixedContainerState, action: MixedContainerAction): MixedContainerTransition | undefined;
export declare function isMcTerminal(state: MixedContainerState): boolean;
