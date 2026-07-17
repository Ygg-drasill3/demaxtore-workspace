import type {
  ConversationContextDto,
  UnifiedConversationDetail,
  UnifiedConversationParticipantDto,
  UnifiedConversationSummary,
  UnifiedMessageDto,
} from "@dmx/contracts/unified-messaging";
import { channelFromColumn } from "./unified-messaging.constants.js";
import type { ConversationWithRelations, MessageRow } from "./unified-messaging.types.js";

export function mapParticipant(row: {
  id: string;
  participantKey: string;
  userId: string | null;
  whatsappContactId: string | null;
  participantType: string;
  participantRole: string;
  companyId: string | null;
  displayName: string | null;
  phoneE164: string | null;
  email: string | null;
  joinedAt: Date;
  lastReadAt: Date | null;
}): UnifiedConversationParticipantDto {
  return {
    id: row.id,
    participantKey: row.participantKey,
    userId: row.userId,
    whatsappContactId: row.whatsappContactId,
    participantType: row.participantType as UnifiedConversationParticipantDto["participantType"],
    participantRole: row.participantRole,
    companyId: row.companyId,
    displayName: row.displayName,
    phoneE164: row.phoneE164,
    email: row.email,
    joinedAt: row.joinedAt.toISOString(),
    lastReadAt: row.lastReadAt?.toISOString() ?? null,
  };
}

export function mapContext(row: {
  id: string;
  contextType: string;
  contextId: string;
  contextReference: string | null;
  metadata: unknown;
  createdAt: Date;
}): ConversationContextDto {
  return {
    id: row.id,
    contextType: row.contextType as ConversationContextDto["contextType"],
    contextId: row.contextId,
    contextReference: row.contextReference,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapConversationSummary(
  row: ConversationWithRelations,
  unreadCount = 0,
): UnifiedConversationSummary {
  const last = row.messages[0];
  return {
    id: row.id,
    subject: row.subject,
    status: row.status as UnifiedConversationSummary["status"],
    priority: row.priority as UnifiedConversationSummary["priority"],
    primaryChannel: channelFromColumn(row.primaryChannel),
    assignedUserId: row.assignedUserId,
    isArchived: row.isArchived,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: last?.body?.slice(0, 120) ?? null,
    unreadCount,
    workspaceType: row.workspaceType,
    workspaceId: row.workspaceId,
    contexts: row.contexts.map(mapContext),
    participants: row.participants.map(mapParticipant),
  };
}

export function mapConversationDetail(
  row: ConversationWithRelations,
  unreadCount = 0,
): UnifiedConversationDetail {
  return {
    ...mapConversationSummary(row, unreadCount),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapMessage(row: MessageRow): UnifiedMessageDto {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderUserId: row.authorUserId,
    direction: row.direction as UnifiedMessageDto["direction"],
    channel: channelFromColumn(row.channelSource),
    audienceScope: row.audienceScope as UnifiedMessageDto["audienceScope"],
    messageType: row.messageType,
    body: row.body,
    status: row.status,
    replyToMessageId: row.parentMessageId,
    externalMessageId: row.externalMessageId,
    whatsappMessageId: row.whatsappMessageId,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
  };
}

export function filterMessagesForUser(
  messages: MessageRow[],
  canReadInternal: boolean,
): MessageRow[] {
  if (canReadInternal) return messages;
  return messages.filter((m) => m.audienceScope === "EXTERNAL");
}
