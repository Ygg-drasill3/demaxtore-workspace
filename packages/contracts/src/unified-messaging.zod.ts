import { z } from "zod";
import {
  ConversationContextType,
  ConversationPriority,
  ConversationStatus,
  MessageAudienceScope,
  MessagingChannel,
  ParticipantType,
} from "./unified-messaging.js";

export const ConversationListFiltersSchema = z.object({
  channel: z.enum(MessagingChannel).optional(),
  contextType: z.enum(ConversationContextType).optional(),
  contextId: z.string().uuid().optional(),
  participantId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  unread: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().optional(),
  status: z.enum(ConversationStatus).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const CreateConversationRequestSchema = z.object({
  subject: z.string().trim().min(1).max(500).optional(),
  primaryChannel: z.enum(MessagingChannel).optional(),
  priority: z.enum(ConversationPriority).optional(),
  workspaceType: z.string().trim().min(1).max(64).optional(),
  workspaceId: z.string().uuid().optional(),
  contexts: z
    .array(
      z.object({
        contextType: z.enum(ConversationContextType),
        contextId: z.string().uuid(),
        contextReference: z.string().trim().max(200).optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
  participants: z
    .array(
      z.object({
        userId: z.string().uuid().optional(),
        whatsappContactId: z.string().uuid().optional(),
        participantType: z.enum(ParticipantType),
        participantRole: z.string().trim().max(64).optional(),
        displayName: z.string().trim().max(200).optional(),
        phoneE164: z.string().trim().max(32).optional(),
        email: z.string().email().optional(),
        companyId: z.string().uuid().optional(),
      }),
    )
    .optional(),
});

export const CreateMessageRequestSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  messageType: z.string().trim().max(64).optional(),
  channel: z.enum(MessagingChannel).optional(),
  replyToMessageId: z.string().uuid().optional(),
  clientMessageId: z.string().uuid().optional(),
});

export const CreateInternalNoteRequestSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  replyToMessageId: z.string().uuid().optional(),
});

export const AssignConversationRequestSchema = z.object({
  assignedUserId: z.string().uuid(),
});

export const AddContextRequestSchema = z.object({
  contextType: z.enum(ConversationContextType),
  contextId: z.string().uuid(),
  contextReference: z.string().trim().max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdatePriorityRequestSchema = z.object({
  priority: z.enum(ConversationPriority),
});

export const UpdateStatusRequestSchema = z.object({
  status: z.enum(ConversationStatus),
});

export const AddParticipantRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  whatsappContactId: z.string().uuid().optional(),
  participantType: z.enum(ParticipantType),
  participantRole: z.string().trim().max(64).optional(),
  displayName: z.string().trim().max(200).optional(),
  phoneE164: z.string().trim().max(32).optional(),
  email: z.string().email().optional(),
  companyId: z.string().uuid().optional(),
});

export const MessageListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
