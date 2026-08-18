import { isWhatsAppDeliverableType } from "@dmx/contracts/whatsapp-notification-bridge";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { prisma } from "../../db/prisma.js";
import { notificationToDTO } from "../notifications/notifications.service.js";
import { getNotificationPreferences } from "../notification-engine/notification-preferences.store.js";
import { parseMetadata, resolveOperationalShape } from "../notification-engine/notification-engine.mapper.js";
import { issuePasswordlessLinkInternal } from "../passwordless-access/passwordless-access.service.js";
import { getWhatsAppProvider } from "./providers/whatsapp-provider.factory.js";
import { buildWhatsAppTemplateBody, maskPhoneForLog } from "./whatsapp-bridge.templates.js";
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 60_000;
export function computeNextRetryAt(retryCount, now = new Date()) {
    const delayMs = Math.min(BASE_BACKOFF_MS * 2 ** retryCount, 60 * 60_000);
    return new Date(now.getTime() + delayMs);
}
function bridgeEnabled() {
    return env.WHATSAPP_BRIDGE_ENABLED !== false;
}
async function shouldDeliverWhatsApp(userId, centerType) {
    const prefs = await getNotificationPreferences(userId);
    const pref = prefs.types.find((t) => t.type === centerType);
    if (!pref)
        return false;
    return pref.channels.workspace && pref.channels.whatsapp;
}
async function resolveWorkspaceRef(workspaceId, metadataRef) {
    if (metadataRef)
        return metadataRef;
    if (!workspaceId)
        return "Workspace";
    const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { externalRef: true },
    });
    return ws?.externalRef ?? "Workspace";
}
/** Queue + send WhatsApp notification for a Notification Center item (idempotent). */
export async function processWhatsAppBridgeDelivery(notificationId) {
    if (!bridgeEnabled())
        return;
    const existing = await prisma.whatsAppNotificationDelivery.findUnique({
        where: { notificationId },
    });
    if (existing && existing.status !== "FAILED")
        return;
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: { workspace: true, user: true },
    });
    if (!notification?.userId || !notification.user)
        return;
    const metadata = parseMetadata(notification.metadata);
    const shape = resolveOperationalShape(notification.eventType, metadata, notification.type);
    if (!isWhatsAppDeliverableType(shape.centerType))
        return;
    const deliver = await shouldDeliverWhatsApp(notification.userId, shape.centerType);
    if (!deliver)
        return;
    const phone = notification.user.whatsappPhone;
    if (!phone?.trim()) {
        logger.info({ notificationId, userId: notification.userId }, "[WA Bridge] skip — no whatsapp phone");
        return;
    }
    const commType = (metadata.commWorkspaceType ?? notification.workspace?.type);
    const commId = metadata.commWorkspaceId ?? notification.workspaceId;
    if (!commType || !commId) {
        logger.warn({ notificationId }, "[WA Bridge] skip — missing workspace context");
        return;
    }
    const workspaceRef = await resolveWorkspaceRef(notification.workspaceId, metadata.workspaceRef ?? notification.workspace?.externalRef);
    let delivery = existing;
    if (!delivery) {
        try {
            delivery = await prisma.whatsAppNotificationDelivery.create({
                data: {
                    notificationId,
                    userId: notification.userId,
                    workspaceRef,
                    templateKey: shape.centerType.toLowerCase(),
                    recipientPhone: phone,
                    provider: getWhatsAppProvider().id,
                    status: "QUEUED",
                },
            });
        }
        catch {
            return;
        }
    }
    const link = await issuePasswordlessLinkInternal({
        userId: notification.userId,
        workspaceType: commType,
        workspaceId: commId,
        ttl: "ONE_HOUR",
        singleUse: true,
    });
    const template = buildWhatsAppTemplateBody({
        centerType: shape.centerType,
        workspaceRef,
        headline: notification.title,
        detailLine: notification.message,
        counterpartyLabel: shape.centerType === "NEW_SUPPLIER_MESSAGE" ? "Supplier" : undefined,
    });
    const provider = getWhatsAppProvider();
    const result = await provider.sendTemplateMessage({
        toPhone: phone,
        bodyText: template.bodyText,
        buttonLabel: template.buttonLabel,
        buttonUrl: link.accessUrl,
    });
    const now = new Date();
    if (result.providerMessageId || result.demo) {
        await prisma.whatsAppNotificationDelivery.update({
            where: { id: delivery.id },
            data: {
                status: result.demo ? "SENT" : "SENT",
                providerMessageId: result.providerMessageId,
                sentAt: now,
                lastError: null,
                providerResponse: (result.raw ?? {}),
                templateKey: template.templateKey,
            },
        });
        logger.info({
            notificationId,
            deliveryId: delivery.id,
            phone: maskPhoneForLog(phone),
            demo: result.demo,
        }, "[WA Bridge] delivered");
        return;
    }
    const retryCount = delivery.retryCount + 1;
    const failed = retryCount >= MAX_RETRIES;
    await prisma.whatsAppNotificationDelivery.update({
        where: { id: delivery.id },
        data: {
            status: "FAILED",
            retryCount,
            lastError: result.error?.slice(0, 500) ?? "send_failed",
            nextRetryAt: failed ? null : computeNextRetryAt(retryCount, now),
            providerResponse: (result.raw ?? { error: result.error }),
        },
    });
    logger.warn({ notificationId, error: result.error, retryCount }, "[WA Bridge] delivery failed — notification remains in Workspace");
}
export async function retryFailedWhatsAppDeliveries() {
    const now = new Date();
    const pending = await prisma.whatsAppNotificationDelivery.findMany({
        where: {
            status: "FAILED",
            retryCount: { lt: MAX_RETRIES },
            nextRetryAt: { lte: now },
        },
        take: 25,
        orderBy: { nextRetryAt: "asc" },
    });
    for (const row of pending) {
        await processWhatsAppBridgeDelivery(row.notificationId);
    }
    return pending.length;
}
export async function updateDeliveryStatusFromWebhook(providerMessageId, status, raw) {
    const row = await prisma.whatsAppNotificationDelivery.findFirst({
        where: { providerMessageId },
    });
    if (!row)
        return;
    const now = new Date();
    const data = {
        providerResponse: { ...row.providerResponse, lastWebhook: raw ?? {} },
    };
    if (status === "delivered") {
        data.status = "DELIVERED";
        data.deliveredAt = now;
    }
    else if (status === "read") {
        data.status = "READ";
        data.readAt = now;
        data.deliveredAt = row.deliveredAt ?? now;
    }
    else if (status === "failed") {
        data.status = "FAILED";
        data.lastError = "provider_reported_failed";
    }
    else if (status === "sent" && row.status === "QUEUED") {
        data.status = "SENT";
        data.sentAt = now;
    }
    await prisma.whatsAppNotificationDelivery.update({ where: { id: row.id }, data });
}
export async function getDeliveryForNotification(notificationId) {
    const row = await prisma.whatsAppNotificationDelivery.findUnique({ where: { notificationId } });
    if (!row)
        return null;
    return {
        id: row.id,
        notificationId: row.notificationId,
        userId: row.userId,
        workspaceRef: row.workspaceRef,
        templateKey: row.templateKey,
        recipientPhone: maskPhoneForLog(row.recipientPhone),
        provider: row.provider,
        status: row.status,
        providerMessageId: row.providerMessageId,
        retryCount: row.retryCount,
        lastError: row.lastError,
        queuedAt: row.queuedAt.toISOString(),
        sentAt: row.sentAt?.toISOString() ?? null,
        deliveredAt: row.deliveredAt?.toISOString() ?? null,
        readAt: row.readAt?.toISOString() ?? null,
    };
}
/** Hydrate DTO for logging without exposing internal ids in outbound messages. */
export async function loadNotificationDto(notificationId) {
    const row = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: { workspace: true },
    });
    return row ? notificationToDTO(row) : null;
}
//# sourceMappingURL=whatsapp-bridge.service.js.map