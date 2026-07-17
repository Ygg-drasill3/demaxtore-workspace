import type { Prisma } from "@prisma/client";
import type {
  AddContextRequest,
  AssignConversationRequest,
  ConversationListFilters,
  CreateConversationRequest,
  CreateInternalNoteRequest,
  CreateMessageRequest,
} from "@dmx/contracts/unified-messaging";
import type { Role } from "@prisma/client";

export type AuthUser = { id: string; email: string; role: Role | "SYSTEM" };

export type ConversationWithRelations = Prisma.WorkspaceConversationGetPayload<{
  include: {
    participants: true;
    contexts: true;
    messages: { take: 1; orderBy: { createdAt: "desc" } };
  };
}>;

export type MessageRow = Prisma.WorkspaceMessageGetPayload<Record<string, never>>;

export interface CreateMessageInput extends CreateMessageRequest {
  audienceScope: "EXTERNAL" | "INTERNAL" | "SYSTEM";
  messageType: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  channel: "WORKSPACE" | "WHATSAPP" | "SYSTEM";
}

export interface CreateInternalNoteInput extends CreateInternalNoteRequest {
  audienceScope: "INTERNAL";
  messageType: "INTERNAL_NOTE";
  direction: "INTERNAL";
  channel: "WORKSPACE";
}

export type ListConversationsInput = ConversationListFilters;
export type CreateConversationInput = CreateConversationRequest;
export type AssignConversationInput = AssignConversationRequest;
export type AddContextInput = AddContextRequest;

export interface ChannelSendInput {
  conversationId: string;
  messageId: string;
  body: string;
  phoneE164?: string | null;
}

export interface ChannelSendResult {
  externalMessageId: string | null;
  whatsappMessageId: string | null;
  sentAt: Date | null;
}

export interface MessagingChannelAdapter {
  channel: "WORKSPACE" | "WHATSAPP";
  canSend(input: ChannelSendInput & { audienceScope: string }): Promise<boolean>;
  send(input: ChannelSendInput): Promise<ChannelSendResult>;
}
