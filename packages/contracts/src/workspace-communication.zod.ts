import { z } from "zod";
import {
  CommWorkspaceType,
  CommunicationAction,
  MessageType,
  MessageVisibility,
} from "./workspace-communication";

export const CommWorkspaceTypeParam = z.enum(CommWorkspaceType);

export const CreateMessagePayload = z.object({
  body: z.string().min(1).max(8000),
  messageType: z.enum(MessageType).default("MESSAGE"),
  visibility: z.enum(MessageVisibility).default("ALL_PARTICIPANTS"),
  parentMessageId: z.string().uuid().optional(),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
  attachmentIds: z.array(z.string().uuid()).optional(),
  /** Per-send client id for idempotent message creation (scoped to sender + conversation). */
  clientMessageId: z.string().uuid().optional(),
});
export type CreateMessagePayload = z.infer<typeof CreateMessagePayload>;

export const EditMessagePayload = z.object({
  messageId: z.string().uuid(),
  body: z.string().min(1).max(8000),
});
export type EditMessagePayload = z.infer<typeof EditMessagePayload>;

export const DeleteMessagePayload = z.object({
  messageId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
export type DeleteMessagePayload = z.infer<typeof DeleteMessagePayload>;

export const MarkReadPayload = z.object({
  messageId: z.string().uuid(),
});
export type MarkReadPayload = z.infer<typeof MarkReadPayload>;

export const MessageSearchQuerySchema = z.object({
  authorUserId: z.string().uuid().optional(),
  messageType: z.enum(MessageType).optional(),
  visibility: z.enum(MessageVisibility).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  hasAttachment: z.coerce.boolean().optional(),
  mentionedMe: z.coerce.boolean().optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type MessageSearchQuerySchema = z.infer<typeof MessageSearchQuerySchema>;

export const CommunicationActionParam = z.enum(CommunicationAction);
