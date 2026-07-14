// =============================================================================
// Email Notification Bridge™ contracts
// =============================================================================
import { z } from "zod";
import { OperationalNotificationType } from "./notification-center.js";

export const EmailDeliveryStatus = z.enum([
  "QUEUED",
  "SENT",
  "DELIVERED",
  "OPENED",
  "FAILED",
]);
export type EmailDeliveryStatus = z.infer<typeof EmailDeliveryStatus>;

export const EmailBridgeProviderId = z.enum([
  "console",
  "smtp",
  "resend",
]);
export type EmailBridgeProviderId = z.infer<typeof EmailBridgeProviderId>;

/** Planned providers — not yet implemented at runtime. */
export const EmailBridgeProviderIdPlanned = z.enum([
  "ses",
  "sendgrid",
  "mailgun",
  "microsoft_graph",
  "gmail_api",
]);

/** Operational types eligible for Email bridge delivery. */
export const EmailDeliverableNotificationType = z.enum([
  "NEW_SUPPLIER_MESSAGE",
  "BUYER_MENTIONED",
  "SUPPLIER_MENTIONED",
  "APPROVAL_REQUIRED",
  "ACTION_REQUIRED",
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
export type EmailDeliverableNotificationType = z.infer<typeof EmailDeliverableNotificationType>;

export function isEmailDeliverableType(
  type: OperationalNotificationType | string | undefined,
): type is EmailDeliverableNotificationType {
  if (!type) return false;
  return (EmailDeliverableNotificationType.options as readonly string[]).includes(type);
}
