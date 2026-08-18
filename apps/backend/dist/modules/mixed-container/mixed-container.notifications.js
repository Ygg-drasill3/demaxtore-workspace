import { emitOperationalNotifications, scheduleOperationalNotificationSockets, } from "../notification-engine/notification-engine.service.js";
import { notificationToDTO } from "../notifications/notifications.service.js";
import { prisma } from "../../db/prisma.js";
export async function notifyMcEvent(tx, input) {
    if (!input.userIds.length)
        return;
    const created = await emitOperationalNotifications(tx, {
        userIds: input.userIds,
        workspaceId: input.workspaceId,
        eventType: input.eventType,
        title: input.title,
        message: input.message,
        link: input.link,
        priority: input.priority,
        metadata: {
            channels: { workspace: true, email: true, whatsapp: true, push: false },
        },
    });
    scheduleOperationalNotificationSockets(created, async (id) => {
        const row = await prisma.notification.findUnique({ where: { id }, include: { workspace: true } });
        return row ? notificationToDTO(row) : null;
    });
}
//# sourceMappingURL=mixed-container.notifications.js.map