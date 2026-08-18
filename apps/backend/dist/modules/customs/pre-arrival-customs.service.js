import { PRE_ARRIVAL_CUSTOMS_DEFAULTS, buildPreArrivalSummary, daysUntil, } from "@dmx/contracts/pre-arrival-customs";
import { isTurkeyCountryCode } from "@dmx/contracts/customs";
import { resolveFreightRoute } from "../freightiq/commercial/freight-route.util.js";
import { ExceptionIntelligenceService } from "../exception-intelligence/exception-intelligence.service.js";
import { createCustomsService } from "./customs.service.js";
const SYSTEM_ACTOR = {
    id: "00000000-0000-0000-0000-000000000000",
    email: "system@demaxtore.local",
    role: "ADMIN",
};
export function createPreArrivalCustomsService(db) {
    const customs = createCustomsService(db);
    const ei = new ExceptionIntelligenceService(db);
    async function loadConfig() {
        const rule = await db.operationalAutomationRule.findUnique({
            where: { key: "customs.pre_arrival.enabled" },
            select: { enabled: true },
        });
        return {
            ...PRE_ARRIVAL_CUSTOMS_DEFAULTS,
            enabled: rule ? rule.enabled : PRE_ARRIVAL_CUSTOMS_DEFAULTS.enabled,
        };
    }
    async function resolveOperationalEta(shipmentWorkspaceId) {
        const sw = await db.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: { eta: true, arrivedAt: true },
        });
        const snap = await db.shipmentTrackingSnapshot.findFirst({
            where: { shipmentId: shipmentWorkspaceId, eta: { not: null } },
            orderBy: { syncedAt: "desc" },
            select: { eta: true, syncedAt: true },
        });
        const bookingEta = sw?.eta ?? null;
        const maritimeEta = snap?.eta ?? null;
        if (maritimeEta) {
            return {
                eta: maritimeEta,
                etaSource: "MARITIME",
                bookingEta,
                maritimeEta,
                ata: sw?.arrivedAt ?? null,
            };
        }
        if (bookingEta) {
            return {
                eta: bookingEta,
                etaSource: "BOOKING",
                bookingEta,
                maritimeEta: null,
                ata: sw?.arrivedAt ?? null,
            };
        }
        return {
            eta: null,
            etaSource: "NONE",
            bookingEta: null,
            maritimeEta: null,
            ata: sw?.arrivedAt ?? null,
        };
    }
    async function isTurkeyEligible(shipmentWorkspaceId, orderWorkspaceId) {
        const sw = await db.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: { originPort: true, destinationPort: true },
        });
        if (!sw)
            return false;
        const po = await db.purchaseOrder.findFirst({
            where: { orderId: orderWorkspaceId },
            orderBy: { createdAt: "desc" },
            select: {
                revisions: {
                    orderBy: { revisionNumber: "desc" },
                    take: 1,
                    select: { snapshotJson: true },
                },
            },
        });
        const snap = po?.revisions[0]?.snapshotJson;
        const fromPo = snap?.header?.destinationCountryCode ?? snap?.header?.destinationCountry ?? null;
        if (isTurkeyCountryCode(fromPo))
            return true;
        const route = resolveFreightRoute(sw.originPort || "", sw.destinationPort || "");
        return isTurkeyCountryCode(route.countryTo);
    }
    function nextActionFor(summary, caseStatus) {
        if (summary.phase === "CLEARED")
            return null;
        if (summary.phase === "READY_BEFORE_ARRIVAL")
            return "Monitor until arrival — preparation ready";
        if (summary.phase === "ARRIVED")
            return "Immediate customs preparation action required";
        if (summary.blockingCount > 0)
            return "Resolve blocking readiness items";
        if (caseStatus === "READY_FOR_BROKER")
            return "Start broker review";
        return summary.label;
    }
    /**
     * Evaluate one shipment. Failure-isolated callers should wrap in try/catch.
     * Idempotent: ensure + readiness + EI keys dedupe.
     */
    async function evaluateShipment(shipmentWorkspaceId, opts) {
        const config = await loadConfig();
        if (!config.enabled && !opts?.force) {
            return {
                shipmentWorkspaceId,
                ensured: false,
                skipped: true,
                skipReason: "DISABLED",
                customsCaseId: null,
                preArrival: null,
            };
        }
        const sw = await db.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: {
                workspaceId: true,
                orderWorkspaceId: true,
                deliveredAt: true,
            },
        });
        if (!sw) {
            return {
                shipmentWorkspaceId,
                ensured: false,
                skipped: true,
                skipReason: "SHIPMENT_NOT_FOUND",
                customsCaseId: null,
                preArrival: null,
            };
        }
        const turkey = await isTurkeyEligible(sw.workspaceId, sw.orderWorkspaceId);
        if (!turkey) {
            return {
                shipmentWorkspaceId,
                ensured: false,
                skipped: true,
                skipReason: "NOT_TURKEY",
                customsCaseId: null,
                preArrival: null,
            };
        }
        const etaInfo = await resolveOperationalEta(sw.workspaceId);
        const days = etaInfo.ata ? 0 : daysUntil(etaInfo.eta);
        const existing = await db.customsCase.findUnique({
            where: { shipmentWorkspaceId: sw.workspaceId },
        });
        if (existing?.status === "CLEARED") {
            const summary = buildPreArrivalSummary({
                caseStatus: "CLEARED",
                readinessStatus: existing.readinessStatus,
                blockingCount: 0,
                warningCount: 0,
                eta: etaInfo.eta?.toISOString() ?? null,
                etaSource: etaInfo.etaSource,
                bookingEta: etaInfo.bookingEta?.toISOString() ?? null,
                maritimeEta: etaInfo.maritimeEta?.toISOString() ?? null,
                ata: etaInfo.ata?.toISOString() ?? null,
                hasCase: true,
                config,
            });
            return {
                shipmentWorkspaceId,
                ensured: false,
                skipped: true,
                skipReason: "CLEARED",
                customsCaseId: existing.id,
                preArrival: summary,
            };
        }
        if (existing?.status === "CANCELLED") {
            return {
                shipmentWorkspaceId,
                ensured: false,
                skipped: true,
                skipReason: "CANCELLED",
                customsCaseId: existing.id,
                preArrival: null,
            };
        }
        const inEnsureWindow = !!etaInfo.ata
            || (days != null && days <= config.caseEnsureDays)
            || (days != null && days <= config.scanHorizonDays);
        const hasEta = !!etaInfo.eta || !!etaInfo.ata;
        if (!existing && !hasEta) {
            return {
                shipmentWorkspaceId,
                ensured: false,
                skipped: true,
                skipReason: "NO_ETA",
                customsCaseId: null,
                preArrival: null,
            };
        }
        if (!existing && !inEnsureWindow) {
            return {
                shipmentWorkspaceId,
                ensured: false,
                skipped: true,
                skipReason: "OUTSIDE_WINDOW",
                customsCaseId: null,
                preArrival: null,
            };
        }
        let ensured = false;
        let caseId = existing?.id ?? null;
        if (!existing) {
            // Ensure when inside caseEnsureDays (or arrived)
            const shouldEnsure = !!etaInfo.ata || (days != null && days <= config.caseEnsureDays) || opts?.force;
            if (shouldEnsure) {
                const dto = await customs.ensure(SYSTEM_ACTOR, { shipmentWorkspaceId: sw.workspaceId });
                caseId = dto.id;
                ensured = true;
                // Provenance event for automation start
                await db.customsCaseEvent.create({
                    data: {
                        customsCaseId: dto.id,
                        actorUserId: SYSTEM_ACTOR.id,
                        source: "SYSTEM_DERIVED",
                        fromStatus: null,
                        toStatus: dto.status,
                        reason: "CUSTOMS_PREPARATION_STARTED",
                        payload: {
                            etaSource: etaInfo.etaSource,
                            eta: etaInfo.eta?.toISOString() ?? null,
                            daysToArrival: days,
                        },
                    },
                }).catch(() => undefined);
            }
            else {
                return {
                    shipmentWorkspaceId,
                    ensured: false,
                    skipped: true,
                    skipReason: "OUTSIDE_ENSURE_WINDOW",
                    customsCaseId: null,
                    preArrival: null,
                };
            }
        }
        if (!caseId) {
            return {
                shipmentWorkspaceId,
                ensured: false,
                skipped: true,
                skipReason: "NO_CASE",
                customsCaseId: null,
                preArrival: null,
            };
        }
        // Canonical readiness (Sprint 37) — also runs base EI
        const readiness = await customs.readiness(SYSTEM_ACTOR, caseId);
        const caseRow = await db.customsCase.findUniqueOrThrow({ where: { id: caseId } });
        const brokerMissing = readiness.checks.some((c) => c.code === "BROKER_ASSIGNMENT" && c.status === "FAIL");
        const originMissing = readiness.checks.some((c) => c.code === "ORIGIN" && c.status === "FAIL");
        const classificationMissing = readiness.checks.some((c) => c.code === "GTIP_CLASSIFICATION" && c.status === "FAIL");
        const classificationCandidate = readiness.checks.some((c) => c.code === "GTIP_CLASSIFICATION" && c.status === "WARNING" && c.reason === "CANDIDATE");
        const invoiceMissing = readiness.checks.some((c) => c.code === "COMMERCIAL_INVOICE" && c.status === "FAIL");
        const packingMissing = readiness.checks.some((c) => c.code === "PACKING_LIST" && c.status === "FAIL");
        const inBrokerWindow = !!etaInfo.ata || (days != null && days <= config.brokerReadyDays);
        const nearHighRisk = !!etaInfo.ata || (days != null && days <= config.highRiskDays);
        const preparationAtRisk = nearHighRisk && readiness.status !== "READY_FOR_BROKER" && caseRow.status !== "CLEARED";
        const brokerReviewPending = inBrokerWindow
            && !brokerMissing
            && readiness.status === "READY_FOR_BROKER"
            && ["DRAFT", "PREPARING", "READY_FOR_BROKER"].includes(caseRow.status);
        const arrivedNotReady = !!etaInfo.ata
            && readiness.status !== "READY_FOR_BROKER"
            && caseRow.status !== "CLEARED"
            && caseRow.status !== "CANCELLED";
        // Time-aware re-evaluation (same automation keys; escalates severity)
        // Only raise broker-missing when inside broker window (false-positive protection)
        await ei.onCustomsReadiness({
            orderId: caseRow.orderWorkspaceId,
            shipmentWorkspaceId: sw.workspaceId,
            customsCaseId: caseId,
            brokerMissing: brokerMissing && inBrokerWindow,
            originMissing: originMissing && (inBrokerWindow || nearHighRisk || !!etaInfo.ata),
            classificationMissing: classificationMissing && (inBrokerWindow || nearHighRisk || !!etaInfo.ata),
            classificationCandidate: classificationCandidate && nearHighRisk,
            onHold: caseRow.status === "HOLD",
            invoiceMissing: invoiceMissing && (inEnsureWindow || !!etaInfo.ata),
            packingMissing: packingMissing && (inEnsureWindow || !!etaInfo.ata),
            daysToArrival: days,
            arrived: !!etaInfo.ata,
            preparationAtRisk,
            brokerReviewPending,
            arrivedNotReady,
        });
        if (etaInfo.ata && caseRow.status !== "CLEARED") {
            const daysSince = (Date.now() - etaInfo.ata.getTime()) / 86_400_000;
            await ei.onCustomsClearanceDelay({
                orderId: caseRow.orderWorkspaceId,
                shipmentWorkspaceId: sw.workspaceId,
                customsCaseId: caseId,
                daysSinceArrival: daysSince,
                thresholdDays: 3,
                cleared: false,
            });
        }
        const summary = buildPreArrivalSummary({
            caseStatus: caseRow.status,
            readinessStatus: readiness.status,
            blockingCount: readiness.blockingCount,
            warningCount: readiness.warningCount,
            eta: etaInfo.eta?.toISOString() ?? null,
            etaSource: etaInfo.etaSource,
            bookingEta: etaInfo.bookingEta?.toISOString() ?? null,
            maritimeEta: etaInfo.maritimeEta?.toISOString() ?? null,
            ata: etaInfo.ata?.toISOString() ?? null,
            hasCase: true,
            config,
        });
        summary.nextAction = nextActionFor(summary, caseRow.status);
        return {
            shipmentWorkspaceId,
            ensured,
            skipped: false,
            skipReason: null,
            customsCaseId: caseId,
            preArrival: summary,
        };
    }
    /** Safe wrapper — never throws to tracking/booking callers. */
    async function safeEvaluateShipment(shipmentWorkspaceId) {
        try {
            return await evaluateShipment(shipmentWorkspaceId);
        }
        catch (err) {
            console.error("[pre-arrival-customs] evaluation failed", shipmentWorkspaceId, err);
            return {
                shipmentWorkspaceId,
                ensured: false,
                skipped: true,
                skipReason: "EVAL_FAILED",
                customsCaseId: null,
                preArrival: null,
            };
        }
    }
    /**
     * Bounded scan: Turkey-likely PODs / existing cases with ETA in horizon.
     */
    async function runScan(limit = 40) {
        const config = await loadConfig();
        if (!config.enabled)
            return { evaluated: 0, ensured: 0, skipped: 0 };
        const horizon = new Date(Date.now() + config.scanHorizonDays * 86_400_000);
        const now = new Date(Date.now() - 1 * 86_400_000); // include recently due
        const candidates = await db.shipmentWorkspace.findMany({
            where: {
                OR: [
                    { destinationPort: { startsWith: "TR" } },
                    { destinationPort: { contains: "IST" } },
                    { destinationPort: { contains: "MER" } },
                    { destinationPort: { contains: "IZM" } },
                    {
                        customsCases: {
                            some: { status: { notIn: ["CLEARED", "CANCELLED"] } },
                        },
                    },
                ],
                AND: [
                    {
                        OR: [
                            { eta: { lte: horizon, gte: now } },
                            { arrivedAt: { not: null }, customsCompletedAt: null },
                            {
                                workspaceId: {
                                    in: (await db.shipmentTrackingSnapshot.findMany({
                                        where: { eta: { lte: horizon, gte: now } },
                                        select: { shipmentId: true },
                                        distinct: ["shipmentId"],
                                        take: limit,
                                    })).map((s) => s.shipmentId),
                                },
                            },
                        ],
                    },
                ],
            },
            select: { workspaceId: true },
            take: limit,
            orderBy: { eta: "asc" },
        });
        let evaluated = 0;
        let ensured = 0;
        let skipped = 0;
        for (const row of candidates) {
            const r = await safeEvaluateShipment(row.workspaceId);
            evaluated++;
            if (r.ensured)
                ensured++;
            if (r.skipped)
                skipped++;
        }
        return { evaluated, ensured, skipped };
    }
    async function summarizeForCase(customsCaseId) {
        const row = await db.customsCase.findUnique({ where: { id: customsCaseId } });
        if (!row)
            return null;
        const etaInfo = await resolveOperationalEta(row.shipmentWorkspaceId);
        const readinessStatus = row.readinessStatus;
        // Lightweight: use stored readiness; detail endpoints refresh via readiness()
        const summary = buildPreArrivalSummary({
            caseStatus: row.status,
            readinessStatus,
            blockingCount: readinessStatus === "NOT_READY" ? 1 : 0,
            warningCount: readinessStatus === "PARTIALLY_READY" ? 1 : 0,
            eta: etaInfo.eta?.toISOString() ?? null,
            etaSource: etaInfo.etaSource,
            bookingEta: etaInfo.bookingEta?.toISOString() ?? null,
            maritimeEta: etaInfo.maritimeEta?.toISOString() ?? null,
            ata: etaInfo.ata?.toISOString() ?? null,
            hasCase: true,
        });
        summary.nextAction = nextActionFor(summary, row.status);
        return summary;
    }
    return {
        evaluateShipment,
        safeEvaluateShipment,
        runScan,
        resolveOperationalEta,
        summarizeForCase,
        loadConfig,
    };
}
//# sourceMappingURL=pre-arrival-customs.service.js.map