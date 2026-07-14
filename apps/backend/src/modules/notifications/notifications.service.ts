// apps/backend/src/modules/notifications/notifications.service.ts
import type { Notification, Workspace } from "@prisma/client";
import type { NotificationCategory } from "@dmx/contracts/notification-center";
import type { NotificationDTO } from "@dmx/contracts/notifications";
import { prisma } from "../../db/prisma.js";
import { NotFound } from "../../lib/errors.js";
import {
  buildActions,
  isSnoozedActive,
  matchesCategory,
  parseMetadata,
  prioritySortKey,
  readStatus,
  resolveOperationalShape,
  snoozeUntil,
} from "../notification-engine/notification-engine.mapper.js";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";

type NotificationRow = Notification & { workspace: Workspace | null };

export function notificationToDTO(n: NotificationRow): NotificationDTO {
  const metadata = parseMetadata(n.metadata);
  const shape = resolveOperationalShape(n.eventType, metadata, n.type);
  const wsType = (metadata.commWorkspaceType ?? n.workspace?.type ?? null) as CommWorkspaceType | null;

  const status = readStatus(n.isRead, metadata);

  return {
    id:            n.id,
    type:          n.type,
    titleKey:      n.eventType ?? shape.titleKey,
    title:         n.title,
    body:          n.message ?? null,
    link:          n.link ?? null,
    workspaceId:   n.workspaceId ?? null,
    workspaceType: wsType,
    workspaceRef:  metadata.workspaceRef ?? n.workspace?.externalRef ?? null,
    read:          n.isRead,
    readAt:        n.readAt?.toISOString() ?? null,
    createdAt:     n.createdAt.toISOString(),
    centerType:    shape.centerType,
    priority:      shape.priority,
    category:      shape.category,
    status,
    snoozedUntil:  metadata.snoozedUntil ?? null,
    actions: buildActions({
      centerType: shape.centerType,
      link: n.link,
      workspaceType: wsType,
      workspaceId: n.workspaceId,
      messageId: metadata.messageId,
      documentId: metadata.documentId,
    }),
  };
}

interface ListParams {
  userId:     string;
  category:   NotificationCategory;
  unreadOnly: boolean;
  limit:      number;
  cursor?:    string;
}

function sortNotifications(rows: NotificationRow[]): NotificationRow[] {
  return [...rows].sort((a, b) => {
    const ma = parseMetadata(a.metadata);
    const mb = parseMetadata(b.metadata);
    const pa = prioritySortKey(resolveOperationalShape(a.eventType, ma, a.type).priority);
    const pb = prioritySortKey(resolveOperationalShape(b.eventType, mb, b.type).priority);
    if (pa !== pb) return pa - pb;
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export async function unreadCount(userId: string): Promise<{ count: number }> {
  const rows = await prisma.notification.findMany({
    where: { userId, isRead: false },
    select: { id: true, metadata: true, eventType: true, type: true, isRead: true },
  });
  const now = new Date();
  const count = rows.filter((r) => {
    const meta = parseMetadata(r.metadata);
    if (meta.archivedAt) return false;
    if (isSnoozedActive(meta, now)) return false;
    return true;
  }).length;
  return { count };
}

export async function list({ userId, category, unreadOnly, limit, cursor }: ListParams) {
  const where = {
    userId,
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
  };

  const [rawItems, unreadRows] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    Math.min(limit * 4, 200),
      include: { workspace: true },
    }),
    prisma.notification.findMany({
      where: { userId, isRead: false },
      select: { id: true, metadata: true, eventType: true, type: true, isRead: true },
    }),
  ]);

  const now = new Date();
  const filtered = sortNotifications(rawItems).filter((n) => {
    const meta = parseMetadata(n.metadata);
    const shape = resolveOperationalShape(n.eventType, meta, n.type);
    if (unreadOnly && (n.isRead || meta.archivedAt || isSnoozedActive(meta, now))) return false;
    return matchesCategory(category, shape, n.isRead, meta);
  });

  const items = filtered.slice(0, limit + 1);
  let nextCursor: string | null = null;
  if (items.length > limit) {
    const last = items.pop()!;
    nextCursor = last.createdAt.toISOString();
  }

  const unreadCount = unreadRows.filter((r) => {
    const meta = parseMetadata(r.metadata);
    if (meta.archivedAt) return false;
    if (isSnoozedActive(meta, now)) return false;
    return true;
  }).length;

  return { items: items.map(notificationToDTO), unreadCount, nextCursor };
}

async function loadOwned(userId: string, id: string): Promise<NotificationRow> {
  const row = await prisma.notification.findUnique({ where: { id }, include: { workspace: true } });
  if (!row || row.userId !== userId) throw NotFound("Notification not found");
  return row;
}

export async function markRead(userId: string, id: string) {
  const row = await loadOwned(userId, id);
  if (row.isRead) return notificationToDTO(row);
  const updated = await prisma.notification.update({
    where:  { id },
    data:   { isRead: true, readAt: new Date() },
    include: { workspace: true },
  });
  return notificationToDTO(updated);
}

export async function markAllRead(userId: string): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
}

export async function archive(userId: string, id: string) {
  const row = await loadOwned(userId, id);
  const meta = parseMetadata(row.metadata);
  const updated = await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: row.readAt ?? new Date(),
      metadata: { ...meta, archivedAt: new Date().toISOString() },
    },
    include: { workspace: true },
  });
  return notificationToDTO(updated);
}

export async function dismiss(userId: string, id: string) {
  return archive(userId, id);
}

export async function snooze(userId: string, id: string, option: string) {
  const row = await loadOwned(userId, id);
  const meta = parseMetadata(row.metadata);
  const until = snoozeUntil(option).toISOString();
  const updated = await prisma.notification.update({
    where: { id },
    data: { metadata: { ...meta, snoozedUntil: until } },
    include: { workspace: true },
  });
  return notificationToDTO(updated);
}

export async function getById(userId: string, id: string) {
  const row = await loadOwned(userId, id);
  return notificationToDTO(row);
}
