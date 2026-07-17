import type { Prisma } from "@prisma/client";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import {
  emitOperationalNotifications,
  scheduleOperationalNotificationSockets,
} from "../notification-engine/notification-engine.service.js";
import { notificationToDTO } from "../notifications/notifications.service.js";
import { prisma } from "../../db/prisma.js";
import {
  filterRecipientsForMessagingDedup,
  messagingDedupMetadata,
} from "../unified-messaging/messaging-notify.helper.js";

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
    messagingDedup?: {
      conversationId: string;
      messageId: string;
      eventType: string;
    };
  },
): Promise<void> {
  let userIds = input.userIds;
  if (input.messagingDedup && userIds.length) {
    userIds = await filterRecipientsForMessagingDedup(tx, {
      eventType: input.messagingDedup.eventType,
      conversationId: input.messagingDedup.conversationId,
      messageId: input.messagingDedup.messageId,
      userIds,
    });
  }
  if (!userIds.length) return;

  const perUserMeta = input.messagingDedup
    ? (recipientId: string) => ({
        ...(input.metadata ?? {}),
        ...messagingDedupMetadata(
          input.messagingDedup!.eventType,
          input.messagingDedup!.conversationId,
          input.messagingDedup!.messageId,
          recipientId,
        ),
      })
    : () => input.metadata ?? {};

  const createdAll: Array<{ id: string; userId: string }> = [];
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
