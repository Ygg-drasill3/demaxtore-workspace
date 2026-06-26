// =============================================================================
// @dmx/contracts — Notification contracts
// =============================================================================
import { z } from "zod";

export const NotificationType = z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]);
export type NotificationType = z.infer<typeof NotificationType>;

export const NotificationDTO = z.object({
  id:           z.string().uuid(),
  type:         NotificationType,
  /** i18n key from FSM NotifySpec.titleKey (e.g. "rfq.submitted.admin"). */
  titleKey:     z.string(),
  /** Hydrated title for current locale — computed server-side. */
  title:        z.string(),
  body:         z.string().nullable(),
  /** Workspace deep-link (e.g. "/workspace/rfq/<id>"). */
  link:         z.string().nullable(),
  workspaceId:  z.string().uuid().nullable(),
  workspaceType: z.enum(["RFQ", "COMMODITYBID", "ORDER"]).nullable(),
  read:         z.boolean(),
  readAt:       z.string().datetime().nullable(),
  createdAt:    z.string().datetime(),
});
export type NotificationDTO = z.infer<typeof NotificationDTO>;

export const ListNotificationsQuery = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  cursor:     z.string().optional(),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});
export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuery>;

export const NotificationListResponse = z.object({
  items:      z.array(NotificationDTO),
  unreadCount: z.number().int(),
  nextCursor: z.string().nullable(),
});
export type NotificationListResponse = z.infer<typeof NotificationListResponse>;
