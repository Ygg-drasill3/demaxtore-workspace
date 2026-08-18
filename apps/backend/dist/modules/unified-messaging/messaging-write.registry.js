export function buildSocketOutbox(surface, input) {
    return {
        eventType: "SOCKET_EMIT",
        aggregateType: surface,
        aggregateId: input.messageId ?? input.conversationId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        idempotencyKey: `socket:${input.idempotencyKey}`,
        payload: {
            event: input.event,
            eventPayload: {
                conversationId: input.conversationId,
                messageId: input.messageId,
                workspaceId: input.workspaceId,
                audienceScope: input.audienceScope,
                idempotencyKey: input.idempotencyKey,
            },
        },
    };
}
export function buildNotificationOutbox(surface, input) {
    return {
        eventType: "NOTIFICATION_DISPATCH",
        aggregateType: surface,
        aggregateId: input.messageId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        idempotencyKey: `notify:${input.idempotencyKey}`,
        payload: { notifyInput: input.notifyInput },
    };
}
/** Enqueue outbox rows inside an open transaction. */
export async function enqueueOutboxBatch(enqueue, events, tx) {
    for (const evt of events) {
        await enqueue(evt, tx);
    }
}
/** All 37 messaging mutation surfaces — used by coverage tests. */
export const MESSAGING_WRITE_SURFACES = [
    "workspace_external_message",
    "workspace_internal_note",
    "workspace_attachment",
    "workspace_mark_read",
    "conversation_hub_message",
    "conversation_hub_reply",
    "conversation_hub_internal_note",
    "general_messages_send",
    "direct_chat_send",
    "direct_chat_attachment",
    "order_freight_chat_send",
    "freightiq_message_send",
    "rfq_clarification_create",
    "rfq_clarification_reply",
    "rfq_clarification_read",
    "whatsapp_outbound_text",
    "whatsapp_outbound_media",
    "whatsapp_inbound",
    "whatsapp_status",
    "conversation_assignment",
    "team_assignment",
    "archive",
    "unarchive",
    "participant_add",
    "participant_remove",
    "context_add",
    "context_remove",
    "priority_update",
    "conversation_status_update",
    "attachment_upload",
    "message_retry",
    "conversation_mark_read",
    "message_read_receipt",
    "system_event",
    "mention",
    "passwordless_reply",
    "unified_internal_note",
];
/** Registry of wired surfaces (updated as code wires each path). */
export const WIRED_MESSAGING_SURFACES = new Set();
export function registerWiredSurface(surface) {
    WIRED_MESSAGING_SURFACES.add(surface);
}
export function assertAllSurfacesWired() {
    const missing = MESSAGING_WRITE_SURFACES.filter((s) => !WIRED_MESSAGING_SURFACES.has(s));
    if (missing.length) {
        throw new Error(`Unwired messaging surfaces: ${missing.join(", ")}`);
    }
}
//# sourceMappingURL=messaging-write.registry.js.map