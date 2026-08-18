import { channelFromColumn } from "./unified-messaging.constants.js";
export function mapParticipant(row) {
    return {
        id: row.id,
        participantKey: row.participantKey,
        userId: row.userId,
        whatsappContactId: row.whatsappContactId,
        participantType: row.participantType,
        participantRole: row.participantRole,
        companyId: row.companyId,
        displayName: row.displayName,
        phoneE164: row.phoneE164,
        email: row.email,
        joinedAt: row.joinedAt.toISOString(),
        lastReadAt: row.lastReadAt?.toISOString() ?? null,
    };
}
export function mapContext(row) {
    return {
        id: row.id,
        contextType: row.contextType,
        contextId: row.contextId,
        contextReference: row.contextReference,
        metadata: row.metadata ?? {},
        createdAt: row.createdAt.toISOString(),
    };
}
export function mapConversationSummary(row, unreadCount = 0) {
    const last = row.messages[0];
    return {
        id: row.id,
        subject: row.subject,
        status: row.status,
        priority: row.priority,
        primaryChannel: channelFromColumn(row.primaryChannel),
        assignedUserId: row.assignedUserId,
        isArchived: row.isArchived,
        lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: last?.body?.slice(0, 120) ?? null,
        unreadCount,
        workspaceType: row.workspaceType,
        workspaceId: row.workspaceId,
        contexts: row.contexts.map(mapContext),
        participants: row.participants.map(mapParticipant),
    };
}
export function mapConversationDetail(row, unreadCount = 0) {
    return {
        ...mapConversationSummary(row, unreadCount),
        metadata: row.metadata ?? {},
        createdAt: row.createdAt.toISOString(),
    };
}
export function mapMessage(row) {
    // `failureReason` is persisted and served to clients, but not yet declared on
    // UnifiedMessageDto in @dmx/contracts; keep emitting it until the contract adds it.
    const dto = {
        id: row.id,
        conversationId: row.conversationId,
        senderUserId: row.authorUserId,
        direction: row.direction,
        channel: channelFromColumn(row.channelSource),
        audienceScope: row.audienceScope,
        messageType: row.messageType,
        body: row.body,
        status: row.status,
        replyToMessageId: row.parentMessageId,
        externalMessageId: row.externalMessageId,
        whatsappMessageId: row.whatsappMessageId,
        createdAt: row.createdAt.toISOString(),
        sentAt: row.sentAt?.toISOString() ?? null,
        deliveredAt: row.deliveredAt?.toISOString() ?? null,
        readAt: row.readAt?.toISOString() ?? null,
        failedAt: row.failedAt?.toISOString() ?? null,
        failureReason: row.failureReason ?? null,
    };
    return dto;
}
export function filterMessagesForUser(messages, canReadInternal) {
    if (canReadInternal)
        return messages;
    return messages.filter((m) => m.audienceScope === "EXTERNAL");
}
//# sourceMappingURL=unified-messaging.mapper.js.map