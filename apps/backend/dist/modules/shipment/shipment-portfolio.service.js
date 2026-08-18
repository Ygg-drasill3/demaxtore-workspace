import { shipmentProgressPercent } from "@dmx/contracts/shipment.scripts";
import { hasPortfolioVisibility } from "../../lib/staff-roles.js";
import { tradeRefFromRoot } from "../trade/trade.resolver.js";
import { shipmentDocumentStatusSummary } from "../document-center/document-center.service.js";
import { shipmentExceptionSummary } from "../exception-hub/exception-hub.service.js";
const ACTIVE_STATES = new Set([
    "SHIPMENT_CREATED", "BOOKING_PENDING", "BOOKING_CONFIRMED", "CONTAINER_ASSIGNED",
    "READY_FOR_PICKUP", "PICKED_UP", "AT_ORIGIN_PORT", "LOADED_ON_VESSEL", "IN_TRANSIT",
    "ARRIVED_DESTINATION_PORT", "CUSTOMS_CLEARANCE", "READY_FOR_DELIVERY", "DELIVERED", "EXCEPTION",
]);
const TRANSIT_STATES = new Set([
    "LOADED_ON_VESSEL", "IN_TRANSIT", "ARRIVED_DESTINATION_PORT", "CUSTOMS_CLEARANCE", "READY_FOR_DELIVERY",
]);
function workspaceAccessFilter(actor) {
    if (hasPortfolioVisibility(actor.role))
        return {};
    return { participants: { some: { userId: actor.id, leftAt: null } } };
}
function mapMilestone(state) {
    const map = {
        SHIPMENT_CREATED: "Production",
        BOOKING_PENDING: "Production",
        BOOKING_CONFIRMED: "Ready For Loading",
        CONTAINER_ASSIGNED: "Ready For Loading",
        READY_FOR_PICKUP: "Ready For Loading",
        PICKED_UP: "Loaded",
        AT_ORIGIN_PORT: "Export Customs",
        LOADED_ON_VESSEL: "Vessel Departure",
        IN_TRANSIT: "In Transit",
        ARRIVED_DESTINATION_PORT: "Arrival",
        CUSTOMS_CLEARANCE: "Import Customs",
        READY_FOR_DELIVERY: "Import Customs",
        DELIVERED: "Delivered",
        COMPLETED: "Delivered",
        EXCEPTION: "In Transit",
        CANCELLED: "Delivered",
    };
    return map[state] ?? "Production";
}
function deriveStatus(state, delayFlag, eta, openAlertCount, healthScore) {
    if (state === "CANCELLED")
        return "Cancelled";
    if (state === "DELIVERED" || state === "COMPLETED")
        return "Delivered";
    if (state === "EXCEPTION" || delayFlag === "MAJOR")
        return "Delayed";
    if (eta && eta.getTime() < Date.now() && !["DELIVERED", "COMPLETED"].includes(state))
        return "Delayed";
    if (openAlertCount > 0 || delayFlag === "MINOR" || healthScore < 70)
        return "At Risk";
    return "On Track";
}
function healthLabel(score) {
    if (score >= 90)
        return "Healthy";
    if (score >= 70)
        return "Monitor";
    return "At Risk";
}
function computeHealthScore(state, delayFlag, openAlerts, syncedAt, eta) {
    let score = shipmentProgressPercent(state);
    for (const a of openAlerts) {
        if (a.severity === "CRITICAL")
            score -= 20;
        else if (a.severity === "WARNING")
            score -= 10;
        else
            score -= 5;
    }
    if (delayFlag === "MAJOR")
        score -= 25;
    else if (delayFlag === "MINOR")
        score -= 15;
    if (syncedAt) {
        const ageDays = (Date.now() - syncedAt.getTime()) / 86_400_000;
        if (ageDays > 14)
            score -= 20;
        else if (ageDays > 7)
            score -= 10;
    }
    else if (TRANSIT_STATES.has(state)) {
        score -= 10;
    }
    if (eta && eta.getTime() < Date.now() && !["DELIVERED", "COMPLETED"].includes(state)) {
        score -= 30;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
}
function startOfWeek(d = new Date()) {
    const copy = new Date(d);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
}
function endOfWeek(d = new Date()) {
    const start = startOfWeek(d);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return end;
}
function startOfMonth(d = new Date()) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
export class ShipmentPortfolioService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getPortfolio(actor, query) {
        const where = {
            type: "SHIPMENT",
            ...workspaceAccessFilter(actor),
        };
        const rows = await this.db.workspace.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            include: {
                shipmentWorkspace: true,
                trackingSnapshots: { orderBy: { syncedAt: "desc" }, take: 1 },
            },
        });
        if (rows.length === 0) {
            return emptyPayload();
        }
        const orderIds = [...new Set(rows.map((r) => r.spawnedFromId).filter(Boolean))];
        const [orders, orderWorkspaces, alerts] = await Promise.all([
            orderIds.length
                ? this.db.workspace.findMany({
                    where: { id: { in: orderIds } },
                    select: { id: true, externalRef: true },
                })
                : [],
            orderIds.length
                ? this.db.orderWorkspace.findMany({
                    where: { workspaceId: { in: orderIds } },
                    select: {
                        workspaceId: true,
                        buyerUserId: true,
                        supplierUserId: true,
                        parentWorkspaceId: true,
                        parentWorkspaceType: true,
                    },
                })
                : [],
            this.db.controlTowerAlert.findMany({
                where: {
                    workspaceId: { in: rows.map((r) => r.id) },
                    resolvedAt: null,
                },
                select: {
                    id: true,
                    severity: true,
                    category: true,
                    title: true,
                    workspaceId: true,
                },
            }),
        ]);
        const orderMap = new Map(orders.map((o) => [o.id, o]));
        const owMap = new Map(orderWorkspaces.map((o) => [o.workspaceId, o]));
        const parentIds = [...new Set(orderWorkspaces.map((o) => o.parentWorkspaceId).filter((id) => !!id))];
        const parents = parentIds.length
            ? await this.db.workspace.findMany({
                where: { id: { in: parentIds } },
                select: { id: true, externalRef: true, type: true },
            })
            : [];
        const parentMap = new Map(parents.map((p) => [p.id, p]));
        const userIds = new Set();
        for (const ow of orderWorkspaces) {
            userIds.add(ow.buyerUserId);
            userIds.add(ow.supplierUserId);
        }
        const users = userIds.size
            ? await this.db.user.findMany({
                where: { id: { in: [...userIds] } },
                select: { id: true, displayName: true },
            })
            : [];
        const userName = new Map(users.map((u) => [u.id, u.displayName]));
        const alertsByShipment = new Map();
        for (const a of alerts) {
            if (!a.workspaceId)
                continue;
            const list = alertsByShipment.get(a.workspaceId) ?? [];
            list.push(a);
            alertsByShipment.set(a.workspaceId, list);
        }
        const weekStart = startOfWeek();
        const weekEnd = endOfWeek();
        const monthStart = startOfMonth();
        let enriched = rows.flatMap((ws) => {
            const sw = ws.shipmentWorkspace;
            if (!sw)
                return [];
            const snap = ws.trackingSnapshots[0];
            const order = ws.spawnedFromId ? orderMap.get(ws.spawnedFromId) : undefined;
            const ow = ws.spawnedFromId ? owMap.get(ws.spawnedFromId) : undefined;
            const parent = ow?.parentWorkspaceId ? parentMap.get(ow.parentWorkspaceId) : undefined;
            const tradeRootId = parent?.id ?? ow?.parentWorkspaceId ?? ws.spawnedFromId ?? ws.id;
            const tradeRef = parent
                ? tradeRefFromRoot(parent)
                : (order ? `TRADE-${order.externalRef.replace(/^RFQ-/, "")}` : ws.externalRef);
            const openAlerts = alertsByShipment.get(ws.id) ?? [];
            const eta = snap?.eta ?? null;
            const etd = snap?.etd ?? null;
            const healthScore = computeHealthScore(ws.state, snap?.delayFlag, openAlerts, snap?.syncedAt, eta);
            const status = deriveStatus(ws.state, snap?.delayFlag, eta, openAlerts.length, healthScore);
            const carrier = snap?.carrier ?? sw.carrierName ?? null;
            const tradeType = (ow?.parentWorkspaceType ?? null);
            return [{
                    shipmentId: ws.id,
                    shipmentNumber: ws.externalRef,
                    tradeId: tradeRef,
                    tradeRootId,
                    tradeWorkspaceUrl: `/workspace/trade/${tradeRootId}`,
                    buyerName: userName.get(sw.buyerUserId) ?? userName.get(ow?.buyerUserId ?? "") ?? "—",
                    buyerId: sw.buyerUserId,
                    supplierName: userName.get(sw.supplierUserId) ?? userName.get(ow?.supplierUserId ?? "") ?? "—",
                    supplierId: sw.supplierUserId,
                    origin: snap?.pol ?? sw.originPort,
                    destination: snap?.pod ?? sw.destinationPort,
                    carrier,
                    containerCount: sw.containerNumber ? 1 : 1,
                    containerNumber: sw.containerNumber,
                    etd: etd?.toISOString() ?? null,
                    eta: eta?.toISOString() ?? null,
                    currentMilestone: mapMilestone(ws.state),
                    status,
                    healthScore,
                    healthLabel: healthLabel(healthScore),
                    fsmState: ws.state,
                    tradeType,
                    openAlertCount: openAlerts.length,
                    alerts: openAlerts.map((a) => ({
                        id: a.id,
                        severity: a.severity,
                        category: a.category,
                        title: a.title,
                    })),
                    trackingStatus: snap?.trackingStatus ?? null,
                    lastTrackingSyncAt: snap?.syncedAt?.toISOString() ?? sw.lastTrackingSyncAt?.toISOString() ?? null,
                    documentStatus: "No Documents",
                    documentsUrl: `/workspace/trade/${tradeRootId}/documents`,
                    exceptionCount: 0,
                    highestSeverity: null,
                    exceptionStatus: "None",
                    primaryExceptionUrl: null,
                    updatedAt: ws.updatedAt.toISOString(),
                    _deliveredAt: sw.deliveredAt,
                    _transitDays: sw.loadedAt && sw.deliveredAt
                        ? Math.round((sw.deliveredAt.getTime() - sw.loadedAt.getTime()) / 86_400_000)
                        : null,
                }];
        });
        const shipmentIds = enriched.map((r) => r.shipmentId);
        const tradeDocs = shipmentIds.length
            ? await this.db.tradeDocument.findMany({
                where: { workspaceType: "SHIPMENT", workspaceId: { in: shipmentIds } },
            })
            : [];
        const docsByShipment = new Map();
        for (const d of tradeDocs) {
            const list = docsByShipment.get(d.workspaceId) ?? [];
            list.push(d);
            docsByShipment.set(d.workspaceId, list);
        }
        enriched = enriched.map((r) => {
            const docs = (docsByShipment.get(r.shipmentId) ?? []).map((d) => ({
                id: `TRADE:${d.id}`,
                source: "TRADE",
                sourceDocumentId: d.id,
                documentName: d.fileName ?? d.documentType,
                documentType: d.documentType,
                category: "Other",
                tradeId: r.tradeId,
                tradeRootId: r.tradeRootId,
                tradeWorkspaceUrl: r.tradeWorkspaceUrl,
                relatedEntityType: "SHIPMENT",
                relatedEntityId: r.shipmentId,
                relatedEntityRef: r.shipmentNumber,
                poNumber: null,
                poOrderId: null,
                orderWorkspaceUrl: null,
                buyerName: r.buyerName,
                supplierName: r.supplierName,
                shipmentRef: r.shipmentNumber,
                status: mapDocStatus(d.status),
                version: d.version,
                uploadedByName: null,
                uploadedById: d.uploadedById,
                uploadedAt: d.uploadedAt?.toISOString() ?? null,
                reviewOwnerName: null,
                lastUpdated: d.updatedAt.toISOString(),
                isRequired: true,
                openAlertCount: 0,
                downloadUrl: null,
                detailUrl: `/documents/TRADE:${d.id}`,
            }));
            return {
                ...r,
                documentStatus: shipmentDocumentStatusSummary(docs),
                documentsUrl: `/workspace/trade/${r.tradeRootId}/documents`,
            };
        });
        const exceptions = await this.db.tradeException.findMany({
            where: {
                workspaceId: { in: shipmentIds },
                status: { notIn: ["Resolved", "Closed"] },
            },
        });
        const exByShipment = new Map();
        for (const ex of exceptions) {
            const list = exByShipment.get(ex.workspaceId) ?? [];
            list.push(ex);
            exByShipment.set(ex.workspaceId, list);
        }
        enriched = enriched.map((r) => {
            const exRows = (exByShipment.get(r.shipmentId) ?? []).map((ex) => ({
                id: ex.id,
                exceptionRef: `EXC-${ex.id.slice(0, 8).toUpperCase()}`,
                tradeId: r.tradeId,
                tradeRootId: r.tradeRootId,
                tradeWorkspaceUrl: r.tradeWorkspaceUrl,
                exceptionType: ex.exceptionType,
                severity: ex.severity,
                status: ex.status,
                buyerName: r.buyerName,
                supplierName: r.supplierName,
                shipmentRef: r.shipmentNumber,
                createdAt: ex.createdAt.toISOString(),
                ownerName: null,
                ownerId: ex.ownerId,
                ownerRole: ex.ownerRole,
                dueDate: ex.dueDate?.toISOString() ?? null,
                resolutionEta: ex.resolutionEta?.toISOString() ?? null,
                requiredAction: ex.requiredAction,
                alertId: ex.alertId,
                detailUrl: `/exceptions/${ex.id}`,
            }));
            const exSummary = shipmentExceptionSummary(exRows);
            return {
                ...r,
                exceptionCount: exSummary.count,
                highestSeverity: exSummary.highestSeverity,
                exceptionStatus: exSummary.status,
                primaryExceptionUrl: exSummary.primaryDetailUrl,
            };
        });
        enriched = applyFilters(enriched, query);
        const kpis = computeKpis(enriched, weekStart, weekEnd, monthStart);
        const analytics = computeAnalytics(enriched);
        const total = enriched.length;
        const page = enriched.slice(query.offset, query.offset + query.limit).map(stripInternalFields);
        const mapPoints = page.slice(0, 12).map((r) => toMapPoint(r));
        return { kpis, analytics, items: page, total, mapPoints };
    }
}
function stripInternalFields(row) {
    const { _deliveredAt: _d, _transitDays: _t, ...publicRow } = row;
    return publicRow;
}
function applyFilters(rows, query) {
    let out = rows;
    if (query.status)
        out = out.filter((r) => r.status === query.status);
    if (query.buyerId)
        out = out.filter((r) => r.buyerId === query.buyerId);
    if (query.supplierId)
        out = out.filter((r) => r.supplierId === query.supplierId);
    if (query.carrier) {
        const c = query.carrier.toLowerCase();
        out = out.filter((r) => (r.carrier ?? "").toLowerCase().includes(c));
    }
    if (query.country) {
        const c = query.country.toLowerCase();
        out = out.filter((r) => r.origin.toLowerCase().includes(c) || r.destination.toLowerCase().includes(c));
    }
    if (query.tradeType)
        out = out.filter((r) => r.tradeType === query.tradeType);
    if (query.dateFrom) {
        const from = new Date(query.dateFrom).getTime();
        out = out.filter((r) => r.eta && new Date(r.eta).getTime() >= from);
    }
    if (query.dateTo) {
        const to = new Date(query.dateTo).getTime();
        out = out.filter((r) => r.eta && new Date(r.eta).getTime() <= to);
    }
    if (query.search?.trim()) {
        const q = query.search.trim().toLowerCase();
        out = out.filter((r) => r.tradeId.toLowerCase().includes(q) ||
            r.shipmentNumber.toLowerCase().includes(q) ||
            r.buyerName.toLowerCase().includes(q) ||
            r.supplierName.toLowerCase().includes(q) ||
            (r.containerNumber ?? "").toLowerCase().includes(q));
    }
    return out;
}
function computeKpis(rows, weekStart, weekEnd, monthStart) {
    const active = rows.filter((r) => ACTIVE_STATES.has(r.fsmState));
    const arrivingThisWeek = rows.filter((r) => {
        if (!r.eta)
            return false;
        const eta = new Date(r.eta);
        return eta >= weekStart && eta < weekEnd && r.status !== "Delivered" && r.status !== "Cancelled";
    });
    const delayed = rows.filter((r) => r.status === "Delayed" || r.status === "At Risk");
    const deliveredThisMonth = rows.filter((r) => {
        if (r.status !== "Delivered")
            return false;
        const d = r._deliveredAt ?? (r.eta ? new Date(r.eta) : null);
        return d ? d >= monthStart : false;
    });
    const containersInTransit = rows
        .filter((r) => TRANSIT_STATES.has(r.fsmState))
        .reduce((n, r) => n + r.containerCount, 0);
    const openAlerts = rows.reduce((n, r) => n + r.openAlertCount, 0);
    return {
        activeShipments: active.length,
        arrivingThisWeek: arrivingThisWeek.length,
        delayedShipments: delayed.length,
        deliveredThisMonth: deliveredThisMonth.length,
        containersInTransit,
        openAlerts,
    };
}
function computeAnalytics(rows) {
    const delivered = rows.filter((r) => r.status === "Delivered");
    const withTransit = delivered.filter((r) => r._transitDays != null);
    const avgTransit = withTransit.length
        ? withTransit.reduce((s, r) => s + (r._transitDays ?? 0), 0) / withTransit.length
        : null;
    const terminal = rows.filter((r) => ["Delivered", "Delayed", "Cancelled", "On Track", "At Risk"].includes(r.status));
    const delayedCount = rows.filter((r) => r.status === "Delayed").length;
    const onTimeCount = delivered.filter((r) => r.fsmState !== "EXCEPTION").length;
    return {
        averageTransitDays: avgTransit != null ? Math.round(avgTransit * 10) / 10 : null,
        delayedShipmentRate: terminal.length > 0 ? Math.round((delayedCount / terminal.length) * 1000) / 10 : null,
        onTimeDeliveryPct: delivered.length > 0 ? Math.round((onTimeCount / delivered.length) * 1000) / 10 : null,
        shipmentVolume: rows.length,
        containerVolume: rows.reduce((n, r) => n + r.containerCount, 0),
    };
}
function toMapPoint(row) {
    const progress = shipmentProgressPercent(row.fsmState);
    const hasLive = !!row.trackingStatus && row.lastTrackingSyncAt != null;
    return {
        shipmentId: row.shipmentId,
        shipmentNumber: row.shipmentNumber,
        tradeId: row.tradeId,
        origin: row.origin,
        destination: row.destination,
        currentPosition: hasLive ? (row.trackingStatus ?? row.currentMilestone) : row.currentMilestone,
        progressPercent: progress,
        routeLabel: `${row.origin} → ${row.destination}`,
        status: row.status,
        hasLivePosition: hasLive,
    };
}
function mapDocStatus(status) {
    const map = {
        MISSING: "Missing",
        REQUESTED: "Revision Requested",
        UPLOADED: "Uploaded",
        UNDER_REVIEW: "Under Review",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        EXPIRED: "Expired",
    };
    return map[status] ?? "Uploaded";
}
function emptyPayload() {
    return {
        kpis: {
            activeShipments: 0,
            arrivingThisWeek: 0,
            delayedShipments: 0,
            deliveredThisMonth: 0,
            containersInTransit: 0,
            openAlerts: 0,
        },
        analytics: {
            averageTransitDays: null,
            delayedShipmentRate: null,
            onTimeDeliveryPct: null,
            shipmentVolume: 0,
            containerVolume: 0,
        },
        items: [],
        total: 0,
        mapPoints: [],
    };
}
//# sourceMappingURL=shipment-portfolio.service.js.map