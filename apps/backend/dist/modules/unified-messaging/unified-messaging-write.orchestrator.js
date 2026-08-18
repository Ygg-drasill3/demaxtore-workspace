import { logger } from "../../config/logger.js";
import { getUnifiedMessagingWriteMode } from "../../config/env.js";
import { UnifiedMessagingRepository } from "./unified-messaging.repository.js";
import { UnifiedMessagingPolicy } from "./unified-messaging.policy.js";
import { channelToColumn, defaultDirectionForAudience, } from "./unified-messaging.constants.js";
import { mergeCanonicalStatus, mapWhatsAppStatusToCanonical } from "./messaging-status.js";
export class UnifiedMessagingWriteOrchestrator {
    prisma;
    repo;
    policy;
    constructor(prisma) {
        this.prisma = prisma;
        this.repo = new UnifiedMessagingRepository(prisma);
        this.policy = new UnifiedMessagingPolicy(prisma);
    }
    get writeMode() {
        return getUnifiedMessagingWriteMode();
    }
    /** Canonical unified API write — always persists unified row; optional legacy mirror. */
    async writeFromUnifiedApi(user, input) {
        if (input.internal) {
            if (!this.policy.canCreateInternalNote(user))
                throw new Error("INTERNAL_NOTE_BLOCKED");
            return this.persistUnifiedMessage({
                conversationId: input.conversationId,
                authorUserId: input.authorUserId,
                body: input.body,
                messageType: "INTERNAL_NOTE",
                visibility: "ADMIN_ONLY",
                audienceScope: "INTERNAL",
                direction: "INTERNAL",
                channelSource: "WORKSPACE",
                parentMessageId: input.parentMessageId,
                sentAt: new Date(),
            });
        }
        const channel = input.channel ?? "WORKSPACE";
        const audienceScope = "EXTERNAL";
        this.policy.assertCanDispatchToChannel(audienceScope, channel);
        const unified = await this.persistUnifiedMessage({
            conversationId: input.conversationId,
            authorUserId: input.authorUserId,
            body: input.body,
            messageType: input.messageType ?? "MESSAGE",
            visibility: input.visibility ?? "ALL_PARTICIPANTS",
            audienceScope,
            direction: defaultDirectionForAudience(audienceScope),
            channelSource: channelToColumn(channel),
            parentMessageId: input.parentMessageId,
            clientMessageId: input.clientMessageId,
            sentAt: channel === "WORKSPACE" ? new Date() : undefined,
        });
        const mode = this.writeMode;
        if (mode === "unified_primary_legacy_mirror" && input.legacyMirror) {
            void input.legacyMirror().catch((err) => {
                logger.warn({ err: String(err), messageId: unified.id }, "legacy mirror failed");
            });
        }
        return unified;
    }
    async createExternalMessage(user, input) {
        const mode = this.writeMode;
        const channel = input.channel ?? "WORKSPACE";
        const audienceScope = "EXTERNAL";
        this.policy.assertCanDispatchToChannel(audienceScope, channel);
        if (mode === "legacy_only") {
            if (!input.legacyMirror)
                throw new Error("LEGACY_MIRROR_REQUIRED");
            const legacy = await input.legacyMirror();
            const existing = await this.repo.findMessageByLegacy(legacy.legacySource, legacy.legacyId);
            if (existing)
                return existing;
            throw new Error("LEGACY_ONLY_MODE");
        }
        if (mode === "legacy_primary_unified_mirror") {
            const legacy = await input.legacyMirror();
            void this.mirrorToUnified(user, input, legacy).catch((err) => {
                logger.warn({ err: String(err), surface: "external_message" }, "unified mirror failed");
            });
            const row = await this.repo.findMessageByLegacy(legacy.legacySource, legacy.legacyId);
            return row;
        }
        const unified = await this.persistUnifiedMessage({
            conversationId: input.conversationId,
            authorUserId: input.authorUserId,
            body: input.body,
            messageType: input.messageType ?? "MESSAGE",
            visibility: input.visibility ?? "ALL_PARTICIPANTS",
            audienceScope,
            direction: defaultDirectionForAudience(audienceScope),
            channelSource: channelToColumn(channel),
            parentMessageId: input.parentMessageId,
            clientMessageId: input.clientMessageId,
        });
        if (mode === "unified_primary_legacy_mirror" && input.legacyMirror) {
            void input.legacyMirror().catch((err) => {
                logger.warn({ err: String(err), messageId: unified.id }, "legacy mirror failed");
            });
        }
        return unified;
    }
    async createInternalNote(user, input) {
        if (!this.policy.canCreateInternalNote(user)) {
            throw new Error("INTERNAL_NOTE_BLOCKED");
        }
        const audienceScope = "INTERNAL";
        this.policy.assertCanDispatchToChannel(audienceScope, "WORKSPACE");
        const mode = this.writeMode;
        if (mode === "legacy_only" || mode === "legacy_primary_unified_mirror") {
            if (!input.legacyMirror)
                throw new Error("LEGACY_MIRROR_REQUIRED");
            const legacy = await input.legacyMirror();
            if (mode === "legacy_primary_unified_mirror") {
                void this.mirrorToUnified(user, { ...input, channel: "WORKSPACE", messageType: "INTERNAL_NOTE", visibility: "ADMIN_ONLY" }, legacy).catch((err) => {
                    logger.warn({ err: String(err), surface: "internal_note" }, "unified mirror failed");
                });
            }
            return null;
        }
        return this.persistUnifiedMessage({
            conversationId: input.conversationId,
            authorUserId: input.authorUserId,
            body: input.body,
            messageType: "INTERNAL_NOTE",
            visibility: "ADMIN_ONLY",
            audienceScope,
            direction: "INTERNAL",
            channelSource: "WORKSPACE",
            parentMessageId: input.parentMessageId,
        });
    }
    async updateDeliveryStatus(messageId, incomingStatus, timestamps) {
        const msg = await this.prisma.workspaceMessage.findUnique({ where: { id: messageId } });
        if (!msg)
            return null;
        const current = msg.readAt
            ? "READ"
            : msg.deliveredAt
                ? "DELIVERED"
                : msg.sentAt
                    ? "SENT"
                    : "PENDING";
        const incoming = mapWhatsAppStatusToCanonical(incomingStatus);
        const merged = mergeCanonicalStatus(current, incoming);
        const data = {};
        if (merged === "SENT" && timestamps?.sentAt)
            data.sentAt = timestamps.sentAt;
        if (merged === "DELIVERED" && timestamps?.deliveredAt)
            data.deliveredAt = timestamps.deliveredAt;
        if (merged === "READ" && timestamps?.readAt)
            data.readAt = timestamps.readAt;
        if (merged === "FAILED" && timestamps?.failedAt)
            data.failedAt = timestamps.failedAt;
        if (Object.keys(data).length === 0)
            return msg;
        return this.prisma.workspaceMessage.update({ where: { id: messageId }, data });
    }
    async createSystemMessage(user, input, legacy) {
        const audienceScope = "SYSTEM";
        this.policy.assertCanDispatchToChannel(audienceScope, "WORKSPACE");
        const mode = this.writeMode;
        if (mode === "legacy_only")
            return null;
        if (mode === "legacy_primary_unified_mirror" && legacy) {
            return this.mirrorToUnified(user, { ...input, channel: "WORKSPACE", messageType: "SYSTEM_EVENT", visibility: "ALL_PARTICIPANTS" }, legacy, audienceScope);
        }
        if (legacy) {
            const existing = await this.repo.findMessageByLegacy(legacy.legacySource, legacy.legacyId);
            if (existing)
                return existing;
        }
        return this.persistUnifiedMessage({
            conversationId: input.conversationId,
            authorUserId: input.authorUserId,
            body: input.body,
            messageType: "SYSTEM_EVENT",
            visibility: "ALL_PARTICIPANTS",
            audienceScope,
            direction: "INTERNAL",
            channelSource: "WORKSPACE",
            legacySource: legacy?.legacySource,
            legacyId: legacy?.legacyId,
            systemEventKey: input.systemEventKey,
        });
    }
    async mirrorFromLegacy(user, input, legacy) {
        if (this.writeMode !== "legacy_primary_unified_mirror")
            return null;
        try {
            return await this.mirrorToUnified(user, input, legacy);
        }
        catch (err) {
            logger.warn({ err: String(err), surface: "mirror_from_legacy" }, "unified mirror failed");
            return null;
        }
    }
    async persistUnifiedMessage(data) {
        if (data.clientMessageId) {
            const existing = await this.repo.findMessageByClientId(data.conversationId, data.authorUserId, data.clientMessageId);
            if (existing)
                return existing;
        }
        try {
            return await this.repo.createMessage(data);
        }
        catch (e) {
            const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
            if (code === "P2002" && data.clientMessageId) {
                const existing = await this.repo.findMessageByClientId(data.conversationId, data.authorUserId, data.clientMessageId);
                if (existing)
                    return existing;
            }
            throw e;
        }
    }
    async mirrorToUnified(user, input, legacy, audienceScope = "EXTERNAL") {
        const existing = await this.repo.findMessageByLegacy(legacy.legacySource, legacy.legacyId);
        if (existing)
            return existing;
        const isInternal = audienceScope === "INTERNAL" || input.messageType === "INTERNAL_NOTE";
        const resolvedScope = isInternal ? "INTERNAL" : audienceScope;
        return this.persistUnifiedMessage({
            conversationId: input.conversationId,
            authorUserId: input.authorUserId,
            body: input.body,
            messageType: input.messageType ?? "MESSAGE",
            visibility: input.visibility ?? (isInternal ? "ADMIN_ONLY" : "ALL_PARTICIPANTS"),
            audienceScope: resolvedScope,
            direction: defaultDirectionForAudience(resolvedScope),
            channelSource: channelToColumn(input.channel ?? "WORKSPACE"),
            parentMessageId: input.parentMessageId,
            clientMessageId: input.clientMessageId,
            legacySource: legacy.legacySource,
            legacyId: legacy.legacyId,
        });
    }
}
//# sourceMappingURL=unified-messaging-write.orchestrator.js.map