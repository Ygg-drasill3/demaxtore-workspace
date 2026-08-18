import { findBcTransition, } from "@dmx/contracts/bulk-container.fsm";
import { FREIGHTIQ_ORDER_ELIGIBLE_STATES } from "@dmx/contracts/freightiq";
import { AppError } from "../../utils/httpErrors.js";
import { spawnOrderWorkspace } from "../order/order.spawn.js";
import { createPurchaseOrderOnOrderSpawn } from "../purchase-order/purchase-order.spawn.js";
import { isOrderEligibleForFreight } from "../freightiq/freightiq.policy.js";
const SUPPLIER_CODE_EMAIL = {
    "SUP-001": "supplier1@acme-mfg.test",
    "SUP-002": "supplier1@beta-industries.test",
};
const SHIPMENT_TERMINAL = ["DELIVERED", "COMPLETED", "CLOSED"];
function num(v) {
    if (v == null)
        return null;
    return Number(v);
}
function allocationRef(sortOrder) {
    return `Allocation ${sortOrder + 1}`;
}
async function appendTimeline(tx, workspaceId, eventType, actorUserId, payload = {}) {
    await tx.timelineEvent.create({
        data: { workspaceId, eventType, actorUserId, payload: payload },
    });
}
async function applyBcTransition(tx, workspaceId, action, actor, auditEvent, payload = {}) {
    await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
    const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const from = ws.state;
    const t = findBcTransition(from, action);
    if (!t)
        throw new AppError(400, "INVALID_TRANSITION", { from, action });
    if (!t.allowedRoles.includes(actor.role)) {
        throw new AppError(403, "FORBIDDEN_ROLE");
    }
    await tx.workspace.update({ where: { id: workspaceId }, data: { state: t.to } });
    await appendTimeline(tx, workspaceId, auditEvent, actor.role === "SYSTEM" ? null : actor.id, payload);
    return t.to;
}
async function nextBcExecRef(tx) {
    const year = new Date().getUTCFullYear();
    const prefix = `BC-EXEC-${year}-`;
    const last = await tx.bcMasterOrder.findFirst({
        where: { externalRef: { startsWith: prefix } },
        orderBy: { externalRef: "desc" },
        select: { externalRef: true },
    });
    const n = last ? Number(last.externalRef.slice(prefix.length)) : 0;
    return `${prefix}${String(n + 1).padStart(5, "0")}`;
}
async function resolveSupplierUserId(tx, supplierCode) {
    const email = SUPPLIER_CODE_EMAIL[supplierCode];
    if (!email)
        throw new AppError(400, "SUPPLIER_NOT_RESOLVED", { supplierCode });
    const user = await tx.user.findUnique({ where: { email } });
    if (!user)
        throw new AppError(404, "SUPPLIER_USER_NOT_FOUND", { email });
    return user.id;
}
function lineFullyAllocated(lineId, lineQtyMt, allocations) {
    const total = allocations
        .filter((a) => a.lineId === lineId)
        .reduce((sum, a) => sum + Number(a.allocatedQuantityMt), 0);
    return total >= lineQtyMt - 0.001;
}
export class BulkContainerExecutionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertBuyerAccess(workspaceId, actor) {
        const part = await this.prisma.workspaceParticipant.findFirst({
            where: { workspaceId, userId: actor.id, participantRole: "OWNER" },
        });
        if (!part)
            throw new AppError(403, "FORBIDDEN");
    }
    async spawnExecutionOrders(id, actor) {
        if (actor.role !== "ADMIN" && actor.role !== "SYSTEM")
            throw new AppError(403, "FORBIDDEN");
        const ws = await this.prisma.workspace.findUniqueOrThrow({
            where: { id },
            include: {
                bulkContainerDetails: true,
                bulkContainerLines: { where: { removedAt: null } },
                bcSupplierAllocations: {
                    include: {
                        line: { include: { catalogProduct: true, packingType: true } },
                        proformas: true,
                        payments: true,
                    },
                    orderBy: { sortOrder: "asc" },
                },
                bcMasterOrders: true,
                bcOrderLinks: true,
            },
        });
        if (ws.type !== "BULK_CONTAINER")
            throw new AppError(409, "WRONG_WORKSPACE_TYPE");
        if (ws.state !== "BC_EXECUTION_READY") {
            throw new AppError(409, "NOT_EXECUTION_READY", { state: ws.state });
        }
        const incomplete = ws.bulkContainerLines.filter((l) => !lineFullyAllocated(l.id, Number(l.quantityMt), ws.bcSupplierAllocations));
        if (incomplete.length > 0)
            throw new AppError(409, "LINES_NOT_ALLOCATED", { count: incomplete.length });
        if (ws.bcSupplierAllocations.length === 0)
            throw new AppError(409, "NO_ALLOCATIONS");
        const allHaveProformas = ws.bcSupplierAllocations.every((a) => a.proformas.length > 0);
        if (!allHaveProformas)
            throw new AppError(409, "PROFORMAS_MISSING");
        const allPaid = ws.bcSupplierAllocations.every((a) => a.payments.some((p) => p.status === "PAYMENT_CONFIRMED"));
        if (!allPaid)
            throw new AppError(409, "PAYMENTS_NOT_CONFIRMED");
        const { assertFreightEstimatePoGate } = await import("../freight-estimate/freight-estimate.policy.js");
        await assertFreightEstimatePoGate(this.prisma, id);
        if (ws.bcOrderLinks.length > 0) {
            const master = ws.bcMasterOrders[0];
            const orders = await this.prisma.workspace.findMany({
                where: { id: { in: ws.bcOrderLinks.map((l) => l.supplierOrderId) } },
                select: { id: true, externalRef: true },
            });
            const orderRefMap = new Map(orders.map((o) => [o.id, o.externalRef]));
            return {
                masterOrderRef: master?.externalRef ?? null,
                masterOrderId: master?.id ?? null,
                supplierOrders: ws.bcOrderLinks.map((l) => ({
                    allocationRef: allocationRef(ws.bcSupplierAllocations.find((a) => a.id === l.allocationId).sortOrder),
                    orderId: l.supplierOrderId,
                    orderExternalRef: orderRefMap.get(l.supplierOrderId) ?? "",
                })),
                state: ws.state,
            };
        }
        const buyerUserId = ws.createdById;
        const currency = ws.bulkContainerDetails?.currency ?? ws.currency ?? "USD";
        const dest = ws.bulkContainerDetails?.destinationMarket?.slice(0, 20) ?? "NLRTM";
        try {
            return await this.prisma.$transaction(async (tx) => {
                await appendTimeline(tx, id, "bulk_execution_started", actor.id, {});
                const bcRef = await nextBcExecRef(tx);
                const master = await tx.bcMasterOrder.create({
                    data: { bulkContainerId: id, externalRef: bcRef, status: "ACTIVE" },
                });
                const spawnedOrders = [];
                for (const alloc of ws.bcSupplierAllocations) {
                    const supplierUserId = await resolveSupplierUserId(tx, alloc.supplierCode);
                    const proforma = alloc.proformas[0];
                    const qtyMt = Number(alloc.allocatedQuantityMt);
                    const totalValue = proforma ? num(proforma.amount) : qtyMt * 350;
                    const unitPrice = proforma ? totalValue / qtyMt : 350;
                    const poNumber = `${bcRef}-${alloc.sortOrder + 1}`;
                    const suffix = `A${alloc.sortOrder + 1}`;
                    const spawned = await spawnOrderWorkspace(tx, {
                        parentWorkspaceId: id,
                        parentType: "BULK_CONTAINER",
                        parentExternalRef: ws.externalRef,
                        buyerUserId,
                        supplierUserId,
                        contractRef: poNumber,
                        currency: proforma?.currency ?? currency,
                        totalValue,
                        incoterms: "EXW",
                        originPort: "CNSHA",
                        destinationPort: dest,
                        actorUserId: actor.id,
                        auditEvent: "order.created_from_bulk_container",
                        orderRefSuffix: suffix,
                        timelinePayload: {
                            bulkContainerId: id,
                            masterOrderRef: bcRef,
                            allocationId: alloc.id,
                            allocationRef: allocationRef(alloc.sortOrder),
                        },
                    });
                    const product = alloc.line.catalogProduct;
                    await createPurchaseOrderOnOrderSpawn(tx, {
                        orderId: spawned.orderWorkspaceId,
                        poNumber,
                        buyerId: buyerUserId,
                        supplierId: supplierUserId,
                        currency: proforma?.currency ?? currency,
                        incoterm: "EXW",
                        paymentTerms: "Direct supplier payment",
                        lines: [{
                                sku: product.productRef,
                                description: `${product.name} — ${alloc.line.packingType.name}`,
                                quantity: qtyMt,
                                unitPrice,
                            }],
                        actorUserId: actor.id,
                        actorEmail: actor.email,
                        actorRole: actor.role,
                        // See the SmartContainer spawn: container purchases are not RFQ-sourced.
                        source: "DIRECT",
                        issueReason: `BulkContainer ${bcRef} allocation ${alloc.sortOrder + 1}`,
                    });
                    await tx.bcOrderLink.create({
                        data: {
                            workspaceId: id,
                            masterOrderId: master.id,
                            supplierOrderId: spawned.orderWorkspaceId,
                            allocationId: alloc.id,
                        },
                    });
                    spawnedOrders.push({
                        allocationRef: allocationRef(alloc.sortOrder),
                        orderId: spawned.orderWorkspaceId,
                        orderExternalRef: spawned.externalRef,
                    });
                }
                await applyBcTransition(tx, id, "spawn_execution_orders", actor, "bulk_orders_spawned", {
                    masterOrderRef: bcRef,
                    supplierOrderCount: spawnedOrders.length,
                });
                return {
                    masterOrderRef: bcRef,
                    masterOrderId: master.id,
                    supplierOrders: spawnedOrders,
                    state: "BC_EXECUTION_ACTIVE",
                };
            });
        }
        catch (err) {
            if (err instanceof AppError)
                throw err;
            throw new AppError(500, "ORDER_SPAWN_FAILED", { message: String(err) });
        }
    }
    async getExecution(id, actor) {
        const ws = await this.prisma.workspace.findUniqueOrThrow({
            where: { id },
            include: {
                bulkContainerDetails: true,
                bcSupplierAllocations: {
                    include: { line: { include: { catalogProduct: true, packingType: true } } },
                    orderBy: { sortOrder: "asc" },
                },
                bcSupplierProformas: true,
                bcMasterOrders: { orderBy: { createdAt: "desc" }, take: 1 },
                bcOrderLinks: true,
                timelineEvents: { orderBy: { createdAt: "asc" }, take: 100 },
            },
        });
        if (ws.type !== "BULK_CONTAINER")
            throw new AppError(409, "WRONG_WORKSPACE_TYPE");
        if (actor.role === "BUYER") {
            await this.assertBuyerAccess(id, actor);
        }
        else if (actor.role !== "ADMIN") {
            throw new AppError(403, "FORBIDDEN");
        }
        const master = ws.bcMasterOrders[0] ?? null;
        const orderIds = ws.bcOrderLinks.map((l) => l.supplierOrderId);
        const orders = orderIds.length
            ? await this.prisma.workspace.findMany({
                where: { id: { in: orderIds } },
                include: { orderWorkspace: true },
            })
            : [];
        const freightRequests = orderIds.length
            ? await this.prisma.freightRequest.findMany({
                where: { orderId: { in: orderIds } },
                orderBy: { createdAt: "desc" },
            })
            : [];
        const shipments = orderIds.length
            ? await this.prisma.workspace.findMany({
                where: { spawnedFromId: { in: orderIds }, type: "SHIPMENT" },
            })
            : [];
        const orderDocs = orderIds.length
            ? await this.prisma.orderDocument.findMany({ where: { workspaceId: { in: orderIds } } })
            : [];
        const shipmentIds = shipments.map((s) => s.id);
        const shipDocs = shipmentIds.length
            ? await this.prisma.shipmentDocument.findMany({ where: { workspaceId: { in: shipmentIds } } })
            : [];
        const orderByAlloc = new Map(ws.bcOrderLinks.map((l) => [l.allocationId, l.supplierOrderId]));
        const orderMap = new Map(orders.map((o) => [o.id, o]));
        const freightByOrder = new Map();
        for (const fr of freightRequests) {
            if (!freightByOrder.has(fr.orderId))
                freightByOrder.set(fr.orderId, fr.status);
        }
        const shipmentByOrder = new Map();
        for (const sh of shipments) {
            if (sh.spawnedFromId)
                shipmentByOrder.set(sh.spawnedFromId, sh.state);
        }
        const allocations = ws.bcSupplierAllocations.map((a) => {
            const orderId = orderByAlloc.get(a.id);
            const order = orderId ? orderMap.get(orderId) : undefined;
            const docCount = (orderId ? orderDocs.filter((d) => d.workspaceId === orderId).length : 0) +
                ws.bcSupplierProformas.filter((p) => p.allocationId === a.id).length;
            return {
                allocationRef: allocationRef(a.sortOrder),
                productName: a.line.catalogProduct.name,
                orderState: order?.state ?? null,
                orderExternalRef: order?.externalRef ?? null,
                freightStatus: orderId ? freightByOrder.get(orderId) ?? null : null,
                shipmentState: orderId ? shipmentByOrder.get(orderId) ?? null : null,
                documentCount: docCount,
            };
        });
        const allocMap = new Map(ws.bcSupplierAllocations.map((a) => [a.id, a]));
        const documents = [];
        for (const p of ws.bcSupplierProformas) {
            const alloc = allocMap.get(p.allocationId);
            documents.push({
                id: p.id,
                type: "PROFORMA",
                label: `Proforma ${p.proformaNumber}`,
                source: "PROFORMA",
                url: p.proformaFileUrl,
                allocationRef: alloc ? allocationRef(alloc.sortOrder) : null,
            });
        }
        for (const d of orderDocs) {
            documents.push({
                id: d.id,
                type: d.documentType,
                label: d.fileName,
                source: "ORDER",
                url: null,
                allocationRef: null,
            });
        }
        for (const d of shipDocs) {
            documents.push({
                id: d.id,
                type: d.documentType,
                label: d.fileName,
                source: "SHIPMENT",
                url: null,
                allocationRef: null,
            });
        }
        const timelineEvents = ws.timelineEvents;
        const eventAt = (type) => timelineEvents.find((e) => e.eventType === type)?.createdAt.toISOString() ?? null;
        const timeline = [
            { key: "execution_ready", label: "Execution Ready", completed: !!eventAt("bulk_execution_ready"), completedAt: eventAt("bulk_execution_ready") },
            { key: "execution_started", label: "Execution Started", completed: !!eventAt("bulk_execution_started"), completedAt: eventAt("bulk_execution_started") },
            { key: "orders_spawned", label: "Orders Created", completed: !!eventAt("bulk_orders_spawned"), completedAt: eventAt("bulk_orders_spawned") },
            { key: "freight_started", label: "Freight Started", completed: !!eventAt("bulk_freight_started"), completedAt: eventAt("bulk_freight_started") },
            { key: "shipment_started", label: "Shipment Started", completed: !!eventAt("bulk_shipment_started"), completedAt: eventAt("bulk_shipment_started") },
            { key: "execution_completed", label: "Execution Complete", completed: ws.state === "BC_EXECUTION_COMPLETE", completedAt: eventAt("bulk_execution_completed") },
        ];
        let completionPercent = 0;
        if (ws.state === "BC_EXECUTION_COMPLETE") {
            completionPercent = 100;
        }
        else if (orderIds.length > 0) {
            let score = 0;
            for (const orderId of orderIds) {
                const order = orderMap.get(orderId);
                const shipState = shipmentByOrder.get(orderId);
                if (shipState && SHIPMENT_TERMINAL.includes(shipState))
                    score += 100;
                else if (shipState)
                    score += 70;
                else if (order && FREIGHTIQ_ORDER_ELIGIBLE_STATES.includes(order.state) && freightByOrder.has(orderId))
                    score += 50;
                else if (order && order.state !== "ORDER_CREATED")
                    score += 30;
                else
                    score += 10;
            }
            completionPercent = Math.round(score / orderIds.length);
        }
        else if (ws.state === "BC_EXECUTION_READY") {
            completionPercent = 80;
        }
        await this.tryMarkExecutionComplete(id);
        const currentState = (await this.prisma.workspace.findUnique({ where: { id }, select: { state: true } })).state;
        return {
            workspaceId: ws.id,
            containerExternalRef: ws.externalRef,
            state: currentState,
            masterOrderRef: master?.externalRef ?? null,
            masterOrderId: master?.id ?? null,
            completionPercent,
            allocations,
            documents,
            timeline,
            supplierOrderCount: orderIds.length,
        };
    }
    async tryMarkExecutionComplete(bulkContainerId) {
        const ws = await this.prisma.workspace.findUnique({
            where: { id: bulkContainerId },
            include: { bcOrderLinks: true },
        });
        if (!ws || ws.state !== "BC_EXECUTION_ACTIVE" || ws.bcOrderLinks.length === 0)
            return;
        const orderIds = ws.bcOrderLinks.map((l) => l.supplierOrderId);
        const shipments = await this.prisma.workspace.findMany({
            where: { spawnedFromId: { in: orderIds }, type: "SHIPMENT" },
        });
        if (shipments.length < orderIds.length)
            return;
        const allDone = shipments.every((s) => SHIPMENT_TERMINAL.includes(s.state));
        if (!allDone)
            return;
        await this.prisma.$transaction(async (tx) => {
            await applyBcTransition(tx, bulkContainerId, "mark_execution_complete", { id: "00000000-0000-0000-0000-000000000001", role: "SYSTEM", email: "system@demaxtore.local" }, "bulk_execution_completed");
            await tx.bcMasterOrder.updateMany({
                where: { bulkContainerId },
                data: { status: "COMPLETE" },
            });
        });
    }
    async recordFreightStarted(bulkContainerId, orderId) {
        const link = await this.prisma.bcOrderLink.findFirst({
            where: { workspaceId: bulkContainerId, supplierOrderId: orderId },
        });
        if (!link)
            return;
        const existing = await this.prisma.timelineEvent.findFirst({
            where: { workspaceId: bulkContainerId, eventType: "bulk_freight_started" },
        });
        if (existing)
            return;
        await this.prisma.timelineEvent.create({
            data: {
                workspaceId: bulkContainerId,
                eventType: "bulk_freight_started",
                actorUserId: null,
                payload: { orderId },
            },
        });
    }
    async recordShipmentStarted(bulkContainerId, orderId, shipmentId) {
        const link = await this.prisma.bcOrderLink.findFirst({
            where: { workspaceId: bulkContainerId, supplierOrderId: orderId },
        });
        if (!link)
            return;
        const existing = await this.prisma.timelineEvent.findFirst({
            where: { workspaceId: bulkContainerId, eventType: "bulk_shipment_started" },
        });
        if (!existing) {
            await this.prisma.timelineEvent.create({
                data: {
                    workspaceId: bulkContainerId,
                    eventType: "bulk_shipment_started",
                    actorUserId: null,
                    payload: { orderId, shipmentId },
                },
            });
        }
        await this.tryMarkExecutionComplete(bulkContainerId);
    }
    static isOrderFreightEligible(state) {
        return isOrderEligibleForFreight(state);
    }
}
//# sourceMappingURL=bulk-container-execution.service.js.map