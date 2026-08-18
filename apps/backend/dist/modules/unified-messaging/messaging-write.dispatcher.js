import { logger } from "../../config/logger.js";
import { getUnifiedMessagingWriteMode } from "../../config/env.js";
import { UnifiedMessagingWriteOrchestrator } from "./unified-messaging-write.orchestrator.js";
import { getMessagingOutboxService } from "./messaging-outbox.service.js";
import { buildSocketOutbox, registerWiredSurface } from "./messaging-write.registry.js";
/** Central write-mode dispatcher — primary persistence + transactional outbox. */
export class MessagingWriteDispatcher {
    prisma;
    orchestrator;
    outbox;
    constructor(prisma) {
        this.prisma = prisma;
        this.orchestrator = new UnifiedMessagingWriteOrchestrator(prisma);
        this.outbox = getMessagingOutboxService(prisma);
    }
    get writeMode() {
        return getUnifiedMessagingWriteMode();
    }
    /** Legacy-first path (workspace comm, direct chat, whatsapp, rfq, system). */
    async dispatchLegacyFirst(input) {
        const mode = this.writeMode;
        if (mode === "legacy_only" || mode === "legacy_primary_unified_mirror" || mode === "unified_primary_legacy_mirror") {
            const result = await input.legacy();
            try {
                if (input.afterLegacy)
                    await input.afterLegacy(result);
            }
            catch (err) {
                logger.warn({ err: String(err), surface: input.surface }, "dispatchLegacyFirst afterLegacy failed");
                const mirror = input.mirrorPayload?.(result);
                if (mirror && mode === "unified_primary_legacy_mirror") {
                    await this.enqueueMirrorRetry(input.surface, input.actor, mirror, input.idempotencyKey);
                }
            }
            return result;
        }
        // unified_only: legacy path should not be primary — delegate to unified if afterLegacy provides mirror
        const result = await input.legacy();
        if (input.afterLegacy) {
            try {
                await input.afterLegacy(result);
            }
            catch (err) {
                logger.warn({ err: String(err), surface: input.surface }, "dispatchLegacyFirst unified_only hook failed");
            }
        }
        return result;
    }
    /** Unified-first path (unified API mutations, assign, archive, etc.). */
    async dispatchUnifiedFirst(input) {
        if (input.registryKey)
            registerWiredSurface(input.registryKey);
        const mode = this.writeMode;
        if (mode === "legacy_only") {
            throw new Error("UNIFIED_WRITE_BLOCKED_IN_LEGACY_ONLY");
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const value = await input.unified(tx);
            const events = input.outbox?.(value) ?? [];
            for (const evt of events) {
                await this.outbox.enqueue(evt, tx);
            }
            return value;
        });
        const mode2 = this.writeMode;
        if (mode2 === "unified_primary_legacy_mirror" && input.legacyMirror) {
            void input.legacyMirror(result).catch((err) => {
                logger.warn({ err: String(err), surface: input.surface }, "legacy mirror async failed");
            });
        }
        return result;
    }
    /**
     * Canonical write entry for all 37 mutation surfaces.
     * unified_primary_legacy_mirror / unified_only → unified primary + transactional outbox.
     * legacy_primary_unified_mirror / legacy_only → legacyOnly callback when provided.
     */
    async dispatchMutation(input) {
        registerWiredSurface(input.registryKey);
        const mode = this.writeMode;
        if (mode === "legacy_only" || mode === "legacy_primary_unified_mirror") {
            if (!input.legacyOnly) {
                throw new Error(`LEGACY_ONLY_HANDLER_REQUIRED:${input.registryKey}`);
            }
            return this.dispatchLegacyFirst({
                surface: input.surface,
                actor: input.actor,
                idempotencyKey: input.idempotencyKey,
                legacy: input.legacyOnly,
            });
        }
        return this.dispatchUnifiedFirst({
            surface: input.surface,
            actor: input.actor,
            idempotencyKey: input.idempotencyKey,
            registryKey: input.registryKey,
            unified: input.unifiedPrimary,
            outbox: input.buildOutbox,
            legacyMirror: input.legacyMirror,
        });
    }
    /** Persist unified message in transaction with optional mirror outbox. */
    async persistMessageWithOutbox(actor, surface, input, opts) {
        const idempotencyKey = opts?.idempotencyKey ?? `msg:${input.conversationId}:${input.clientMessageId ?? Date.now()}`;
        return this.dispatchUnifiedFirst({
            surface,
            actor,
            idempotencyKey,
            unified: async () => this.orchestrator.writeFromUnifiedApi(actor, input),
            outbox: (msg) => {
                if (!msg)
                    return [];
                const events = [
                    {
                        eventType: "SOCKET_EMIT",
                        aggregateType: surface,
                        aggregateId: msg.id,
                        conversationId: input.conversationId,
                        messageId: msg.id,
                        idempotencyKey: `socket:${idempotencyKey}`,
                        payload: {
                            event: "messaging:message:new",
                            eventPayload: {
                                conversationId: input.conversationId,
                                messageId: msg.id,
                                idempotencyKey,
                            },
                        },
                    },
                ];
                const mode = this.writeMode;
                if (mode === "unified_primary_legacy_mirror" && opts?.legacyMirror) {
                    events.push({
                        eventType: "LEGACY_MIRROR",
                        aggregateType: surface,
                        aggregateId: msg.id,
                        conversationId: input.conversationId,
                        messageId: msg.id,
                        idempotencyKey: `mirror:${idempotencyKey}`,
                        payload: {
                            actor,
                            mirrorInput: {
                                conversationId: input.conversationId,
                                authorUserId: input.authorUserId,
                                body: input.body,
                                channel: input.channel,
                                messageType: input.messageType,
                                visibility: input.visibility,
                                parentMessageId: input.parentMessageId,
                                clientMessageId: input.clientMessageId,
                            },
                            legacy: { legacyId: msg.id, legacySource: surface },
                        },
                    });
                }
                return events;
            },
        });
    }
    /** Conversation metadata mutation with transactional outbox. */
    async dispatchConversationMutation(user, surface, registryKey, conversationId, idempotencyKey, data, socket) {
        registerWiredSurface(registryKey);
        return this.dispatchUnifiedFirst({
            surface,
            actor: user,
            idempotencyKey,
            unified: async (tx) => {
                await tx.workspaceConversation.update({ where: { id: conversationId }, data });
                return { conversationId };
            },
            outbox: () => [
                buildSocketOutbox(surface, {
                    event: socket,
                    conversationId,
                    idempotencyKey,
                }),
            ],
        });
    }
    /** Mark conversation read with outbox socket event. */
    async dispatchMarkRead(user, surface, registryKey, conversationId) {
        registerWiredSurface(registryKey);
        return this.dispatchUnifiedFirst({
            surface,
            actor: user,
            idempotencyKey: `read:${conversationId}:${user.id}`,
            unified: async (tx) => {
                await tx.workspaceConversationParticipant.updateMany({
                    where: { conversationId, userId: user.id },
                    data: { lastReadAt: new Date() },
                });
                return { conversationId };
            },
            outbox: () => [
                buildSocketOutbox(surface, {
                    event: "messaging:conversation:read",
                    conversationId,
                    idempotencyKey: `read:${conversationId}:${user.id}`,
                }),
            ],
        });
    }
    async enqueueMirrorRetry(surface, actor, mirror, idempotencyKey) {
        await this.outbox.enqueue({
            eventType: "LEGACY_MIRROR",
            aggregateType: surface,
            aggregateId: mirror.messageId ?? idempotencyKey,
            conversationId: mirror.conversationId,
            messageId: mirror.messageId,
            idempotencyKey: `mirror:${idempotencyKey}`,
            payload: {
                actor,
                mirrorInput: mirror.mirrorInput,
                legacy: mirror.legacy,
            },
        });
    }
}
let dispatcher = null;
export function getMessagingWriteDispatcher(prisma) {
    if (!dispatcher)
        dispatcher = new MessagingWriteDispatcher(prisma);
    return dispatcher;
}
//# sourceMappingURL=messaging-write.dispatcher.js.map