// =============================================================================
// Sprint 5E — Unified workspace communication (not chat / Slack / social)
// =============================================================================
export const CommWorkspaceType = [
    "RFQ",
    "COMMODITYBID",
    "ORDER",
    "SHIPMENT",
    "PO",
    "FREIGHTIQ",
];
export const MessageVisibility = [
    "ALL_PARTICIPANTS",
    "BUYER_ONLY",
    "SUPPLIER_ONLY",
    "ADMIN_ONLY",
    "BUYER_ADMIN",
    "SUPPLIER_ADMIN",
];
export const MessageType = [
    "MESSAGE",
    "QUESTION",
    "ANSWER",
    "DECISION",
    "STATUS_UPDATE",
    "INTERNAL_NOTE",
];
export const MessageStatus = ["ACTIVE", "EDITED", "DELETED"];
export const CommunicationAction = [
    "create_message",
    "edit_message",
    "delete_message",
    "mark_read",
];
/** Timeline-worthy message types (MESSAGE excluded). */
export const TIMELINE_MESSAGE_TYPES = [
    "QUESTION",
    "ANSWER",
    "DECISION",
    "STATUS_UPDATE",
];
//# sourceMappingURL=workspace-communication.js.map