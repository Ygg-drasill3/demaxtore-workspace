export declare const CommWorkspaceType: readonly ["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "PO", "FREIGHTIQ"];
export type CommWorkspaceType = (typeof CommWorkspaceType)[number];
export declare const MessageVisibility: readonly ["ALL_PARTICIPANTS", "BUYER_ONLY", "SUPPLIER_ONLY", "ADMIN_ONLY", "BUYER_ADMIN", "SUPPLIER_ADMIN"];
export type MessageVisibility = (typeof MessageVisibility)[number];
export declare const MessageType: readonly ["MESSAGE", "DOCUMENT", "QUESTION", "ANSWER", "DECISION", "APPROVAL", "ACTION_REQUIRED", "SYSTEM_EVENT", "STATUS_UPDATE", "INTERNAL_NOTE"];
export type MessageType = (typeof MessageType)[number];
export declare const MessageStatus: readonly ["ACTIVE", "EDITED", "DELETED"];
export type MessageStatus = (typeof MessageStatus)[number];
export declare const CommunicationAction: readonly ["create_message", "edit_message", "delete_message", "mark_read"];
export type CommunicationAction = (typeof CommunicationAction)[number];
/** Timeline-worthy message types (MESSAGE excluded). */
export declare const TIMELINE_MESSAGE_TYPES: MessageType[];
export interface WorkspaceParticipant {
    userId: string;
    displayName: string;
    role: "BUYER" | "SUPPLIER" | "ADMIN";
    participantRole?: string;
}
export interface Mention {
    userId: string;
    displayName: string;
}
export interface ReadReceipt {
    userId: string;
    displayName: string;
    readAt: string;
}
export interface MessageAttachment {
    id: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    uploadedAt: string;
}
export interface WorkspaceMessage {
    id: string;
    conversationId: string;
    authorUserId: string | null;
    authorName: string;
    authorRole: string;
    messageType: MessageType;
    visibility: MessageVisibility;
    body: string;
    status: MessageStatus;
    parentMessageId: string | null;
    mentions: Mention[];
    attachments: MessageAttachment[];
    readReceipts: ReadReceipt[];
    editedAt: string | null;
    createdAt: string;
    /** True when current viewer has read this message. */
    readByMe: boolean;
}
export interface WorkspaceConversation {
    id: string;
    workspaceType: CommWorkspaceType;
    workspaceId: string;
    auditWorkspaceId: string;
    messages: WorkspaceMessage[];
    unreadCount: number;
    mentionCount: number;
}
export interface MessageSearchQuery {
    authorUserId?: string;
    messageType?: MessageType;
    visibility?: MessageVisibility;
    dateFrom?: string;
    dateTo?: string;
    hasAttachment?: boolean;
    mentionedMe?: boolean;
    q?: string;
    limit?: number;
    offset?: number;
}
export interface MessageSearchResult {
    items: WorkspaceMessage[];
    total: number;
}
