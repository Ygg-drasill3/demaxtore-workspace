import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { buildWorkspaceLink, resolveOperationalShape, parseMetadata, } from "./notification-engine.mapper.js";
function defaultChannels() {
    return { workspace: true, email: false, whatsapp: false, push: false };
}
function buildEngineMetadata(input, shape) {
    return {
        centerType: input.centerType ?? shape.centerType,
        priority: input.priority ?? shape.priority,
        category: shape.category,
        commWorkspaceType: input.commWorkspaceType,
        commWorkspaceId: input.commWorkspaceId,
        channels: defaultChannels(),
        ...(input.metadata ?? {}),
    };
}
export async function emitOperationalNotifications(tx, input) {
    if (!input.userIds.length)
        return [];
    const shape = resolveOperationalShape(input.eventType, parseMetadata({
        centerType: input.centerType,
        priority: input.priority,
        ...(input.metadata ?? {}),
    }));
    const link = input.link
        ?? buildWorkspaceLink(input.commWorkspaceType ?? null, input.commWorkspaceId ?? null);
    const meta = buildEngineMetadata(input, shape);
    const created = [];
    for (const userId of input.userIds) {
        const row = await tx.notification.create({
            data: {
                userId,
                workspaceId: input.workspaceId,
                eventType: input.eventType,
                type: input.visualType ?? shape.visualType,
                title: input.title,
                message: input.message,
                link: link ?? null,
                metadata: meta,
                isRead: false,
            },
        });
        created.push({ id: row.id, userId });
    }
    return created;
}
export function scheduleOperationalNotificationSockets(rows, toDto) {
    socketBus.scheduleEmit(() => {
        void (async () => {
            for (const row of rows) {
                const dto = await toDto(row.id);
                if (dto) {
                    socketBus.emitToUser(row.userId, SocketEvents.NOTIFICATION_NEW, { notification: dto });
                }
            }
            const { scheduleNotificationChannelDeliveries } = await import("../notification-center/delivery.dispatcher.js");
            scheduleNotificationChannelDeliveries(rows);
        })();
    });
}
export async function resolveWorkspaceParticipantIds(tx, auditWorkspaceId, excludeUserId) {
    const parts = await tx.workspaceParticipant.findMany({
        where: { workspaceId: auditWorkspaceId, leftAt: null },
        select: { userId: true },
    });
    const ids = parts.map((p) => p.userId);
    if (excludeUserId)
        return ids.filter((id) => id !== excludeUserId);
    return ids;
}
export async function emitSystemEventNotifications(db, input) {
    const userIds = await resolveWorkspaceParticipantIds(db, input.auditWorkspaceId, input.actorUserId);
    if (!userIds.length)
        return;
    const created = await emitOperationalNotifications(db, {
        userIds,
        workspaceId: input.auditWorkspaceId,
        commWorkspaceType: input.commWorkspaceType,
        commWorkspaceId: input.commWorkspaceId,
        eventType: `system.${input.systemEventType.toLowerCase()}`,
        title: input.title,
        message: input.message,
        metadata: { systemEventType: input.systemEventType },
    });
    if (created.length) {
        const { notificationToDTO } = await import("../notifications/notifications.service.js");
        scheduleOperationalNotificationSockets(created, async (id) => {
            const row = await db.notification.findUnique({
                where: { id },
                include: { workspace: true },
            });
            return row ? notificationToDTO(row) : null;
        });
    }
}
//# sourceMappingURL=notification-engine.service.js.map