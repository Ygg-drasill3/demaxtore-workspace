// =============================================================================
// Sprint 19 — Conversation Hub™ Foundation
// One Conversation per Workspace — permanent business timeline
// =============================================================================
export const TimelineItemType = [
    "MESSAGE",
    "DOCUMENT",
    "QUESTION",
    "ANSWER",
    "DECISION",
    "APPROVAL",
    "ACTION_REQUIRED",
    "SYSTEM_EVENT",
    "STATUS_UPDATE",
    "INTERNAL_NOTE",
];
export const SystemEventType = [
    "WORKSPACE_CREATED",
    "RFQ_PUBLISHED",
    "QUOTATION_SUBMITTED",
    "SUPPLIER_SELECTED",
    "COMMODITYBID_CLOSED",
    "PURCHASE_ORDER_ISSUED",
    "INSPECTION_SCHEDULED",
    "SHIPMENT_BOOKED",
    "ETA_UPDATED",
    "SHIPMENT_DELIVERED",
];
export const ConversationParticipantRole = [
    "BUYER",
    "SUPPLIER",
    "DEMAXTORE_REPRESENTATIVE",
];
export const DeliveryState = ["SENT", "DELIVERED", "READ"];
