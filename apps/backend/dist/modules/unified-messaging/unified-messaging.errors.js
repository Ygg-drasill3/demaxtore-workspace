import { Forbidden, Validation } from "../../lib/errors.js";
export const UnifiedMessagingErrors = {
    conversationNotFound: () => Validation("Conversation not found"),
    messageNotFound: () => Validation("Message not found"),
    participantRequired: () => Validation("At least userId or whatsappContactId is required"),
    duplicateParticipant: () => Validation("Participant already exists in conversation"),
    duplicateContext: () => Validation("Context already linked to conversation"),
    internalNoteBlocked: () => Forbidden("Internal notes cannot be sent to external channels"),
    whatsappBlocked: () => Forbidden("Only EXTERNAL messages may be dispatched to WhatsApp"),
    supplierWhatsAppRequired: () => Validation("Supplier WhatsApp number is not on file. Add whatsappPhone to the supplier profile before sending."),
    whatsappNotConfigured: () => Validation("WhatsApp Cloud API is not configured on this server."),
    notParticipant: () => Forbidden("You are not a participant in this conversation"),
    cannotAccessConversation: () => Forbidden("You cannot access this conversation"),
    cannotAssign: () => Forbidden("You cannot assign this conversation"),
    cannotArchive: () => Forbidden("You cannot archive this conversation"),
    cannotLinkContext: () => Forbidden("You cannot link context to this conversation"),
    featureDisabled: () => Forbidden("Unified messaging is not enabled"),
};
//# sourceMappingURL=unified-messaging.errors.js.map