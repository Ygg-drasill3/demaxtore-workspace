import { z } from "zod";
export declare const CommWorkspaceTypeParam: z.ZodEnum<["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "PO", "FREIGHTIQ"]>;
export declare const CreateMessagePayload: z.ZodObject<{
    body: z.ZodString;
    messageType: z.ZodDefault<z.ZodEnum<["MESSAGE", "DOCUMENT", "QUESTION", "ANSWER", "DECISION", "APPROVAL", "ACTION_REQUIRED", "SYSTEM_EVENT", "STATUS_UPDATE", "INTERNAL_NOTE"]>>;
    visibility: z.ZodDefault<z.ZodEnum<["ALL_PARTICIPANTS", "BUYER_ONLY", "SUPPLIER_ONLY", "ADMIN_ONLY", "BUYER_ADMIN", "SUPPLIER_ADMIN"]>>;
    parentMessageId: z.ZodOptional<z.ZodString>;
    mentionedUserIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    attachmentIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Per-send client id for idempotent message creation (scoped to sender + conversation). */
    clientMessageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    body: string;
    visibility: "ALL_PARTICIPANTS" | "BUYER_ONLY" | "SUPPLIER_ONLY" | "ADMIN_ONLY" | "BUYER_ADMIN" | "SUPPLIER_ADMIN";
    messageType: "MESSAGE" | "DOCUMENT" | "QUESTION" | "ANSWER" | "DECISION" | "APPROVAL" | "ACTION_REQUIRED" | "SYSTEM_EVENT" | "STATUS_UPDATE" | "INTERNAL_NOTE";
    parentMessageId?: string | undefined;
    attachmentIds?: string[] | undefined;
    mentionedUserIds?: string[] | undefined;
    clientMessageId?: string | undefined;
}, {
    body: string;
    visibility?: "ALL_PARTICIPANTS" | "BUYER_ONLY" | "SUPPLIER_ONLY" | "ADMIN_ONLY" | "BUYER_ADMIN" | "SUPPLIER_ADMIN" | undefined;
    parentMessageId?: string | undefined;
    attachmentIds?: string[] | undefined;
    mentionedUserIds?: string[] | undefined;
    clientMessageId?: string | undefined;
    messageType?: "MESSAGE" | "DOCUMENT" | "QUESTION" | "ANSWER" | "DECISION" | "APPROVAL" | "ACTION_REQUIRED" | "SYSTEM_EVENT" | "STATUS_UPDATE" | "INTERNAL_NOTE" | undefined;
}>;
export type CreateMessagePayload = z.infer<typeof CreateMessagePayload>;
export declare const EditMessagePayload: z.ZodObject<{
    messageId: z.ZodString;
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    body: string;
    messageId: string;
}, {
    body: string;
    messageId: string;
}>;
export type EditMessagePayload = z.infer<typeof EditMessagePayload>;
export declare const DeleteMessagePayload: z.ZodObject<{
    messageId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    messageId: string;
    reason?: string | undefined;
}, {
    messageId: string;
    reason?: string | undefined;
}>;
export type DeleteMessagePayload = z.infer<typeof DeleteMessagePayload>;
export declare const MarkReadPayload: z.ZodObject<{
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    messageId: string;
}, {
    messageId: string;
}>;
export type MarkReadPayload = z.infer<typeof MarkReadPayload>;
export declare const MessageSearchQuerySchema: z.ZodObject<{
    authorUserId: z.ZodOptional<z.ZodString>;
    messageType: z.ZodOptional<z.ZodEnum<["MESSAGE", "DOCUMENT", "QUESTION", "ANSWER", "DECISION", "APPROVAL", "ACTION_REQUIRED", "SYSTEM_EVENT", "STATUS_UPDATE", "INTERNAL_NOTE"]>>;
    visibility: z.ZodOptional<z.ZodEnum<["ALL_PARTICIPANTS", "BUYER_ONLY", "SUPPLIER_ONLY", "ADMIN_ONLY", "BUYER_ADMIN", "SUPPLIER_ADMIN"]>>;
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
    hasAttachment: z.ZodOptional<z.ZodBoolean>;
    mentionedMe: z.ZodOptional<z.ZodBoolean>;
    q: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    q?: string | undefined;
    visibility?: "ALL_PARTICIPANTS" | "BUYER_ONLY" | "SUPPLIER_ONLY" | "ADMIN_ONLY" | "BUYER_ADMIN" | "SUPPLIER_ADMIN" | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    messageType?: "MESSAGE" | "DOCUMENT" | "QUESTION" | "ANSWER" | "DECISION" | "APPROVAL" | "ACTION_REQUIRED" | "SYSTEM_EVENT" | "STATUS_UPDATE" | "INTERNAL_NOTE" | undefined;
    authorUserId?: string | undefined;
    hasAttachment?: boolean | undefined;
    mentionedMe?: boolean | undefined;
}, {
    q?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    visibility?: "ALL_PARTICIPANTS" | "BUYER_ONLY" | "SUPPLIER_ONLY" | "ADMIN_ONLY" | "BUYER_ADMIN" | "SUPPLIER_ADMIN" | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    messageType?: "MESSAGE" | "DOCUMENT" | "QUESTION" | "ANSWER" | "DECISION" | "APPROVAL" | "ACTION_REQUIRED" | "SYSTEM_EVENT" | "STATUS_UPDATE" | "INTERNAL_NOTE" | undefined;
    authorUserId?: string | undefined;
    hasAttachment?: boolean | undefined;
    mentionedMe?: boolean | undefined;
}>;
export type MessageSearchQuerySchema = z.infer<typeof MessageSearchQuerySchema>;
export declare const CommunicationActionParam: z.ZodEnum<["create_message", "edit_message", "delete_message", "mark_read"]>;
