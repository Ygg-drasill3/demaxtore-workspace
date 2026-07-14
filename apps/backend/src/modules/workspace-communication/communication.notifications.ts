import type { Prisma } from "@prisma/client";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import {
  emitOperationalNotifications,
  scheduleOperationalNotificationSockets,
} from "../notification-engine/notification-engine.service.js";
import { notificationToDTO } from "../notifications/notifications.service.js";
import { prisma } from "../../db/prisma.js";

export async function notifyCommEvent(
  tx: Prisma.TransactionClient,
  input: {
    userIds: string[];
    auditWorkspaceId: string;
    commWorkspaceType?: CommWorkspaceType;
    commWorkspaceId?: string;
    eventType: string;
    title: string;
    message: string;
    link: string;
    centerType?: import("@dmx/contracts/notification-center").OperationalNotificationType;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!input.userIds.length) return;

  const created = await emitOperationalNotifications(tx, {
    userIds: input.userIds,
    workspaceId: input.auditWorkspaceId,
    commWorkspaceType: input.commWorkspaceType,
    commWorkspaceId: input.commWorkspaceId,
    eventType: input.eventType,
    title: input.title,
    message: input.message,
    link: input.link,
    centerType: input.centerType,
    metadata: input.metadata,
  });

  scheduleOperationalNotificationSockets(created, async (id) => {
    const row = await prisma.notification.findUnique({ where: { id }, include: { workspace: true } });
    return row ? notificationToDTO(row) : null;
  });
}
