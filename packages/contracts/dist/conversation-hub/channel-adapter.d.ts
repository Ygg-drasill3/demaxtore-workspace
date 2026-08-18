import type { ConversationChannelType } from "../conversation-hub.js";
export interface SendChannelMessageInput {
    conversationId: string;
    messageId: string;
    publicId: string;
    body: string;
    recipientPhone?: string | null;
    recipientEmail?: string | null;
    replyToExternalId?: string | null;
    metadata?: Record<string, unknown>;
}
export interface ChannelDeliveryResult {
    success: boolean;
    externalMessageId?: string | null;
    demo?: boolean;
    errorCode?: string;
    errorReason?: string;
}
export interface InboundChannelMessageInput {
    channel: ConversationChannelType;
    externalMessageId?: string | null;
    fromPhone?: string | null;
    fromEmail?: string | null;
    body: string;
    replyToExternalId?: string | null;
    rawPayload?: Record<string, unknown>;
}
export interface NormalizedInboundMessage {
    conversationId: string;
    body: string;
    senderUserId?: string | null;
    externalMessageId?: string | null;
    ambiguous?: boolean;
}
export interface ChannelConfigurationStatus {
    configured: boolean;
    enabled: boolean;
    details?: Record<string, unknown>;
}
export interface ConversationChannelAdapter {
    channel: ConversationChannelType;
    sendMessage(input: SendChannelMessageInput): Promise<ChannelDeliveryResult>;
    processInboundMessage(input: InboundChannelMessageInput): Promise<NormalizedInboundMessage | null>;
    validateConfiguration(): Promise<ChannelConfigurationStatus>;
}
