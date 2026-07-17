import type {
  MessageAudienceScope,
  MessageDirection,
  MessagingChannel,
} from "@dmx/contracts/unified-messaging";

/** Application channel field maps to existing `channelSource` column. */
export const CHANNEL_COLUMN = "channelSource" as const;

export const ADMIN_MESSAGING_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "OPS_MANAGER",
  "SALES_CONTROL",
] as const;

export const SALES_MANAGER_ROLES = ["SALES_CONTROL", "ADMIN", "SUPER_ADMIN"] as const;

export const INTERNAL_MESSAGE_TYPES = new Set([
  "INTERNAL_NOTE",
  "SYSTEM_EVENT",
  "STATUS_UPDATE",
]);

export function mapLegacyMessageTypeToAudience(
  messageType: string,
  visibility: string,
): MessageAudienceScope {
  if (INTERNAL_MESSAGE_TYPES.has(messageType) || visibility === "ADMIN_ONLY") {
    return "INTERNAL";
  }
  if (messageType === "SYSTEM_EVENT" || messageType === "STATUS_UPDATE") {
    return "SYSTEM";
  }
  return "EXTERNAL";
}

export function channelFromColumn(value: string): MessagingChannel {
  if (value === "WHATSAPP") return "WHATSAPP";
  if (value === "SYSTEM") return "SYSTEM";
  return "WORKSPACE";
}

export function channelToColumn(channel: MessagingChannel): string {
  return channel;
}

export function defaultDirectionForAudience(audience: MessageAudienceScope): MessageDirection {
  if (audience === "INTERNAL") return "INTERNAL";
  return "OUTBOUND";
}

export function participantKeyForUser(userId: string): string {
  return `user:${userId}`;
}

export function participantKeyForWhatsApp(contactId: string): string {
  return `wa:${contactId}`;
}
