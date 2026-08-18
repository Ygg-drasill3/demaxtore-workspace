import { AppError } from "../../utils/httpErrors.js";
import { canAccessTrade } from "./trade.policy.js";
import { collectTradeGraph, resolveTradeRoot, tradeRefFromRoot, } from "./trade.resolver.js";
import { FreightEstimateService } from "../freight-estimate/freight-estimate.service.js";
import { FreightBookingEngineService } from "../freight-booking/freight-booking.service.js";
const DOC_CATEGORY_MAP = {
    PROFORMA: "Proforma",
    COMMERCIAL_INVOICE: "Invoice",
    PACKING_LIST: "Packing List",
    BILL_OF_LADING: "BL",
    CERTIFICATE_OF_ORIGIN: "COO",
    HEALTH_CERTIFICATE: "Health Certificate",
    INSPECTION_REPORT: "Inspection Reports",
    CONTRACT: "Contracts",
    PHYTOSANITARY: "Health Certificate",
};
function mapDocCategory(documentType) {
    return DOC_CATEGORY_MAP[documentType] ?? "Other";
}
function workspaceUrl(type, id) {
    if (type === "RFQ")
        return `/workspace/rfq/${id}`;
    if (type === "COMMODITYBID")
        return `/workspace/commoditybid/${id}`;
    if (type === "ORDER")
        return `/workspace/order/${id}`;
    if (type === "SHIPMENT")
        return `/workspace/shipment/${id}`;
    if (type === "MIXED_CONTAINER")
        return `/buyer/mixed-container/requests/${id}`;
    if (type === "BULK_CONTAINER")
        return `/buyer/bulk-container/requests/${id}`;
    return `/workspace/trade/${id}`;
}
function deriveMilestone(rootState, rootType, orderStates, shipmentStates, hasPo) {
    if (shipmentStates.some((s) => s === "DELIVERED" || s === "CLOSED"))
        return "Delivered";
    if (shipmentStates.length > 0)
        return "Shipment";
    if (orderStates.some((s) => ["PRODUCTION_STARTED", "PRODUCTION_COMPLETED", "INSPECTION_PENDING", "INSPECTION_COMPLETED"].includes(s)))
        return "Production";
    if (orderStates.some((s) => s !== "ORDER_CREATED" && s !== "CANCELLED"))
        return "Order Confirmed";
    if (hasPo)
        return "PO Created";
    if (rootType === "RFQ" && ["RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION"].includes(rootState)) {
        return "Quoted";
    }
    return "Created";
}
export class TradeWorkspaceService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getWorkspace(actor, workspaceId) {
        if (!(await canAccessTrade(this.db, actor, workspaceId))) {
            throw new AppError(403, "FORBIDDEN");
        }
        const root = await resolveTradeRoot(this.db, workspaceId);
        if (!root)
            throw new AppError(404, "TRADE_NOT_FOUND");
        const graph = await collectTradeGraph(this.db, root);
        const tradeRef = tradeRefFromRoot(root);
        const tradeType = root.type;
        const [orders, shipments, pos, freightReqs, timelineEvents, alertRows, rfqDetails, rfqLines] = await Promise.all([
            graph.orderIds.length
                ? this.db.workspace.findMany({
                    where: { id: { in: graph.orderIds } },
                    include: { orderWorkspace: true },
                })
                : [],
            graph.shipmentIds.length
                ? this.db.workspace.findMany({
                    where: { id: { in: graph.shipmentIds } },
                    include: { shipmentWorkspace: true, trackingSnapshots: { orderBy: { syncedAt: "desc" }, take: 1 } },
                })
                : [],
            graph.orderIds.length
                ? this.db.purchaseOrder.findMany({
                    where: { orderId: { in: graph.orderIds } },
                    include: { lines: true },
                })
                : [],
            graph.orderIds.length
                ? this.db.freightRequest.findMany({
                    where: { orderId: { in: graph.orderIds } },
                    include: {
                        selection: { include: { offer: true } },
                        offers: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
                    },
                })
                : [],
            this.db.timelineEvent.findMany({
                where: { workspaceId: { in: graph.allWorkspaceIds } },
                orderBy: { createdAt: "asc" },
                take: 200,
                include: { actor: { select: { displayName: true } } },
            }),
            this.db.controlTowerAlert.findMany({
                where: { workspaceId: { in: graph.allWorkspaceIds } },
                orderBy: { createdAt: "desc" },
                take: 50,
            }),
            root.type === "RFQ"
                ? this.db.rfqDetails.findUnique({ where: { workspaceId: root.id } })
                : null,
            root.type === "RFQ"
                ? this.db.rfqLineItem.findMany({ where: { workspaceId: root.id }, orderBy: { position: "asc" } })
                : [],
        ]);
        const buyerUserId = orders[0]?.orderWorkspace?.buyerUserId
            ?? root.createdById
            ?? (await this.db.workspaceParticipant.findFirst({
                where: { workspaceId: root.id, participantRole: "OWNER" },
                select: { userId: true },
            }))?.userId;
        const supplierUserId = orders[0]?.orderWorkspace?.supplierUserId
            ?? (await this.db.workspaceParticipant.findFirst({
                where: { workspaceId: root.id, participantRole: "COUNTERPARTY" },
                select: { userId: true },
            }))?.userId;
        const [buyer, supplier] = await Promise.all([
            buyerUserId
                ? this.db.user.findUnique({ where: { id: buyerUserId }, select: { displayName: true } })
                : null,
            supplierUserId
                ? this.db.user.findUnique({ where: { id: supplierUserId }, select: { displayName: true } })
                : null,
        ]);
        const orderStates = orders.map((o) => o.state);
        const shipmentStates = shipments.map((s) => s.state);
        const milestone = deriveMilestone(root.state, root.type, orderStates, shipmentStates, pos.length > 0);
        const orderValue = orders.reduce((sum, o) => sum + Number(o.orderWorkspace?.totalValue ?? 0), 0);
        let freightValue = 0;
        for (const fr of freightReqs) {
            const selected = fr.selection?.offer;
            const fallback = fr.offers[0];
            freightValue += Number(selected?.displayPriceUsd ?? selected?.price ?? fallback?.price ?? 0);
        }
        const currency = orders[0]?.orderWorkspace?.currency ?? root.currency ?? (rfqDetails ? "USD" : null);
        const incoterm = orders[0]?.orderWorkspace?.incoterms ?? rfqDetails?.incoterm ?? null;
        const lastTimeline = timelineEvents.at(-1);
        const containerCount = freightReqs.reduce((n, fr) => n + (fr.containerType ? 1 : 0), 0) || shipments.length || null;
        const header = {
            tradeId: tradeRef,
            rootWorkspaceId: root.id,
            buyerName: buyer?.displayName ?? "—",
            manufacturerName: supplier?.displayName ?? "—",
            tradeType,
            currentStatus: milestone,
            containerCount: containerCount ?? 0,
            tradeValue: orderValue > 0 ? orderValue : null,
            currency,
            incoterm,
            lastActivityAt: lastTimeline?.createdAt.toISOString() ?? root.updatedAt.toISOString(),
        };
        const products = rfqLines.length
            ? rfqLines.map((l) => l.description).join("; ")
            : orders.map((o) => o.externalRef).join(", ") || root.externalRef;
        const summary = {
            buyerName: header.buyerName,
            manufacturerName: header.manufacturerName,
            products,
            containerType: freightReqs[0]?.containerType ?? null,
            orderValue: orderValue > 0 ? orderValue : null,
            freightValue: freightValue > 0 ? freightValue : null,
            serviceFee: null,
            totalTradeValue: orderValue + freightValue > 0 ? orderValue + freightValue : null,
            currency,
            currentMilestone: milestone,
        };
        const orderRefMap = new Map(orders.map((o) => [o.id, o.externalRef]));
        const purchaseOrders = pos.map((po) => ({
            poId: po.id,
            poNumber: po.poNumber,
            status: po.status,
            poDate: po.issuedAt?.toISOString() ?? po.createdAt.toISOString(),
            poValue: Number(po.lines.reduce((s, l) => s + Number(l.lineTotal), 0)),
            currency: po.currency,
            orderId: po.orderId,
            orderRef: orderRefMap.get(po.orderId) ?? "",
            workspaceUrl: `/workspace/po/${po.id}`,
        }));
        const orderPanels = orders.map((o) => {
            let productionStatus = "Not started";
            if (o.state === "PRODUCTION_STARTED")
                productionStatus = "In progress";
            if (["PRODUCTION_COMPLETED", "INSPECTION_PENDING", "INSPECTION_COMPLETED"].includes(o.state)) {
                productionStatus = "Completed";
            }
            if (o.orderWorkspace?.productionStartedAt && !o.orderWorkspace.productionCompletedAt) {
                productionStatus = "In progress";
            }
            return {
                orderId: o.id,
                orderRef: o.externalRef,
                status: o.state,
                products: o.orderWorkspace?.contractRef ?? o.externalRef,
                quantitySummary: o.orderWorkspace?.contractRef ?? "—",
                productionStatus,
                workspaceUrl: workspaceUrl("ORDER", o.id),
            };
        });
        const freightPanels = freightReqs.map((fr) => {
            const offer = fr.selection?.offer ?? fr.offers[0];
            return {
                orderId: fr.orderId,
                orderRef: orderRefMap.get(fr.orderId) ?? "",
                carrier: offer?.carrierName ?? offer?.providerName ?? null,
                route: `${fr.pol} → ${fr.pod}`,
                containerCount: fr.containerType ? 1 : null,
                etd: offer?.etd?.toISOString() ?? null,
                eta: offer?.eta?.toISOString() ?? null,
                trackingStatus: fr.status,
                workspaceUrl: workspaceUrl("ORDER", fr.orderId),
            };
        });
        const shipmentPanels = shipments.map((s) => {
            const snap = s.trackingSnapshots[0];
            const sw = s.shipmentWorkspace;
            const location = snap?.pod ?? sw?.destinationPort ?? sw?.originPort ?? null;
            return {
                shipmentId: s.id,
                shipmentRef: s.externalRef,
                status: s.state,
                orderRef: sw?.orderRef ?? "",
                currentLocation: location,
                latestUpdate: snap?.trackingStatus ?? s.state,
                latestUpdateAt: snap?.syncedAt.toISOString() ?? s.updatedAt.toISOString(),
                workspaceUrl: workspaceUrl("SHIPMENT", s.id),
            };
        });
        const refMap = new Map([
            [root.id, root.externalRef],
            ...orders.map((o) => [o.id, o.externalRef]),
            ...shipments.map((s) => [s.id, s.externalRef]),
        ]);
        const [tradeDocs, orderDocs, shipmentDocs, rfqAttachments] = await Promise.all([
            this.db.tradeDocument.findMany({
                where: {
                    OR: [
                        { workspaceId: { in: graph.orderIds }, workspaceType: "ORDER" },
                        { workspaceId: { in: graph.shipmentIds }, workspaceType: "SHIPMENT" },
                    ],
                },
            }),
            graph.orderIds.length
                ? this.db.orderDocument.findMany({ where: { workspaceId: { in: graph.orderIds } } })
                : [],
            graph.shipmentIds.length
                ? this.db.shipmentDocument.findMany({ where: { workspaceId: { in: graph.shipmentIds } } })
                : [],
            root.type === "RFQ"
                ? this.db.rfqAttachment.findMany({ where: { workspaceId: root.id } })
                : [],
        ]);
        const documents = [
            ...tradeDocs.map((d) => ({
                id: d.id,
                detailId: `TRADE:${d.id}`,
                fileName: d.fileName,
                documentType: d.documentType,
                category: mapDocCategory(d.documentType),
                status: d.status,
                workspaceType: d.workspaceType,
                workspaceId: d.workspaceId,
                workspaceRef: refMap.get(d.workspaceId) ?? "",
                uploadedAt: d.uploadedAt?.toISOString() ?? null,
            })),
            ...orderDocs.map((d) => ({
                id: d.id,
                detailId: `ORDER:${d.id}`,
                fileName: d.fileName,
                documentType: d.documentType,
                category: mapDocCategory(d.documentType),
                status: "UPLOADED",
                workspaceType: "ORDER",
                workspaceId: d.workspaceId,
                workspaceRef: refMap.get(d.workspaceId) ?? "",
                uploadedAt: d.uploadedAt.toISOString(),
            })),
            ...shipmentDocs.map((d) => ({
                id: d.id,
                detailId: `SHIPMENT:${d.id}`,
                fileName: d.fileName,
                documentType: d.documentType,
                category: mapDocCategory(d.documentType),
                status: "UPLOADED",
                workspaceType: "SHIPMENT",
                workspaceId: d.workspaceId,
                workspaceRef: refMap.get(d.workspaceId) ?? "",
                uploadedAt: d.uploadedAt.toISOString(),
            })),
            ...rfqAttachments.map((d) => ({
                id: d.id,
                detailId: `RFQ:${d.id}`,
                fileName: d.fileName,
                documentType: "ATTACHMENT",
                category: "Other",
                status: "UPLOADED",
                workspaceType: "RFQ",
                workspaceId: d.workspaceId,
                workspaceRef: refMap.get(d.workspaceId) ?? "",
                uploadedAt: d.uploadedAt.toISOString(),
            })),
        ];
        const timeline = timelineEvents.map((e) => ({
            id: e.id,
            label: formatTimelineLabel(e.eventType),
            eventType: e.eventType,
            workspaceType: graph.rootId === e.workspaceId ? root.type : orders.some((o) => o.id === e.workspaceId) ? "ORDER" : "SHIPMENT",
            workspaceId: e.workspaceId,
            actorName: e.actor?.displayName ?? null,
            createdAt: e.createdAt.toISOString(),
        }));
        const alertItems = alertRows.map((a) => ({
            id: a.id,
            severity: a.severity,
            category: a.category,
            title: a.title,
            description: a.description,
            owner: null,
            dueDate: null,
            status: a.resolvedAt ? "RESOLVED" : "OPEN",
            workspaceType: a.workspaceType,
            workspaceId: a.workspaceId,
        }));
        const relatedRecords = [
            {
                type: root.type,
                id: root.id,
                ref: root.externalRef,
                state: root.state,
                url: workspaceUrl(root.type, root.id),
            },
        ];
        if (rfqDetails?.linkedCommoditybidId) {
            const cb = await this.db.workspace.findUnique({ where: { id: rfqDetails.linkedCommoditybidId } });
            if (cb) {
                relatedRecords.push({
                    type: "COMMODITYBID",
                    id: cb.id,
                    ref: cb.externalRef,
                    state: cb.state,
                    url: workspaceUrl("COMMODITYBID", cb.id),
                });
            }
        }
        for (const o of orders) {
            relatedRecords.push({
                type: "ORDER",
                id: o.id,
                ref: o.externalRef,
                state: o.state,
                url: workspaceUrl("ORDER", o.id),
            });
        }
        const estimateSvc = new FreightEstimateService(this.db);
        const estimatePanel = await estimateSvc.getPanel(actor, root.id);
        const freightEstimate = estimateSvc.buildTradePanel(estimatePanel);
        const bookingSvc = new FreightBookingEngineService(this.db);
        const bookingPanel = await bookingSvc.getPanel(actor, root.id);
        const freightBooking = bookingSvc.buildTradePanel(bookingPanel);
        return {
            header,
            summary,
            purchaseOrders,
            orders: orderPanels,
            freight: freightPanels,
            freightEstimate,
            freightBooking,
            shipments: shipmentPanels,
            documents,
            timeline,
            alerts: alertItems,
            relatedRecords,
        };
    }
}
function formatTimelineLabel(eventType) {
    return eventType
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
//# sourceMappingURL=trade.service.js.map