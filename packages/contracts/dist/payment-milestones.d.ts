export declare const PAYMENT_MILESTONE_KINDS: readonly ["DEPOSIT_REQUIRED", "DEPOSIT_PAID", "PRODUCTION_PAYMENT_REQUIRED", "BALANCE_REQUIRED", "BALANCE_PAID", "PAYMENT_OVERDUE", "PAYMENT_DISPUTED", "PAYMENT_CONFIRMED"];
export type PaymentMilestoneKind = (typeof PAYMENT_MILESTONE_KINDS)[number];
export declare const PAYMENT_PLAN_STATUSES: readonly ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
export type PaymentPlanStatus = (typeof PAYMENT_PLAN_STATUSES)[number];
export declare const PAYMENT_HOLD_REASONS: readonly ["DEPOSIT_UNPAID", "BALANCE_UNPAID", "PAYMENT_DISPUTE", "MANUAL_HOLD"];
export type PaymentHoldReason = (typeof PAYMENT_HOLD_REASONS)[number];
/** Order actions gated by payment milestones when PAYMENT_GATES_ENABLED. */
export declare const PAYMENT_GATED_ORDER_ACTIONS: Partial<Record<string, PaymentMilestoneKind>>;
export interface PaymentMilestoneDto {
    id: string;
    kind: PaymentMilestoneKind;
    status: "PENDING" | "SATISFIED" | "OVERDUE" | "WAIVED";
    amount: number | null;
    currency: string;
    dueAt: string | null;
    paidAt: string | null;
}
export interface PaymentPlanDto {
    orderId: string;
    status: PaymentPlanStatus;
    milestones: PaymentMilestoneDto[];
    holds: Array<{
        reason: PaymentHoldReason;
        active: boolean;
    }>;
    financialStatus: "CLEAR" | "HOLD" | "OVERDUE" | "DISPUTED";
}
