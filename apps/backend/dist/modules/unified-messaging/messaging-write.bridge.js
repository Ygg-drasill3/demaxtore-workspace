import { createHash } from "node:crypto";
import { logger } from "../../config/logger.js";
import { socketBus } from "../../realtime/socket-bus.js";
import { UnifiedMessagingWriteOrchestrator } from "./unified-messaging-write.orchestrator.js";
import { participantKeyForUser } from "./unified-messaging.constants.js";
import { getMessagingDedupStore } from "./messaging-dedup.store.js";
import { getMessagingOutboxService } from "./messaging-outbox.service.js";
import { getMessagingWriteDispatcher } from "./messaging-write.dispatcher.js";
import { registerWiredSurface } from "./messaging-write.registry.js";
const emittedEventKeys = new Set();
export function resetMessagingEventDedupForTests() {
    emittedEventKeys.clear();
}
function eventKey(parts) {
    return createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 24);
}
export class MessagingEventEmitter {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    emit(event, payload) {
        const dedupeKey = payload.idempotencyKey ?? eventKey([
            event,
            payload.conversationId,
            payload.messageId ?? "",
        ]);
        void this.emitOnce(event, payload, dedupeKey);
    }
    async emitOnce(event, payload, dedupeKey) {
        if (emittedEventKeys.has(dedupeKey))
            return;
        const claimed = await getMessagingDedupStore(this.prisma).claim("socket", dedupeKey);
        if (!claimed)
            return;
        emittedEventKeys.add(dedupeKey);
        setTimeout(() => emittedEventKeys.delete(dedupeKey), 60_000);
        socketBus.scheduleEmit(() => {
            const room = `messaging:conversation:${payload.conversationId}`;
            socketBus.emitToRoom(room, event, {
                conversationId: payload.conversationId,
                messageId: payload.messageId,
                workspaceId: payload.workspaceId,
                idempotencyKey: dedupeKey,
            });
            if (payload.workspaceId) {
                socketBus.emitToWorkspace(payload.workspaceId, event, { ...payload, idempotencyKey: dedupeKey });
            }
        });
    }
}
export class MessagingNotificationDedup {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async shouldNotify(input) {
        const key = `messaging:${input.eventType}:${input.conversationId}:${input.messageId}:${input.recipientId}`;
        return getMessagingDedupStore(this.prisma).claim("notification", key);
    }
    messagingDedupMetadata(eventType, conversationId, messageId, recipientId) {
        const key = `messaging:${eventType}:${conversationId}:${messageId}:${recipientId}`;
        return { messagingDedupKey: createHash("sha256").update(key).digest("hex").slice(0, 32) };
    }
}
export class MessagingWriteBridge {
    prisma;
    orchestrator;
    events;
    notifications;
    outbox;
    dispatcher;
    constructor(prisma) {
        this.prisma = prisma;
        this.orchestrator = new UnifiedMessagingWriteOrchestrator(prisma);
        this.events = new MessagingEventEmitter(prisma);
        this.notifications = new MessagingNotificationDedup(prisma);
        this.outbox = getMessagingOutboxService(prisma);
        this.dispatcher = getMessagingWriteDispatcher(prisma);
    }
    get dispatcherInstance() {
        return this.dispatcher;
    }
    get writeMode() {
        return this.orchestrator.writeMode;
    }
    publishEvent(event, payload) {
        this.events.emit(event, payload);
    }
    /** Execute legacy write via central dispatcher. */
    async runLegacyWrite(input) {
        if (input.registryKey)
            registerWiredSurface(input.registryKey);
        const idempotencyKey = input.idempotencyKey ?? `${input.surface}:${Date.now()}`;
        return this.dispatcher.dispatchLegacyFirst({
            surface: input.surface,
            actor: input.actor,
            idempotencyKey,
            legacy: input.legacy,
            afterLegacy: input.afterLegacy,
            mirrorPayload: input.mirrorOnFailure
                ? (result) => {
                    const m = input.mirrorOnFailure(result);
                    return {
                        conversationId: m.conversationId,
                        messageId: m.messageId,
                        mirrorInput: {
                            conversationId: m.conversationId ?? "",
                            authorUserId: input.actor.id,
                            body: "",
                        },
                        legacy: { legacyId: m.messageId ?? m.idempotencyKey, legacySource: input.surface },
                    };
                }
                : undefined,
        });
    }
    async onWorkspaceMessageCreated(input) {
        const conv = await this.prisma.workspaceConversation.findUnique({
            where: { workspaceType_workspaceId: { workspaceType: input.workspaceType, workspaceId: input.workspaceId } },
        });
        if (!conv)
            return;
        await this.syncConversationFromWorkspace(conv.id, input.workspaceType, input.workspaceId, input.auditWorkspaceId).catch((err) => {
            logger.warn({ err: String(err), conversationId: conv.id }, "conversation participant sync failed");
        });
        const isInternal = input.messageType === "INTERNAL_NOTE" ||
            input.visibility === "ADMIN_ONLY";
        if (this.writeMode === "legacy_primary_unified_mirror") {
            try {
                const legacy = { legacyId: input.messageId, legacySource: input.legacySource ?? "workspace" };
                if (isInternal) {
                    await this.orchestrator.mirrorFromLegacy(input.actor, {
                        conversationId: conv.id,
                        authorUserId: input.actor.id,
                        body: input.body,
                        messageType: "INTERNAL_NOTE",
                        visibility: "ADMIN_ONLY",
                    }, legacy);
                }
                else {
                    await this.orchestrator.mirrorFromLegacy(input.actor, {
                        conversationId: conv.id,
                        authorUserId: input.actor.id,
                        body: input.body,
                        messageType: input.messageType,
                        visibility: input.visibility,
                        clientMessageId: input.clientMessageId ?? undefined,
                    }, legacy);
                }
            }
            catch (err) {
                logger.warn({ err: String(err), surface: "workspace_communication" }, "unified mirror failed");
            }
        }
        else if (this.writeMode === "unified_primary_legacy_mirror" || this.writeMode === "unified_only") {
            try {
                if (isInternal) {
                    await this.orchestrator.createInternalNote(input.actor, {
                        conversationId: conv.id,
                        authorUserId: input.actor.id,
                        body: input.body,
                    });
                }
                else {
                    await this.orchestrator.createExternalMessage(input.actor, {
                        conversationId: conv.id,
                        authorUserId: input.actor.id,
                        body: input.body,
                        messageType: input.messageType,
                        visibility: input.visibility,
                        clientMessageId: input.clientMessageId ?? undefined,
                    });
                }
            }
            catch (err) {
                logger.warn({ err: String(err), surface: "workspace_communication" }, "unified write failed");
            }
        }
        if (!isInternal) {
            this.events.emit("messaging:message:new", {
                conversationId: conv.id,
                messageId: input.messageId,
                workspaceId: input.auditWorkspaceId,
                audienceScope: "EXTERNAL",
                idempotencyKey: input.clientMessageId ?? input.messageId,
            });
        }
        else {
            this.events.emit("messaging:message:new", {
                conversationId: conv.id,
                messageId: input.messageId,
                workspaceId: input.auditWorkspaceId,
                audienceScope: "INTERNAL",
                idempotencyKey: input.messageId,
            });
        }
    }
    async onDirectMessageCreated(input) {
        let unifiedConv = await this.prisma.workspaceConversation.findFirst({
            where: { metadata: { path: ["legacyDirectConversationId"], equals: input.directConversationId } },
        });
        const direct = await this.prisma.directConversation.findUnique({
            where: { id: input.directConversationId },
        });
        if (!unifiedConv && direct) {
            const contextType = direct.contextType === "ORDER_FREIGHT" ? "FREIGHT" : direct.contextType;
            unifiedConv = await this.prisma.workspaceConversation.findFirst({
                where: {
                    contexts: {
                        some: { contextType, contextId: direct.contextWorkspaceId },
                    },
                },
            });
        }
        if (!unifiedConv && direct && this.writeMode !== "legacy_only") {
            const contextType = direct.contextType === "ORDER_FREIGHT" ? "FREIGHT" : direct.contextType;
            unifiedConv = await this.prisma.workspaceConversation.create({
                data: {
                    workspaceType: "DIRECT_CHAT",
                    workspaceId: input.directConversationId,
                    primaryChannel: input.source === "whatsapp" ? "WHATSAPP" : "WORKSPACE",
                    metadata: { legacyDirectConversationId: input.directConversationId },
                    contexts: direct.contextWorkspaceId
                        ? {
                            create: {
                                contextType,
                                contextId: direct.contextWorkspaceId,
                                contextReference: direct.contextRef,
                            },
                        }
                        : undefined,
                },
            });
        }
        const channel = input.channel ?? (input.source === "whatsapp" ? "WHATSAPP" : "WORKSPACE");
        const legacy = { legacyId: input.messageId, legacySource: "direct_chat" };
        // WhatsApp Cloud inbound is mirrored exclusively by onWhatsAppInbound.
        // Legacy trade-chat must not create a second unified row (ghost OUTBOUND).
        if (input.source === "whatsapp") {
            if (unifiedConv && input.whatsappMessageId) {
                const alreadyMirrored = await this.prisma.workspaceMessage.findFirst({
                    where: {
                        OR: [
                            { externalMessageId: input.whatsappMessageId },
                            { whatsappMessageId: input.whatsappMessageId },
                        ],
                    },
                    select: { id: true, conversationId: true },
                });
                if (alreadyMirrored) {
                    this.events.emit("messaging:message:new", {
                        conversationId: alreadyMirrored.conversationId,
                        messageId: alreadyMirrored.id,
                        idempotencyKey: input.whatsappMessageId,
                    });
                }
            }
            return;
        }
        if (unifiedConv && this.writeMode === "legacy_primary_unified_mirror") {
            try {
                await this.orchestrator.mirrorFromLegacy(input.actor, {
                    conversationId: unifiedConv.id,
                    authorUserId: input.actor.id,
                    body: input.body,
                    channel,
                    clientMessageId: input.clientMessageId ?? undefined,
                }, legacy);
            }
            catch (err) {
                logger.warn({ err: String(err), surface: "direct_chat" }, "unified mirror failed");
            }
        }
        else if (unifiedConv && (this.writeMode === "unified_primary_legacy_mirror" || this.writeMode === "unified_only")) {
            try {
                await this.orchestrator.createExternalMessage(input.actor, {
                    conversationId: unifiedConv.id,
                    authorUserId: input.actor.id,
                    body: input.body,
                    channel,
                    clientMessageId: input.clientMessageId ?? undefined,
                    legacyMirror: async () => legacy,
                });
            }
            catch (err) {
                logger.warn({ err: String(err), surface: "direct_chat" }, "unified write failed");
            }
        }
        if (unifiedConv) {
            this.events.emit("messaging:message:new", {
                conversationId: unifiedConv.id,
                messageId: input.messageId,
                idempotencyKey: input.whatsappMessageId ?? input.clientMessageId ?? input.messageId,
            });
        }
    }
    async onWhatsAppMessageCreated(input) {
        const unifiedConv = await this.prisma.workspaceConversation.findFirst({
            where: { metadata: { path: ["whatsappConversationId"], equals: input.whatsappConversationId } },
        });
        // Prefer emitting against an existing unified row (created by unified API or inbound mirror).
        // Never insert a second empty WHATSAPP OUTBOUND — that caused Sent+Pending duplicates.
        let timelineMessageId = input.messageId;
        if (unifiedConv) {
            const existing = (input.metaMessageId
                ? await this.prisma.workspaceMessage.findFirst({
                    where: {
                        conversationId: unifiedConv.id,
                        OR: [
                            { externalMessageId: input.metaMessageId },
                            { whatsappMessageId: input.metaMessageId },
                        ],
                    },
                    select: { id: true },
                })
                : null) ??
                (await this.prisma.workspaceMessage.findFirst({
                    where: { legacySource: "whatsapp", legacyId: input.messageId },
                    select: { id: true },
                }));
            if (existing)
                timelineMessageId = existing.id;
        }
        const convId = unifiedConv?.id ?? input.whatsappConversationId;
        this.events.emit("messaging:message:new", {
            conversationId: convId,
            messageId: timelineMessageId,
            idempotencyKey: input.metaMessageId ?? input.messageId,
        });
    }
    async onConversationRead(input) {
        if (this.writeMode === "unified_primary_legacy_mirror" || this.writeMode === "unified_only") {
            try {
                await this.prisma.workspaceConversationParticipant.updateMany({
                    where: { conversationId: input.conversationId, userId: input.actor.id },
                    data: { lastReadAt: new Date() },
                });
            }
            catch {
                /* optional */
            }
        }
        this.events.emit("messaging:conversation:read", {
            conversationId: input.conversationId,
            workspaceId: input.workspaceId,
            idempotencyKey: `${input.conversationId}:${input.actor.id}:read`,
        });
    }
    async onAssignment(input) {
        this.events.emit("messaging:conversation:assigned", {
            conversationId: input.conversationId,
            idempotencyKey: `${input.conversationId}:assign:${input.assignedUserId}`,
        });
    }
    async onArchive(input) {
        this.events.emit("messaging:conversation:archived", {
            conversationId: input.conversationId,
            idempotencyKey: `${input.conversationId}:archive`,
        });
    }
    async onWhatsAppInbound(input) {
        registerWiredSurface("whatsapp_inbound");
        if (input.duplicate)
            return;
        const { UnifiedMessagingInboundHandler } = await import("./unified-messaging-inbound.handler.js");
        const handler = new UnifiedMessagingInboundHandler(this.prisma);
        const mirrored = await handler.mirrorWhatsAppInboxResult({
            conversationId: input.whatsappConversationId,
            messageId: input.messageId,
            metaMessageId: input.metaMessageId,
            direction: "INBOUND",
            body: input.body,
            workspaceConversationId: input.workspaceConversationId,
        });
        const unifiedConv = mirrored
            ? await this.prisma.workspaceConversation.findUnique({ where: { id: mirrored.conversationId } })
            : await this.prisma.workspaceConversation.findFirst({
                where: { metadata: { path: ["whatsappConversationId"], equals: input.whatsappConversationId } },
            });
        const convId = unifiedConv?.id ?? input.whatsappConversationId;
        const timelineMessageId = mirrored?.id ?? input.messageId;
        this.events.emit("messaging:message:new", {
            conversationId: convId,
            messageId: timelineMessageId,
            idempotencyKey: input.metaMessageId ?? `inbound:${input.messageId}`,
        });
        // Fan-out to participants so buyers see supplier WhatsApp replies without refresh
        // even if the client missed the conversation room subscribe.
        if (unifiedConv?.id) {
            const participants = await this.prisma.workspaceConversationParticipant.findMany({
                where: { conversationId: unifiedConv.id, leftAt: null, userId: { not: null } },
                select: { userId: true },
            });
            socketBus.scheduleEmit(() => {
                for (const p of participants) {
                    if (!p.userId)
                        continue;
                    socketBus.emitToUser(p.userId, "messaging:message:new", {
                        conversationId: unifiedConv.id,
                        messageId: timelineMessageId,
                        idempotencyKey: input.metaMessageId ?? `inbound:${input.messageId}`,
                    });
                }
            });
            // Late supplier reply (>1h after buyer) → WhatsApp ping to buyer
            if (mirrored) {
                const { maybeNotifyBuyerOfDelayedSupplierReply } = await import("./delayed-supplier-reply.notify.js");
                void maybeNotifyBuyerOfDelayedSupplierReply(this.prisma, unifiedConv.id, mirrored.id, mirrored.createdAt);
            }
        }
    }
    async onAttachmentCreated(input) {
        this.events.emit("messaging:attachment:created", {
            conversationId: input.conversationId,
            messageId: input.messageId,
            idempotencyKey: `attach:${input.attachmentId}`,
        });
    }
    async onSystemMessage(input) {
        registerWiredSurface("system_event");
        const conv = await this.prisma.workspaceConversation.findUnique({
            where: { workspaceType_workspaceId: { workspaceType: input.workspaceType, workspaceId: input.workspaceId } },
        });
        if (!conv)
            return;
        await this.syncConversationFromWorkspace(conv.id, input.workspaceType, input.workspaceId, input.auditWorkspaceId).catch((err) => {
            logger.warn({ err: String(err), conversationId: conv.id }, "conversation participant sync failed");
        });
        const actor = input.actor ?? { id: "system", email: "", role: "SYSTEM" };
        const legacy = { legacyId: input.messageId, legacySource: "system_event" };
        if (this.writeMode !== "legacy_only") {
            try {
                await this.orchestrator.createSystemMessage(actor, {
                    conversationId: conv.id,
                    // The "system" sentinel above is only an AuthUser shape for the policy check.
                    // Writing it here put a non-uuid into `author_user_id`, so Prisma rejected every
                    // actorless system event and the mirror silently dropped it.
                    authorUserId: input.actor?.id ?? null,
                    body: input.body,
                    systemEventKey: input.systemEventKey,
                }, legacy);
            }
            catch (err) {
                logger.warn({ err: String(err), surface: "system_event" }, "unified mirror failed");
            }
        }
        this.events.emit("messaging:message:new", {
            conversationId: conv.id,
            messageId: input.messageId,
            workspaceId: input.auditWorkspaceId,
            audienceScope: "SYSTEM",
            idempotencyKey: `system:${input.messageId}`,
        });
    }
    async onParticipantUpdated(input) {
        this.events.emit("messaging:participant:updated", {
            conversationId: input.conversationId,
            idempotencyKey: `participant:${input.participantId}`,
        });
    }
    async onContextUpdated(input) {
        this.events.emit("messaging:context:updated", {
            conversationId: input.conversationId,
            idempotencyKey: `context:${input.contextId}`,
        });
    }
    async onConversationUpdated(input) {
        this.events.emit("messaging:conversation:updated", {
            conversationId: input.conversationId,
            idempotencyKey: `${input.conversationId}:updated:${input.reason}`,
        });
    }
    async onDeliveryStatus(input) {
        registerWiredSurface("whatsapp_status");
        if (this.writeMode !== "legacy_only") {
            await this.orchestrator.updateDeliveryStatus(input.messageId, input.status).catch(() => undefined);
        }
        this.events.emit("messaging:message:status", {
            conversationId: input.conversationId,
            messageId: input.messageId,
            idempotencyKey: `${input.messageId}:${input.status}`,
        });
    }
    async syncConversationFromWorkspace(conversationId, workspaceType, workspaceId, auditWorkspaceId) {
        const parts = await this.prisma.workspaceParticipant.findMany({
            where: { workspaceId: auditWorkspaceId, leftAt: null },
            include: {
                user: {
                    select: { id: true, email: true, displayName: true, organisationId: true },
                },
            },
        });
        for (const p of parts) {
            const participantKey = participantKeyForUser(p.userId);
            const participantRole = p.participantRole === "OWNER" ? "OWNER" : "MEMBER";
            await this.prisma.workspaceConversationParticipant.upsert({
                where: { conversationId_participantKey: { conversationId, participantKey } },
                create: {
                    conversationId,
                    participantKey,
                    userId: p.userId,
                    participantType: "USER",
                    participantRole,
                    companyId: p.user.organisationId,
                    displayName: p.user.displayName,
                    email: p.user.email,
                },
                update: {
                    leftAt: null,
                    companyId: p.user.organisationId,
                    displayName: p.user.displayName,
                    email: p.user.email,
                },
            });
        }
        const hasContext = await this.prisma.conversationContext.findFirst({
            where: { conversationId, contextType: workspaceType, contextId: workspaceId },
        });
        if (!hasContext) {
            const ws = await this.prisma.workspace.findUnique({
                where: { id: auditWorkspaceId },
                select: {
                    externalRef: true,
                    rfqDetails: { select: { title: true } },
                    commodityBidDetails: { select: { title: true } },
                },
            });
            await this.prisma.conversationContext.create({
                data: {
                    conversationId,
                    contextType: workspaceType,
                    contextId: workspaceId,
                    contextReference: ws?.externalRef ?? null,
                },
            });
            const subject = ws?.rfqDetails?.title ?? ws?.commodityBidDetails?.title ?? null;
            if (subject) {
                await this.prisma.workspaceConversation.updateMany({
                    where: { id: conversationId, subject: null },
                    data: { subject },
                });
            }
        }
        if (workspaceType === "RFQ") {
            const { enableRfqWhatsApp } = await import("../rfq/rfq-whatsapp-enable.service.js");
            await enableRfqWhatsApp(this.prisma, auditWorkspaceId);
        }
    }
    async ensureParticipant(conversationId, userId) {
        const key = participantKeyForUser(userId);
        await this.prisma.workspaceConversationParticipant.upsert({
            where: { conversationId_participantKey: { conversationId, participantKey: key } },
            create: {
                conversationId,
                participantKey: key,
                userId,
                participantType: "USER",
                participantRole: "MEMBER",
            },
            update: { leftAt: null },
        });
    }
}
let bridge = null;
export function getMessagingWriteBridge(prisma) {
    if (!bridge)
        bridge = new MessagingWriteBridge(prisma);
    return bridge;
}
//# sourceMappingURL=messaging-write.bridge.js.map