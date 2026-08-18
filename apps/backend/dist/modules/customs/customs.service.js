import { env } from "../../config/env.js";
import { assertCanTransitionCustomsStatus, canTransitionCustomsStatus, isTurkeyCountryCode, summarizeReadiness, } from "@dmx/contracts/customs";
import { AppError } from "../../utils/httpErrors.js";
import { resolveFreightRoute } from "../freightiq/commercial/freight-route.util.js";
import { canAccessShipment } from "../shipment/shipment.policy.js";
import { ExceptionIntelligenceService } from "../exception-intelligence/exception-intelligence.service.js";
import { assertBuyerCustomsListAccess, assertCustomsCaseAccess, canManageCustomsAsBuyer, isCustomsDeniedRole, resolveActorOrganisationId, } from "./customs.policy.js";
import { createDutyTaxService } from "./duty-tax.service.js";
import { createLandedCostService } from "../landed-cost/landed-cost.service.js";
const CLEARANCE_DELAY_DAYS = 3;
function iso(d) {
    return d ? d.toISOString() : null;
}
function mapCase(row, extra) {
    return {
        id: row.id,
        organisationId: row.organisationId,
        shipmentWorkspaceId: row.shipmentWorkspaceId,
        orderWorkspaceId: row.orderWorkspaceId,
        status: row.status,
        readinessStatus: row.readinessStatus,
        destinationCountryCode: row.destinationCountryCode,
        brokerUserId: row.brokerUserId,
        brokerAssignmentId: row.brokerAssignmentId,
        declarationReference: row.declarationReference,
        declarationDate: iso(row.declarationDate),
        customsOffice: row.customsOffice,
        statusSource: row.statusSource,
        holdCategory: row.holdCategory ?? null,
        holdReason: row.holdReason,
        holdAt: iso(row.holdAt),
        clearedAt: iso(row.clearedAt),
        cancelledAt: iso(row.cancelledAt),
        notes: row.notes,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        ...extra,
    };
}
function sourceForActor(user, override) {
    if (override)
        return override;
    const r = String(user.role);
    if (r === "CUSTOMS_BROKER")
        return "CUSTOMS_BROKER";
    if (r === "BUYER")
        return "BUYER";
    if (r === "ADMIN" || r === "SUPER_ADMIN" || r === "OPS_MANAGER" || r === "LOGISTICS_OPERATOR") {
        return "DEMAXTORE_OPERATIONS";
    }
    return "SYSTEM_DERIVED";
}
export function createCustomsService(db) {
    const ei = new ExceptionIntelligenceService(db);
    async function resolveOrganisationIdForShipment(shipmentWorkspaceId) {
        const sw = await db.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: { buyerUserId: true },
        });
        if (!sw)
            throw new AppError(404, "SHIPMENT_NOT_FOUND");
        const buyer = await db.user.findUnique({
            where: { id: sw.buyerUserId },
            select: { organisationId: true },
        });
        if (!buyer?.organisationId) {
            throw new AppError(400, "SHIPMENT_BUYER_ORG_MISSING");
        }
        return buyer.organisationId;
    }
    async function resolveDestinationCountry(shipmentWorkspaceId, orderWorkspaceId) {
        const sw = await db.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: { originPort: true, destinationPort: true },
        });
        if (!sw)
            return { eligible: false, countryCode: null };
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
        const fromPo = snap?.header?.destinationCountryCode
            ?? snap?.header?.destinationCountry
            ?? snap?.destinationCountryCode
            ?? snap?.destinationCountry
            ?? null;
        if (isTurkeyCountryCode(fromPo)) {
            return { eligible: true, countryCode: "TR" };
        }
        const route = resolveFreightRoute(sw.originPort || "", sw.destinationPort || "");
        if (isTurkeyCountryCode(route.countryTo)) {
            return { eligible: true, countryCode: "TR" };
        }
        return { eligible: false, countryCode: fromPo ?? route.countryTo ?? null };
    }
    async function syncBrokerFromAssignment(customsCaseId, shipmentWorkspaceId) {
        const assignment = await db.partnerAssignment.findFirst({
            where: {
                workspaceId: shipmentWorkspaceId,
                partnerRole: "CUSTOMS_BROKER",
                revokedAt: null,
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, userId: true },
        });
        await db.customsCase.update({
            where: { id: customsCaseId },
            data: {
                brokerUserId: assignment?.userId ?? null,
                brokerAssignmentId: assignment?.id ?? null,
            },
        });
        return assignment;
    }
    async function loadProductLines(shipmentWorkspaceId) {
        const allocations = await db.shipmentLineAllocation.findMany({
            where: { shipmentWorkspaceId },
            include: {
                purchaseOrderLine: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                sku: true,
                                name: true,
                                countryOfOrigin: true,
                                gtipCode: true,
                                classificationStatus: true,
                                customsDescription: true,
                            },
                        },
                        purchaseOrder: { select: { id: true, poNumber: true } },
                    },
                },
            },
        });
        return allocations.map((a) => {
            const line = a.purchaseOrderLine;
            const product = line.product;
            return {
                purchaseOrderLineId: line.id,
                purchaseOrderId: line.purchaseOrderId,
                poNumber: line.purchaseOrder.poNumber,
                productId: product?.id ?? line.productId ?? null,
                sku: product?.sku ?? line.sku ?? null,
                description: line.description,
                quantity: Number(line.quantity),
                allocatedQuantity: Number(a.quantity),
                countryOfOrigin: product?.countryOfOrigin ?? null,
                gtipCode: product?.gtipCode ?? null,
                classificationStatus: product?.classificationStatus ?? (line.productId ? null : null),
                customsDescription: product?.customsDescription ?? null,
            };
        });
    }
    async function documentStatus(shipmentWorkspaceId, orderWorkspaceId, docType) {
        const docs = await db.tradeDocument.findMany({
            where: {
                documentType: docType,
                OR: [
                    { workspaceType: "SHIPMENT", workspaceId: shipmentWorkspaceId },
                    { workspaceType: "ORDER", workspaceId: orderWorkspaceId },
                ],
            },
            select: { status: true },
        });
        if (docs.some((d) => d.status === "APPROVED"))
            return "APPROVED";
        if (docs.some((d) => ["UPLOADED", "UNDER_REVIEW", "APPROVED"].includes(d.status))) {
            return "PRESENT";
        }
        return "MISSING";
    }
    async function evaluateReadiness(caseRow) {
        await syncBrokerFromAssignment(caseRow.id, caseRow.shipmentWorkspaceId);
        const fresh = await db.customsCase.findUniqueOrThrow({ where: { id: caseRow.id } });
        const products = await loadProductLines(fresh.shipmentWorkspaceId);
        const checks = [];
        if (products.length === 0) {
            checks.push({
                code: "PRODUCT_LINKED",
                status: "FAIL",
                reason: "NO_LINE_ALLOCATIONS",
                label: "Shipment has no PO line allocations",
            });
        }
        else {
            const linked = products.some((p) => !!p.productId);
            checks.push({
                code: "PRODUCT_LINKED",
                status: linked ? "PASS" : "WARNING",
                reason: linked ? null : "HISTORICAL_LINES_WITHOUT_PRODUCT",
                label: linked ? "Product linked" : "Lines present without Product Master link",
            });
        }
        const withProduct = products.filter((p) => p.productId);
        const originMissing = withProduct.some((p) => !p.countryOfOrigin);
        checks.push({
            code: "ORIGIN",
            status: withProduct.length === 0 ? "WARNING" : originMissing ? "FAIL" : "PASS",
            reason: originMissing ? "ORIGIN_MISSING" : null,
            label: "Country of Origin",
        });
        const unclassified = withProduct.filter((p) => !p.gtipCode || p.classificationStatus === "UNCLASSIFIED");
        const candidate = withProduct.filter((p) => p.classificationStatus === "CANDIDATE");
        if (unclassified.length > 0) {
            checks.push({
                code: "GTIP_CLASSIFICATION",
                status: "FAIL",
                reason: "CLASSIFICATION_MISSING",
                label: "GTİP / tariff reference",
            });
        }
        else if (candidate.length > 0) {
            checks.push({
                code: "GTIP_CLASSIFICATION",
                status: "WARNING",
                reason: "CANDIDATE",
                label: "GTİP classification is CANDIDATE (not legally confirmed)",
            });
        }
        else if (withProduct.length === 0) {
            checks.push({
                code: "GTIP_CLASSIFICATION",
                status: "WARNING",
                reason: "NO_PRODUCT",
                label: "GTİP / tariff reference",
            });
        }
        else {
            checks.push({
                code: "GTIP_CLASSIFICATION",
                status: "PASS",
                reason: null,
                label: "GTİP reference present",
            });
        }
        checks.push({
            code: "BROKER_ASSIGNMENT",
            status: fresh.brokerAssignmentId ? "PASS" : "FAIL",
            reason: fresh.brokerAssignmentId ? null : "BROKER_MISSING",
            label: "Customs broker assigned",
        });
        const invoice = await documentStatus(fresh.shipmentWorkspaceId, fresh.orderWorkspaceId, "COMMERCIAL_INVOICE");
        checks.push({
            code: "COMMERCIAL_INVOICE",
            status: invoice === "MISSING" ? "FAIL" : "PASS",
            reason: invoice === "MISSING" ? "DOCUMENT_MISSING" : null,
            label: "Commercial Invoice",
        });
        const packing = await documentStatus(fresh.shipmentWorkspaceId, fresh.orderWorkspaceId, "PACKING_LIST");
        checks.push({
            code: "PACKING_LIST",
            status: packing === "MISSING" ? "FAIL" : "PASS",
            reason: packing === "MISSING" ? "DOCUMENT_MISSING" : null,
            label: "Packing List",
        });
        const bol = await documentStatus(fresh.shipmentWorkspaceId, fresh.orderWorkspaceId, "BILL_OF_LADING");
        checks.push({
            code: "BILL_OF_LADING",
            status: bol === "MISSING" ? "WARNING" : "PASS",
            reason: bol === "MISSING" ? "DOCUMENT_MISSING" : null,
            label: "Bill of Lading",
        });
        const readiness = summarizeReadiness(checks);
        await db.customsCase.update({
            where: { id: fresh.id },
            data: { readinessStatus: readiness.status },
        });
        await applyExceptionRules(fresh, readiness, products, {
            invoiceMissing: invoice === "MISSING",
            packingMissing: packing === "MISSING",
        });
        return readiness;
    }
    async function applyExceptionRules(caseRow, readiness, products, docs) {
        const orderId = caseRow.orderWorkspaceId;
        const cid = caseRow.id;
        const applyOrResolve = async (key, outcome) => {
            if (!outcome) {
                await ei["issues"].resolveAutomatedIssue({
                    orderId,
                    automationKey: key,
                    resolutionNote: "Customs readiness condition cleared.",
                });
                return;
            }
            await ei["applyOutcome"](orderId, key, outcome, {
                relatedEntityType: "SHIPMENT",
                relatedEntityId: caseRow.shipmentWorkspaceId,
            });
        };
        // Use public safeEvaluate wrappers via dedicated methods below instead of private access.
        await evaluateAndSyncExceptions(caseRow, readiness, products, docs);
    }
    async function evaluateAndSyncExceptions(caseRow, readiness, products, docs) {
        const orderId = caseRow.orderWorkspaceId;
        const shipmentWorkspaceId = caseRow.shipmentWorkspaceId;
        const brokerMissing = readiness.checks.some((c) => c.code === "BROKER_ASSIGNMENT" && c.status === "FAIL");
        const originMissing = readiness.checks.some((c) => c.code === "ORIGIN" && c.status === "FAIL");
        const classMissing = readiness.checks.some((c) => c.code === "GTIP_CLASSIFICATION" && c.status === "FAIL");
        const onHold = caseRow.status === "HOLD";
        await ei.onCustomsReadiness({
            orderId,
            shipmentWorkspaceId,
            customsCaseId: caseRow.id,
            brokerMissing,
            originMissing,
            classificationMissing: classMissing,
            onHold,
            invoiceMissing: docs.invoiceMissing,
            packingMissing: docs.packingMissing,
        });
        const sw = await db.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: { arrivedAt: true },
        });
        if (sw?.arrivedAt && caseRow.status !== "CLEARED" && caseRow.status !== "CANCELLED") {
            const days = (Date.now() - sw.arrivedAt.getTime()) / 86_400_000;
            await ei.onCustomsClearanceDelay({
                orderId,
                shipmentWorkspaceId,
                customsCaseId: caseRow.id,
                daysSinceArrival: days,
                thresholdDays: CLEARANCE_DELAY_DAYS,
                cleared: false,
            });
        }
        else if (caseRow.status === "CLEARED") {
            await ei.onCustomsClearanceDelay({
                orderId,
                shipmentWorkspaceId,
                customsCaseId: caseRow.id,
                daysSinceArrival: 0,
                thresholdDays: CLEARANCE_DELAY_DAYS,
                cleared: true,
            });
        }
        void products;
    }
    async function recordEvent(customsCaseId, actorUserId, source, fromStatus, toStatus, reason, payload = {}) {
        await db.customsCaseEvent.create({
            data: {
                customsCaseId,
                actorUserId,
                source,
                fromStatus,
                toStatus,
                reason: reason ?? null,
                payload: payload,
            },
        });
    }
    async function enrichCase(row, includeDetail = false) {
        const sw = await db.shipmentWorkspace.findUnique({
            where: { workspaceId: row.shipmentWorkspaceId },
            select: {
                referenceNumber: true,
                orderRef: true,
                eta: true,
                arrivedAt: true,
                originPort: true,
                destinationPort: true,
            },
        });
        const extra = {
            shipmentRef: sw?.referenceNumber ?? sw?.orderRef ?? null,
            eta: iso(sw?.eta),
            ata: iso(sw?.arrivedAt),
            originPort: sw?.originPort ?? null,
            destinationPort: sw?.destinationPort ?? null,
        };
        if (includeDetail) {
            extra.readiness = await evaluateReadiness(row);
            const refreshed = await db.customsCase.findUniqueOrThrow({ where: { id: row.id } });
            extra.products = await loadProductLines(row.shipmentWorkspaceId);
            return mapCase(refreshed, extra);
        }
        return mapCase(row, extra);
    }
    return {
        async ensure(actor, input) {
            if (isCustomsDeniedRole(actor) || String(actor.role) === "CUSTOMS_BROKER") {
                throw new AppError(403, "CUSTOMS_FORBIDDEN");
            }
            if (!canManageCustomsAsBuyer(actor))
                throw new AppError(403, "CUSTOMS_FORBIDDEN");
            const sw = await db.shipmentWorkspace.findUnique({
                where: { workspaceId: input.shipmentWorkspaceId },
            });
            if (!sw)
                throw new AppError(404, "SHIPMENT_NOT_FOUND");
            const ok = await canAccessShipment(db, actor, sw.workspaceId);
            if (!ok && actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
                throw new AppError(403, "CUSTOMS_FORBIDDEN");
            }
            const dest = await resolveDestinationCountry(sw.workspaceId, sw.orderWorkspaceId);
            if (!dest.eligible) {
                throw new AppError(400, "NOT_TURKEY_IMPORT");
            }
            const existing = await db.customsCase.findUnique({
                where: { shipmentWorkspaceId: sw.workspaceId },
            });
            if (existing && existing.status !== "CANCELLED") {
                await syncBrokerFromAssignment(existing.id, existing.shipmentWorkspaceId);
                const readiness = await evaluateReadiness(existing);
                const refreshed = await db.customsCase.findUniqueOrThrow({ where: { id: existing.id } });
                return enrichCase(refreshed, false).then((dto) => ({ ...dto, readiness }));
            }
            const organisationId = await resolveOrganisationIdForShipment(sw.workspaceId);
            if (existing?.status === "CANCELLED") {
                // Unique on shipment — reopen cancelled case instead of inserting a second row.
                const reopened = await db.customsCase.update({
                    where: { id: existing.id },
                    data: {
                        status: "DRAFT",
                        readinessStatus: "NOT_READY",
                        destinationCountryCode: dest.countryCode,
                        organisationId,
                        cancelledAt: null,
                        cancelReason: null,
                        clearedAt: null,
                        holdCategory: null,
                        holdReason: null,
                        holdAt: null,
                        previousStatusBeforeHold: null,
                        updatedById: actor.id,
                        statusSource: "SYSTEM_DERIVED",
                    },
                });
                await recordEvent(reopened.id, actor.id, "SYSTEM_DERIVED", "CANCELLED", "DRAFT", "Reopened cancelled customs case");
                const readiness = await evaluateReadiness(reopened);
                const refreshed = await db.customsCase.findUniqueOrThrow({ where: { id: reopened.id } });
                return { ...(await enrichCase(refreshed, false)), readiness };
            }
            const created = await db.customsCase.create({
                data: {
                    organisationId,
                    shipmentWorkspaceId: sw.workspaceId,
                    orderWorkspaceId: sw.orderWorkspaceId,
                    status: "DRAFT",
                    readinessStatus: "NOT_READY",
                    destinationCountryCode: dest.countryCode,
                    createdById: actor.id,
                    statusSource: "SYSTEM_DERIVED",
                },
            });
            await recordEvent(created.id, actor.id, "SYSTEM_DERIVED", null, "DRAFT", "Customs case created");
            const readiness = await evaluateReadiness(created);
            const refreshed = await db.customsCase.findUniqueOrThrow({ where: { id: created.id } });
            return { ...(await enrichCase(refreshed, false)), readiness };
        },
        async list(actor, query) {
            assertBuyerCustomsListAccess(actor);
            const orgId = await resolveActorOrganisationId(db, actor);
            const where = {
                status: query.status ?? { not: "CANCELLED" },
            };
            if (orgId)
                where.organisationId = orgId;
            if (query.readiness)
                where.readinessStatus = query.readiness;
            if (query.attention) {
                where.OR = [
                    { status: "HOLD" },
                    { readinessStatus: { in: ["NOT_READY", "PARTIALLY_READY"] } },
                    { status: { in: ["READY_FOR_BROKER", "BROKER_REVIEW", "DECLARATION_FILED", "CUSTOMS_PROCESSING"] } },
                ];
            }
            const page = query.page ?? 1;
            const pageSize = query.pageSize ?? 25;
            const [totalItems, rows] = await Promise.all([
                db.customsCase.count({ where }),
                db.customsCase.findMany({
                    where,
                    orderBy: { updatedAt: "desc" },
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                }),
            ]);
            const items = await Promise.all(rows.map((r) => enrichCase(r, false)));
            return {
                items,
                pagination: {
                    page,
                    pageSize,
                    totalItems,
                    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
                },
            };
        },
        async get(actor, id) {
            const row = await db.customsCase.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "CUSTOMS_CASE_NOT_FOUND");
            await assertCustomsCaseAccess(db, actor, row);
            return enrichCase(row, true);
        },
        async getByShipment(actor, shipmentWorkspaceId) {
            const row = await db.customsCase.findUnique({ where: { shipmentWorkspaceId } });
            if (!row) {
                // Eligibility peek for UI — no case created.
                if (isCustomsDeniedRole(actor) || String(actor.role) === "CUSTOMS_BROKER") {
                    throw new AppError(403, "CUSTOMS_FORBIDDEN");
                }
                const sw = await db.shipmentWorkspace.findUnique({
                    where: { workspaceId: shipmentWorkspaceId },
                });
                if (!sw)
                    throw new AppError(404, "SHIPMENT_NOT_FOUND");
                const ok = await canAccessShipment(db, actor, shipmentWorkspaceId);
                if (!ok && actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
                    throw new AppError(403, "CUSTOMS_FORBIDDEN");
                }
                const dest = await resolveDestinationCountry(shipmentWorkspaceId, sw.orderWorkspaceId);
                return null;
            }
            await assertCustomsCaseAccess(db, actor, row);
            return enrichCase(row, true);
        },
        async readiness(actor, id) {
            const row = await db.customsCase.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "CUSTOMS_CASE_NOT_FOUND");
            await assertCustomsCaseAccess(db, actor, row);
            return evaluateReadiness(row);
        },
        async transition(actor, id, input) {
            const row = await db.customsCase.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "CUSTOMS_CASE_NOT_FOUND");
            const access = await assertCustomsCaseAccess(db, actor, row);
            const to = input.toStatus;
            const from = row.status;
            if (to === "HOLD") {
                throw new AppError(400, "USE_HOLD_ENDPOINT");
            }
            if (from === "HOLD") {
                throw new AppError(400, "USE_RESOLVE_HOLD_ENDPOINT");
            }
            // Brokers may advance prep → review → declaration → clearance (Sprint 39 startReview path).
            if (access === "BROKER") {
                const brokerAllowed = new Set([
                    "PREPARING",
                    "READY_FOR_BROKER",
                    "BROKER_REVIEW",
                    "DECLARATION_PREPARING",
                    "DECLARATION_FILED",
                    "CUSTOMS_PROCESSING",
                    "CLEARANCE_PENDING",
                    "CLEARED",
                ]);
                if (!brokerAllowed.has(to)) {
                    throw new AppError(403, "BROKER_TRANSITION_FORBIDDEN");
                }
            }
            try {
                assertCanTransitionCustomsStatus(from, to);
            }
            catch {
                throw new AppError(409, `INVALID_CUSTOMS_TRANSITION:${from}->${to}`);
            }
            if (!canTransitionCustomsStatus(from, to)) {
                throw new AppError(409, `INVALID_CUSTOMS_TRANSITION:${from}->${to}`);
            }
            const source = sourceForActor(actor, input.source);
            const data = {
                status: to,
                statusSource: source,
                updatedById: actor.id,
            };
            if (to === "CLEARED") {
                data.clearedAt = new Date();
            }
            if (to === "CANCELLED") {
                data.cancelledAt = new Date();
                data.cancelReason = input.reason ?? null;
            }
            const updated = await db.customsCase.update({ where: { id }, data });
            await recordEvent(id, actor.id, source, from, to, input.reason ?? null);
            // CLEARED must NOT set shipment deliveredAt / DELIVERED
            if (to === "CLEARED") {
                await db.shipmentWorkspace.update({
                    where: { workspaceId: updated.shipmentWorkspaceId },
                    data: { customsCompletedAt: new Date() },
                });
                // Best-effort: seed DutyTaxCalculation + refresh Landed Cost (does not fail CLEARED).
                try {
                    await createDutyTaxService(db).calculate(actor, id, {
                        targetCurrency: "TRY",
                        exchangeRate: env.CUSTOMS_DEFAULT_USD_TRY_RATE,
                        exchangeRateSource: "SYSTEM_CONFIGURED",
                        freightAllocationMethod: "VALUE",
                    });
                    const swMeta = await db.shipmentWorkspace.findUnique({
                        where: { workspaceId: updated.shipmentWorkspaceId },
                        select: { buyerUserId: true },
                    });
                    const buyer = swMeta?.buyerUserId
                        ? await db.user.findUnique({ where: { id: swMeta.buyerUserId } })
                        : null;
                    if (buyer) {
                        await createLandedCostService(db).calculate({ id: buyer.id, role: buyer.role, email: buyer.email }, {
                            shipmentWorkspaceId: updated.shipmentWorkspaceId,
                            calculationCurrency: "USD",
                            fxRates: {
                                TRY: 1 / env.CUSTOMS_DEFAULT_USD_TRY_RATE,
                                EUR: env.CUSTOMS_DEFAULT_USD_EUR_RATE,
                            },
                        });
                    }
                }
                catch {
                    // CLEARED remains authoritative; duty/LC can be completed via UI.
                }
            }
            const readiness = await evaluateReadiness(updated);
            const refreshed = await db.customsCase.findUniqueOrThrow({ where: { id } });
            return { ...(await enrichCase(refreshed, false)), readiness };
        },
        async placeHold(actor, id, input) {
            const row = await db.customsCase.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "CUSTOMS_CASE_NOT_FOUND");
            await assertCustomsCaseAccess(db, actor, row);
            if (row.status === "CLEARED" || row.status === "CANCELLED" || row.status === "HOLD") {
                throw new AppError(409, `INVALID_CUSTOMS_TRANSITION:${row.status}->HOLD`);
            }
            if (!canTransitionCustomsStatus(row.status, "HOLD")) {
                throw new AppError(409, `INVALID_CUSTOMS_TRANSITION:${row.status}->HOLD`);
            }
            const source = sourceForActor(actor);
            const updated = await db.customsCase.update({
                where: { id },
                data: {
                    previousStatusBeforeHold: row.status,
                    status: "HOLD",
                    holdCategory: input.category,
                    holdReason: input.reason,
                    holdAt: new Date(),
                    statusSource: source,
                    updatedById: actor.id,
                },
            });
            await recordEvent(id, actor.id, source, row.status, "HOLD", input.reason, {
                category: input.category,
            });
            const readiness = await evaluateReadiness(updated);
            const refreshed = await db.customsCase.findUniqueOrThrow({ where: { id } });
            return { ...(await enrichCase(refreshed, false)), readiness };
        },
        async resolveHold(actor, id, input) {
            const row = await db.customsCase.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "CUSTOMS_CASE_NOT_FOUND");
            await assertCustomsCaseAccess(db, actor, row);
            if (row.status !== "HOLD")
                throw new AppError(409, "NOT_ON_HOLD");
            const resume = (input.resumeStatus
                ?? row.previousStatusBeforeHold
                ?? "PREPARING");
            if (resume === "HOLD" || resume === "CANCELLED" || resume === "CLEARED") {
                throw new AppError(400, "INVALID_RESUME_STATUS");
            }
            const source = sourceForActor(actor);
            const updated = await db.customsCase.update({
                where: { id },
                data: {
                    status: resume,
                    holdCategory: null,
                    holdReason: null,
                    holdAt: null,
                    previousStatusBeforeHold: null,
                    statusSource: source,
                    updatedById: actor.id,
                },
            });
            await recordEvent(id, actor.id, source, "HOLD", resume, input.reason ?? "Hold resolved");
            const readiness = await evaluateReadiness(updated);
            const refreshed = await db.customsCase.findUniqueOrThrow({ where: { id } });
            return { ...(await enrichCase(refreshed, false)), readiness };
        },
        async recordDeclaration(actor, id, input) {
            const row = await db.customsCase.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "CUSTOMS_CASE_NOT_FOUND");
            await assertCustomsCaseAccess(db, actor, row);
            const source = sourceForActor(actor);
            let nextStatus = row.status;
            if (row.status === "DECLARATION_PREPARING"
                || row.status === "BROKER_REVIEW"
                || row.status === "READY_FOR_BROKER") {
                if (canTransitionCustomsStatus(row.status, "DECLARATION_FILED")) {
                    nextStatus = "DECLARATION_FILED";
                }
                else if (row.status === "BROKER_REVIEW"
                    && canTransitionCustomsStatus("BROKER_REVIEW", "DECLARATION_PREPARING")) {
                    // step through preparing then filed in one operational record
                    await db.customsCase.update({
                        where: { id },
                        data: { status: "DECLARATION_PREPARING", statusSource: source, updatedById: actor.id },
                    });
                    await recordEvent(id, actor.id, source, row.status, "DECLARATION_PREPARING", "Auto-advance before declaration record");
                    nextStatus = "DECLARATION_FILED";
                }
            }
            const updated = await db.customsCase.update({
                where: { id },
                data: {
                    declarationReference: input.declarationReference,
                    declarationDate: input.declarationDate ? new Date(input.declarationDate) : new Date(),
                    customsOffice: input.customsOffice ?? row.customsOffice,
                    status: nextStatus,
                    statusSource: source,
                    updatedById: actor.id,
                },
            });
            if (nextStatus !== row.status) {
                await recordEvent(id, actor.id, source, row.status === "BROKER_REVIEW" ? "DECLARATION_PREPARING" : row.status, nextStatus, input.reason ?? "External declaration reference recorded", { declarationReference: input.declarationReference });
            }
            else {
                await recordEvent(id, actor.id, source, row.status, row.status, input.reason ?? "Declaration reference updated", { declarationReference: input.declarationReference });
            }
            const readiness = await evaluateReadiness(updated);
            const refreshed = await db.customsCase.findUniqueOrThrow({ where: { id } });
            return { ...(await enrichCase(refreshed, false)), readiness };
        },
        async syncBroker(actor, id) {
            const row = await db.customsCase.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "CUSTOMS_CASE_NOT_FOUND");
            await assertCustomsCaseAccess(db, actor, row);
            await syncBrokerFromAssignment(id, row.shipmentWorkspaceId);
            const readiness = await evaluateReadiness(row);
            const refreshed = await db.customsCase.findUniqueOrThrow({ where: { id } });
            return { ...(await enrichCase(refreshed, false)), readiness };
        },
        async events(actor, id) {
            const row = await db.customsCase.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "CUSTOMS_CASE_NOT_FOUND");
            await assertCustomsCaseAccess(db, actor, row);
            const rows = await db.customsCaseEvent.findMany({
                where: { customsCaseId: id },
                orderBy: { createdAt: "desc" },
                take: 100,
            });
            return rows.map((e) => ({
                id: e.id,
                source: e.source,
                fromStatus: e.fromStatus,
                toStatus: e.toStatus,
                reason: e.reason,
                actorUserId: e.actorUserId,
                payload: e.payload,
                createdAt: e.createdAt.toISOString(),
            }));
        },
        /** Turkey eligibility without creating a case (Shipment Workspace UI). */
        async eligibility(actor, shipmentWorkspaceId) {
            if (isCustomsDeniedRole(actor))
                throw new AppError(403, "CUSTOMS_FORBIDDEN");
            const sw = await db.shipmentWorkspace.findUnique({
                where: { workspaceId: shipmentWorkspaceId },
            });
            if (!sw)
                throw new AppError(404, "SHIPMENT_NOT_FOUND");
            if (String(actor.role) === "CUSTOMS_BROKER") {
                await assertCustomsCaseAccess(db, actor, {
                    id: "00000000-0000-0000-0000-000000000000",
                    organisationId: "",
                    shipmentWorkspaceId,
                    brokerUserId: actor.id,
                }).catch(() => {
                    throw new AppError(403, "PARTNER_NOT_ASSIGNED");
                });
            }
            else {
                const ok = await canAccessShipment(db, actor, shipmentWorkspaceId);
                if (!ok && actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
                    throw new AppError(403, "CUSTOMS_FORBIDDEN");
                }
            }
            const dest = await resolveDestinationCountry(shipmentWorkspaceId, sw.orderWorkspaceId);
            const existing = await db.customsCase.findUnique({
                where: { shipmentWorkspaceId },
                select: { id: true, status: true, readinessStatus: true },
            });
            return {
                eligible: dest.eligible,
                destinationCountryCode: dest.countryCode,
                customsCaseId: existing && existing.status !== "CANCELLED" ? existing.id : null,
                status: existing && existing.status !== "CANCELLED" ? existing.status : null,
                readinessStatus: existing && existing.status !== "CANCELLED" ? existing.readinessStatus : null,
            };
        },
        // exposed for tests
        _evaluateReadiness: evaluateReadiness,
        _resolveDestinationCountry: resolveDestinationCountry,
    };
}
//# sourceMappingURL=customs.service.js.map