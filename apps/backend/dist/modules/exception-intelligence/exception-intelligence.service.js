import { evaluateBookingCutoffRisk, evaluateBookingStalled, evaluateCustomsArrivalNotReady, evaluateCustomsBrokerMissing, evaluateCustomsBrokerReviewPending, evaluateCustomsClassificationMissing, evaluateCustomsClearanceDelay, evaluateCustomsDocumentMissing, evaluateCustomsHold, evaluateCustomsOriginMissing, evaluateCustomsPreparationAtRisk, evaluateDocumentMissing, evaluateDocumentRejected, evaluateEtaDeliveryRisk, evaluateInspectionFailed, evaluateMilestoneOverdue, mapImpactToIssueCategory, } from "@dmx/contracts/exception-intelligence";
import { escalateSeverityByEta } from "@dmx/contracts/pre-arrival-customs";
import { OPERATIONAL_ISSUE_AUTOMATION_KEYS } from "@dmx/contracts/operational-issue";
import { OperationalIssueService } from "../operational-issue/operational-issue.service.js";
import { OperationalTaskService } from "../operational-task/operational-task.service.js";
async function resolveOrderIdFromShipment(db, shipmentWorkspaceId) {
    const sw = await db.shipmentWorkspace.findUnique({
        where: { workspaceId: shipmentWorkspaceId },
        select: { orderWorkspaceId: true },
    });
    return sw?.orderWorkspaceId ?? null;
}
async function expectedDeliveryForOrder(db, orderId) {
    const po = await db.purchaseOrder.findFirst({
        where: { orderId },
        orderBy: { createdAt: "desc" },
        select: {
            revisions: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { snapshotJson: true },
            },
        },
    });
    const snap = po?.revisions[0]?.snapshotJson;
    const raw = snap?.header?.expectedDeliveryDate ?? snap?.expectedDeliveryDate ?? null;
    if (!raw)
        return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}
export class ExceptionIntelligenceService {
    db;
    issues;
    tasks;
    constructor(db) {
        this.db = db;
        this.issues = new OperationalIssueService(db);
        this.tasks = new OperationalTaskService(db);
    }
    async applyOutcome(orderId, automationKey, outcome, related) {
        if (!outcome.raiseException) {
            return { raised: false, issueId: null, taskId: null, created: false, outcome };
        }
        let taskId = null;
        if (outcome.createTask) {
            const task = await this.tasks.ensureAutomatedTask({
                orderId,
                automationKey: `task:${automationKey}`,
                title: outcome.title,
                description: outcome.recommendedAction,
                priority: outcome.severity,
                relatedEntityType: related.relatedEntityType === "SHIPMENT"
                    ? "SHIPMENT"
                    : related.relatedEntityType === "INSPECTION"
                        ? "NCR"
                        : related.relatedEntityType === "COMMERCIAL_DOCUMENT"
                            ? "DOCUMENT"
                            : "ORDER",
                relatedEntityId: related.relatedEntityId ?? orderId,
                dueInDays: outcome.severity === "CRITICAL" ? 1 : 2,
            });
            taskId = task.id;
        }
        const issue = await this.issues.ensureAutomatedIssue({
            orderId,
            automationKey,
            title: outcome.title,
            description: outcome.description,
            category: mapImpactToIssueCategory(outcome.impactType),
            severity: outcome.severity,
            relatedEntityType: related.relatedEntityType,
            relatedEntityId: related.relatedEntityId,
            assignedTaskId: taskId,
            impactType: outcome.impactType,
            ownerRole: outcome.ownerRole,
            recommendedAction: outcome.recommendedAction,
            sourceEventType: outcome.eventType,
            sourceRuleId: outcome.ruleId,
            sourceAlertId: related.sourceAlertId,
        });
        return {
            raised: true,
            issueId: issue.id,
            taskId,
            created: issue.created,
            outcome,
        };
    }
    /** Safe wrapper — never throws to callers of tracking/booking. */
    async safeEvaluate(fn) {
        try {
            return await fn();
        }
        catch (err) {
            console.error("[exception-intelligence] evaluation failed", err);
            return { raised: false, issueId: null, taskId: null, created: false, outcome: null };
        }
    }
    async onEtaChanged(input) {
        return this.safeEvaluate(async () => {
            const orderId = await resolveOrderIdFromShipment(this.db, input.shipmentWorkspaceId);
            if (!orderId)
                return { raised: false, issueId: null, taskId: null, created: false, outcome: null };
            const expected = await expectedDeliveryForOrder(this.db, orderId);
            const outcome = evaluateEtaDeliveryRisk({
                etaShiftHours: input.etaShiftHours,
                currentEta: input.currentEta,
                expectedDeliveryDate: expected,
            });
            if (!outcome) {
                return { raised: false, issueId: null, taskId: null, created: false, outcome: null };
            }
            const key = `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.ETA_DELIVERY_RISK}:${input.shipmentWorkspaceId}`;
            if (!outcome.raiseException) {
                // Clear prior delivery-risk issue when drift is no longer material
                if (input.etaShiftHours < 24) {
                    await this.issues.resolveAutomatedIssue({
                        orderId,
                        automationKey: key,
                        resolutionNote: "ETA drift no longer material / delivery not at risk.",
                    });
                }
                return { raised: false, issueId: null, taskId: null, created: false, outcome };
            }
            return this.applyOutcome(orderId, key, outcome, {
                relatedEntityType: "SHIPMENT",
                relatedEntityId: input.shipmentWorkspaceId,
                sourceAlertId: input.sourceAlertId,
            });
        });
    }
    async onBookingContext(input) {
        const results = [];
        const orderId = await resolveOrderIdFromShipment(this.db, input.shipmentWorkspaceId);
        if (!orderId)
            return results;
        const sw = await this.db.shipmentWorkspace.findUnique({
            where: { workspaceId: input.shipmentWorkspaceId },
            select: {
                bookingStatus: true,
                bookingRequestedAt: true,
                cargoReadyDate: true,
                siCutoff: true,
                cyCutoff: true,
            },
        });
        if (!sw)
            return results;
        const stalled = evaluateBookingStalled({
            bookingStatus: sw.bookingStatus,
            bookingRequestedAt: sw.bookingRequestedAt,
        });
        const stalledKey = `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.BOOKING_STALLED}:${input.shipmentWorkspaceId}`;
        if (stalled?.raiseException) {
            results.push(await this.safeEvaluate(() => this.applyOutcome(orderId, stalledKey, stalled, {
                relatedEntityType: "SHIPMENT",
                relatedEntityId: input.shipmentWorkspaceId,
            })));
        }
        else if (sw.bookingStatus === "CONFIRMED" || sw.bookingStatus === "AMENDED") {
            await this.issues.resolveAutomatedIssue({
                orderId,
                automationKey: stalledKey,
                resolutionNote: "Booking confirmed — stalled condition cleared.",
            });
        }
        const cutoff = evaluateBookingCutoffRisk({
            cargoReadyDate: sw.cargoReadyDate,
            siCutoff: sw.siCutoff,
            cyCutoff: sw.cyCutoff,
        });
        if (cutoff?.raiseException) {
            const key = `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.BOOKING_CUTOFF_RISK}:${input.shipmentWorkspaceId}`;
            results.push(await this.safeEvaluate(() => this.applyOutcome(orderId, key, cutoff, {
                relatedEntityType: "SHIPMENT",
                relatedEntityId: input.shipmentWorkspaceId,
            })));
        }
        return results;
    }
    async onDocumentMissing(input) {
        return this.safeEvaluate(async () => {
            const outcome = evaluateDocumentMissing({
                documentType: input.documentType,
                overdueHours: input.overdueHours,
            });
            const key = `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.DOCUMENT_MISSING}:${input.documentType}:${input.orderId}`;
            return this.applyOutcome(input.orderId, key, outcome, {
                relatedEntityType: "COMMERCIAL_DOCUMENT",
                relatedEntityId: input.relatedEntityId,
                sourceAlertId: input.sourceAlertId,
            });
        });
    }
    async onDocumentRejected(input) {
        return this.safeEvaluate(async () => {
            const outcome = evaluateDocumentRejected({ documentType: input.documentType });
            const key = `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.DOCUMENT_REJECTED}:${input.documentType}:${input.relatedEntityId ?? input.orderId}`;
            return this.applyOutcome(input.orderId, key, outcome, {
                relatedEntityType: "COMMERCIAL_DOCUMENT",
                relatedEntityId: input.relatedEntityId,
            });
        });
    }
    async onInspectionFailed(input) {
        return this.safeEvaluate(async () => {
            const outcome = evaluateInspectionFailed();
            const key = `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.INSPECTION_FAILURE}:${input.inspectionId}`;
            return this.applyOutcome(input.orderId, key, outcome, {
                relatedEntityType: "INSPECTION",
                relatedEntityId: input.inspectionId,
            });
        });
    }
    async onMilestoneOverdue(input) {
        return this.safeEvaluate(async () => {
            const outcome = evaluateMilestoneOverdue({
                milestoneType: input.milestoneType,
                label: input.label,
            });
            const key = `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.MILESTONE_OVERDUE}:${input.milestoneId}`;
            return this.applyOutcome(input.orderId, key, outcome, {
                relatedEntityType: "SHIPMENT",
                relatedEntityId: input.shipmentWorkspaceId,
            });
        });
    }
    /** Sprint 37/38 — customs readiness → OperationalIssue (idempotent, time-aware severity). */
    async onCustomsReadiness(input) {
        const results = [];
        const arrived = !!input.arrived;
        const days = input.daysToArrival ?? null;
        const withTime = (outcome) => {
            if (!outcome)
                return null;
            return {
                ...outcome,
                severity: escalateSeverityByEta(outcome.severity, days, arrived),
            };
        };
        // Classification: missing always; CANDIDATE only when near-arrival flag set (time-aware).
        const classMissing = input.classificationMissing || (!!input.classificationCandidate && (arrived || (days != null && days <= 3)));
        const pairs = [
            {
                key: `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.CUSTOMS_BROKER_MISSING}:${input.customsCaseId}`,
                outcome: withTime(evaluateCustomsBrokerMissing(input.brokerMissing)),
            },
            {
                key: `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.CUSTOMS_ORIGIN_MISSING}:${input.customsCaseId}`,
                outcome: withTime(evaluateCustomsOriginMissing(input.originMissing)),
            },
            {
                key: `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.CUSTOMS_CLASSIFICATION_MISSING}:${input.customsCaseId}`,
                outcome: withTime(evaluateCustomsClassificationMissing(classMissing)),
            },
            {
                key: `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.CUSTOMS_HOLD}:${input.customsCaseId}`,
                outcome: withTime(evaluateCustomsHold(input.onHold)),
            },
            {
                key: `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.CUSTOMS_DOCUMENT_MISSING}:${input.customsCaseId}:COMMERCIAL_INVOICE`,
                outcome: withTime(evaluateCustomsDocumentMissing({
                    documentType: "COMMERCIAL_INVOICE",
                    missing: input.invoiceMissing,
                })),
            },
            {
                key: `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.CUSTOMS_DOCUMENT_MISSING}:${input.customsCaseId}:PACKING_LIST`,
                outcome: withTime(evaluateCustomsDocumentMissing({
                    documentType: "PACKING_LIST",
                    missing: input.packingMissing,
                })),
            },
            {
                key: `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.CUSTOMS_PREPARATION_AT_RISK}:${input.customsCaseId}`,
                outcome: evaluateCustomsPreparationAtRisk({
                    active: !!input.preparationAtRisk,
                    daysToArrival: days,
                    severity: escalateSeverityByEta("HIGH", days, arrived),
                }),
            },
            {
                key: `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.CUSTOMS_BROKER_REVIEW_PENDING}:${input.customsCaseId}`,
                outcome: withTime(evaluateCustomsBrokerReviewPending({ pending: !!input.brokerReviewPending })),
            },
            {
                key: `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.CUSTOMS_ARRIVAL_NOT_READY}:${input.customsCaseId}`,
                outcome: evaluateCustomsArrivalNotReady({ arrivedNotReady: !!input.arrivedNotReady }),
            },
        ];
        for (const { key, outcome } of pairs) {
            const r = await this.safeEvaluate(async () => {
                if (!outcome) {
                    await this.issues.resolveAutomatedIssue({
                        orderId: input.orderId,
                        automationKey: key,
                        resolutionNote: "Customs readiness condition cleared.",
                    });
                    return { raised: false, issueId: null, taskId: null, created: false, outcome: null };
                }
                return this.applyOutcome(input.orderId, key, outcome, {
                    relatedEntityType: "SHIPMENT",
                    relatedEntityId: input.shipmentWorkspaceId,
                });
            });
            results.push(r);
        }
        return results;
    }
    async onCustomsClearanceDelay(input) {
        return this.safeEvaluate(async () => {
            const key = `${OPERATIONAL_ISSUE_AUTOMATION_KEYS.CUSTOMS_CLEARANCE_DELAY}:${input.customsCaseId}`;
            const outcome = evaluateCustomsClearanceDelay({
                daysSinceArrival: input.daysSinceArrival,
                thresholdDays: input.thresholdDays,
                cleared: input.cleared,
            });
            if (!outcome) {
                await this.issues.resolveAutomatedIssue({
                    orderId: input.orderId,
                    automationKey: key,
                    resolutionNote: "Customs cleared or delay below threshold.",
                });
                return { raised: false, issueId: null, taskId: null, created: false, outcome: null };
            }
            return this.applyOutcome(input.orderId, key, outcome, {
                relatedEntityType: "SHIPMENT",
                relatedEntityId: input.shipmentWorkspaceId,
            });
        });
    }
    /** Periodic scan — booking stalled + overdue milestones + Sprint 38 pre-arrival. */
    async runPeriodicScan(limit = 40) {
        let booking = 0;
        let milestones = 0;
        let preArrival = 0;
        const threshold = new Date(Date.now() - 48 * 3_600_000);
        const stalled = await this.db.shipmentWorkspace.findMany({
            where: {
                bookingStatus: { in: ["REQUESTED", "PENDING"] },
                bookingRequestedAt: { lte: threshold },
            },
            select: { workspaceId: true },
            take: limit,
        });
        for (const row of stalled) {
            const res = await this.onBookingContext({ shipmentWorkspaceId: row.workspaceId });
            booking += res.filter((r) => r.raised && r.created).length;
        }
        const overdue = await this.db.shipmentMilestone.findMany({
            where: {
                status: { in: ["PENDING", "ACTIVE"] },
                plannedAt: { lt: new Date() },
            },
            select: {
                id: true,
                type: true,
                shipmentWorkspaceId: true,
                shipmentWorkspace: { select: { workspaceId: true, orderWorkspaceId: true } },
            },
            take: limit,
        });
        for (const m of overdue) {
            const orderId = m.shipmentWorkspace.orderWorkspaceId;
            if (!orderId)
                continue;
            const r = await this.onMilestoneOverdue({
                orderId,
                shipmentWorkspaceId: m.shipmentWorkspace.workspaceId,
                milestoneId: m.id,
                milestoneType: m.type,
            });
            if (r.raised && r.created)
                milestones++;
        }
        // Sprint 38 — pre-arrival customs (failure-isolated)
        try {
            const { createPreArrivalCustomsService } = await import("../customs/pre-arrival-customs.service.js");
            const scan = await createPreArrivalCustomsService(this.db).runScan(limit);
            preArrival = scan.evaluated;
        }
        catch (err) {
            console.error("[exception-intelligence] pre-arrival scan failed", err);
        }
        return { booking, milestones, preArrival };
    }
}
//# sourceMappingURL=exception-intelligence.service.js.map