/**
 * Sprint 38 — Pre-Arrival Customs Engine (derived presentation + config).
 * Does not replace CustomsCase lifecycle or readiness.
 */
import type { CustomsCaseStatus, CustomsReadinessStatus } from "./customs.js";
/** Operational thresholds only — not Turkish legal deadlines. */
export declare const PRE_ARRIVAL_CUSTOMS_DEFAULTS: {
    readonly enabled: true;
    /** Ensure CustomsCase when ETA ≤ this many days. */
    readonly caseEnsureDays: 14;
    /** Broker assignment expected within this window. */
    readonly brokerReadyDays: 7;
    /** Escalate incomplete readiness to HIGH. */
    readonly highRiskDays: 3;
    /** Escalate incomplete readiness to CRITICAL. */
    readonly criticalRiskDays: 1;
    /** Scheduled scan horizon (days ahead). */
    readonly scanHorizonDays: 21;
};
export type PreArrivalCustomsConfig = {
    enabled: boolean;
    caseEnsureDays: number;
    brokerReadyDays: number;
    highRiskDays: number;
    criticalRiskDays: number;
    scanHorizonDays: number;
};
export declare const PRE_ARRIVAL_ETA_SOURCES: readonly ["MARITIME", "BOOKING", "NONE"];
export type PreArrivalEtaSource = (typeof PRE_ARRIVAL_ETA_SOURCES)[number];
/** Customer-facing derived phase — not a second lifecycle. */
export declare const PRE_ARRIVAL_PHASES: readonly ["NOT_STARTED", "PREPARING", "ACTION_REQUIRED", "BROKER_REVIEW", "READY_BEFORE_ARRIVAL", "ARRIVED", "CLEARED", "CANCELLED"];
export type PreArrivalPhase = (typeof PRE_ARRIVAL_PHASES)[number];
export type PreArrivalSummary = {
    phase: PreArrivalPhase;
    daysToArrival: number | null;
    eta: string | null;
    etaSource: PreArrivalEtaSource;
    bookingEta: string | null;
    maritimeEta: string | null;
    ata: string | null;
    readinessStatus: CustomsReadinessStatus | string | null;
    blockingCount: number;
    warningCount: number;
    urgency: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    label: string;
    nextAction: string | null;
};
export declare function daysUntil(eta: Date | string | null | undefined, now?: Date): number | null;
/** Map days-to-arrival + blocking into urgency (deterministic). */
export declare function preArrivalUrgency(input: {
    daysToArrival: number | null;
    arrived: boolean;
    blockingCount: number;
    warningCount: number;
    cleared: boolean;
    cancelled: boolean;
    config?: Pick<PreArrivalCustomsConfig, "highRiskDays" | "criticalRiskDays">;
}): PreArrivalSummary["urgency"];
/** Escalate base severity by time-to-arrival. Never downgrades CRITICAL. */
export declare function escalateSeverityByEta(base: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", daysToArrival: number | null, arrived: boolean, config?: Pick<PreArrivalCustomsConfig, "highRiskDays" | "criticalRiskDays">): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export declare function derivePreArrivalPhase(input: {
    caseStatus: CustomsCaseStatus | string | null;
    readinessStatus: CustomsReadinessStatus | string | null;
    blockingCount: number;
    arrived: boolean;
    hasCase: boolean;
}): PreArrivalPhase;
export declare function preArrivalLabel(phase: PreArrivalPhase): string;
export declare function buildPreArrivalSummary(input: {
    caseStatus: CustomsCaseStatus | string | null;
    readinessStatus: CustomsReadinessStatus | string | null;
    blockingCount: number;
    warningCount: number;
    eta: string | null;
    etaSource: PreArrivalEtaSource;
    bookingEta: string | null;
    maritimeEta: string | null;
    ata: string | null;
    hasCase: boolean;
    nextAction?: string | null;
    now?: Date;
    config?: PreArrivalCustomsConfig;
}): PreArrivalSummary;
