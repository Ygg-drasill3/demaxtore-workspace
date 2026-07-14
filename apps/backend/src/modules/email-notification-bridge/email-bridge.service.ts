import type { Prisma } from "@prisma/client";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import { isEmailDeliverableType } from "@dmx/contracts/email-notification-bridge";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { sanitizeProviderResponse } from "../../lib/log-redaction.js";
import { prisma } from "../../db/prisma.js";
import { getNotificationPreferences } from "../notification-engine/notification-preferences.store.js";
import { parseMetadata, resolveOperationalShape } from "../notification-engine/notification-engine.mapper.js";
import {
  issuePasswordlessLinkInternal,
  revokeSupersededDeliveryTokens,
  reuseDeliveryPasswordlessLink,
} from "../passwordless-access/passwordless-access.service.js";
import { getEmailBridgeProvider } from "./providers/email-bridge-provider.factory.js";
import {
  buildOperationalEmailTemplate,
  buildOpenTrackingUrl,
  maskEmailForLog,
} from "./email-bridge.templates.js";
import { resolveEmailSafeMessage } from "./email-bridge.content.js";
import { canTransitionDeliveryStatus } from "./email-bridge.status.js";

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 60_000;

export function computeEmailRetryAt(retryCount: number, now = new Date()): Date {
  const delayMs = Math.min(BASE_BACKOFF_MS * 2 ** retryCount, 60 * 60_000);
  return new Date(now.getTime() + delayMs);
}

function bridgeEnabled(): boolean {
  return env.EMAIL_BRIDGE_ENABLED !== false;
}

async function shouldDeliverEmail(userId: string, centerType: string): Promise<boolean> {
  const prefs = await getNotificationPreferences(userId);
  const pref = prefs.types.find((t) => t.type === centerType);
  if (!pref) return false;
  return pref.channels.workspace && pref.channels.email;
}

async function resolveWorkspaceRef(workspaceId: string | null, metadataRef?: string | null) {
  if (metadataRef) return metadataRef;
  if (!workspaceId) return "Workspace";
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { externalRef: true },
  });
  return ws?.externalRef ?? "Workspace";
}

async function resolvePartyLabels(auditWorkspaceId: string | null): Promise<{
  buyer: string | null;
  supplier: string | null;
}> {
  if (!auditWorkspaceId) return { buyer: null, supplier: null };

  const parts = await prisma.workspaceParticipant.findMany({
    where: { workspaceId: auditWorkspaceId, leftAt: null },
    include: {
      user: {
        include: { organisation: { select: { name: true } } },
      },
    },
  });

  let buyer: string | null = null;
  let supplier: string | null = null;

  for (const p of parts) {
    const label = p.user.organisation?.name ?? p.user.displayName;
    if (p.user.role === "BUYER" && (p.participantRole === "OWNER" || !buyer)) {
      buyer = label;
    }
    if (p.user.role === "SUPPLIER" && (p.participantRole === "COUNTERPARTY" || !supplier)) {
      supplier = label;
    }
  }

  return { buyer, supplier };
}

async function assertActiveParticipant(userId: string, auditWorkspaceId: string | null): Promise<boolean> {
  if (!auditWorkspaceId) return false;
  const row = await prisma.workspaceParticipant.findFirst({
    where: { workspaceId: auditWorkspaceId, userId, leftAt: null },
    select: { id: true },
  });
  return Boolean(row);
}

async function resolveDeliveryPasswordlessLink(
  deliveryId: string,
  userId: string,
  commType: CommWorkspaceType,
  commId: string,
  existingTokenId: string | null,
  isRetry: boolean,
): Promise<{ accessUrl: string; tokenId: string }> {
  if (!isRetry && existingTokenId) {
    const reused = await reuseDeliveryPasswordlessLink(existingTokenId);
    if (reused) {
      return { accessUrl: reused.accessUrl, tokenId: reused.tokenId };
    }
  }

  if (isRetry) {
    await revokeSupersededDeliveryTokens(deliveryId);
  }

  const link = await issuePasswordlessLinkInternal({
    userId,
    workspaceType: commType,
    workspaceId: commId,
    ttl: "ONE_HOUR",
    singleUse: true,
    emailDeliveryId: deliveryId,
  });

  await prisma.emailNotificationDelivery.update({
    where: { id: deliveryId },
    data: { passwordlessTokenId: link.tokenId },
  });

  return { accessUrl: link.accessUrl, tokenId: link.tokenId };
}

async function updateDeliveryStatus(
  deliveryId: string,
  currentStatus: string,
  target: "SENT" | "FAILED" | "DELIVERED" | "OPENED",
  data: Prisma.EmailNotificationDeliveryUpdateInput,
): Promise<boolean> {
  if (!canTransitionDeliveryStatus(currentStatus, target)) {
    logger.warn({ deliveryId, currentStatus, target }, "[Email Bridge] ignored invalid status transition");
    return false;
  }
  await prisma.emailNotificationDelivery.update({ where: { id: deliveryId }, data: { status: target, ...data } });
  return true;
}

/** Queue + send email notification for a Notification Center item (idempotent). */
export async function processEmailBridgeDelivery(notificationId: string): Promise<void> {
  if (!bridgeEnabled()) return;

  const existing = await prisma.emailNotificationDelivery.findUnique({
    where: { notificationId },
  });
  if (existing && existing.status !== "FAILED") return;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { workspace: true, user: true },
  });
  if (!notification?.userId || !notification.user) return;

  const metadata = parseMetadata(notification.metadata);
  const shape = resolveOperationalShape(notification.eventType, metadata, notification.type);
  if (!isEmailDeliverableType(shape.centerType)) return;

  const deliver = await shouldDeliverEmail(notification.userId, shape.centerType);
  if (!deliver) return;

  const email = notification.user.email?.trim();
  if (!email) {
    logger.info({ notificationId, userId: notification.userId }, "[Email Bridge] skip — no email");
    return;
  }

  const commType = (metadata.commWorkspaceType ?? notification.workspace?.type) as CommWorkspaceType | undefined;
  const commId = metadata.commWorkspaceId ?? notification.workspaceId;
  if (!commType || !commId) {
    logger.warn({ notificationId }, "[Email Bridge] skip — missing workspace context");
    return;
  }

  const participantOk = await assertActiveParticipant(notification.userId, notification.workspaceId);
  if (!participantOk) {
    logger.info({ notificationId, userId: notification.userId }, "[Email Bridge] skip — not an active participant");
    return;
  }

  const workspaceRef = await resolveWorkspaceRef(
    notification.workspaceId,
    metadata.workspaceRef ?? notification.workspace?.externalRef,
  );

  const parties = await resolvePartyLabels(notification.workspaceId);

  let delivery = existing;
  if (!delivery) {
    try {
      delivery = await prisma.emailNotificationDelivery.create({
        data: {
          notificationId,
          userId: notification.userId,
          workspaceRef,
          subject: `[DeMaxtore] ${notification.title}`,
          templateKey: shape.centerType.toLowerCase(),
          recipientEmail: email,
          provider: getEmailBridgeProvider().id,
          status: "QUEUED",
        },
      });
    } catch {
      return;
    }
  }

  const isRetry = Boolean(existing && existing.status === "FAILED");
  let link: { accessUrl: string; tokenId: string };
  try {
    link = await resolveDeliveryPasswordlessLink(
      delivery.id,
      notification.userId,
      commType,
      commId,
      delivery.passwordlessTokenId,
      isRetry,
    );
  } catch (err) {
    logger.warn({ err, notificationId }, "[Email Bridge] passwordless link issuance failed");
    return;
  }

  const safeMessage = resolveEmailSafeMessage({
    eventType: notification.eventType,
    message: notification.message,
    shape,
    metadata,
  });

  const template = buildOperationalEmailTemplate({
    centerType: shape.centerType,
    priority: shape.priority,
    workspaceRef,
    workspaceType: commType,
    buyerLabel: parties.buyer,
    supplierLabel: parties.supplier,
    title: notification.title,
    message: safeMessage,
    occurredAt: notification.createdAt.toISOString(),
    openConversationUrl: link.accessUrl,
    trackingPixelUrl: buildOpenTrackingUrl(delivery.id),
  });

  const provider = getEmailBridgeProvider();
  const result = await provider.send({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  const now = new Date();
  const sanitizedRaw = sanitizeProviderResponse(result.raw ?? {});

  if (result.providerMessageId || result.demo) {
    await updateDeliveryStatus(delivery.id, delivery.status, "SENT", {
      subject: template.subject,
      templateKey: template.templateKey,
      provider: provider.id,
      providerMessageId: result.providerMessageId,
      sentAt: now,
      deliveredAt: result.demo ? now : delivery.deliveredAt,
      lastError: null,
      providerResponse: sanitizedRaw as Prisma.InputJsonValue,
      passwordlessTokenId: link.tokenId,
    });
    logger.info(
      {
        notificationId,
        deliveryId: delivery.id,
        email: maskEmailForLog(email),
        demo: result.demo,
      },
      "[Email Bridge] delivered",
    );
    return;
  }

  const retryCount = delivery.retryCount + 1;
  const failed = retryCount >= MAX_RETRIES;
  await updateDeliveryStatus(delivery.id, delivery.status, "FAILED", {
    retryCount,
    lastError: result.error?.slice(0, 500) ?? "send_failed",
    nextRetryAt: failed ? null : computeEmailRetryAt(retryCount, now),
    providerResponse: sanitizeProviderResponse({ error: result.error, ...sanitizedRaw }) as Prisma.InputJsonValue,
  });
  logger.warn(
    { notificationId, error: result.error, retryCount },
    "[Email Bridge] delivery failed — notification remains in Workspace",
  );
}

export async function retryFailedEmailDeliveries(): Promise<number> {
  const now = new Date();
  const pending = await prisma.emailNotificationDelivery.findMany({
    where: {
      status: "FAILED",
      retryCount: { lt: MAX_RETRIES },
      nextRetryAt: { lte: now },
    },
    take: 25,
    orderBy: { nextRetryAt: "asc" },
  });

  for (const row of pending) {
    await processEmailBridgeDelivery(row.notificationId);
  }
  return pending.length;
}

/** Informational open metric only — not proof of human read. */
export async function recordEmailOpen(deliveryId: string): Promise<void> {
  const row = await prisma.emailNotificationDelivery.findUnique({ where: { id: deliveryId } });
  if (!row) return;

  if (!canTransitionDeliveryStatus(row.status, "OPENED")) {
    logger.info({ deliveryId, status: row.status }, "[Email Bridge] open tracking ignored for status");
    return;
  }

  const now = new Date();
  await prisma.emailNotificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "OPENED",
      openedAt: row.openedAt ?? now,
      deliveredAt: row.deliveredAt ?? now,
    },
  });
}

export async function getEmailDeliveryForNotification(notificationId: string) {
  const row = await prisma.emailNotificationDelivery.findUnique({ where: { notificationId } });
  if (!row) return null;
  return {
    id: row.id,
    notificationId: row.notificationId,
    userId: row.userId,
    workspaceRef: row.workspaceRef,
    subject: row.subject,
    templateKey: row.templateKey,
    recipientEmail: maskEmailForLog(row.recipientEmail),
    provider: row.provider,
    status: row.status,
    providerMessageId: row.providerMessageId,
    retryCount: row.retryCount,
    lastError: row.lastError,
    queuedAt: row.queuedAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    openedAt: row.openedAt?.toISOString() ?? null,
  };
}

/** 1×1 transparent GIF for open tracking pixel. */
export const OPEN_TRACKING_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);
