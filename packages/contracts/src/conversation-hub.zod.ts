import { z } from "zod";
import { TimelineItemType } from "./conversation-hub.js";

export const CreateTimelineItemSchema = z.object({
  body: z.string().min(1).max(50_000),
  itemType: z.enum([
    "MESSAGE",
    "DOCUMENT",
    "QUESTION",
    "ANSWER",
    "DECISION",
    "APPROVAL",
    "ACTION_REQUIRED",
    "STATUS_UPDATE",
    "INTERNAL_NOTE",
  ]),
  visibility: z.enum([
    "ALL_PARTICIPANTS",
    "BUYER_ONLY",
    "SUPPLIER_ONLY",
    "ADMIN_ONLY",
    "BUYER_ADMIN",
    "SUPPLIER_ADMIN",
  ]).optional(),
  parentMessageId: z.string().uuid().optional(),
  attachmentIds: z.array(z.string().uuid()).optional(),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
  clientMessageId: z.string().uuid().optional(),
});

export const MarkTimelineDeliveredSchema = z.object({
  messageId: z.string().uuid(),
});

export const MarkTimelineReadSchema = z.object({
  messageId: z.string().uuid(),
});

export const ConversationSearchQuerySchema = z.object({
  q: z.string().optional(),
  participantUserId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  fileName: z.string().optional(),
  itemType: z.enum(TimelineItemType as unknown as [string, ...string[]]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type CreateTimelineItemInput = z.infer<typeof CreateTimelineItemSchema>;

export const PinTimelineItemSchema = z.object({
  pinned: z.boolean(),
});

export type PinTimelineItemInput = z.infer<typeof PinTimelineItemSchema>;
