import { UNKNOWN_DAYS_SINCE_ACTIVITY } from "@dmx/contracts/activity-days";
import { resolveFreightRoute } from "../freightiq/commercial/freight-route.util.js";
import { buildFunnelStages, buyerActivationScore, classifyBuyer, classifySupplier, supplierGrowthScore, } from "./growth.analytics.js";
import { growthAudit } from "./growth-audit.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { cached } from "../../lib/response-cache.js";
import { SocketEvents } from "@dmx/contracts/socket-events";
const DRAFT = "RFQ_DRAFT";
const AVG_FREIGHT_MARGIN = 250;
const AVG_ORDER_VALUE = 5000;
export class GrowthService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getFunnel() {
        return cached("growth:funnel", 10 * 60_000, async () => {
            const rows = await this.loadRfqFunnelRows();
            const metrics = await this.computeFunnelCounts(rows);
            await growthAudit(this.db, "growth.report.generated", { report: "funnel" });
            socketBus.scheduleEmit(() => {
                socketBus.emitToRole("ADMIN", SocketEvents.GROWTH_FUNNEL_UPDATED, { at: new Date().toISOString() });
            });
            return metrics;
        });
    }
    async getConversion() {
        const rows = await this.loadRfqFunnelRows();
        const f = await this.computeFunnelCounts(rows);
        return this.conversionFromFunnel(f);
    }
    async getDropoffs() {
        const rows = await this.loadRfqFunnelRows();
        const f = await this.computeFunnelCounts(rows);
        return this.dropoffsFromFunnel(f);
    }
    async getInsights() {
        return cached("growth:insights", 10 * 60_000, () => this.buildInsights());
    }
    async buildInsights() {
        const rows = await this.loadRfqFunnelRows();
        const batch = await this.buildFunnelBatchMaps(rows);
        const funnel = this.computeFunnelCountsWithBatch(rows, batch);
        const conversion = this.conversionFromFunnel(funnel);
        const dropoffs = this.dropoffsFromFunnel(funnel);
        const lostOpportunities = this.buildLostOpportunitiesFromBatch(rows, batch);
        const [buyerActivation, supplierPerformance, categories, routes, repeatCustomers, trends] = await Promise.all([
            this.getBuyerActivation(),
            this.getSupplierPerformance(),
            this.getCategoryIntelligence(),
            this.getRouteIntelligence(),
            this.getRepeatCustomers(),
            this.getGrowthTrends(),
        ]);
        const activationSummary = {
            cold: buyerActivation.filter((b) => b.classification === "Cold").length,
            warm: buyerActivation.filter((b) => b.classification === "Warm").length,
            active: buyerActivation.filter((b) => b.classification === "Active").length,
            powerBuyer: buyerActivation.filter((b) => b.classification === "Power Buyer").length,
            totalBuyers: buyerActivation.length,
        };
        await growthAudit(this.db, "growth.insight.generated", { buyers: buyerActivation.length });
        socketBus.scheduleEmit(() => {
            socketBus.emitToRole("ADMIN", SocketEvents.GROWTH_FUNNEL_UPDATED, { at: new Date().toISOString() });
            socketBus.emitToRole("ADMIN", SocketEvents.GROWTH_METRICS_UPDATED, { at: new Date().toISOString() });
        });
        return {
            funnel,
            conversion,
            dropoffs,
            buyerActivation,
            activationSummary,
            supplierPerformance,
            categories,
            routes,
            repeatCustomers,
            lostOpportunities,
            trends,
            generatedAt: new Date().toISOString(),
        };
    }
    async getBuyerActivation() {
        const buyers = await this.db.user.findMany({
            where: { role: "BUYER", organisationId: { not: null } },
            include: { organisation: true },
        });
        const byOrg = new Map();
        for (const b of buyers) {
            const oid = b.organisationId;
            const list = byOrg.get(oid) ?? [];
            list.push(b);
            byOrg.set(oid, list);
        }
        const results = [];
        for (const [orgId, users] of byOrg) {
            const userIds = users.map((u) => u.id);
            const rfqs = await this.db.workspace.findMany({
                where: { type: "RFQ", createdById: { in: userIds } },
                select: { id: true, state: true, updatedAt: true },
            });
            const submitted = rfqs.filter((r) => r.state !== DRAFT).length;
            const rfqIds = rfqs.map((r) => r.id);
            const orders = rfqIds.length
                ? await this.db.workspace.findMany({
                    where: { type: "ORDER", spawnedFromId: { in: rfqIds } },
                    select: { id: true },
                })
                : [];
            const orderIds = orders.map((o) => o.id);
            const shipmentsCompleted = orderIds.length
                ? await this.db.workspace.count({
                    where: { type: "SHIPMENT", spawnedFromId: { in: orderIds }, state: "DELIVERED" },
                })
                : 0;
            const comms = rfqIds.length
                ? await this.db.timelineEvent.count({
                    where: {
                        workspaceId: { in: rfqIds },
                        eventType: { contains: "communication" },
                    },
                })
                : 0;
            const last = rfqs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
            const daysSince = last
                ? Math.floor((Date.now() - last.updatedAt.getTime()) / 86_400_000)
                : UNKNOWN_DAYS_SINCE_ACTIVITY;
            const classification = classifyBuyer({
                rfqsSubmitted: submitted,
                ordersCreated: orders.length,
                shipmentsCompleted,
                daysSince,
            });
            results.push({
                organisationId: orgId,
                organisationName: users[0].organisation.name,
                buyerUserIds: userIds,
                rfqsCreated: rfqs.length,
                rfqsSubmitted: submitted,
                ordersCreated: orders.length,
                shipmentsCompleted,
                daysSinceActivity: daysSince,
                communicationCount: comms,
                activationScore: buyerActivationScore({
                    rfqsCreated: rfqs.length,
                    rfqsSubmitted: submitted,
                    ordersCreated: orders.length,
                    shipmentsCompleted,
                    daysSince,
                    comms,
                }),
                classification,
            });
        }
        return results.sort((a, b) => b.activationScore - a.activationScore);
    }
    async getSupplierPerformance() {
        const suppliers = await this.db.user.findMany({
            where: { role: "SUPPLIER", organisationId: { not: null } },
            include: { organisation: true },
        });
        const byOrg = new Map();
        for (const s of suppliers) {
            const oid = s.organisationId;
            const list = byOrg.get(oid) ?? [];
            list.push(s);
            byOrg.set(oid, list);
        }
        const results = [];
        for (const [orgId, users] of byOrg) {
            const userIds = users.map((u) => u.id);
            const invitations = await this.db.supplierAssignment.count({
                where: { supplierUserId: { in: userIds } },
            });
            const quotes = await this.db.quotation.count({
                where: { supplierUserId: { in: userIds }, status: { not: "WITHDRAWN" } },
            });
            const selected = await this.db.rfqDetails.count({
                where: { selectedSupplierUserId: { in: userIds } },
            });
            const selectionRate = invitations > 0 ? selected / invitations : 0;
            const winRate = quotes > 0 ? selected / quotes : 0;
            const orderParts = await this.db.workspaceParticipant.findMany({
                where: { userId: { in: userIds }, workspace: { type: "ORDER" } },
                select: { workspaceId: true },
            });
            const orderIds = [...new Set(orderParts.map((p) => p.workspaceId))];
            const shipmentVolume = orderIds.length
                ? await this.db.workspace.count({ where: { type: "SHIPMENT", spawnedFromId: { in: orderIds } } })
                : 0;
            const ledger = orderIds.length
                ? await this.db.freightRevenueLedger.aggregate({
                    where: { orderId: { in: orderIds }, status: { in: ["PENDING", "REALIZED"] } },
                    _sum: { freightiqMarginUsd: true },
                })
                : { _sum: { freightiqMarginUsd: null } };
            const freightiqRevenueUsd = Number(ledger._sum.freightiqMarginUsd ?? 0);
            const revenueGeneratedUsd = freightiqRevenueUsd * 2;
            const lastQuote = await this.db.quotation.findFirst({
                where: { supplierUserId: { in: userIds } },
                orderBy: { submittedAt: "desc" },
                select: { submittedAt: true },
            });
            const daysSince = lastQuote?.submittedAt
                ? Math.floor((Date.now() - lastQuote.submittedAt.getTime()) / 86_400_000)
                : UNKNOWN_DAYS_SINCE_ACTIVITY;
            results.push({
                organisationId: orgId,
                organisationName: users[0].organisation.name,
                supplierUserIds: userIds,
                invitationsReceived: invitations,
                quotationsSubmitted: quotes,
                selectionRate: Math.round(selectionRate * 1000) / 1000,
                winRate: Math.round(winRate * 1000) / 1000,
                revenueGeneratedUsd,
                shipmentVolume,
                freightiqRevenueUsd,
                growthScore: supplierGrowthScore({
                    invitations,
                    quotes,
                    selectionRate,
                    revenue: revenueGeneratedUsd,
                    freightRevenue: freightiqRevenueUsd,
                }),
                classification: classifySupplier({
                    quotationsSubmitted: quotes,
                    selectionRate,
                    revenue: revenueGeneratedUsd,
                    daysSince,
                }),
            });
        }
        return results.sort((a, b) => b.growthScore - a.growthScore);
    }
    async getCategoryIntelligence() {
        const rfqs = await this.db.rfqDetails.findMany({
            select: { workspaceId: true, productCategory: true },
        });
        const catMap = new Map();
        for (const r of rfqs) {
            const c = r.productCategory || "Uncategorized";
            const slot = catMap.get(c) ?? { rfqIds: [] };
            slot.rfqIds.push(r.workspaceId);
            catMap.set(c, slot);
        }
        const results = [];
        for (const [category, { rfqIds }] of catMap) {
            const orders = rfqIds.length
                ? await this.db.workspace.findMany({
                    where: { type: "ORDER", spawnedFromId: { in: rfqIds } },
                    select: { id: true },
                })
                : [];
            const orderIds = orders.map((o) => o.id);
            const shipments = orderIds.length
                ? await this.db.workspace.count({ where: { type: "SHIPMENT", spawnedFromId: { in: orderIds } } })
                : 0;
            const orderValues = orderIds.length
                ? await this.db.orderWorkspace.aggregate({
                    where: { workspaceId: { in: orderIds } },
                    _sum: { totalValue: true },
                })
                : { _sum: { totalValue: null } };
            const freight = orderIds.length
                ? await this.db.freightRevenueLedger.aggregate({
                    where: { orderId: { in: orderIds } },
                    _sum: { freightiqMarginUsd: true },
                })
                : { _sum: { freightiqMarginUsd: null } };
            results.push({
                category,
                rfqCount: rfqIds.length,
                orderCount: orders.length,
                shipmentCount: shipments,
                revenueUsd: Number(orderValues._sum.totalValue ?? 0),
                freightiqRevenueUsd: Number(freight._sum.freightiqMarginUsd ?? 0),
            });
        }
        return results.sort((a, b) => b.revenueUsd - a.revenueUsd);
    }
    async getRouteIntelligence() {
        const requests = await this.db.freightRequest.findMany({
            select: { orderId: true, pol: true, pod: true },
            take: 2000,
        });
        const routeMap = new Map();
        for (const fr of requests) {
            const resolved = resolveFreightRoute(fr.pol, fr.pod);
            const slot = routeMap.get(resolved.route) ?? { lane: resolved.lane, orderIds: new Set() };
            slot.orderIds.add(fr.orderId);
            routeMap.set(resolved.route, slot);
        }
        const results = [];
        for (const [route, { lane, orderIds }] of routeMap) {
            const oids = [...orderIds];
            const rfqLinks = oids.length
                ? await this.db.workspace.findMany({
                    where: { id: { in: oids } },
                    select: { spawnedFromId: true },
                })
                : [];
            const rfqCount = new Set(rfqLinks.map((o) => o.spawnedFromId).filter(Boolean)).size;
            const shipments = oids.length
                ? await this.db.workspace.count({ where: { type: "SHIPMENT", spawnedFromId: { in: oids } } })
                : 0;
            const freight = oids.length
                ? await this.db.freightRevenueLedger.aggregate({
                    where: { orderId: { in: oids } },
                    _sum: { freightiqMarginUsd: true },
                })
                : { _sum: { freightiqMarginUsd: null } };
            const rev = oids.length
                ? await this.db.orderWorkspace.aggregate({
                    where: { workspaceId: { in: oids } },
                    _sum: { totalValue: true },
                })
                : { _sum: { totalValue: null } };
            results.push({
                route,
                lane,
                rfqCount,
                orderCount: oids.length,
                shipmentCount: shipments,
                revenueUsd: Number(rev._sum.totalValue ?? 0),
                freightiqRevenueUsd: Number(freight._sum.freightiqMarginUsd ?? 0),
            });
        }
        return results.sort((a, b) => b.freightiqRevenueUsd - a.freightiqRevenueUsd);
    }
    async getProcurementStrategy() {
        return cached("growth:procurement-strategy", 10 * 60_000, async () => {
            const rfqDetails = await this.db.rfqDetails.findMany({
                select: {
                    procurementMethod: true,
                    poNumber: true,
                    workspace: { select: { id: true, state: true, spawnedFromId: true } },
                },
            });
            let directRfqCount = 0;
            let commodityBidCount = 0;
            let pendingStrategyCount = 0;
            let directRfqPoIssued = 0;
            for (const d of rfqDetails) {
                if (!d.procurementMethod)
                    pendingStrategyCount++;
                else if (d.procurementMethod === "DIRECT_RFQ") {
                    directRfqCount++;
                    if (d.poNumber || d.workspace.state === "PO_ISSUED")
                        directRfqPoIssued++;
                }
                else if (d.procurementMethod === "COMMODITYBID_AUCTION")
                    commodityBidCount++;
            }
            const cbOrders = await this.db.workspace.count({
                where: { type: "ORDER", spawnedFrom: { type: "COMMODITYBID" } },
            });
            const directRfqConversionRate = directRfqCount > 0
                ? Math.round((directRfqPoIssued / directRfqCount) * 1000) / 10
                : null;
            const auctionConversionRate = commodityBidCount > 0
                ? Math.round((cbOrders / commodityBidCount) * 1000) / 10
                : null;
            const revenueDirectRfqUsd = directRfqPoIssued * AVG_ORDER_VALUE;
            const revenueCommodityBidUsd = cbOrders * AVG_ORDER_VALUE;
            await growthAudit(this.db, "growth.report.generated", { report: "procurement-strategy" });
            return {
                directRfqCount,
                commodityBidCount,
                pendingStrategyCount,
                directRfqPoIssued,
                commodityBidOrdersSpawned: cbOrders,
                directRfqConversionRate,
                auctionConversionRate,
                revenueDirectRfqUsd,
                revenueCommodityBidUsd,
            };
        });
    }
    async getRepeatCustomers() {
        return this.getRepeatCustomersFixed();
    }
    async computeRepeatHorizon(horizonDays, byOrg) {
        const since = new Date(Date.now() - horizonDays * 86_400_000);
        let firstTimeBuyers = 0;
        let repeatBuyers = 0;
        let repeatShipmentTotal = 0;
        let repeatRevenueUsd = 0;
        for (const [, userIds] of byOrg) {
            const rfqs = await this.db.workspace.findMany({
                where: { type: "RFQ", createdById: { in: userIds }, state: "PO_ISSUED" },
                select: { id: true, updatedAt: true },
            });
            const recent = rfqs.filter((r) => r.updatedAt >= since);
            if (!recent.length)
                continue;
            if (rfqs.length >= 2) {
                repeatBuyers += 1;
                const rfqIds = rfqs.map((r) => r.id);
                const orders = await this.db.workspace.findMany({
                    where: { type: "ORDER", spawnedFromId: { in: rfqIds } },
                    select: { id: true },
                });
                const orderIds = orders.map((o) => o.id);
                repeatShipmentTotal += orderIds.length
                    ? await this.db.workspace.count({
                        where: { type: "SHIPMENT", spawnedFromId: { in: orderIds }, state: "DELIVERED" },
                    })
                    : 0;
                const agg = orderIds.length
                    ? await this.db.orderWorkspace.aggregate({
                        where: { workspaceId: { in: orderIds } },
                        _sum: { totalValue: true },
                    })
                    : { _sum: { totalValue: null } };
                repeatRevenueUsd += Number(agg._sum.totalValue ?? 0);
            }
            else {
                firstTimeBuyers += 1;
            }
        }
        const total = firstTimeBuyers + repeatBuyers;
        return {
            horizonDays,
            firstTimeBuyers,
            repeatBuyers,
            repeatRate: total ? repeatBuyers / total : 0,
            repeatShipmentRate: repeatBuyers ? repeatShipmentTotal / repeatBuyers : 0,
            repeatRevenueUsd: repeatRevenueUsd,
        };
    }
    async getRepeatCustomersFixed() {
        const buyers = await this.db.user.findMany({
            where: { role: "BUYER", organisationId: { not: null } },
            select: { id: true, organisationId: true },
        });
        const byOrg = new Map();
        for (const b of buyers) {
            const oid = b.organisationId;
            const list = byOrg.get(oid) ?? [];
            list.push(b.id);
            byOrg.set(oid, list);
        }
        const horizons = [30, 90, 365];
        const out = [];
        for (const h of horizons) {
            out.push(await this.computeRepeatHorizon(h, byOrg));
        }
        return out;
    }
    async getLostOpportunities() {
        const rows = await this.loadRfqFunnelRows();
        const batch = await this.buildFunnelBatchMaps(rows);
        return this.buildLostOpportunitiesFromBatch(rows, batch);
    }
    buildLostOpportunitiesFromBatch(rows, batch) {
        const items = [];
        for (const r of rows) {
            const assigned = batch.assignedCount.get(r.id) ?? 0;
            const quotes = batch.quoteCount.get(r.id) ?? 0;
            const order = batch.orderByRfq.get(r.id) ?? null;
            const shipment = order ? batch.shipmentByOrder.get(order.id) ?? null : null;
            const estOrder = AVG_ORDER_VALUE;
            const estFreight = AVG_FREIGHT_MARGIN;
            if (r.state !== DRAFT && r.state !== "CANCELLED" && quotes === 0 && assigned > 0) {
                items.push({
                    type: "rfq_submitted_never_quoted",
                    workspaceId: r.id,
                    workspaceRef: r.externalRef,
                    description: "RFQ progressed but no supplier quotation received",
                    estimatedLostRevenueUsd: estOrder,
                    estimatedLostFreightiqRevenueUsd: estFreight,
                });
            }
            if (quotes > 0 && !r.rfqDetails?.selectedSupplierUserId && !["PO_ISSUED", "CANCELLED", "CLOSED_NO_AWARD"].includes(r.state)) {
                items.push({
                    type: "quoted_never_selected",
                    workspaceId: r.id,
                    workspaceRef: r.externalRef,
                    description: "Quotations received but no supplier selected",
                    estimatedLostRevenueUsd: estOrder * 0.7,
                    estimatedLostFreightiqRevenueUsd: estFreight,
                });
            }
            if (r.rfqDetails?.selectedSupplierUserId && !r.rfqDetails.poNumber && r.state !== "PO_ISSUED") {
                items.push({
                    type: "selected_no_po",
                    workspaceId: r.id,
                    workspaceRef: r.externalRef,
                    description: "Supplier selected but PO not issued",
                    estimatedLostRevenueUsd: estOrder * 0.5,
                    estimatedLostFreightiqRevenueUsd: estFreight * 0.5,
                });
            }
            if (r.state === "PO_ISSUED" && !order) {
                items.push({
                    type: "po_no_order",
                    workspaceId: r.id,
                    workspaceRef: r.externalRef,
                    description: "PO issued but order workspace not spawned",
                    estimatedLostRevenueUsd: estOrder,
                    estimatedLostFreightiqRevenueUsd: estFreight,
                });
            }
            if (order && !shipment) {
                items.push({
                    type: "order_no_shipment",
                    workspaceId: order.id,
                    workspaceRef: order.id.slice(0, 8),
                    description: "Order exists without shipment",
                    estimatedLostRevenueUsd: estOrder * 0.3,
                    estimatedLostFreightiqRevenueUsd: estFreight,
                });
            }
            if (shipment &&
                shipment.state !== "DELIVERED" &&
                shipment.state !== "CANCELLED") {
                items.push({
                    type: "shipment_not_completed",
                    workspaceId: shipment.id,
                    workspaceRef: shipment.id.slice(0, 8),
                    description: `Shipment stuck in ${shipment.state}`,
                    estimatedLostRevenueUsd: estFreight,
                    estimatedLostFreightiqRevenueUsd: estFreight * 0.5,
                });
            }
        }
        return {
            items: items.slice(0, 100),
            totalEstimatedLostRevenueUsd: items.reduce((s, i) => s + i.estimatedLostRevenueUsd, 0),
            totalEstimatedLostFreightiqRevenueUsd: items.reduce((s, i) => s + i.estimatedLostFreightiqRevenueUsd, 0),
        };
    }
    async getGrowthTrends() {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
            const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
            const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
            const rfqsCreated = await this.db.workspace.count({
                where: { type: "RFQ", createdAt: { gte: d, lt: end } },
            });
            const posIssued = await this.db.workspace.count({
                where: { type: "RFQ", state: "PO_ISSUED", updatedAt: { gte: d, lt: end } },
            });
            const ordersCreated = await this.db.workspace.count({
                where: { type: "ORDER", createdAt: { gte: d, lt: end } },
            });
            const shipmentsCompleted = await this.db.workspace.count({
                where: { type: "SHIPMENT", state: "DELIVERED", updatedAt: { gte: d, lt: end } },
            });
            const freight = await this.db.freightRevenueLedger.aggregate({
                where: { realizedAt: { gte: d, lt: end }, status: "REALIZED" },
                _sum: { freightiqMarginUsd: true },
            });
            months.push({
                period,
                rfqsCreated,
                posIssued,
                ordersCreated,
                shipmentsCompleted,
                freightiqRevenueUsd: Number(freight._sum.freightiqMarginUsd ?? 0),
            });
        }
        return months;
    }
    async loadRfqFunnelRows() {
        return this.db.workspace.findMany({
            where: { type: "RFQ" },
            select: {
                id: true,
                state: true,
                externalRef: true,
                createdAt: true,
                createdById: true,
                rfqDetails: {
                    select: {
                        selectedSupplierUserId: true,
                        poNumber: true,
                        productCategory: true,
                    },
                },
            },
            take: 3000,
        });
    }
    async buildFunnelBatchMaps(rows) {
        const rfqIds = rows.map((r) => r.id);
        if (!rfqIds.length) {
            return {
                assignedCount: new Map(),
                quoteCount: new Map(),
                orderByRfq: new Map(),
                shipmentByOrder: new Map(),
                assignedSet: new Set(),
                quotedSet: new Set(),
            };
        }
        const [assignments, quotes, orders] = await Promise.all([
            this.db.supplierAssignment.groupBy({
                by: ["workspaceId"],
                where: { workspaceId: { in: rfqIds } },
                _count: true,
            }),
            this.db.quotation.groupBy({
                by: ["workspaceId"],
                where: { workspaceId: { in: rfqIds }, status: { not: "WITHDRAWN" } },
                _count: true,
            }),
            this.db.workspace.findMany({
                where: { type: "ORDER", spawnedFromId: { in: rfqIds } },
                select: { id: true, spawnedFromId: true, state: true, createdAt: true },
            }),
        ]);
        const orderIds = orders.map((o) => o.id);
        const shipments = orderIds.length
            ? await this.db.workspace.findMany({
                where: { type: "SHIPMENT", spawnedFromId: { in: orderIds } },
                select: { id: true, spawnedFromId: true, state: true, createdAt: true },
            })
            : [];
        const assignedCount = new Map();
        for (const a of assignments)
            assignedCount.set(a.workspaceId, a._count);
        const quoteCount = new Map();
        for (const q of quotes)
            quoteCount.set(q.workspaceId, q._count);
        const orderByRfq = new Map();
        for (const o of orders) {
            if (o.spawnedFromId)
                orderByRfq.set(o.spawnedFromId, o);
        }
        const shipmentByOrder = new Map();
        for (const s of shipments) {
            if (s.spawnedFromId)
                shipmentByOrder.set(s.spawnedFromId, s);
        }
        return { assignedCount, quoteCount, orderByRfq, shipmentByOrder, assignedSet: new Set(assignments.map((a) => a.workspaceId)), quotedSet: new Set(quotes.map((q) => q.workspaceId)) };
    }
    conversionFromFunnel(f) {
        const by = (s) => f.stages.find((x) => x.stage === s)?.count ?? 0;
        const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
        return {
            assignToQuotePercent: pct(by("quotation_submitted"), by("supplier_assigned")),
            quoteToSelectPercent: pct(by("supplier_selected"), by("quotation_submitted")),
            rfqToPoPercent: pct(by("po_issued"), by("rfq_created")),
            poToOrderPercent: pct(by("order_created"), by("po_issued")),
            orderToShipmentPercent: pct(by("shipment_created"), by("order_created")),
            shipmentCompletePercent: pct(by("shipment_completed"), by("shipment_created")),
        };
    }
    dropoffsFromFunnel(f) {
        return f.stages.slice(1).map((stage, i) => {
            const prev = f.stages[i];
            const drop = prev.count - stage.count;
            return {
                stage: stage.stage,
                label: `${prev.label} → ${stage.label}`,
                dropoffCount: Math.max(0, drop),
                dropoffPercent: stage.dropoffPercent,
                primaryReason: this.dropoffReason(stage.stage),
            };
        });
    }
    async computeFunnelCounts(rows) {
        const rfqIds = rows.map((r) => r.id);
        if (!rfqIds.length) {
            const stages = buildFunnelStages([0, 0, 0, 0, 0, 0, 0, 0, 0], []);
            return { stages, totalRfqs: 0, overallConversionPercent: 0 };
        }
        const batch = await this.buildFunnelBatchMaps(rows);
        return this.computeFunnelCountsWithBatch(rows, batch);
    }
    computeFunnelCountsWithBatch(rows, batch) {
        const { assignedSet, quotedSet, orderByRfq, shipmentByOrder } = batch;
        let c0 = 0, c1 = 0, c2 = 0, c3 = 0, c4 = 0, c6 = 0, c7 = 0, c8 = 0;
        const hours = [[], [], [], [], [], [], [], [], []];
        for (const r of rows) {
            c0++;
            const t0 = r.createdAt.getTime();
            if (r.state !== DRAFT) {
                c1++;
                hours[1].push((r.createdAt.getTime() - t0) / 3_600_000);
            }
            if (assignedSet.has(r.id))
                c2++;
            if (quotedSet.has(r.id))
                c3++;
            if (r.rfqDetails?.selectedSupplierUserId)
                c4++;
            const ord = orderByRfq.get(r.id);
            if (ord) {
                c6++;
                const ship = shipmentByOrder.get(ord.id);
                if (ship) {
                    c7++;
                    if (ship.state === "DELIVERED")
                        c8++;
                }
            }
        }
        const c5 = rows.filter((r) => r.rfqDetails?.poNumber || r.state === "PO_ISSUED").length;
        const counts = [c0, c1, c2, c3, c4, c5, c6, c7, c8];
        const avgHours = counts.map((_, i) => {
            const arr = hours[i];
            if (!arr?.length)
                return null;
            return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
        });
        const stages = buildFunnelStages(counts, avgHours);
        const overall = c0 > 0 ? Math.round((c8 / c0) * 1000) / 10 : 0;
        return { stages, totalRfqs: c0, overallConversionPercent: overall };
    }
    dropoffReason(stage) {
        const map = {
            rfq_submitted: "draft_abandonment",
            supplier_assigned: "no_supplier_assignment",
            quotation_submitted: "supplier_no_quote",
            supplier_selected: "buyer_no_selection",
            po_issued: "proforma_or_po_delay",
            order_created: "order_spawn_failure",
            shipment_created: "freight_or_booking_delay",
            shipment_completed: "logistics_delay",
        };
        return map[stage] ?? null;
    }
}
//# sourceMappingURL=growth.service.js.map