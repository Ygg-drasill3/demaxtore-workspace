// =============================================================================
// Notification Center™ — operational awareness contracts
// =============================================================================
import { z } from "zod";
import { CommWorkspaceType } from "./workspace-communication.js";
/** Operational event types surfaced in Notification Center. */
export const OperationalNotificationType = z.enum([
    "NEW_SUPPLIER_MESSAGE",
    "BUYER_MENTIONED",
    "SUPPLIER_MENTIONED",
    "ACTION_REQUIRED",
    "APPROVAL_REQUIRED",
    "QUOTATION_SUBMITTED",
    "QUOTATION_REVISED",
    "SUPPLIER_SELECTED",
    "COMMODITYBID_CLOSED",
    "PURCHASE_ORDER_ISSUED",
    "DOCUMENT_UPLOADED",
    "INSPECTION_SCHEDULED",
    "INSPECTION_COMPLETED",
    "SHIPMENT_BOOKED",
    "ETA_UPDATED",
    "SHIPMENT_DELAYED",
    "SHIPMENT_DELIVERED",
    "WORKSPACE_ASSIGNED",
]);
export const NotificationPriority = z.enum([
    "CRITICAL",
    "HIGH",
    "NORMAL",
    "INFORMATION",
]);
export const NotificationCategory = z.enum([
    "ALL",
    "UNREAD",
    "MESSAGES",
    "APPROVALS",
    "DOCUMENTS",
    "INSPECTION",
    "SHIPMENT",
    "WORKSPACE",
    "SYSTEM",
    "ARCHIVED",
]);
export const NotificationReadStatus = z.enum(["UNREAD", "READ", "ARCHIVED"]);
export const NotificationActionType = z.enum([
    "OPEN_CONVERSATION",
    "OPEN_WORKSPACE",
    "OPEN_DOCUMENT",
    "OPEN_SHIPMENT",
    "OPEN_INSPECTION",
    "OPEN_PURCHASE_ORDER",
    "DISMISS",
    "MARK_READ",
]);
export const NotificationAction = z.object({
    type: NotificationActionType,
    label: z.string(),
    href: z.string().optional(),
});
export const SnoozeOption = z.enum([
    "FIFTEEN_MINUTES",
    "ONE_HOUR",
    "TOMORROW",
    "NEXT_WEEK",
]);
export const SnoozeNotificationBody = z.object({
    option: SnoozeOption,
});
/** Future delivery channels — architecture only (no external delivery in this sprint). */
export const DeliveryChannel = z.enum(["WORKSPACE", "EMAIL", "WHATSAPP", "PUSH"]);
export const NotificationChannelPreference = z.object({
    workspace: z.boolean().default(true),
    email: z.boolean().default(false),
    whatsapp: z.boolean().default(false),
    push: z.boolean().default(false),
});
export const NotificationTypePreference = z.object({
    type: OperationalNotificationType,
    channels: NotificationChannelPreference,
});
export const NotificationPreferences = z.object({
    types: z.array(NotificationTypePreference),
});
export const NotificationCenterDTO = z.object({
    id: z.string().uuid(),
    /** Legacy visual severity (INFO / SUCCESS / WARNING / ERROR). */
    type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]),
    centerType: OperationalNotificationType,
    priority: NotificationPriority,
    category: NotificationCategory.exclude(["ALL", "UNREAD", "ARCHIVED"]),
    titleKey: z.string(),
    title: z.string(),
    body: z.string().nullable(),
    link: z.string().nullable(),
    workspaceId: z.string().uuid().nullable(),
    workspaceType: z.enum(CommWorkspaceType).nullable(),
    workspaceRef: z.string().nullable(),
    status: NotificationReadStatus,
    read: z.boolean(),
    readAt: z.string().datetime().nullable(),
    snoozedUntil: z.string().datetime().nullable(),
    actions: z.array(NotificationAction),
    createdAt: z.string().datetime(),
});
export const ListNotificationCenterQuery = z.object({
    category: NotificationCategory.default("ALL"),
    unreadOnly: z.coerce.boolean().default(false),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
});
export const NotificationCenterListResponse = z.object({
    items: z.array(NotificationCenterDTO),
    unreadCount: z.number().int(),
    nextCursor: z.string().nullable(),
});
