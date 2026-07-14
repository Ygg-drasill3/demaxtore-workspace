import type { Prisma } from "@prisma/client";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import type {
  OperationalNotificationType,
  NotificationPriority,
} from "@dmx/contracts/notification-center";
import { SocketEvents } from "@dmx/contracts/socket-events";
import type { NotificationDTO } from "@dmx/contracts/notifications";
import { socketBus } from "../../realtime/socket-bus.js";
import {
  buildWorkspaceLink,
  resolveOperationalShape,
  parseMetadata,
  type NotificationMetadata,
  type ResolvedOperationalShape,
} from "./notification-engine.mapper.js";

export interface EmitNotificationInput {
  userIds: string[];
  workspaceId: string;
  commWorkspaceType?: CommWorkspaceType;
  commWorkspaceId?: string;
  eventType: string;
  title: string;
  message: string;
  link?: string;
  centerType?: OperationalNotificationType;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
  visualType?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
}

function defaultChannels() {
  return { workspace: true, email: false, whatsapp: false, push: false };
}

function buildEngineMetadata(
  input: EmitNotificationInput,
  shape: ResolvedOperationalShape,
): NotificationMetadata {
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

export async function emitOperationalNotifications(
  tx: Prisma.TransactionClient,
  input: EmitNotificationInput,
): Promise<Array<{ id: string; userId: string }>> {
  if (!input.userIds.length) return [];

  const shape = resolveOperationalShape(input.eventType, parseMetadata({
    centerType: input.centerType,
    priority: input.priority,
    ...(input.metadata ?? {}),
  }));

  const link = input.link
    ?? buildWorkspaceLink(input.commWorkspaceType ?? null, input.commWorkspaceId ?? null);

  const meta = buildEngineMetadata(input, shape);
  const created: Array<{ id: string; userId: string }> = [];

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
        metadata: meta as Prisma.InputJsonValue,
        isRead: false,
      },
    });
    created.push({ id: row.id, userId });
  }

  return created;
}

export function scheduleOperationalNotificationSockets(
  rows: Array<{ id: string; userId: string }>,
  toDto: (id: string) => Promise<NotificationDTO | null>,
): void {
  socketBus.scheduleEmit(() => {
    void (async () => {
      for (const row of rows) {
        const dto = await toDto(row.id);
        if (dto) {
          socketBus.emitToUser(row.userId, SocketEvents.NOTIFICATION_NEW, { notification: dto });
        }
      }
      const { scheduleNotificationChannelDeliveries } = await import(
        "../notification-center/delivery.dispatcher.js"
      );
      scheduleNotificationChannelDeliveries(rows);
    })();
  });
}

export async function resolveWorkspaceParticipantIds(
  tx: Prisma.TransactionClient,
  auditWorkspaceId: string,
  excludeUserId?: string | null,
): Promise<string[]> {
  const parts = await tx.workspaceParticipant.findMany({
    where: { workspaceId: auditWorkspaceId, leftAt: null },
    select: { userId: true },
  });
  const ids = parts.map((p) => p.userId);
  if (excludeUserId) return ids.filter((id) => id !== excludeUserId);
  return ids;
}

export async function emitSystemEventNotifications(
  db: Prisma.TransactionClient | { workspaceParticipant: Prisma.TransactionClient["workspaceParticipant"]; notification: Prisma.TransactionClient["notification"] },
  input: {
    auditWorkspaceId: string;
    commWorkspaceType: CommWorkspaceType;
    commWorkspaceId: string;
    systemEventType: string;
    title: string;
    message: string;
    actorUserId: string | null;
  },
): Promise<void> {
  const userIds = await resolveWorkspaceParticipantIds(db as Prisma.TransactionClient, input.auditWorkspaceId, input.actorUserId);
  if (!userIds.length) return;

  const created = await emitOperationalNotifications(db as Prisma.TransactionClient, {
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
      const row = await (db as Prisma.TransactionClient).notification.findUnique({
        where: { id },
        include: { workspace: true },
      });
      return row ? notificationToDTO(row) : null;
    });
  }
}
