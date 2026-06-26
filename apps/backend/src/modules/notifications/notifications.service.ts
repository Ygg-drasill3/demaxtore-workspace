// apps/backend/src/modules/notifications/notifications.service.ts
import type { Notification, Workspace } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { NotFound } from "../../lib/errors.js";

type NotificationRow = Notification & { workspace: Workspace | null };

function toDTO(n: NotificationRow) {
  return {
    id:            n.id,
    type:          n.type,
    titleKey:      n.eventType ?? "notification.generic",
    title:         n.title,
    body:          n.message ?? null,
    link:          n.link ?? null,
    workspaceId:   n.workspaceId ?? null,
    workspaceType: n.workspace?.type ?? null,
    read:          n.isRead,
    readAt:        n.readAt?.toISOString() ?? null,
    createdAt:     n.createdAt.toISOString(),
  };
}

interface ListParams {
  userId:     string;
  unreadOnly: boolean;
  limit:      number;
  cursor?:    string;
}

export async function unreadCount(userId: string): Promise<{ count: number }> {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { count };
}

export async function list({ userId, unreadOnly, limit, cursor }: ListParams) {
  const where = {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
  };

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    limit + 1,
      include: { workspace: true },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const last = items.pop()!;
    nextCursor = last.createdAt.toISOString();
  }

  return { items: items.map(toDTO), unreadCount, nextCursor };
}

export async function markRead(userId: string, id: string) {
  const row = await prisma.notification.findUnique({ where: { id } });
  if (!row || row.userId !== userId) throw NotFound("Notification not found");
  if (row.isRead) return toDTO({ ...row, workspace: null });
  const updated = await prisma.notification.update({
    where:  { id },
    data:   { isRead: true, readAt: new Date() },
    include: { workspace: true },
  });
  return toDTO(updated);
}

export async function markAllRead(userId: string): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
}
