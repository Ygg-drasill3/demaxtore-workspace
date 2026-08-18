import { emitOperationalNotifications, scheduleOperationalNotificationSockets, } from "../notification-engine/notification-engine.service.js";
import { notificationToDTO } from "../notifications/notifications.service.js";
import { prisma } from "../../db/prisma.js";
import { filterRecipientsForMessagingDedup, messagingDedupMetadata, } from "../unified-messaging/messaging-notify.helper.js";
export async function notifyCommEvent(tx, input) {
    let userIds = input.userIds;
    if (input.messagingDedup && userIds.length) {
        userIds = await filterRecipientsForMessagingDedup(tx, {
            eventType: input.messagingDedup.eventType,
            conversationId: input.messagingDedup.conversationId,
            messageId: input.messagingDedup.messageId,
            userIds,
        });
    }
    if (!userIds.length)
        return;
    const perUserMeta = input.messagingDedup
        ? (recipientId) => ({
            ...(input.metadata ?? {}),
            ...messagingDedupMetadata(input.messagingDedup.eventType, input.messagingDedup.conversationId, input.messagingDedup.messageId, recipientId),
        })
        : () => input.metadata ?? {};
    const createdAll = [];
    for (const userId of userIds) {
        const batch = await emitOperationalNotifications(tx, {
            userIds: [userId],
            workspaceId: input.auditWorkspaceId,
            commWorkspaceType: input.commWorkspaceType,
            commWorkspaceId: input.commWorkspaceId,
            eventType: input.eventType,
            title: input.title,
            message: input.message,
            link: input.link,
            centerType: input.centerType,
            metadata: perUserMeta(userId),
        });
        createdAll.push(...batch);
    }
    scheduleOperationalNotificationSockets(createdAll, async (id) => {
        const row = await prisma.notification.findUnique({ where: { id }, include: { workspace: true } });
        return row ? notificationToDTO(row) : null;
    });
}
//# sourceMappingURL=communication.notifications.js.map