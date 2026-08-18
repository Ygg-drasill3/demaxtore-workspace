// =============================================================================
// Unified Messaging — shared contracts (Phase 2)
// =============================================================================
export const MessagingChannel = ["WORKSPACE", "WHATSAPP", "SYSTEM"];
export const MessageDirection = ["INBOUND", "OUTBOUND", "INTERNAL"];
export const MessageAudienceScope = ["EXTERNAL", "INTERNAL", "SYSTEM"];
export const ConversationContextType = [
    "GENERAL",
    "RFQ",
    "QUOTATION",
    "PURCHASE_ORDER",
    "ORDER",
    "SHIPMENT",
    "FREIGHT",
    "FREIGHT_REQUEST",
    "FREIGHTIQ",
    "COMMODITY_BID",
    "SMART_CONTAINER",
    "BULK_CONTAINER",
    "FULL_CONTAINER",
    "INSPECTION",
    "DOCUMENT",
    "SUPPORT",
    "WHATSAPP",
];
export const ConversationStatus = ["ACTIVE", "ARCHIVED", "CLOSED"];
export const ConversationPriority = ["LOW", "NORMAL", "HIGH", "URGENT"];
export const ParticipantType = [
    "USER",
    "WHATSAPP_CONTACT",
    "SYSTEM",
];
