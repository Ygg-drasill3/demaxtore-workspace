import { hashId } from "./legacy-adapter.config.js";
import { canonicalStatusDistribution, resolveWhatsAppMessageCanonical, } from "../../messaging-status.js";
export function emptyNormalized(surface) {
    return {
        sourceSurface: surface,
        legacyConversationIdHash: null,
        unifiedConversationIdHash: null,
        contextType: null,
        contextIdHash: null,
        participantCount: 0,
        messageCount: 0,
        unreadCount: 0,
        attachmentCount: 0,
        inboundCount: 0,
        outboundCount: 0,
        internalCount: 0,
        systemCount: 0,
        lastMessageTimestamp: null,
        hasWhatsAppChannel: false,
        deliveryStatusCounts: {},
        missingAuthorCount: 0,
        missingContextCount: 0,
    };
}
export function normalizeWorkspaceCommunicationLegacy(result) {
    const messages = result.messages ?? [];
    let internalCount = 0;
    let systemCount = 0;
    let outboundCount = 0;
    let inboundCount = 0;
    let attachmentCount = 0;
    let missingAuthorCount = 0;
    const deliveryStatusCounts = {};
    for (const m of messages) {
        if (!m.authorUserId)
            missingAuthorCount += 1;
        attachmentCount += m.attachments?.length ?? 0;
        const type = m.messageType ?? "MESSAGE";
        const visibility = m.visibility ?? "";
        const audience = m.audienceScope ?? "";
        if (type === "SYSTEM_EVENT" || type === "STATUS_UPDATE" || audience === "SYSTEM")
            systemCount += 1;
        else if (type === "INTERNAL_NOTE" || visibility === "ADMIN_ONLY" || audience === "INTERNAL")
            internalCount += 1;
        else
            outboundCount += 1;
        if (m.channelSource === "WHATSAPP")
            deliveryStatusCounts.whatsapp = (deliveryStatusCounts.whatsapp ?? 0) + 1;
    }
    const last = messages.length ? messages[messages.length - 1] : undefined;
    return {
        sourceSurface: "workspace_communication",
        legacyConversationIdHash: hashId(result.id),
        unifiedConversationIdHash: hashId(result.id),
        contextType: result.workspaceType ?? null,
        contextIdHash: hashId(result.workspaceId),
        participantCount: 0,
        messageCount: messages.length,
        unreadCount: result.unreadCount ?? 0,
        attachmentCount,
        inboundCount,
        outboundCount,
        internalCount,
        systemCount,
        lastMessageTimestamp: last?.createdAt ?? null,
        hasWhatsAppChannel: messages.some((m) => m.channelSource === "WHATSAPP"),
        deliveryStatusCounts,
        missingAuthorCount,
        missingContextCount: 0,
    };
}
export function normalizeConversationHubLegacy(result) {
    const base = normalizeWorkspaceCommunicationLegacy({
        id: result.conversationId,
        workspaceType: result.workspaceType,
        workspaceId: result.workspaceId,
        messages: (result.timeline ?? []).map((t) => ({
            authorUserId: t.authorUserId,
            messageType: t.messageType,
            visibility: t.visibility,
            attachments: t.attachments,
            createdAt: t.createdAt,
            channelSource: t.channelSource,
        })),
        unreadCount: result.summary?.unreadCount ?? 0,
    });
    return { ...base, sourceSurface: "conversation_hub" };
}
export function normalizeInboxLegacy(result) {
    const cards = result.workspaceCards ?? [];
    const unreadCount = cards.reduce((n, c) => n + (c.unreadCount ?? 0), 0);
    const lastTs = cards
        .map((c) => c.lastMessageAt)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;
    return {
        ...emptyNormalized("workspace_inbox"),
        messageCount: cards.length,
        unreadCount,
        lastMessageTimestamp: lastTs,
        participantCount: cards.length,
    };
}
export function normalizePortfolioLegacy(result) {
    const items = result.items ?? [];
    return {
        ...emptyNormalized("portfolio_messages"),
        messageCount: items.length,
        unreadCount: items.reduce((n, i) => n + (i.unreadCount ?? 0), 0),
        participantCount: result.total ?? items.length,
        lastMessageTimestamp: items.map((i) => i.lastAt).filter(Boolean).sort().at(-1) ?? null,
    };
}
export function normalizeDirectChatLegacy(result) {
    const rows = Array.isArray(result) ? result : [];
    let messageCount = 0;
    let hasWhatsApp = false;
    for (const row of rows) {
        const r = row;
        messageCount += r.messages?.length ?? 0;
        if (r.whatsappPhone)
            hasWhatsApp = true;
    }
    return {
        ...emptyNormalized("direct_chat"),
        messageCount,
        participantCount: rows.length,
        hasWhatsAppChannel: hasWhatsApp,
    };
}
export function normalizeWhatsAppInboxLegacy(result) {
    const items = result.items ?? [];
    const allMessages = items.flatMap((i) => i.messages ?? []);
    const statuses = allMessages.map((m) => resolveWhatsAppMessageCanonical({
        status: m.status,
        sentAt: m.sentAt ? new Date(m.sentAt) : null,
        deliveredAt: m.deliveredAt ? new Date(m.deliveredAt) : null,
        readAt: m.readAt ? new Date(m.readAt) : null,
        failedAt: "failedAt" in m && m.failedAt ? new Date(m.failedAt) : null,
    }));
    return {
        ...emptyNormalized("whatsapp_inbox"),
        messageCount: allMessages.length,
        unreadCount: items.reduce((n, i) => n + (i.unreadCount ?? 0), 0),
        participantCount: items.length,
        hasWhatsAppChannel: true,
        inboundCount: allMessages.filter((m) => m.direction === "INBOUND").length,
        outboundCount: allMessages.filter((m) => m.direction === "OUTBOUND").length,
        lastMessageTimestamp: items.map((i) => i.lastMessageAt).filter(Boolean).sort().at(-1)?.toString() ?? null,
        deliveryStatusCounts: canonicalStatusDistribution(statuses),
    };
}
export function normalizeClarificationsLegacy(result) {
    const messages = result.messages ?? [];
    const internalCount = messages.filter((m) => m.visibility === "ADMIN_ONLY").length;
    const last = messages.at(-1);
    return {
        ...emptyNormalized("rfq_clarifications"),
        messageCount: messages.length,
        internalCount,
        outboundCount: messages.length - internalCount,
        missingAuthorCount: messages.filter((m) => !m.authorUserId).length,
        lastMessageTimestamp: last?.createdAt ?? null,
    };
}
export function normalizeSearchResultsLegacy(surface, result) {
    const items = result.items ?? [];
    const base = normalizeWorkspaceCommunicationLegacy({
        messages: items.map((m) => ({
            authorUserId: m.authorUserId,
            messageType: m.messageType,
            visibility: m.visibility,
            attachments: m.attachments,
            createdAt: m.createdAt,
            channelSource: m.channelSource,
        })),
    });
    return {
        ...base,
        sourceSurface: surface,
        messageCount: result.total ?? items.length,
    };
}
export function normalizeDirectConversationLegacy(result) {
    const messages = result.messages ?? [];
    return {
        ...emptyNormalized("direct_chat"),
        legacyConversationIdHash: hashId(result.id),
        unifiedConversationIdHash: hashId(result.id),
        contextType: result.contextType ?? null,
        contextIdHash: hashId(result.contextWorkspaceId),
        participantCount: 1,
        messageCount: messages.length,
        inboundCount: messages.filter((m) => m.source === "whatsapp").length,
        outboundCount: messages.filter((m) => m.source !== "whatsapp").length,
        hasWhatsAppChannel: Boolean(result.whatsappPhone),
        lastMessageTimestamp: messages.at(-1)?.createdAt ?? null,
    };
}
export function normalizeWhatsAppMessagesLegacy(result) {
    const count = result.items?.length ?? 0;
    return {
        ...emptyNormalized("whatsapp_inbox"),
        messageCount: count,
        participantCount: 1,
        hasWhatsAppChannel: true,
    };
}
//# sourceMappingURL=legacy-adapter.normalizer.js.map