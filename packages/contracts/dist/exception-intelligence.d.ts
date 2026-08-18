/**
 * Sprint 34 — Exception Intelligence 2.0
 * Deterministic EVENT → RULE → IMPACT → SEVERITY → OWNER → ACTION.
 * Persists via OperationalIssue + OperationalTask (no new exception entity).
 */
import type { OperationalIssueSeverity } from "./operational-issue";
export declare const EXCEPTION_IMPACT_TYPES: readonly ["DELIVERY_RISK", "BOOKING_RISK", "SHIPMENT_DELAY", "DOCUMENT_RISK", "INSPECTION_RISK", "MILESTONE_RISK", "EXECUTION_RISK", "CUSTOMS_RISK", "INLAND_EXECUTION_RISK", "LANDED_COST_RISK"];
export type ExceptionImpactType = (typeof EXCEPTION_IMPACT_TYPES)[number];
export declare const EXCEPTION_OWNER_ROLES: readonly ["OPERATIONS", "DOCUMENTATION", "PROCUREMENT", "CUSTOMER", "SUPPLIER", "ORIGIN_AGENT"];
/** Role queue for Exception Intelligence (distinct from Exception Hub owner roles). */
export type ExceptionIntelligenceOwnerRole = (typeof EXCEPTION_OWNER_ROLES)[number];
/** Canonical event types consumed by the rule pack (map to existing emitters). */
export declare const EXCEPTION_EVENT_TYPES: readonly ["ETA_CHANGED", "BOOKING_CUTOFF_CHANGED", "BOOKING_STALLED", "DOCUMENT_MISSING", "DOCUMENT_REJECTED", "INSPECTION_FAILED", "MILESTONE_OVERDUE", "CUSTOMS_BROKER_MISSING", "CUSTOMS_ORIGIN_MISSING", "CUSTOMS_CLASSIFICATION_MISSING", "CUSTOMS_HOLD", "CUSTOMS_CLEARANCE_DELAY", "CUSTOMS_PREPARATION_AT_RISK", "CUSTOMS_BROKER_REVIEW_PENDING", "CUSTOMS_ARRIVAL_NOT_READY"];
export type ExceptionEventType = (typeof EXCEPTION_EVENT_TYPES)[number];
export declare const EXCEPTION_RULE_IDS: readonly ["RULE_ETA_DELIVERY_RISK", "RULE_BOOKING_CUTOFF_RISK", "RULE_BOOKING_STALLED", "RULE_DOCUMENT_MISSING", "RULE_DOCUMENT_REJECTED", "RULE_INSPECTION_FAILED", "RULE_MILESTONE_OVERDUE", "RULE_CUSTOMS_BROKER_MISSING", "RULE_CUSTOMS_ORIGIN_MISSING", "RULE_CUSTOMS_CLASSIFICATION_MISSING", "RULE_CUSTOMS_HOLD", "RULE_CUSTOMS_CLEARANCE_DELAY", "RULE_CUSTOMS_PREPARATION_AT_RISK", "RULE_CUSTOMS_BROKER_REVIEW_PENDING", "RULE_CUSTOMS_ARRIVAL_NOT_READY"];
export type ExceptionRuleId = (typeof EXCEPTION_RULE_IDS)[number];
export interface ExceptionRuleOutcome {
    ruleId: ExceptionRuleId;
    eventType: ExceptionEventType;
    impactType: ExceptionImpactType;
    severity: OperationalIssueSeverity;
    ownerRole: ExceptionIntelligenceOwnerRole;
    recommendedAction: string;
    createTask: boolean;
    /** When false, evaluator should not open an issue (informational). */
    raiseException: boolean;
    title: string;
    description: string;
}
/** Booking pending threshold (ms) — aligns with AlertEngine-style ops constants. */
export declare const BOOKING_STALLED_THRESHOLD_MS: number;
/** ETA shift below this (hours) is informational unless delivery date is at risk. */
export declare const ETA_INFORMATIONAL_MAX_HOURS = 24;
export declare function mapImpactToIssueCategory(impact: ExceptionImpactType): "SHIPMENT_DELAY" | "BOOKING_FAILURE" | "DOCUMENT_MISSING" | "INSPECTION_FAILURE" | "OTHER";
export declare function evaluateCustomsBrokerMissing(missing: boolean): ExceptionRuleOutcome | null;
export declare function evaluateCustomsOriginMissing(missing: boolean): ExceptionRuleOutcome | null;
export declare function evaluateCustomsClassificationMissing(missing: boolean): ExceptionRuleOutcome | null;
export declare function evaluateCustomsHold(onHold: boolean): ExceptionRuleOutcome | null;
export declare function evaluateCustomsDocumentMissing(input: {
    documentType: string;
    missing: boolean;
}): ExceptionRuleOutcome | null;
export declare function evaluateCustomsClearanceDelay(input: {
    daysSinceArrival: number;
    thresholdDays: number;
    cleared: boolean;
}): ExceptionRuleOutcome | null;
/** Sprint 38 — near-arrival incomplete readiness (time-aware). */
export declare function evaluateCustomsPreparationAtRisk(input: {
    active: boolean;
    daysToArrival: number | null;
    severity: OperationalIssueSeverity;
}): ExceptionRuleOutcome | null;
export declare function evaluateCustomsBrokerReviewPending(input: {
    pending: boolean;
}): ExceptionRuleOutcome | null;
export declare function evaluateCustomsArrivalNotReady(input: {
    arrivedNotReady: boolean;
}): ExceptionRuleOutcome | null;
/** Evaluate ETA delivery risk from shift hours + optional required/expected delivery date. */
export declare function evaluateEtaDeliveryRisk(input: {
    etaShiftHours: number;
    currentEta: Date | string | null;
    expectedDeliveryDate: Date | string | null;
}): ExceptionRuleOutcome | null;
export declare function evaluateBookingStalled(input: {
    bookingStatus: string | null;
    bookingRequestedAt: Date | string | null;
    now?: Date;
}): ExceptionRuleOutcome | null;
export declare function evaluateBookingCutoffRisk(input: {
    cargoReadyDate: Date | string | null;
    siCutoff: Date | string | null;
    cyCutoff: Date | string | null;
    now?: Date;
}): ExceptionRuleOutcome | null;
export declare function evaluateDocumentMissing(input: {
    documentType: string;
    overdueHours?: number;
}): ExceptionRuleOutcome;
export declare function evaluateDocumentRejected(input: {
    documentType: string;
}): ExceptionRuleOutcome;
export declare function evaluateInspectionFailed(): ExceptionRuleOutcome;
export declare function evaluateMilestoneOverdue(input: {
    milestoneType: string;
    label?: string;
}): ExceptionRuleOutcome;
