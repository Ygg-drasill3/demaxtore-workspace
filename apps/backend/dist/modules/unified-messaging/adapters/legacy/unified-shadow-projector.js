import { hashId } from "./legacy-adapter.config.js";
import { emptyNormalized } from "./legacy-adapter.normalizer.js";
import { canonicalStatusDistribution, resolveWhatsAppMessageCanonical, } from "../../messaging-status.js";
/** Read-only unified projection for shadow comparison (no writes). */
export class UnifiedShadowProjector {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async projectWorkspaceCommunication(workspaceType, workspaceId, actor) {
        const conv = await this.prisma.workspaceConversation.findUnique({
            where: { workspaceType_workspaceId: { workspaceType, workspaceId } },
            include: {
                messages: {
                    where: { status: { not: "DELETED" } },
                    include: { attachments: true },
                },
                participants: { where: { leftAt: null } },
                contexts: true,
            },
        });
        if (!conv)
            return emptyNormalized("workspace_communication");
        let internalCount = 0;
        let systemCount = 0;
        let outboundCount = 0;
        let attachmentCount = 0;
        let missingAuthorCount = 0;
        for (const m of conv.messages) {
            if (!m.authorUserId)
                missingAuthorCount += 1;
            attachmentCount += m.attachments.length;
            if (m.messageType === "SYSTEM_EVENT" || m.audienceScope === "SYSTEM")
                systemCount += 1;
            else if (m.messageType === "INTERNAL_NOTE" || m.audienceScope === "INTERNAL" || m.visibility === "ADMIN_ONLY") {
                internalCount += 1;
            }
            else
                outboundCount += 1;
        }
        const visibleMessages = actor.role === "BUYER" || actor.role === "SUPPLIER"
            ? conv.messages.filter((m) => m.audienceScope === "EXTERNAL" && m.visibility !== "ADMIN_ONLY")
            : conv.messages;
        const last = visibleMessages.at(-1);
        return {
            sourceSurface: "workspace_communication",
            legacyConversationIdHash: hashId(conv.id),
            unifiedConversationIdHash: hashId(conv.id),
            contextType: workspaceType,
            contextIdHash: hashId(workspaceId),
            participantCount: conv.participants.length,
            messageCount: visibleMessages.length,
            unreadCount: 0,
            attachmentCount,
            inboundCount: visibleMessages.filter((m) => m.direction === "INBOUND").length,
            outboundCount,
            internalCount,
            systemCount,
            lastMessageTimestamp: last?.createdAt.toISOString() ?? null,
            hasWhatsAppChannel: conv.primaryChannel === "WHATSAPP" || conv.messages.some((m) => m.channelSource === "WHATSAPP"),
            deliveryStatusCounts: {},
            missingAuthorCount,
            missingContextCount: conv.contexts.length === 0 ? 1 : 0,
        };
    }
    async projectDirectChat(conversationId) {
        const conv = await this.prisma.directConversation.findUnique({
            where: { id: conversationId },
            include: { messages: true },
        });
        if (!conv)
            return emptyNormalized("direct_chat");
        return {
            ...emptyNormalized("direct_chat"),
            legacyConversationIdHash: hashId(conv.id),
            unifiedConversationIdHash: hashId(conv.id),
            contextType: conv.contextType,
            contextIdHash: hashId(conv.contextWorkspaceId),
            messageCount: conv.messages.length,
            participantCount: 1,
            hasWhatsAppChannel: Boolean(conv.whatsappPhone || conv.forwarderPhone),
            outboundCount: conv.messages.filter((m) => m.channel !== "whatsapp" || m.senderType !== "forwarder").length,
            inboundCount: conv.messages.filter((m) => m.source === "whatsapp").length,
            lastMessageTimestamp: conv.messages.at(-1)?.createdAt.toISOString() ?? null,
        };
    }
    async projectWhatsAppConversation(conversationId) {
        const conv = await this.prisma.whatsAppConversation.findUnique({
            where: { id: conversationId },
            include: { messages: true },
        });
        if (!conv)
            return emptyNormalized("whatsapp_inbox");
        const unifiedConv = await this.prisma.workspaceConversation.findFirst({
            where: { metadata: { path: ["whatsappConversationId"], equals: conversationId } },
            include: {
                messages: {
                    where: { channelSource: "WHATSAPP", status: { not: "DELETED" } },
                },
            },
        });
        const legacyStatuses = conv.messages.map((m) => resolveWhatsAppMessageCanonical(m));
        return {
            ...emptyNormalized("whatsapp_inbox"),
            legacyConversationIdHash: hashId(conv.id),
            unifiedConversationIdHash: hashId(unifiedConv?.id ?? conv.id),
            messageCount: conv.messages.length,
            unreadCount: conv.unreadCount,
            participantCount: 1,
            hasWhatsAppChannel: true,
            inboundCount: conv.messages.filter((m) => m.direction === "INBOUND").length,
            outboundCount: conv.messages.filter((m) => m.direction === "OUTBOUND").length,
            lastMessageTimestamp: conv.lastMessageAt?.toISOString() ?? null,
            deliveryStatusCounts: canonicalStatusDistribution(legacyStatuses),
        };
    }
    async projectClarifications(workspaceId) {
        const thread = await this.prisma.clarificationThread.findUnique({
            where: { workspaceId },
            include: { messages: true },
        });
        if (!thread)
            return emptyNormalized("rfq_clarifications");
        return {
            ...emptyNormalized("rfq_clarifications"),
            legacyConversationIdHash: hashId(thread.id),
            unifiedConversationIdHash: hashId(thread.id),
            contextType: "RFQ",
            contextIdHash: hashId(workspaceId),
            messageCount: thread.messages.length,
            internalCount: thread.messages.filter((m) => m.visibility === "ADMIN_ONLY").length,
            outboundCount: thread.messages.filter((m) => m.visibility !== "ADMIN_ONLY").length,
            lastMessageTimestamp: thread.messages.at(-1)?.createdAt.toISOString() ?? null,
        };
    }
}
//# sourceMappingURL=unified-shadow-projector.js.map