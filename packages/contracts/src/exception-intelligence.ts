/**
 * Sprint 34 — Exception Intelligence 2.0
 * Deterministic EVENT → RULE → IMPACT → SEVERITY → OWNER → ACTION.
 * Persists via OperationalIssue + OperationalTask (no new exception entity).
 */

import type { OperationalIssueSeverity } from "./operational-issue";

export const EXCEPTION_IMPACT_TYPES = [
  "DELIVERY_RISK",
  "BOOKING_RISK",
  "SHIPMENT_DELAY",
  "DOCUMENT_RISK",
  "INSPECTION_RISK",
  "MILESTONE_RISK",
  "EXECUTION_RISK",
  "CUSTOMS_RISK",
  "INLAND_EXECUTION_RISK",
  "LANDED_COST_RISK",
] as const;
export type ExceptionImpactType = (typeof EXCEPTION_IMPACT_TYPES)[number];

export const EXCEPTION_OWNER_ROLES = [
  "OPERATIONS",
  "DOCUMENTATION",
  "PROCUREMENT",
  "CUSTOMER",
  "SUPPLIER",
  "ORIGIN_AGENT",
] as const;
/** Role queue for Exception Intelligence (distinct from Exception Hub owner roles). */
export type ExceptionIntelligenceOwnerRole = (typeof EXCEPTION_OWNER_ROLES)[number];

/** Canonical event types consumed by the rule pack (map to existing emitters). */
export const EXCEPTION_EVENT_TYPES = [
  "ETA_CHANGED",
  "BOOKING_CUTOFF_CHANGED",
  "BOOKING_STALLED",
  "DOCUMENT_MISSING",
  "DOCUMENT_REJECTED",
  "INSPECTION_FAILED",
  "MILESTONE_OVERDUE",
  "CUSTOMS_BROKER_MISSING",
  "CUSTOMS_ORIGIN_MISSING",
  "CUSTOMS_CLASSIFICATION_MISSING",
  "CUSTOMS_HOLD",
  "CUSTOMS_CLEARANCE_DELAY",
  "CUSTOMS_PREPARATION_AT_RISK",
  "CUSTOMS_BROKER_REVIEW_PENDING",
  "CUSTOMS_ARRIVAL_NOT_READY",
] as const;
export type ExceptionEventType = (typeof EXCEPTION_EVENT_TYPES)[number];

export const EXCEPTION_RULE_IDS = [
  "RULE_ETA_DELIVERY_RISK",
  "RULE_BOOKING_CUTOFF_RISK",
  "RULE_BOOKING_STALLED",
  "RULE_DOCUMENT_MISSING",
  "RULE_DOCUMENT_REJECTED",
  "RULE_INSPECTION_FAILED",
  "RULE_MILESTONE_OVERDUE",
  "RULE_CUSTOMS_BROKER_MISSING",
  "RULE_CUSTOMS_ORIGIN_MISSING",
  "RULE_CUSTOMS_CLASSIFICATION_MISSING",
  "RULE_CUSTOMS_HOLD",
  "RULE_CUSTOMS_CLEARANCE_DELAY",
  "RULE_CUSTOMS_PREPARATION_AT_RISK",
  "RULE_CUSTOMS_BROKER_REVIEW_PENDING",
  "RULE_CUSTOMS_ARRIVAL_NOT_READY",
] as const;
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
export const BOOKING_STALLED_THRESHOLD_MS = 48 * 3_600_000;

/** ETA shift below this (hours) is informational unless delivery date is at risk. */
export const ETA_INFORMATIONAL_MAX_HOURS = 24;

export function mapImpactToIssueCategory(
  impact: ExceptionImpactType,
):
  | "SHIPMENT_DELAY"
  | "BOOKING_FAILURE"
  | "DOCUMENT_MISSING"
  | "INSPECTION_FAILURE"
  | "OTHER" {
  switch (impact) {
    case "DELIVERY_RISK":
    case "SHIPMENT_DELAY":
      return "SHIPMENT_DELAY";
    case "BOOKING_RISK":
      return "BOOKING_FAILURE";
    case "DOCUMENT_RISK":
      return "DOCUMENT_MISSING";
    case "INSPECTION_RISK":
      return "INSPECTION_FAILURE";
    case "CUSTOMS_RISK":
      return "OTHER";
    default:
      return "OTHER";
  }
}

export function evaluateCustomsBrokerMissing(missing: boolean): ExceptionRuleOutcome | null {
  if (!missing) return null;
  return {
    ruleId: "RULE_CUSTOMS_BROKER_MISSING",
    eventType: "CUSTOMS_BROKER_MISSING",
    impactType: "CUSTOMS_RISK",
    severity: "HIGH",
    ownerRole: "OPERATIONS",
    recommendedAction: "Assign a CUSTOMS_BROKER via Partner Assignment",
    createTask: true,
    raiseException: true,
    title: "Customs broker missing",
    description: "Turkey customs case has no assigned customs broker.",
  };
}

export function evaluateCustomsOriginMissing(missing: boolean): ExceptionRuleOutcome | null {
  if (!missing) return null;
  return {
    ruleId: "RULE_CUSTOMS_ORIGIN_MISSING",
    eventType: "CUSTOMS_ORIGIN_MISSING",
    impactType: "CUSTOMS_RISK",
    severity: "MEDIUM",
    ownerRole: "DOCUMENTATION",
    recommendedAction: "Set Country of Origin on Product Master for linked products",
    createTask: true,
    raiseException: true,
    title: "Customs origin missing",
    description: "One or more customs products lack Country of Origin.",
  };
}

export function evaluateCustomsClassificationMissing(missing: boolean): ExceptionRuleOutcome | null {
  if (!missing) return null;
  return {
    ruleId: "RULE_CUSTOMS_CLASSIFICATION_MISSING",
    eventType: "CUSTOMS_CLASSIFICATION_MISSING",
    impactType: "CUSTOMS_RISK",
    severity: "MEDIUM",
    ownerRole: "DOCUMENTATION",
    recommendedAction: "Add GTİP/tariff reference on Product Master (CANDIDATE or VERIFIED)",
    createTask: true,
    raiseException: true,
    title: "Customs classification missing",
    description: "Linked products lack GTİP/tariff reference for customs preparation.",
  };
}

export function evaluateCustomsHold(onHold: boolean): ExceptionRuleOutcome | null {
  if (!onHold) return null;
  return {
    ruleId: "RULE_CUSTOMS_HOLD",
    eventType: "CUSTOMS_HOLD",
    impactType: "CUSTOMS_RISK",
    severity: "CRITICAL",
    ownerRole: "OPERATIONS",
    recommendedAction: "Resolve customs hold reason with broker/buyer",
    createTask: true,
    raiseException: true,
    title: "Customs hold",
    description: "Turkey customs case is on operational HOLD.",
  };
}

export function evaluateCustomsDocumentMissing(input: {
  documentType: string;
  missing: boolean;
}): ExceptionRuleOutcome | null {
  if (!input.missing) return null;
  return {
    ruleId: "RULE_DOCUMENT_MISSING",
    eventType: "DOCUMENT_MISSING",
    impactType: "CUSTOMS_RISK",
    severity: "HIGH",
    ownerRole: "DOCUMENTATION",
    recommendedAction: `Upload/approve ${input.documentType} for Turkey customs readiness`,
    createTask: true,
    raiseException: true,
    title: `Customs document missing — ${input.documentType}`,
    description: `Required trade document ${input.documentType} is missing for customs preparation.`,
  };
}

export function evaluateCustomsClearanceDelay(input: {
  daysSinceArrival: number;
  thresholdDays: number;
  cleared: boolean;
}): ExceptionRuleOutcome | null {
  if (input.cleared) return null;
  if (!Number.isFinite(input.daysSinceArrival) || input.daysSinceArrival < input.thresholdDays) {
    return null;
  }
  return {
    ruleId: "RULE_CUSTOMS_CLEARANCE_DELAY",
    eventType: "CUSTOMS_CLEARANCE_DELAY",
    impactType: "CUSTOMS_RISK",
    severity: input.daysSinceArrival >= input.thresholdDays * 2 ? "CRITICAL" : "HIGH",
    ownerRole: "OPERATIONS",
    recommendedAction: "Escalate customs clearance with assigned broker",
    createTask: true,
    raiseException: true,
    title: "Customs clearance delay",
    description: `Arrival occurred ~${Math.round(input.daysSinceArrival)}d ago and customs is not CLEARED.`,
  };
}

/** Sprint 38 — near-arrival incomplete readiness (time-aware). */
export function evaluateCustomsPreparationAtRisk(input: {
  active: boolean;
  daysToArrival: number | null;
  severity: OperationalIssueSeverity;
}): ExceptionRuleOutcome | null {
  if (!input.active) return null;
  return {
    ruleId: "RULE_CUSTOMS_PREPARATION_AT_RISK",
    eventType: "CUSTOMS_PREPARATION_AT_RISK",
    impactType: "CUSTOMS_RISK",
    severity: input.severity,
    ownerRole: "OPERATIONS",
    recommendedAction: "Resolve blocking customs preparation items before arrival",
    createTask: true,
    raiseException: true,
    title: "Customs preparation risk before arrival",
    description:
      input.daysToArrival != null
        ? `ETA in ~${Math.round(input.daysToArrival)}d with incomplete customs readiness.`
        : "Customs readiness incomplete inside pre-arrival window.",
  };
}

export function evaluateCustomsBrokerReviewPending(input: {
  pending: boolean;
}): ExceptionRuleOutcome | null {
  if (!input.pending) return null;
  return {
    ruleId: "RULE_CUSTOMS_BROKER_REVIEW_PENDING",
    eventType: "CUSTOMS_BROKER_REVIEW_PENDING",
    impactType: "CUSTOMS_RISK",
    severity: "MEDIUM",
    ownerRole: "OPERATIONS",
    recommendedAction: "Assigned customs broker should start review",
    createTask: true,
    raiseException: true,
    title: "Broker review not started",
    description: "Broker is assigned and readiness is sufficient, but case has not entered broker review.",
  };
}

export function evaluateCustomsArrivalNotReady(input: {
  arrivedNotReady: boolean;
}): ExceptionRuleOutcome | null {
  if (!input.arrivedNotReady) return null;
  return {
    ruleId: "RULE_CUSTOMS_ARRIVAL_NOT_READY",
    eventType: "CUSTOMS_ARRIVAL_NOT_READY",
    impactType: "CUSTOMS_RISK",
    severity: "HIGH",
    ownerRole: "OPERATIONS",
    recommendedAction: "Immediate customs preparation action required after arrival",
    createTask: true,
    raiseException: true,
    title: "Arrived — customs not ready",
    description: "ATA recorded but customs preparation readiness is still incomplete.",
  };
}

/** Evaluate ETA delivery risk from shift hours + optional required/expected delivery date. */
export function evaluateEtaDeliveryRisk(input: {
  etaShiftHours: number;
  currentEta: Date | string | null;
  expectedDeliveryDate: Date | string | null;
}): ExceptionRuleOutcome | null {
  const shift = input.etaShiftHours;
  if (!Number.isFinite(shift) || shift <= 0) return null;

  const eta = input.currentEta ? new Date(input.currentEta) : null;
  const required = input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null;
  const deliveryAtRisk =
    !!eta && !!required && !Number.isNaN(eta.getTime()) && !Number.isNaN(required.getTime()) && eta > required;

  if (deliveryAtRisk) {
    return {
      ruleId: "RULE_ETA_DELIVERY_RISK",
      eventType: "ETA_CHANGED",
      impactType: "DELIVERY_RISK",
      severity: shift >= 72 ? "CRITICAL" : "HIGH",
      ownerRole: "OPERATIONS",
      recommendedAction: "Review delivery plan against the required delivery date.",
      createTask: true,
      raiseException: true,
      title: "Delivery risk — ETA may miss required date",
      description: `Maritime ETA shifted by ~${Math.round(shift)}h and may miss the expected delivery date.`,
    };
  }

  // No delivery-date context: only raise for material drifts; avoid false HIGH on +1 day
  if (shift < ETA_INFORMATIONAL_MAX_HOURS) {
    return {
      ruleId: "RULE_ETA_DELIVERY_RISK",
      eventType: "ETA_CHANGED",
      impactType: "SHIPMENT_DELAY",
      severity: "LOW",
      ownerRole: "OPERATIONS",
      recommendedAction: "Monitor ETA; no delivery commitment at risk.",
      createTask: false,
      raiseException: false,
      title: "ETA updated",
      description: `ETA shifted by ~${Math.round(shift)}h — informational.`,
    };
  }

  return {
    ruleId: "RULE_ETA_DELIVERY_RISK",
    eventType: "ETA_CHANGED",
    impactType: "SHIPMENT_DELAY",
    severity: shift >= 72 ? "HIGH" : "MEDIUM",
    ownerRole: "OPERATIONS",
    recommendedAction: "Review shipment schedule and customer communication.",
    createTask: shift >= 72,
    raiseException: true,
    title: shift >= 72 ? "Significant ETA drift" : "ETA delayed",
    description: `Maritime ETA shifted by ~${Math.round(shift)}h.`,
  };
}

export function evaluateBookingStalled(input: {
  bookingStatus: string | null;
  bookingRequestedAt: Date | string | null;
  now?: Date;
}): ExceptionRuleOutcome | null {
  const status = input.bookingStatus;
  if (status !== "REQUESTED" && status !== "PENDING") return null;
  if (!input.bookingRequestedAt) return null;
  const requested = new Date(input.bookingRequestedAt);
  const now = input.now ?? new Date();
  if (Number.isNaN(requested.getTime())) return null;
  if (now.getTime() - requested.getTime() < BOOKING_STALLED_THRESHOLD_MS) return null;
  return {
    ruleId: "RULE_BOOKING_STALLED",
    eventType: "BOOKING_STALLED",
    impactType: "BOOKING_RISK",
    severity: "HIGH",
    ownerRole: "OPERATIONS",
    recommendedAction: "Follow up booking confirmation with forwarder/carrier.",
    createTask: true,
    raiseException: true,
    title: "Booking confirmation stalled",
    description: `Booking remains ${status} beyond the operational threshold.`,
  };
}

export function evaluateBookingCutoffRisk(input: {
  cargoReadyDate: Date | string | null;
  siCutoff: Date | string | null;
  cyCutoff: Date | string | null;
  now?: Date;
}): ExceptionRuleOutcome | null {
  const now = input.now ?? new Date();
  const ready = input.cargoReadyDate ? new Date(input.cargoReadyDate) : null;
  const cutoffRaw = input.siCutoff ?? input.cyCutoff;
  if (!ready || !cutoffRaw) return null;
  const cutoff = new Date(cutoffRaw);
  if (Number.isNaN(ready.getTime()) || Number.isNaN(cutoff.getTime())) return null;
  if (ready <= cutoff && cutoff.getTime() - now.getTime() > 24 * 3_600_000) return null;
  if (ready > cutoff || cutoff.getTime() - now.getTime() <= 24 * 3_600_000) {
    return {
      ruleId: "RULE_BOOKING_CUTOFF_RISK",
      eventType: "BOOKING_CUTOFF_CHANGED",
      impactType: "BOOKING_RISK",
      severity: ready > cutoff ? "HIGH" : "MEDIUM",
      ownerRole: "OPERATIONS",
      recommendedAction: "Review cargo readiness against the booking cut-off.",
      createTask: ready > cutoff,
      raiseException: true,
      title: "Booking cut-off risk",
      description:
        ready > cutoff
          ? "Cargo ready date is after the SI/CY cut-off."
          : "Booking cut-off is within 24 hours — confirm readiness.",
    };
  }
  return null;
}

export function evaluateDocumentMissing(input: { documentType: string; overdueHours?: number }): ExceptionRuleOutcome {
  const overdue = input.overdueHours ?? 0;
  return {
    ruleId: "RULE_DOCUMENT_MISSING",
    eventType: "DOCUMENT_MISSING",
    impactType: "DOCUMENT_RISK",
    severity: overdue >= 72 ? "HIGH" : "MEDIUM",
    ownerRole: "DOCUMENTATION",
    recommendedAction: `Request missing document: ${input.documentType}.`,
    createTask: true,
    raiseException: true,
    title: `Required document missing — ${input.documentType}`,
    description: `${input.documentType} is required and not yet available.`,
  };
}

export function evaluateDocumentRejected(input: { documentType: string }): ExceptionRuleOutcome {
  return {
    ruleId: "RULE_DOCUMENT_REJECTED",
    eventType: "DOCUMENT_REJECTED",
    impactType: "DOCUMENT_RISK",
    severity: "HIGH",
    ownerRole: "DOCUMENTATION",
    recommendedAction: `Correct or replace rejected document: ${input.documentType}.`,
    createTask: true,
    raiseException: true,
    title: `Document rejected — ${input.documentType}`,
    description: `${input.documentType} failed review and must be replaced.`,
  };
}

export function evaluateInspectionFailed(): ExceptionRuleOutcome {
  return {
    ruleId: "RULE_INSPECTION_FAILED",
    eventType: "INSPECTION_FAILED",
    impactType: "INSPECTION_RISK",
    severity: "CRITICAL",
    ownerRole: "OPERATIONS",
    recommendedAction: "Review inspection findings before shipment release.",
    createTask: true,
    raiseException: true,
    title: "Inspection failed",
    description: "Quality inspection failed — block release until findings are addressed.",
  };
}

export function evaluateMilestoneOverdue(input: { milestoneType: string; label?: string }): ExceptionRuleOutcome {
  const label = input.label ?? input.milestoneType;
  return {
    ruleId: "RULE_MILESTONE_OVERDUE",
    eventType: "MILESTONE_OVERDUE",
    impactType: "MILESTONE_RISK",
    severity: "HIGH",
    ownerRole: "OPERATIONS",
    recommendedAction: `Review overdue milestone: ${label}.`,
    createTask: true,
    raiseException: true,
    title: `Milestone overdue — ${label}`,
    description: `Operational milestone ${label} is overdue.`,
  };
}
