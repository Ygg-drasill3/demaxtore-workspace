/** Operational thresholds only — not Turkish legal deadlines. */
export const PRE_ARRIVAL_CUSTOMS_DEFAULTS = {
    enabled: true,
    /** Ensure CustomsCase when ETA ≤ this many days. */
    caseEnsureDays: 14,
    /** Broker assignment expected within this window. */
    brokerReadyDays: 7,
    /** Escalate incomplete readiness to HIGH. */
    highRiskDays: 3,
    /** Escalate incomplete readiness to CRITICAL. */
    criticalRiskDays: 1,
    /** Scheduled scan horizon (days ahead). */
    scanHorizonDays: 21,
};
export const PRE_ARRIVAL_ETA_SOURCES = ["MARITIME", "BOOKING", "NONE"];
/** Customer-facing derived phase — not a second lifecycle. */
export const PRE_ARRIVAL_PHASES = [
    "NOT_STARTED",
    "PREPARING",
    "ACTION_REQUIRED",
    "BROKER_REVIEW",
    "READY_BEFORE_ARRIVAL",
    "ARRIVED",
    "CLEARED",
    "CANCELLED",
];
export function daysUntil(eta, now = new Date()) {
    if (!eta)
        return null;
    const d = typeof eta === "string" ? new Date(eta) : eta;
    if (Number.isNaN(d.getTime()))
        return null;
    return (d.getTime() - now.getTime()) / 86_400_000;
}
/** Map days-to-arrival + blocking into urgency (deterministic). */
export function preArrivalUrgency(input) {
    if (input.cleared || input.cancelled)
        return "NONE";
    if (input.blockingCount <= 0 && input.warningCount <= 0)
        return "NONE";
    const cfg = input.config ?? PRE_ARRIVAL_CUSTOMS_DEFAULTS;
    if (input.arrived)
        return "HIGH";
    const days = input.daysToArrival;
    if (days == null)
        return input.blockingCount > 0 ? "MEDIUM" : "LOW";
    if (days <= cfg.criticalRiskDays && input.blockingCount > 0)
        return "CRITICAL";
    if (days <= cfg.highRiskDays && input.blockingCount > 0)
        return "HIGH";
    if (days <= cfg.highRiskDays && input.warningCount > 0)
        return "MEDIUM";
    if (input.blockingCount > 0)
        return "MEDIUM";
    if (input.warningCount > 0)
        return "LOW";
    return "NONE";
}
/** Escalate base severity by time-to-arrival. Never downgrades CRITICAL. */
export function escalateSeverityByEta(base, daysToArrival, arrived, config = PRE_ARRIVAL_CUSTOMS_DEFAULTS) {
    const rank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    let target = base;
    if (arrived) {
        target = rank[base] >= rank.HIGH ? base : "HIGH";
    }
    else if (daysToArrival != null) {
        if (daysToArrival <= config.criticalRiskDays)
            target = "CRITICAL";
        else if (daysToArrival <= config.highRiskDays) {
            target = rank[base] >= rank.HIGH ? base : "HIGH";
        }
    }
    return rank[target] >= rank[base] ? target : base;
}
export function derivePreArrivalPhase(input) {
    const status = input.caseStatus;
    if (status === "CLEARED")
        return "CLEARED";
    if (status === "CANCELLED")
        return "CANCELLED";
    if (!input.hasCase)
        return "NOT_STARTED";
    if (input.arrived)
        return "ARRIVED";
    const brokerish = new Set([
        "BROKER_REVIEW",
        "DECLARATION_PREPARING",
        "DECLARATION_FILED",
        "CUSTOMS_PROCESSING",
        "CLEARANCE_PENDING",
    ]);
    // Operational "Ready before arrival" — NOT clearance / NOT legally approved.
    if (input.blockingCount === 0 && input.readinessStatus === "READY_FOR_BROKER") {
        return "READY_BEFORE_ARRIVAL";
    }
    if (brokerish.has(String(status)))
        return "BROKER_REVIEW";
    if (input.blockingCount > 0 || status === "HOLD")
        return "ACTION_REQUIRED";
    if (status === "DRAFT" || status === "PREPARING" || status === "READY_FOR_BROKER") {
        return "PREPARING";
    }
    return "PREPARING";
}
export function preArrivalLabel(phase) {
    switch (phase) {
        case "NOT_STARTED":
            return "Customs preparation not started";
        case "PREPARING":
            return "Customs preparation in progress";
        case "ACTION_REQUIRED":
            return "Action required before arrival";
        case "BROKER_REVIEW":
            return "Broker review in progress";
        case "READY_BEFORE_ARRIVAL":
            return "Ready before arrival";
        case "ARRIVED":
            return "Arrived — customs preparation incomplete or in progress";
        case "CLEARED":
            return "Customs cleared";
        case "CANCELLED":
            return "Customs case cancelled";
        default:
            return phase;
    }
}
export function buildPreArrivalSummary(input) {
    const arrived = !!input.ata;
    const daysToArrival = arrived ? 0 : daysUntil(input.eta, input.now);
    const phase = derivePreArrivalPhase({
        caseStatus: input.caseStatus,
        readinessStatus: input.readinessStatus,
        blockingCount: input.blockingCount,
        arrived,
        hasCase: input.hasCase,
    });
    const urgency = preArrivalUrgency({
        daysToArrival,
        arrived,
        blockingCount: input.blockingCount,
        warningCount: input.warningCount,
        cleared: phase === "CLEARED",
        cancelled: phase === "CANCELLED",
        config: input.config,
    });
    return {
        phase,
        daysToArrival: daysToArrival == null ? null : Math.round(daysToArrival * 10) / 10,
        eta: input.eta,
        etaSource: input.etaSource,
        bookingEta: input.bookingEta,
        maritimeEta: input.maritimeEta,
        ata: input.ata,
        readinessStatus: input.readinessStatus,
        blockingCount: input.blockingCount,
        warningCount: input.warningCount,
        urgency,
        label: preArrivalLabel(phase),
        nextAction: input.nextAction ?? null,
    };
}
