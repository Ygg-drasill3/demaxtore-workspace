/** Per RFQ line item — sourcing / award lifecycle. */
export type RfqLineAwardStatus = "OPEN" | "AWARDED" | "NO_AWARD" | "CANCELLED";
/** Buyer-facing aggregate award phase (maps to workspace.state after RFQ_OPEN). */
export type RfqAwardAggregateState = "OPEN" | "PARTIALLY_AWARDED" | "FULLY_AWARDED";
export interface RfqLineAwardSnapshot {
    rfqLineItemId: string;
    status: RfqLineAwardStatus;
}
/** Active line award row (persisted as RfqLineAward with status ACTIVE). */
export interface RfqLineAwardRecord {
    rfqLineItemId: string;
    quotationId: string;
    supplierUserId: string;
    awardedAt: string;
    rationale?: string | null;
}
export interface RfqLineAwardContext {
    lines: RfqLineAwardSnapshot[];
    /** Supplier user ids with at least one AWARDED line not yet on a PO. */
    suppliersPendingPo?: string[];
}
export declare function isLineAwardTerminal(status: RfqLineAwardStatus): boolean;
/** Derive aggregate award state from line item statuses. */
export declare function computeRfqAwardAggregateState(lines: RfqLineAwardSnapshot[]): RfqAwardAggregateState;
export declare function countLinesByStatus(lines: RfqLineAwardSnapshot[]): Record<RfqLineAwardStatus, number>;
/** Lines that may still receive supplier quotations. */
export declare function openLineItemIds(lines: RfqLineAwardSnapshot[]): string[];
/** Map workspace FSM state ↔ aggregate award label for UI badges. */
export declare function rfqAwardAggregateFromWorkspaceState(workspaceState: string, lines: RfqLineAwardSnapshot[]): RfqAwardAggregateState;
