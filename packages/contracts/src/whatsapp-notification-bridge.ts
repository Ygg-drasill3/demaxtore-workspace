// =============================================================================
// WhatsApp Notification Bridge™ contracts
// =============================================================================
import { z } from "zod";
import { OperationalNotificationType } from "./notification-center.js";

export const WhatsAppDeliveryStatus = z.enum([
  "QUEUED",
  "SENT",
  "DELIVERED",
  "FAILED",
  "READ",
]);
export type WhatsAppDeliveryStatus = z.infer<typeof WhatsAppDeliveryStatus>;

export const WhatsAppProviderId = z.enum([
  "meta_cloud",
  "twilio",
  "dialog360",
]);
export type WhatsAppProviderId = z.infer<typeof WhatsAppProviderId>;

/** Operational types eligible for WhatsApp delivery. */
export const WhatsAppDeliverableNotificationType = z.enum([
  "NEW_SUPPLIER_MESSAGE",
  "BUYER_MENTIONED",
  "SUPPLIER_MENTIONED",
  "APPROVAL_REQUIRED",
  "ACTION_REQUIRED",
  "QUOTATION_SUBMITTED",
  "QUOTATION_REVISED",
  "PURCHASE_ORDER_ISSUED",
  "DOCUMENT_UPLOADED",
  "INSPECTION_SCHEDULED",
  "INSPECTION_COMPLETED",
  "SHIPMENT_BOOKED",
  "ETA_UPDATED",
  "SHIPMENT_DELAYED",
  "SHIPMENT_DELIVERED",
]);
export type WhatsAppDeliverableNotificationType = z.infer<typeof WhatsAppDeliverableNotificationType>;

export const WhatsAppDeliveryDTO = z.object({
  id:                z.string().uuid(),
  notificationId:    z.string().uuid(),
  userId:            z.string().uuid(),
  workspaceRef:      z.string().nullable(),
  templateKey:       z.string(),
  recipientPhone:      z.string().nullable(),
  provider:          WhatsAppProviderId,
  status:            WhatsAppDeliveryStatus,
  providerMessageId: z.string().nullable(),
  retryCount:        z.number().int(),
  lastError:         z.string().nullable(),
  queuedAt:          z.string().datetime(),
  sentAt:            z.string().datetime().nullable(),
  deliveredAt:       z.string().datetime().nullable(),
  readAt:            z.string().datetime().nullable(),
});
export type WhatsAppDeliveryDTO = z.infer<typeof WhatsAppDeliveryDTO>;

export function isWhatsAppDeliverableType(
  type: OperationalNotificationType | string | undefined,
): type is WhatsAppDeliverableNotificationType {
  if (!type) return false;
  return (WhatsAppDeliverableNotificationType.options as readonly string[]).includes(type);
}
