export declare const CommunicationStatus: readonly ["PENDING", "SENT", "RESPONDED", "CLOSED"];
export type CommunicationStatus = (typeof CommunicationStatus)[number];
export declare const CommunicationChannel: readonly ["EMAIL", "PHONE", "WHATSAPP", "MANUAL"];
export type CommunicationChannel = (typeof CommunicationChannel)[number];
export declare const OfferSource: readonly ["FORWARDER_EMAIL", "FORWARDER_PHONE", "FORWARDER_WHATSAPP", "MANUAL_ENTRY"];
export type OfferSource = (typeof OfferSource)[number];
export interface ForwarderContact {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string | null;
    country: string | null;
    notes: string | null;
    active: boolean;
    createdAt: string;
}
export interface ForwarderDirectory {
    items: ForwarderContact[];
    total: number;
}
export interface FreightRequestCommunication {
    id: string;
    freightRequestId: string;
    forwarderContactId: string;
    forwarderCompanyName: string;
    forwarderEmail: string;
    status: CommunicationStatus;
    channel: CommunicationChannel;
    sentAt: string | null;
    respondedAt: string | null;
    notes: string | null;
    createdAt: string;
}
export interface FreightRequestEmailTemplate {
    subject: string;
    body: string;
    pol: string;
    pod: string;
    commodity: string;
    containerType: string | null;
    readyDate: string | null;
    incoterm: string | null;
    requestedReplyDate: string;
}
/** Extended offer fields from forwarder intake (Sprint 5B). */
export interface FreightOfferIntakeFields {
    forwarderContactId: string | null;
    forwarderCompanyName: string | null;
    offerSource: OfferSource | null;
    vesselName: string | null;
    etd: string | null;
    eta: string | null;
    cutOff: string | null;
}
export interface FreightComparisonHintsExtended {
    lowestPriceOfferId: string | null;
    fastestTransitOfferId: string | null;
    earliestEtdOfferId: string | null;
    closestCutOffOfferId: string | null;
    expiringSoonOfferIds: string[];
}
export interface FreightOpsCommunicationsOverview {
    pendingCommunications: FreightRequestCommunication[];
    waitingResponses: FreightRequestCommunication[];
    openFreightRequests: Array<{
        id: string;
        orderId: string;
        orderRef: string | null;
        status: string;
        createdAt: string;
    }>;
    expiredOffers: Array<{
        id: string;
        providerName: string;
        validUntil: string;
        orderId: string;
    }>;
}
export declare const FreightCommunicationAction: readonly ["send_communications", "intake_offer", "mark_communication_responded"];
export type FreightCommunicationAction = (typeof FreightCommunicationAction)[number];
