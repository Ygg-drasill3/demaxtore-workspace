import { z } from "zod";
import { OperationalNotificationType } from "./notification-center.js";
export declare const EmailDeliveryStatus: z.ZodEnum<["QUEUED", "SENT", "DELIVERED", "OPENED", "FAILED"]>;
export type EmailDeliveryStatus = z.infer<typeof EmailDeliveryStatus>;
export declare const EmailBridgeProviderId: z.ZodEnum<["smtp", "ses", "sendgrid", "mailgun", "microsoft_graph", "gmail_api", "console", "resend"]>;
export type EmailBridgeProviderId = z.infer<typeof EmailBridgeProviderId>;
/** Operational types eligible for Email bridge delivery. */
export declare const EmailDeliverableNotificationType: z.ZodEnum<["NEW_SUPPLIER_MESSAGE", "BUYER_MENTIONED", "SUPPLIER_MENTIONED", "APPROVAL_REQUIRED", "ACTION_REQUIRED", "QUOTATION_SUBMITTED", "QUOTATION_REVISED", "SUPPLIER_SELECTED", "COMMODITYBID_CLOSED", "PURCHASE_ORDER_ISSUED", "DOCUMENT_UPLOADED", "INSPECTION_SCHEDULED", "INSPECTION_COMPLETED", "SHIPMENT_BOOKED", "ETA_UPDATED", "SHIPMENT_DELAYED", "SHIPMENT_DELIVERED", "WORKSPACE_ASSIGNED"]>;
export type EmailDeliverableNotificationType = z.infer<typeof EmailDeliverableNotificationType>;
export declare function isEmailDeliverableType(type: OperationalNotificationType | string | undefined): type is EmailDeliverableNotificationType;
