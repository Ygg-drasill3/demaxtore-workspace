// =============================================================================
// Email Notification Bridge™ contracts
// =============================================================================
import { z } from "zod";
export const EmailDeliveryStatus = z.enum([
    "QUEUED",
    "SENT",
    "DELIVERED",
    "OPENED",
    "FAILED",
]);
export const EmailBridgeProviderId = z.enum([
    "smtp",
    "ses",
    "sendgrid",
    "mailgun",
    "microsoft_graph",
    "gmail_api",
    // Two of the three values EMAIL_BRIDGE_PROVIDER actually accepts, and `console` is its
    // default — both providers exist and were simply missing from this union.
    "console",
    "resend",
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
export function isEmailDeliverableType(type) {
    if (!type)
        return false;
    return EmailDeliverableNotificationType.options.includes(type);
}
