import { Forbidden, NotFound, Validation } from "../../lib/errors.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";
import { canAccessPo } from "../purchase-order/purchase-order.policy.js";
import { canAccessShipment } from "../shipment/shipment.policy.js";
function canMutateLineAllocation(role) {
    return (isPlatformAdminRole(role)
        || role === "ADMIN"
        || role === "OPS_MANAGER"
        || role === "LOGISTICS_OPERATOR");
}
const INACTIVE_SHIPMENT_STATES = new Set(["CANCELLED", "REJECTED"]);
function dec(n) {
    if (n == null)
        return 0;
    return Number(n);
}
export class TradeLineageService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Materialize TradeShipmentLink from existing order→shipment FKs (safe discovery).
     * Never fabricates links without an underlying shipment_workspaces.order_workspace_id match.
     */
    async discoverAndLinkForOrder(orderWorkspaceId, source = "DISCOVERED") {
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { orderId: orderWorkspaceId },
            select: { id: true },
        });
        if (!po)
            return 0;
        const shipments = await this.prisma.shipmentWorkspace.findMany({
            where: { orderWorkspaceId },
            select: { workspaceId: true },
        });
        let n = 0;
        for (const s of shipments) {
            await this.prisma.tradeShipmentLink.upsert({
                where: {
                    purchaseOrderId_shipmentWorkspaceId: {
                        purchaseOrderId: po.id,
                        shipmentWorkspaceId: s.workspaceId,
                    },
                },
                create: {
                    purchaseOrderId: po.id,
                    orderWorkspaceId,
                    shipmentWorkspaceId: s.workspaceId,
                    source,
                },
                update: {},
            });
            n += 1;
        }
        return n;
    }
    async linkPoToShipment(user, purchaseOrderId, shipmentWorkspaceId) {
        if (!(await canAccessPo(this.prisma, user, purchaseOrderId))) {
            throw Forbidden("Cannot access purchase order");
        }
        if (!(await canAccessShipment(this.prisma, user, shipmentWorkspaceId))) {
            throw Forbidden("Cannot access shipment");
        }
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            select: { id: true, orderId: true },
        });
        if (!po)
            throw NotFound("Purchase order not found");
        const sw = await this.prisma.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: { workspaceId: true, orderWorkspaceId: true },
        });
        if (!sw)
            throw NotFound("Shipment not found");
        if (sw.orderWorkspaceId !== po.orderId &&
            user.role !== "ADMIN" &&
            user.role !== "SUPER_ADMIN" &&
            user.role !== "OPS_MANAGER") {
            throw Validation("Shipment order does not match purchase order order workspace", {
                purchaseOrderId,
                shipmentWorkspaceId,
            });
        }
        await this.prisma.tradeShipmentLink.upsert({
            where: {
                purchaseOrderId_shipmentWorkspaceId: {
                    purchaseOrderId: po.id,
                    shipmentWorkspaceId,
                },
            },
            create: {
                purchaseOrderId: po.id,
                orderWorkspaceId: po.orderId,
                shipmentWorkspaceId,
                source: "MANUAL",
                createdById: user.id,
            },
            update: { updatedAt: new Date() },
        });
    }
    async upsertAllocation(user, input) {
        if (!canMutateLineAllocation(String(user.role))) {
            throw Forbidden("Line allocation is limited to operations");
        }
        if (!(await canAccessShipment(this.prisma, user, input.shipmentWorkspaceId))) {
            throw Forbidden("Cannot access shipment");
        }
        const line = await this.prisma.purchaseOrderLine.findUnique({
            where: { id: input.purchaseOrderLineId },
            select: { id: true, purchaseOrderId: true, quantity: true },
        });
        if (!line)
            throw NotFound("PO line not found");
        if (!(await canAccessPo(this.prisma, user, line.purchaseOrderId))) {
            throw Forbidden("Cannot access purchase order");
        }
        const sw = await this.prisma.shipmentWorkspace.findUnique({
            where: { workspaceId: input.shipmentWorkspaceId },
            select: { id: true, workspaceId: true },
        });
        if (!sw)
            throw NotFound("Shipment not found");
        let containerDbId = null;
        if (input.shipmentContainerId) {
            const c = await this.prisma.shipmentContainer.findFirst({
                where: {
                    id: input.shipmentContainerId,
                    shipmentWorkspaceId: sw.id,
                },
                select: { id: true },
            });
            if (!c)
                throw Validation("Container does not belong to shipment");
            containerDbId = c.id;
        }
        const existing = await this.prisma.shipmentLineAllocation.findMany({
            where: { purchaseOrderLineId: line.id },
            select: { id: true, quantity: true, shipmentWorkspaceId: true, shipmentContainerId: true },
        });
        const exact = existing.find((a) => a.shipmentWorkspaceId === input.shipmentWorkspaceId &&
            (a.shipmentContainerId ?? null) === (containerDbId ?? null));
        // Spawn auto-allocates remaining qty with no container. Ops attaching a
        // container on the same shipment must update that row, not create a second
        // allocation that would fail remaining-qty validation.
        const uncontaineredOnShipment = containerDbId == null
            ? undefined
            : existing.find((a) => a.shipmentWorkspaceId === input.shipmentWorkspaceId && a.shipmentContainerId == null);
        const match = exact ?? uncontaineredOnShipment;
        const otherSum = await this.sumActiveAllocated(this.prisma, existing.filter((a) => a.id !== match?.id));
        const ordered = dec(line.quantity);
        if (otherSum + input.quantity > ordered + 1e-9) {
            throw Validation("Allocated quantity exceeds PO line quantity", {
                ordered,
                alreadyAllocated: otherSum,
                requested: input.quantity,
            });
        }
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id: line.purchaseOrderId },
            select: { orderId: true },
        });
        if (po) {
            await this.prisma.tradeShipmentLink.upsert({
                where: {
                    purchaseOrderId_shipmentWorkspaceId: {
                        purchaseOrderId: line.purchaseOrderId,
                        shipmentWorkspaceId: input.shipmentWorkspaceId,
                    },
                },
                create: {
                    purchaseOrderId: line.purchaseOrderId,
                    orderWorkspaceId: po.orderId,
                    shipmentWorkspaceId: input.shipmentWorkspaceId,
                    source: "MANUAL",
                    createdById: user.id,
                },
                update: {},
            });
        }
        if (match) {
            await this.prisma.shipmentLineAllocation.update({
                where: { id: match.id },
                data: {
                    quantity: input.quantity,
                    unit: input.unit ?? null,
                    shipmentContainerId: containerDbId,
                },
            });
            return { id: match.id };
        }
        const created = await this.prisma.shipmentLineAllocation.create({
            data: {
                purchaseOrderLineId: line.id,
                purchaseOrderId: line.purchaseOrderId,
                shipmentWorkspaceId: input.shipmentWorkspaceId,
                shipmentContainerId: containerDbId,
                quantity: input.quantity,
                unit: input.unit ?? null,
                createdById: user.id,
            },
            select: { id: true },
        });
        return created;
    }
    /**
     * Allocate remaining PO line qty onto a shipment (FreightIQ spawn / backfill).
     * Does not overwrite existing non-container allocations on this shipment.
     * Respects: allocatable = ordered − qty on other active shipments.
     */
    async allocateRemainingLinesForShipment(db, input) {
        const po = await db.purchaseOrder.findUnique({
            where: { orderId: input.orderWorkspaceId },
            select: {
                id: true,
                orderId: true,
                lines: { select: { id: true, quantity: true } },
            },
        });
        if (!po || po.lines.length === 0) {
            return { created: 0, skipped: 0, allocated: [] };
        }
        await db.tradeShipmentLink.upsert({
            where: {
                purchaseOrderId_shipmentWorkspaceId: {
                    purchaseOrderId: po.id,
                    shipmentWorkspaceId: input.shipmentWorkspaceId,
                },
            },
            create: {
                purchaseOrderId: po.id,
                orderWorkspaceId: input.orderWorkspaceId,
                shipmentWorkspaceId: input.shipmentWorkspaceId,
                source: input.linkSource ?? "SPAWN",
                createdById: input.actorUserId,
            },
            update: {},
        });
        let created = 0;
        let skipped = 0;
        const allocated = [];
        for (const line of po.lines) {
            const existing = await db.shipmentLineAllocation.findMany({
                where: { purchaseOrderLineId: line.id },
                select: { id: true, quantity: true, shipmentWorkspaceId: true, shipmentContainerId: true },
            });
            const match = existing.find((a) => a.shipmentWorkspaceId === input.shipmentWorkspaceId && a.shipmentContainerId == null);
            if (match) {
                skipped += 1;
                continue;
            }
            const otherSum = await this.sumActiveAllocated(db, existing.filter((a) => a.shipmentWorkspaceId !== input.shipmentWorkspaceId));
            const ordered = dec(line.quantity);
            const remaining = Math.max(0, ordered - otherSum);
            if (remaining <= 1e-9) {
                skipped += 1;
                continue;
            }
            await db.shipmentLineAllocation.create({
                data: {
                    purchaseOrderLineId: line.id,
                    purchaseOrderId: po.id,
                    shipmentWorkspaceId: input.shipmentWorkspaceId,
                    shipmentContainerId: null,
                    quantity: remaining,
                    unit: null,
                    createdById: input.actorUserId,
                },
            });
            created += 1;
            allocated.push({ lineId: line.id, quantity: remaining });
        }
        return { created, skipped, allocated };
    }
    /** Auth-gated backfill for an existing shipment workspace (Admin/Ops/Buyer with access). */
    async backfillRemainingAllocations(user, shipmentWorkspaceId) {
        if (!(await canAccessShipment(this.prisma, user, shipmentWorkspaceId))) {
            throw Forbidden("Cannot access shipment");
        }
        const sw = await this.prisma.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: { orderWorkspaceId: true, workspaceId: true },
        });
        if (!sw)
            throw NotFound("Shipment not found");
        return this.allocateRemainingLinesForShipment(this.prisma, {
            orderWorkspaceId: sw.orderWorkspaceId,
            shipmentWorkspaceId: sw.workspaceId,
            actorUserId: user.id,
            linkSource: "MANUAL",
        });
    }
    async sumActiveAllocated(db, rows) {
        if (rows.length === 0)
            return 0;
        const ids = [...new Set(rows.map((r) => r.shipmentWorkspaceId))];
        const workspaces = await db.workspace.findMany({
            where: { id: { in: ids } },
            select: { id: true, state: true },
        });
        const inactive = new Set(workspaces.filter((w) => INACTIVE_SHIPMENT_STATES.has(w.state)).map((w) => w.id));
        return rows
            .filter((r) => !inactive.has(r.shipmentWorkspaceId))
            .reduce((s, r) => s + dec(r.quantity), 0);
    }
    async relatedForPurchaseOrder(user, poId) {
        if (!(await canAccessPo(this.prisma, user, poId))) {
            throw Forbidden("Cannot access purchase order");
        }
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id: poId },
            select: { id: true, orderId: true, poNumber: true, status: true },
        });
        if (!po)
            throw NotFound("Purchase order not found");
        await this.discoverAndLinkForOrder(po.orderId);
        const links = await this.prisma.tradeShipmentLink.findMany({
            where: { purchaseOrderId: poId },
            select: { shipmentWorkspaceId: true },
        });
        const shipmentIds = [...new Set(links.map((l) => l.shipmentWorkspaceId))];
        const allowedShipmentIds = [];
        for (const sid of shipmentIds) {
            if (await canAccessShipment(this.prisma, user, sid))
                allowedShipmentIds.push(sid);
        }
        return this.buildDto({
            purchaseOrderIds: [poId],
            shipmentWorkspaceIds: allowedShipmentIds,
        });
    }
    async relatedForShipment(user, shipmentWorkspaceId) {
        if (!(await canAccessShipment(this.prisma, user, shipmentWorkspaceId))) {
            throw Forbidden("Cannot access shipment");
        }
        const sw = await this.prisma.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: { orderWorkspaceId: true, workspaceId: true },
        });
        if (!sw)
            throw NotFound("Shipment not found");
        await this.discoverAndLinkForOrder(sw.orderWorkspaceId);
        const links = await this.prisma.tradeShipmentLink.findMany({
            where: { shipmentWorkspaceId },
            select: { purchaseOrderId: true },
        });
        const primaryPo = await this.prisma.purchaseOrder.findUnique({
            where: { orderId: sw.orderWorkspaceId },
            select: { id: true },
        });
        const poIds = new Set(links.map((l) => l.purchaseOrderId));
        if (primaryPo)
            poIds.add(primaryPo.id);
        const allowedPoIds = [];
        for (const id of poIds) {
            if (await canAccessPo(this.prisma, user, id))
                allowedPoIds.push(id);
        }
        return this.buildDto({
            purchaseOrderIds: allowedPoIds,
            shipmentWorkspaceIds: [shipmentWorkspaceId],
        });
    }
    async relatedForContainer(user, shipmentWorkspaceId, containerId) {
        if (!(await canAccessShipment(this.prisma, user, shipmentWorkspaceId))) {
            throw Forbidden("Cannot access shipment");
        }
        const sw = await this.prisma.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: { id: true, workspaceId: true },
        });
        if (!sw)
            throw NotFound("Shipment not found");
        const container = await this.prisma.shipmentContainer.findFirst({
            where: { id: containerId, shipmentWorkspaceId: sw.id },
            select: { id: true },
        });
        if (!container)
            throw NotFound("Container not found");
        const base = await this.relatedForShipment(user, shipmentWorkspaceId);
        return {
            ...base,
            containers: base.containers.filter((c) => c.id === containerId),
            allocations: base.allocations.filter((a) => a.shipmentContainerId === containerId),
            poLines: base.poLines.filter((l) => base.allocations.some((a) => a.purchaseOrderLineId === l.id && a.shipmentContainerId === containerId)),
        };
    }
    async buildDto(opts) {
        const { purchaseOrderIds, shipmentWorkspaceIds } = opts;
        const purchaseOrders = purchaseOrderIds.length === 0
            ? []
            : await this.prisma.purchaseOrder.findMany({
                where: { id: { in: purchaseOrderIds } },
                select: { id: true, poNumber: true, status: true, orderId: true, source: true },
            });
        const lines = purchaseOrderIds.length === 0
            ? []
            : await this.prisma.purchaseOrderLine.findMany({
                where: { purchaseOrderId: { in: purchaseOrderIds } },
                select: {
                    id: true,
                    purchaseOrderId: true,
                    sku: true,
                    description: true,
                    quantity: true,
                },
            });
        const allocations = purchaseOrderIds.length === 0 && shipmentWorkspaceIds.length === 0
            ? []
            : await this.prisma.shipmentLineAllocation.findMany({
                where: {
                    OR: [
                        purchaseOrderIds.length ? { purchaseOrderId: { in: purchaseOrderIds } } : undefined,
                        shipmentWorkspaceIds.length
                            ? { shipmentWorkspaceId: { in: shipmentWorkspaceIds } }
                            : undefined,
                    ].filter(Boolean),
                },
                select: {
                    id: true,
                    purchaseOrderLineId: true,
                    purchaseOrderId: true,
                    shipmentWorkspaceId: true,
                    shipmentContainerId: true,
                    quantity: true,
                    unit: true,
                    purchaseOrderLine: { select: { sku: true, description: true } },
                },
            });
        const allocByLine = new Map();
        for (const a of allocations) {
            allocByLine.set(a.purchaseOrderLineId, (allocByLine.get(a.purchaseOrderLineId) ?? 0) + dec(a.quantity));
        }
        const shipmentRows = shipmentWorkspaceIds.length === 0
            ? []
            : await this.prisma.shipmentWorkspace.findMany({
                where: { workspaceId: { in: shipmentWorkspaceIds } },
                select: {
                    workspaceId: true,
                    orderWorkspaceId: true,
                    bookingRef: true,
                    bookingNumber: true,
                    carrierName: true,
                    bookingStatus: true,
                    vesselName: true,
                    voyageNumber: true,
                    originPort: true,
                    destinationPort: true,
                    etd: true,
                    eta: true,
                    workspace: { select: { externalRef: true, state: true } },
                    containers: {
                        select: {
                            id: true,
                            containerNumber: true,
                            containerType: true,
                            status: true,
                            shipmentWorkspaceId: true,
                        },
                    },
                },
            });
        const bookings = shipmentRows.map((s) => ({
            shipmentWorkspaceId: s.workspaceId,
            bookingReference: s.bookingRef ?? s.bookingNumber ?? null,
            carrier: s.carrierName ?? null,
            hasBooking: !!(s.bookingRef || s.bookingNumber || s.carrierName || s.bookingStatus),
            status: s.bookingStatus ?? null,
            etd: s.etd?.toISOString() ?? null,
            eta: s.eta?.toISOString() ?? null,
            vessel: s.vesselName ?? null,
            voyage: s.voyageNumber ?? null,
            pol: s.originPort ?? null,
            pod: s.destinationPort ?? null,
        }));
        const shipments = shipmentRows.map((s) => ({
            id: s.workspaceId,
            externalRef: s.workspace.externalRef ?? null,
            state: s.workspace.state ?? null,
            orderWorkspaceId: s.orderWorkspaceId,
            bookingReference: s.bookingRef ?? s.bookingNumber ?? null,
            containerCount: s.containers.length,
        }));
        const containers = shipmentRows.flatMap((s) => s.containers.map((c) => ({
            id: c.id,
            shipmentWorkspaceId: s.workspaceId,
            containerNumber: c.containerNumber,
            containerType: c.containerType,
            status: c.status,
        })));
        const sourceContext = await this.buildSourceContext(purchaseOrders);
        return {
            purchaseOrders: purchaseOrders.map((p) => ({
                id: p.id,
                poNumber: p.poNumber,
                status: p.status,
                orderId: p.orderId,
            })),
            poLines: lines.map((l) => {
                const allocated = allocByLine.get(l.id) ?? 0;
                const ordered = dec(l.quantity);
                return {
                    id: l.id,
                    purchaseOrderId: l.purchaseOrderId,
                    sku: l.sku,
                    description: l.description,
                    orderedQuantity: ordered,
                    allocatedQuantity: allocated,
                    remainingQuantity: Math.max(0, ordered - allocated),
                };
            }),
            bookings,
            shipments,
            containers,
            allocations: allocations.map((a) => ({
                id: a.id,
                purchaseOrderLineId: a.purchaseOrderLineId,
                purchaseOrderId: a.purchaseOrderId,
                shipmentWorkspaceId: a.shipmentWorkspaceId,
                shipmentContainerId: a.shipmentContainerId,
                quantity: dec(a.quantity),
                unit: a.unit,
                sku: a.purchaseOrderLine.sku,
                description: a.purchaseOrderLine.description,
            })),
            sourceContext,
        };
    }
    async buildSourceContext(purchaseOrders) {
        if (purchaseOrders.length === 0) {
            return {
                sourceType: null,
                orderWorkspaceId: null,
                rfqWorkspaceId: null,
                rfqExternalRef: null,
                commodityBidWorkspaceId: null,
                commodityBidExternalRef: null,
                inspections: [],
                freightRequests: [],
            };
        }
        const primary = purchaseOrders[0];
        const orderId = primary.orderId;
        const [orderWs, workspace, inspections, freightRequests] = await Promise.all([
            this.prisma.orderWorkspace.findUnique({
                where: { workspaceId: orderId },
                select: { parentWorkspaceId: true, parentWorkspaceType: true, origin: true },
            }),
            this.prisma.workspace.findUnique({
                where: { id: orderId },
                select: {
                    spawnedFromId: true,
                    spawnedFrom: { select: { id: true, type: true, externalRef: true } },
                },
            }),
            this.prisma.inspectionWorkspace.findMany({
                where: {
                    OR: [{ orderWorkspaceId: orderId }, { purchaseOrderId: { in: purchaseOrders.map((p) => p.id) } }],
                },
                select: {
                    id: true,
                    inspectionNumber: true,
                    status: true,
                    decision: true,
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
            this.prisma.freightRequest.findMany({
                where: { orderId },
                select: {
                    id: true,
                    status: true,
                    selection: { select: { id: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
        ]);
        const parentType = workspace?.spawnedFrom?.type ?? orderWs?.parentWorkspaceType ?? null;
        const parentId = workspace?.spawnedFrom?.id ?? orderWs?.parentWorkspaceId ?? null;
        const parentRef = workspace?.spawnedFrom?.externalRef ?? null;
        let sourceType = "UNKNOWN";
        let rfqWorkspaceId = null;
        let rfqExternalRef = null;
        let commodityBidWorkspaceId = null;
        let commodityBidExternalRef = null;
        if (parentType === "RFQ" && parentId) {
            sourceType = "RFQ";
            rfqWorkspaceId = parentId;
            rfqExternalRef = parentRef;
        }
        else if (parentType === "COMMODITYBID" && parentId) {
            sourceType = "COMMODITY_BID";
            commodityBidWorkspaceId = parentId;
            commodityBidExternalRef = parentRef;
        }
        else if (parentType === "DIRECT_PO" ||
            orderWs?.origin === "DIRECT_PO" ||
            primary.source === "DIRECT") {
            sourceType = "DIRECT_PO";
        }
        else if (primary.source === "RFQ") {
            sourceType = "RFQ";
        }
        else if (primary.source === "COMMODITY_BID") {
            sourceType = "COMMODITY_BID";
        }
        else if (primary.source === "REORDER") {
            sourceType = "REORDER";
        }
        else if (primary.source === "API") {
            sourceType = "API";
        }
        if (sourceType === "RFQ" && rfqWorkspaceId && !rfqExternalRef) {
            const rfq = await this.prisma.workspace.findUnique({
                where: { id: rfqWorkspaceId },
                select: { externalRef: true },
            });
            rfqExternalRef = rfq?.externalRef ?? null;
        }
        if (sourceType === "COMMODITY_BID" && commodityBidWorkspaceId && !commodityBidExternalRef) {
            const cb = await this.prisma.workspace.findUnique({
                where: { id: commodityBidWorkspaceId },
                select: { externalRef: true },
            });
            commodityBidExternalRef = cb?.externalRef ?? null;
        }
        return {
            sourceType,
            orderWorkspaceId: orderId,
            rfqWorkspaceId,
            rfqExternalRef,
            commodityBidWorkspaceId,
            commodityBidExternalRef,
            inspections: inspections.map((i) => ({
                id: i.id,
                inspectionNumber: i.inspectionNumber,
                status: i.status,
                decision: i.decision,
            })),
            freightRequests: freightRequests.map((f) => ({
                id: f.id,
                status: f.status,
                hasSelection: !!f.selection,
            })),
        };
    }
}
export function createTradeLineageService(prisma) {
    return new TradeLineageService(prisma);
}
//# sourceMappingURL=trade-lineage.service.js.map