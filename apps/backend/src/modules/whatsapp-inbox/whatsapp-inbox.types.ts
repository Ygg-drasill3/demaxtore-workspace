export type WhatsAppMessageDirection = "INBOUND" | "OUTBOUND";

export type WhatsAppMessageType =
  | "text"
  | "image"
  | "document"
  | "audio"
  | "video"
  | "location"
  | "contacts"
  | "interactive"
  | "button"
  | "reaction"
  | "unsupported"
  | "template"
  | "sticker";

export type WhatsAppDeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "received";

export const WHATSAPP_INBOX_ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "OPS_MANAGER",
]);

export const WHATSAPP_INBOX_STAFF_ROLES = new Set([
  ...WHATSAPP_INBOX_ADMIN_ROLES,
  "SALES_CONTROL",
]);

export function canAccessWhatsAppInbox(role: string): boolean {
  return WHATSAPP_INBOX_STAFF_ROLES.has(role);
}

export function canAccessAllWhatsAppConversations(role: string): boolean {
  return WHATSAPP_INBOX_ADMIN_ROLES.has(role);
}

export const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ParsedInboundMessage = {
  waId: string;
  profileName: string | null;
  metaMessageId: string;
  timestamp: Date;
  type: WhatsAppMessageType;
  body: string | null;
  replyToMetaId: string | null;
  mediaId: string | null;
  mimeType: string | null;
  filename: string | null;
  caption: string | null;
  phoneNumberId: string | null;
  raw: Record<string, unknown>;
};

export type ParsedStatusUpdate = {
  metaMessageId: string;
  status: WhatsAppDeliveryStatus;
  timestamp: Date;
  recipientId: string | null;
  errorCode: string | null;
  errorTitle: string | null;
  errorMessage: string | null;
  raw: Record<string, unknown>;
};

export type SendMessageInput = {
  to: string;
  type: "text" | "template" | "image" | "document";
  text?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: Record<string, unknown>[];
  mediaId?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  replyToMetaId?: string;
};
