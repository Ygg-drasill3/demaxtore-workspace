export declare const MessagingChannel: readonly ["WORKSPACE", "WHATSAPP", "SYSTEM"];
export type MessagingChannel = (typeof MessagingChannel)[number];
export declare const MessageDirection: readonly ["INBOUND", "OUTBOUND", "INTERNAL"];
export type MessageDirection = (typeof MessageDirection)[number];
export declare const MessageAudienceScope: readonly ["EXTERNAL", "INTERNAL", "SYSTEM"];
export type MessageAudienceScope = (typeof MessageAudienceScope)[number];
export declare const ConversationContextType: readonly ["GENERAL", "RFQ", "QUOTATION", "PURCHASE_ORDER", "ORDER", "SHIPMENT", "FREIGHT", "FREIGHT_REQUEST", "FREIGHTIQ", "COMMODITY_BID", "SMART_CONTAINER", "BULK_CONTAINER", "FULL_CONTAINER", "INSPECTION", "DOCUMENT", "SUPPORT", "WHATSAPP"];
export type ConversationContextType = (typeof ConversationContextType)[number];
export declare const ConversationStatus: readonly ["ACTIVE", "ARCHIVED", "CLOSED"];
export type ConversationStatus = (typeof ConversationStatus)[number];
export declare const ConversationPriority: readonly ["LOW", "NORMAL", "HIGH", "URGENT"];
export type ConversationPriority = (typeof ConversationPriority)[number];
export declare const ParticipantType: readonly ["USER", "WHATSAPP_CONTACT", "SYSTEM"];
export type ParticipantType = (typeof ParticipantType)[number];
export interface UnifiedConversationParticipantDto {
    id: string;
    participantKey: string;
    userId: string | null;
    whatsappContactId: string | null;
    participantType: ParticipantType;
    participantRole: string;
    companyId: string | null;
    displayName: string | null;
    phoneE164: string | null;
    email: string | null;
    joinedAt: string;
    lastReadAt: string | null;
}
export interface ConversationContextDto {
    id: string;
    contextType: ConversationContextType;
    contextId: string;
    contextReference: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
}
export interface UnifiedConversationSummary {
    id: string;
    subject: string | null;
    status: ConversationStatus;
    priority: ConversationPriority;
    primaryChannel: MessagingChannel;
    assignedUserId: string | null;
    isArchived: boolean;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    unreadCount: number;
    workspaceType: string | null;
    workspaceId: string | null;
    contexts: ConversationContextDto[];
    participants: UnifiedConversationParticipantDto[];
}
export interface UnifiedConversationDetail extends UnifiedConversationSummary {
    metadata: Record<string, unknown>;
    createdAt: string;
}
export interface UnifiedMessageDto {
    id: string;
    conversationId: string;
    senderUserId: string | null;
    direction: MessageDirection;
    channel: MessagingChannel;
    audienceScope: MessageAudienceScope;
    messageType: string;
    body: string;
    status: string;
    replyToMessageId: string | null;
    externalMessageId: string | null;
    whatsappMessageId: string | null;
    createdAt: string;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
    failedAt: string | null;
    /** Backed by `WorkspaceMessage.failureReason`; already serialized to clients. */
    failureReason: string | null;
}
export interface CreateConversationRequest {
    subject?: string;
    primaryChannel?: MessagingChannel;
    priority?: ConversationPriority;
    workspaceType?: string;
    workspaceId?: string;
    contexts?: Array<{
        contextType: ConversationContextType;
        contextId: string;
        contextReference?: string;
        metadata?: Record<string, unknown>;
    }>;
    participants?: Array<{
        userId?: string;
        whatsappContactId?: string;
        participantType: ParticipantType;
        participantRole?: string;
        displayName?: string;
        phoneE164?: string;
        email?: string;
        companyId?: string;
    }>;
}
export interface CreateMessageRequest {
    body: string;
    messageType?: string;
    channel?: MessagingChannel;
    replyToMessageId?: string;
    clientMessageId?: string;
}
export interface CreateInternalNoteRequest {
    body: string;
    replyToMessageId?: string;
}
export interface ConversationListFilters {
    channel?: MessagingChannel;
    contextType?: ConversationContextType;
    contextId?: string;
    participantId?: string;
    companyId?: string;
    assignedUserId?: string;
    unread?: boolean;
    archived?: boolean;
    status?: ConversationStatus;
    search?: string;
    before?: string;
    after?: string;
    cursor?: string;
    limit?: number;
}
export interface ConversationCursorPage<T> {
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
}
export interface AssignConversationRequest {
    assignedUserId: string;
}
export interface AddContextRequest {
    contextType: ConversationContextType;
    contextId: string;
    contextReference?: string;
    metadata?: Record<string, unknown>;
}
