// =============================================================================
// Sprint 5B — Forwarder communication & offer intake (not a marketplace / portal)
// =============================================================================
export const CommunicationStatus = ["PENDING", "SENT", "RESPONDED", "CLOSED"];
export const CommunicationChannel = ["EMAIL", "PHONE", "WHATSAPP", "MANUAL"];
export const OfferSource = [
    "FORWARDER_EMAIL",
    "FORWARDER_PHONE",
    "FORWARDER_WHATSAPP",
    "MANUAL_ENTRY",
];
export const FreightCommunicationAction = [
    "send_communications",
    "intake_offer",
    "mark_communication_responded",
];
