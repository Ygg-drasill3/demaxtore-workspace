export type ChatContextType = "RFQ" | "ORDER_FREIGHT";

export type ConversationStatus = "active" | "archived" | "closed";

export type SenderType = "buyer" | "supplier" | "forwarder" | "admin" | "system";

export type MessageSource = "platform" | "whatsapp" | "system";

export type MessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "received";

export const ADMIN_CHAT_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
]);

export function isAdminChatRole(role: string): boolean {
  return ADMIN_CHAT_ROLES.has(role);
}
