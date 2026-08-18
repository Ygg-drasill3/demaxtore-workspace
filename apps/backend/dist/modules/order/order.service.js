import { Prisma } from "@prisma/client";
import { findOrderTransition, resolveOrderTargetState, ORDER_SELF_LOOP_ACTIONS, } from "@dmx/contracts/order.fsm";
import { resolveRecipients } from "./order.notifications.js";
import { PRECONDITIONS } from "./order.preconditions.js";
import { spawnShipmentFromOrder, backfillFreightSelectionForOrder } from "../shipment/shipment.spawn.js";
import { autoAcknowledgePoOnSupplierConfirm } from "../purchase-order/purchase-order.sync.js";
import { closeParentRfqWhenOrderCloses } from "../rfq/rfq-order.sync.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { buildFsmNotificationMetadata } from "../notification-engine/fsm-notification-metadata.js";
import { AppError } from "../../utils/httpErrors.js";
import { claimProcessedEvent, releaseProcessedEvent } from "../../lib/processed-event.js";
const SYSTEM_ACTOR = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "system@demaxtore.local",
    role: "SYSTEM",
};
export class OrderService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** %100 production update completes the order; partial updates stay in production. */
    resolveTransition(currentState, action, actorRole, payload) {
        if (action === "report_production_progress") {
            const pct = Number(payload.percentage);
            if (Number.isFinite(pct) && pct >= 100) {
                return findOrderTransition(currentState, "mark_production_completed", actorRole);
            }
        }
        return findOrderTransition(currentState, action, actorRole);
    }
    async applyTransition(input) {
        const result = await this.runOneTransition(input);
        // DEPARTED and ETA_UPDATED are "flash" states that auto-resolve to IN_TRANSIT.
        // Only chain the SYSTEM auto-transition when THIS call actually performed the
        // primary transition and landed in a flash state. On an idempotent replay the
        // order is already IN_TRANSIT, so re-running auto_to_in_transit would throw
        // UNKNOWN_ACTION and brick the retry (C1).
        const isReplay = result.timelineEventId === "(idempotent-replay)";
        if (!isReplay && (result.toState === "DEPARTED" || result.toState === "ETA_UPDATED")) {
            await this.runOneTransition({
                ...input,
                action: "auto_to_in_transit",
                actor: SYSTEM_ACTOR,
                payload: {},
                idempotencyKey: undefined,
            });
        }
        void this.notifyOrchestrator(input.workspaceId, input.action, input.payload ?? {}, result).catch(() => { });
        return result;
    }
    async notifyOrchestrator(orderId, action, payload, result) {
        const { isOrchestratorEnabled } = await import("../../config/orchestrator.js");
        if (!isOrchestratorEnabled())
            return;
        const { OrderShipmentOrchestrator } = await import("../orchestration/order-shipment-orchestrator.service.js");
        await new OrderShipmentOrchestrator(this.prisma).onOrderTransition({
            orderId,
            action,
            payload,
            eventId: `${orderId}:${action}:${result.fromState}->${result.toState}`,
            result: { fromState: result.fromState, toState: result.toState },
        });
    }
    async runOneTransition(input) {
        const { workspaceId, action, actor, payload = {}, idempotencyKey, reason, requestContext } = input;
        if (idempotencyKey) {
            const existing = await this.prisma.auditLog.findFirst({
                where: { workspaceId, payload: { path: ["idempotencyKey"], equals: idempotencyKey } },
                orderBy: { createdAt: "desc" },
            });
            if (existing) {
                return {
                    workspaceId,
                    fromState: existing.fromState,
                    toState: existing.toState,
                    timelineEventId: "(idempotent-replay)",
                    auditLogId: existing.id,
                    notificationsCreated: 0,
                };
            }
            const claimed = await claimProcessedEvent(this.prisma, {
                source: "fsm:order",
                eventId: `${workspaceId}:${idempotencyKey}`,
                workspaceId,
                action,
            });
            if (!claimed) {
                const replay = await this.prisma.auditLog.findFirst({
                    where: { workspaceId, payload: { path: ["idempotencyKey"], equals: idempotencyKey } },
                    orderBy: { createdAt: "desc" },
                });
                if (replay) {
                    return {
                        workspaceId,
                        fromState: replay.fromState,
                        toState: replay.toState,
                        timelineEventId: "(idempotent-replay)",
                        auditLogId: replay.id,
                        notificationsCreated: 0,
                    };
                }
                throw new AppError(409, "IDEMPOTENT_IN_FLIGHT");
            }
        }
        const txnPromise = this.prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
            const lockRows = await tx.$queryRaw(Prisma.sql `SELECT id, state, type FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`);
            if (lockRows.length === 0)
                throw new AppError(404, "WORKSPACE_NOT_FOUND");
            const currentState = lockRows[0].state;
            if (lockRows[0].type !== "ORDER")
                throw new AppError(409, "WRONG_WORKSPACE_TYPE");
            const { PaymentMilestoneService } = await import("../payments/payment-milestone.service.js");
            await new PaymentMilestoneService(this.prisma).assertOrderActionAllowed(action, workspaceId);
            const { assertOrderIncotermPreconditions } = await import("../../config/incoterms-gate.js");
            await assertOrderIncotermPreconditions(this.prisma, workspaceId, action);
            const transition = this.resolveTransition(currentState, action, actor.role, payload);
            if (!transition)
                throw new AppError(400, "UNKNOWN_ACTION", { from: currentState, action });
            if (!transition.allowedRoles.includes(actor.role)) {
                throw new AppError(403, "FORBIDDEN_ROLE", { allowed: transition.allowedRoles, actor: actor.role });
            }
            if (transition.requiredParticipant && actor.role !== "ADMIN" && actor.role !== "SYSTEM") {
                const p = await tx.workspaceParticipant.findFirst({ where: { workspaceId, userId: actor.id } });
                if (!p)
                    throw new AppError(403, "FORBIDDEN_NON_PARTICIPANT");
                if (transition.requiredParticipant !== "ANY" && p.participantRole !== transition.requiredParticipant) {
                    throw new AppError(403, "FORBIDDEN_PARTICIPANT");
                }
            }
            const effectiveReason = (reason ?? payload.reason);
            if (transition.requiresReason && !effectiveReason?.trim()) {
                throw new AppError(400, "REASON_REQUIRED", { action });
            }
            const workspaceFull = await tx.workspace.findUniqueOrThrow({
                where: { id: workspaceId },
                include: {
                    orderWorkspace: true,
                    participants: true,
                    orderStatusUpdates: {
                        where: { updateType: "PRODUCTION" },
                        orderBy: { createdAt: "desc" },
                        take: 5,
                    },
                    freightRequests: { include: { selection: true }, orderBy: { createdAt: "desc" } },
                },
            });
            for (const pre of transition.preconditions ?? []) {
                const fn = PRECONDITIONS[pre];
                if (!fn)
                    throw new AppError(500, "UNKNOWN_PRECONDITION", { pre });
                fn({ workspace: workspaceFull, payload, actor });
            }
            const newState = resolveOrderTargetState(currentState, transition);
            if (newState === currentState && !ORDER_SELF_LOOP_ACTIONS.includes(action)) {
                throw new AppError(409, "NO_STATE_CHANGE", { from: currentState, action });
            }
            if (newState !== currentState) {
                await tx.workspace.update({ where: { id: workspaceId }, data: { state: newState } });
            }
            await this.runActionSideEffects(tx, transition, workspaceFull, payload, actor, reason);
            const timelineEvent = await tx.timelineEvent.create({
                data: {
                    workspaceId,
                    eventType: transition.auditEvent,
                    actorUserId: actor.role === "SYSTEM" ? null : actor.id,
                    payload: { ...payload, reason: reason ?? payload.reason, idempotencyKey },
                },
            });
            const auditLog = await tx.auditLog.create({
                data: {
                    workspaceId,
                    actorUserId: actor.id,
                    actorEmail: actor.email,
                    actorRole: actor.role,
                    action,
                    fromState: currentState,
                    toState: newState,
                    reason: (reason ?? payload.reason),
                    payload: { ...payload, idempotencyKey },
                    ipAddress: requestContext?.ip,
                    userAgent: requestContext?.userAgent,
                },
            });
            const recipients = await resolveRecipients(tx, transition, workspaceFull, actor);
            const createdNotifications = [];
            for (const r of recipients) {
                const n = await tx.notification.create({
                    data: {
                        userId: r.userId,
                        role: r.broadcastRole ?? null,
                        workspaceId,
                        eventType: transition.auditEvent,
                        type: r.notificationType,
                        title: r.title,
                        message: r.message,
                        link: `/workspace/order/${workspaceId}`,
                        metadata: buildFsmNotificationMetadata({
                            auditEvent: transition.auditEvent,
                            commWorkspaceType: "ORDER",
                            commWorkspaceId: workspaceId,
                            workspaceRef: workspaceFull.externalRef,
                        }),
                    },
                });
                if (n.userId)
                    createdNotifications.push({ id: n.id, userId: n.userId });
            }
            const timelineEventDTO = {
                id: timelineEvent.id,
                eventType: timelineEvent.eventType,
                actorUserId: timelineEvent.actorUserId,
                createdAt: timelineEvent.createdAt.toISOString(),
                payload: timelineEvent.payload,
            };
            socketBus.scheduleEmit(() => {
                socketBus.emitToWorkspace(workspaceId, "order.state.changed", {
                    workspaceId,
                    fromState: currentState,
                    toState: newState,
                    actorUserId: actor.role === "SYSTEM" ? null : actor.id,
                    occurredAt: new Date().toISOString(),
                });
                socketBus.emitToWorkspace(workspaceId, "order.timeline.appended", { workspaceId, event: timelineEventDTO });
                socketBus.emitToWorkspace(workspaceId, "order.updated", {
                    workspaceId,
                    fromState: currentState,
                    toState: newState,
                    action,
                    actorUserId: actor.role === "SYSTEM" ? null : actor.id,
                    occurredAt: new Date().toISOString(),
                });
                socketBus.emitToWorkspace(workspaceId, "timeline:new", { workspaceId, event: timelineEventDTO });
                socketBus.emitToWorkspace(workspaceId, "workspace:update", { workspaceId, state: newState, action });
                if (createdNotifications.length) {
                    void import("../notification-center/delivery.dispatcher.js").then(({ scheduleNotificationChannelDeliveries }) => {
                        scheduleNotificationChannelDeliveries(createdNotifications.filter((n) => Boolean(n.userId)));
                    });
                }
            });
            return {
                workspaceId,
                fromState: currentState,
                toState: newState,
                timelineEventId: timelineEvent.id,
                auditLogId: auditLog.id,
                notificationsCreated: createdNotifications.length,
            };
        });
        if (!idempotencyKey) {
            const result = await txnPromise;
            void this.emitConversationHubEvent(workspaceId, action, actor, payload, result).catch(() => { });
            return result;
        }
        try {
            const result = await txnPromise;
            void this.emitConversationHubEvent(workspaceId, action, actor, payload, result).catch(() => { });
            return result;
        }
        catch (err) {
            // Transaction rolled back — release the claim so a retry is not bricked.
            await releaseProcessedEvent(this.prisma, "fsm:order", `${workspaceId}:${idempotencyKey}`).catch(() => { });
            throw err;
        }
    }
    async emitConversationHubEvent(workspaceId, action, actor, payload, result) {
        if (result.timelineEventId === "(idempotent-replay)")
            return;
        const { emitFromFsmAuditEvent } = await import("../conversation-hub/conversation-hub.hooks.js");
        const transition = this.resolveTransition(result.fromState, action, actor.role, payload);
        if (transition?.auditEvent) {
            emitFromFsmAuditEvent(this.prisma, "ORDER", workspaceId, transition.auditEvent, actor.role === "SYSTEM" ? null : actor.id);
        }
    }
    async runActionSideEffects(tx, transition, ws, payload, actor, reason) {
        const ow = ws.orderWorkspace;
        if (!ow)
            return;
        const update = async (data) => {
            await tx.orderWorkspace.update({ where: { workspaceId: ws.id }, data });
        };
        switch (transition.action) {
            case "supplier_confirm_order":
                await update({
                    supplierConfirmedAt: new Date(),
                    productionPlannedAt: payload.plannedCompletionDate
                        ? new Date(payload.plannedCompletionDate)
                        : undefined,
                });
                await autoAcknowledgePoOnSupplierConfirm(tx, ws.id, actor);
                break;
            case "start_production":
                await update({
                    productionStartedAt: new Date(),
                    productionPlannedAt: new Date(payload.plannedCompletionDate),
                });
                break;
            case "report_production_progress":
                await tx.orderStatusUpdate.create({
                    data: {
                        workspaceId: ws.id,
                        updateType: "PRODUCTION",
                        label: payload.label,
                        percentage: payload.percentage,
                        notes: payload.notes,
                        reportedById: actor.id,
                    },
                });
                break;
            case "mark_production_completed":
                if (payload.label || payload.percentage != null) {
                    await tx.orderStatusUpdate.create({
                        data: {
                            workspaceId: ws.id,
                            updateType: "PRODUCTION",
                            label: payload.label ?? "Production complete",
                            percentage: Number(payload.percentage ?? 100),
                            notes: payload.notes,
                            reportedById: actor.id,
                        },
                    });
                }
                await update({ productionCompletedAt: new Date() });
                break;
            case "request_inspection":
                await update({
                    inspectionRequestedAt: new Date(),
                    inspectorName: payload.inspectorName ?? null,
                });
                break;
            case "skip_inspection":
            case "proceed_to_freight": {
                const spawned = await spawnShipmentFromOrder(tx, {
                    orderWorkspaceId: ws.id,
                    orderExternalRef: ws.externalRef,
                    contractRef: ow.contractRef,
                    poRef: ow.contractRef,
                    currency: ws.currency ?? "USD",
                    buyerUserId: ow.buyerUserId,
                    supplierUserId: ow.supplierUserId,
                    originPort: ow.originPort,
                    destinationPort: ow.destinationPort,
                    actorUserId: actor.id,
                });
                await backfillFreightSelectionForOrder(tx, ws.id, spawned.shipmentWorkspaceId);
                break;
            }
            case "record_inspection_result":
                await update({
                    inspectionCompletedAt: new Date(),
                    inspectionResult: payload.result,
                    inspectionReportUrl: payload.reportUrl,
                    inspectorName: payload.inspectorName,
                });
                break;
            case "book_shipment":
                await update({
                    freightForwarder: payload.freightForwarder,
                    vesselName: payload.vesselName,
                    billOfLading: payload.billOfLading,
                    expectedDeparture: new Date(payload.expectedDeparture),
                    currentEta: new Date(payload.expectedDeparture),
                });
                break;
            case "mark_departed":
                await update({ departedAt: new Date(payload.actualDepartureDate) });
                break;
            case "update_eta": {
                const prev = ow.currentEta;
                const newEta = new Date(payload.newEta);
                const deltaDays = prev
                    ? Math.round((newEta.getTime() - new Date(prev).getTime()) / 86400_000)
                    : 0;
                await tx.orderStatusUpdate.create({
                    data: {
                        workspaceId: ws.id,
                        updateType: "ETA",
                        previousEta: prev ? new Date(prev) : null,
                        newEta,
                        deltaDays,
                        reason: payload.reason ?? null,
                        reportedById: actor.id,
                    },
                });
                await update({ currentEta: newEta });
                break;
            }
            case "mark_arrived":
                await update({ arrivedAt: new Date(payload.actualArrivalDate) });
                break;
            case "mark_partially_delivered":
                await tx.orderStatusUpdate.create({
                    data: {
                        workspaceId: ws.id,
                        updateType: "DELIVERY",
                        label: payload.partialDeliveryNote,
                        notes: [
                            payload.deliveredQuantity != null ? `delivered: ${payload.deliveredQuantity}` : null,
                            payload.remainingQuantity != null ? `remaining: ${payload.remainingQuantity}` : null,
                        ].filter(Boolean).join("; ") || undefined,
                        reportedById: actor.id,
                    },
                });
                break;
            case "mark_delivered":
                await update({ deliveredAt: new Date() });
                break;
            case "reject_order":
                await update({ closedAt: new Date() });
                break;
            case "close_order":
                await update({ closedAt: new Date() });
                await closeParentRfqWhenOrderCloses(tx, ws.id, ws.externalRef);
                break;
            case "open_dispute":
                await update({
                    disputeOpenedAt: new Date(),
                    disputeReason: (reason ?? payload.reason),
                    disputeCategory: payload.category,
                });
                break;
            case "resolve_dispute_close":
                await update({ closedAt: new Date() });
                await closeParentRfqWhenOrderCloses(tx, ws.id, ws.externalRef);
                break;
            case "resolve_dispute_cancel":
                break;
            case "upload_document": {
                const docType = payload.documentType;
                const latest = await tx.orderDocument.findFirst({
                    where: { workspaceId: ws.id, documentType: docType },
                    orderBy: { version: "desc" },
                });
                await tx.orderDocument.create({
                    data: {
                        workspaceId: ws.id,
                        documentType: docType,
                        fileName: payload.fileName,
                        mimeType: payload.mimeType,
                        storageKey: payload.storageKey,
                        fileSizeBytes: payload.fileSizeBytes,
                        version: (latest?.version ?? 0) + 1,
                        uploadedById: actor.id,
                    },
                });
                break;
            }
            default:
                break;
        }
    }
    async list(query, actor) {
        const where = { type: "ORDER" };
        if (query.bucket === "active") {
            where.state = { notIn: ["CLOSED", "CANCELLED", "REJECTED"] };
        }
        else if (query.bucket === "completed") {
            where.state = "CLOSED";
        }
        else if (query.bucket === "cancelled") {
            where.state = "CANCELLED";
        }
        if (actor.role === "BUYER") {
            where.participants = {
                some: { userId: actor.id, participantRole: "OWNER", leftAt: null },
            };
        }
        else if (actor.role === "SUPPLIER") {
            where.participants = {
                some: { userId: actor.id, participantRole: "COUNTERPARTY", leftAt: null },
            };
        }
        if (query.q) {
            const poMatches = await this.prisma.purchaseOrder.findMany({
                where: { poNumber: { contains: query.q, mode: "insensitive" } },
                select: { orderId: true },
                take: 50,
            });
            where.OR = [
                { externalRef: { contains: query.q, mode: "insensitive" } },
                { orderWorkspace: { contractRef: { contains: query.q, mode: "insensitive" } } },
                ...(poMatches.length ? [{ id: { in: poMatches.map((p) => p.orderId) } }] : []),
            ];
        }
        if (query.cursor) {
            where.createdAt = { ...where.createdAt, lt: new Date(query.cursor) };
        }
        const orderBy = query.sort === "oldest" ? { createdAt: "asc" } :
            query.sort === "activity" ? { updatedAt: "desc" } :
                { createdAt: "desc" };
        const rows = await this.prisma.workspace.findMany({
            where,
            orderBy,
            take: query.limit + 1,
            include: {
                orderWorkspace: true,
                participants: {
                    where: { leftAt: null },
                    include: { user: { select: { displayName: true } } },
                },
            },
        });
        let nextCursor = null;
        if (rows.length > query.limit) {
            const last = rows.pop();
            nextCursor = last.createdAt.toISOString();
        }
        const orderIds = rows.map((r) => r.id);
        const [pos, shipmentGroups] = await Promise.all([
            orderIds.length
                ? this.prisma.purchaseOrder.findMany({
                    where: { orderId: { in: orderIds } },
                    select: { orderId: true, poNumber: true },
                })
                : [],
            orderIds.length
                ? this.prisma.workspace.groupBy({
                    by: ["spawnedFromId"],
                    where: { spawnedFromId: { in: orderIds }, type: "SHIPMENT" },
                    _count: { _all: true },
                })
                : [],
        ]);
        const poByOrder = new Map(pos.map((p) => [p.orderId, p.poNumber]));
        const shipmentsByOrder = new Map(shipmentGroups.map((g) => [g.spawnedFromId, g._count._all]));
        return {
            items: rows.map((r) => {
                const buyer = r.participants.find((p) => p.participantRole === "OWNER");
                const supplier = r.participants.find((p) => p.participantRole === "COUNTERPARTY");
                return {
                    id: r.id,
                    externalRef: r.externalRef,
                    state: r.state,
                    buyerName: buyer?.user.displayName ?? "",
                    supplierName: supplier?.user.displayName ?? "",
                    createdAt: r.createdAt.toISOString(),
                    lastActivityAt: r.updatedAt.toISOString(),
                    shipmentCount: shipmentsByOrder.get(r.id) ?? 0,
                    poReference: poByOrder.get(r.id) ?? null,
                };
            }),
            nextCursor,
        };
    }
    async fetchDTO(workspaceId, user) {
        const ws = await this.prisma.workspace.findUniqueOrThrow({
            where: { id: workspaceId },
            include: {
                orderWorkspace: true,
                participants: { include: { user: { select: { id: true, email: true, displayName: true } } } },
                spawnedFrom: { select: { id: true, externalRef: true, type: true } },
            },
        });
        if (ws.type !== "ORDER")
            throw new AppError(404, "ORDER_NOT_FOUND");
        const ow = ws.orderWorkspace;
        const supplier = ws.participants.find((p) => p.participantRole === "COUNTERPARTY");
        const buyer = ws.participants.find((p) => p.participantRole === "OWNER");
        return {
            id: ws.id,
            externalRef: ws.externalRef,
            state: ws.state,
            currency: ws.currency,
            spawnedFromId: ws.spawnedFromId,
            spawnedFrom: ws.spawnedFrom,
            contractRef: ow.contractRef,
            totalValue: ow.totalValue.toString(),
            incoterms: ow.incoterms,
            originPort: ow.originPort,
            destinationPort: ow.destinationPort,
            inspectionResult: ow.inspectionResult,
            currentEta: ow.currentEta?.toISOString() ?? null,
            ownerUserId: buyer?.userId,
            supplierUserId: supplier?.userId,
            supplierName: supplier?.user.displayName,
            buyerName: buyer?.user.displayName,
            participants: ws.participants.map((p) => ({
                userId: p.userId,
                participantRole: p.participantRole,
                displayName: p.user.displayName,
                email: p.user.email,
            })),
        };
    }
    async timeline(workspaceId) {
        return this.prisma.timelineEvent.findMany({
            where: { workspaceId },
            orderBy: { createdAt: "asc" },
        });
    }
    async listDocuments(workspaceId) {
        return this.prisma.orderDocument.findMany({
            where: { workspaceId },
            orderBy: [{ documentType: "asc" }, { version: "desc" }],
        });
    }
    async statusUpdates(workspaceId) {
        return this.prisma.orderStatusUpdate.findMany({
            where: { workspaceId },
            orderBy: { createdAt: "asc" },
        });
    }
}
//# sourceMappingURL=order.service.js.map