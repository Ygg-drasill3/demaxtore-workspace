import { createHash } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { getMessagingDedupStore } from "./messaging-dedup.store.js";
export function messagingDedupKey(eventType, conversationId, messageId, recipientId) {
    return createHash("sha256")
        .update(`messaging:${eventType}:${conversationId}:${messageId}:${recipientId}`)
        .digest("hex")
        .slice(0, 32);
}
export function messagingDedupMetadata(eventType, conversationId, messageId, recipientId) {
    return { messagingDedupKey: messagingDedupKey(eventType, conversationId, messageId, recipientId) };
}
/** Filter recipients that already received this messaging notification. */
export async function filterRecipientsForMessagingDedup(tx, input) {
    if (!input.userIds.length)
        return [];
    const out = [];
    const dedup = getMessagingDedupStore(prisma);
    for (const userId of input.userIds) {
        const key = `messaging:${input.eventType}:${input.conversationId}:${input.messageId}:${userId}`;
        const claimed = await dedup.claim("notification", key);
        if (claimed)
            out.push(userId);
    }
    return out;
}
/** Skip delivery-status notifications except FAILED for staff. */
export function shouldEmitDeliveryNotification(status) {
    return status.toUpperCase() === "FAILED";
}
//# sourceMappingURL=messaging-notify.helper.js.map