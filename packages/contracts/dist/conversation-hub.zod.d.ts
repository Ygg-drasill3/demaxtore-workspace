import { z } from "zod";
export declare const CreateTimelineItemSchema: z.ZodObject<{
    body: z.ZodString;
    itemType: z.ZodEnum<["MESSAGE", "DOCUMENT", "QUESTION", "ANSWER", "DECISION", "APPROVAL", "ACTION_REQUIRED", "STATUS_UPDATE", "INTERNAL_NOTE"]>;
    visibility: z.ZodOptional<z.ZodEnum<["ALL_PARTICIPANTS", "BUYER_ONLY", "SUPPLIER_ONLY", "ADMIN_ONLY", "BUYER_ADMIN", "SUPPLIER_ADMIN"]>>;
    parentMessageId: z.ZodOptional<z.ZodString>;
    attachmentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    mentionedUserIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    clientMessageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    body: string;
    itemType: "MESSAGE" | "DOCUMENT" | "QUESTION" | "ANSWER" | "DECISION" | "APPROVAL" | "ACTION_REQUIRED" | "STATUS_UPDATE" | "INTERNAL_NOTE";
    visibility?: "ALL_PARTICIPANTS" | "BUYER_ONLY" | "SUPPLIER_ONLY" | "ADMIN_ONLY" | "BUYER_ADMIN" | "SUPPLIER_ADMIN" | undefined;
    parentMessageId?: string | undefined;
    attachmentIds?: string[] | undefined;
    mentionedUserIds?: string[] | undefined;
    clientMessageId?: string | undefined;
}, {
    body: string;
    itemType: "MESSAGE" | "DOCUMENT" | "QUESTION" | "ANSWER" | "DECISION" | "APPROVAL" | "ACTION_REQUIRED" | "STATUS_UPDATE" | "INTERNAL_NOTE";
    visibility?: "ALL_PARTICIPANTS" | "BUYER_ONLY" | "SUPPLIER_ONLY" | "ADMIN_ONLY" | "BUYER_ADMIN" | "SUPPLIER_ADMIN" | undefined;
    parentMessageId?: string | undefined;
    attachmentIds?: string[] | undefined;
    mentionedUserIds?: string[] | undefined;
    clientMessageId?: string | undefined;
}>;
export declare const MarkTimelineDeliveredSchema: z.ZodObject<{
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    messageId: string;
}, {
    messageId: string;
}>;
export declare const MarkTimelineReadSchema: z.ZodObject<{
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    messageId: string;
}, {
    messageId: string;
}>;
export declare const ConversationSearchQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    participantUserId: z.ZodOptional<z.ZodString>;
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
    fileName: z.ZodOptional<z.ZodString>;
    itemType: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    q?: string | undefined;
    limit?: number | undefined;
    fileName?: string | undefined;
    offset?: number | undefined;
    itemType?: string | undefined;
    participantUserId?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}, {
    q?: string | undefined;
    limit?: number | undefined;
    fileName?: string | undefined;
    offset?: number | undefined;
    itemType?: string | undefined;
    participantUserId?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}>;
export type CreateTimelineItemInput = z.infer<typeof CreateTimelineItemSchema>;
export declare const PinTimelineItemSchema: z.ZodObject<{
    pinned: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    pinned: boolean;
}, {
    pinned: boolean;
}>;
export type PinTimelineItemInput = z.infer<typeof PinTimelineItemSchema>;
