import { isAdminChatRole } from "./chat.types.js";
export function resolveSenderType(actorRole, conv, authorUserId) {
    if (isAdminChatRole(actorRole))
        return "admin";
    if (!authorUserId) {
        return conv.forwarderContactId ? "forwarder" : "supplier";
    }
    if (authorUserId === conv.buyerUserId)
        return "buyer";
    if (authorUserId === conv.peerUserId)
        return "supplier";
    return "buyer";
}
export function mapConversationRow(conv, extras = {}) {
    return {
        conversationId: conv.id,
        id: conv.id,
        contextType: conv.contextType,
        contextWorkspaceId: conv.contextWorkspaceId,
        contextRef: conv.contextRef,
        workspaceRfqId: conv.workspaceRfqId,
        freightIqRfqId: conv.freightIqRfqId,
        buyerId: conv.buyerUserId,
        supplierId: conv.peerUserId,
        forwarderPhone: conv.forwarderPhone ?? conv.peerPhone,
        whatsappPhone: extras.peerPhone ?? conv.whatsappPhone ?? conv.peerPhone,
        peerName: extras.peerName ?? conv.peerName,
        peerPhone: extras.peerPhone ?? conv.whatsappPhone ?? conv.peerPhone,
        peerUserId: conv.peerUserId,
        forwarderContactId: conv.forwarderContactId,
        status: conv.status,
        lastMessage: extras.lastMessage ?? null,
        lastAt: extras.lastAt ?? conv.updatedAt.toISOString(),
        lastSource: extras.lastSource ?? null,
        workspaceUrl: conv.contextType === "RFQ"
            ? `/workspace/rfq/${conv.contextWorkspaceId}`
            : `/workspace/order/${conv.contextWorkspaceId}`,
    };
}
export function mapMessageRow(m, conv, viewerUserId, viewerRole) {
    const source = (m.source || (m.channel === "whatsapp" ? "whatsapp" : "platform"));
    const status = (m.status || m.deliveryStatus || "sent");
    const senderType = (m.senderType || resolveSenderType(viewerRole, conv, m.authorUserId));
    return {
        id: m.id,
        conversationId: m.conversationId,
        senderType,
        senderUserId: m.authorUserId,
        senderPhone: m.senderPhone,
        source,
        channel: source === "whatsapp" ? "whatsapp" : "panel",
        body: m.body,
        whatsappMessageId: m.whatsappMessageId,
        status,
        deliveryStatus: status,
        createdAt: m.createdAt.toISOString(),
        isOwn: m.authorUserId === viewerUserId,
    };
}
export function sourceLabel(source, senderType) {
    if (source === "whatsapp")
        return "WhatsApp";
    if (senderType === "admin")
        return "Admin";
    if (source === "system")
        return "System";
    return "Platform";
}
//# sourceMappingURL=chat.mapper.js.map