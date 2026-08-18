import type { NotificationDTO } from "./notifications";
import type { ControlTowerAlertCreatedPayload, ControlTowerAlertResolvedPayload, ControlTowerMetricUpdatedPayload } from "./control-tower";
export declare const SocketEvents: {
    readonly NOTIFICATION_NEW: "notification:new";
    readonly NOTIFICATION_READ: "notification:read";
    readonly WORKSPACE_UPDATE: "workspace:update";
    readonly TIMELINE_NEW: "timeline:new";
    readonly RFQ_STATE_CHANGED: "rfq.state.changed";
    readonly RFQ_TIMELINE_APPENDED: "rfq.timeline.appended";
    readonly RFQ_CLARIF_POSTED: "rfq.clarification.posted";
    readonly RFQ_PARTICIPANTS_CHG: "rfq.participants.changed";
    readonly COMMODITYBID_UPDATED: "commoditybid.updated";
    readonly COMMODITYBID_TIMELINE_APPENDED: "commoditybid.timeline.appended";
    readonly COMMODITYBID_BID_SUBMITTED: "commoditybid.bid.submitted";
    readonly COMMODITYBID_BID_REVISED: "commoditybid.bid.revised";
    readonly COMMODITYBID_BID_WITHDRAWN: "commoditybid.bid.withdrawn";
    readonly COMMODITYBID_AWARD_PUBLISHED: "commoditybid.award.published";
    readonly ORDER_UPDATED: "order.updated";
    readonly ORDER_TIMELINE_APPENDED: "order.timeline.appended";
    readonly ORDER_STATE_CHANGED: "order.state.changed";
    readonly SHIPMENT_UPDATED: "shipment.updated";
    readonly SHIPMENT_TIMELINE_APPENDED: "shipment.timeline.appended";
    readonly SHIPMENT_STATE_CHANGED: "shipment.state.changed";
    readonly SHIPMENT_EXCEPTION_CREATED: "shipment.exception.created";
    readonly SHIPMENT_EXCEPTION_RESOLVED: "shipment.exception.resolved";
    readonly CONTROL_TOWER_ALERT_CREATED: "controltower.alert.created";
    readonly CONTROL_TOWER_ALERT_RESOLVED: "controltower.alert.resolved";
    readonly CONTROL_TOWER_METRIC_UPDATED: "controltower.metric.updated";
    readonly SHIPMENT_TRACKING_UPDATED: "shipment.tracking.updated";
    readonly SHIPMENT_TRACKING_DELAY: "shipment.tracking.delay";
    readonly SHIPMENT_TRACKING_ARRIVED: "shipment.tracking.arrived";
    readonly FREIGHT_REQUEST_CREATED: "freight.request.created";
    readonly FREIGHT_OFFER_SUBMITTED: "freight.offer.submitted";
    readonly FREIGHT_OFFER_REVISED: "freight.offer.revised";
    readonly FREIGHT_OFFER_WITHDRAWN: "freight.offer.withdrawn";
    readonly FREIGHT_OFFER_SELECTED: "freight.offer.selected";
    readonly FREIGHT_COMMUNICATION_SENT: "freight.communication.sent";
    readonly FREIGHT_COMMUNICATION_RESPONDED: "freight.communication.responded";
    readonly FREIGHT_OFFER_INTAKE_CREATED: "freight.offer.intake.created";
    readonly FREIGHT_OFFER_INTAKE_UPDATED: "freight.offer.intake.updated";
    readonly FREIGHT_COMMERCIAL_UPDATED: "freight.commercial.updated";
    readonly FREIGHT_MARGIN_UPDATED: "freight.margin.updated";
    readonly FREIGHT_REVENUE_REALIZED: "freight.revenue.realized";
    readonly FREIGHT_COMMERCIAL_METRIC_UPDATED: "freight.commercial.metric.updated";
    readonly FREIGHT_MARGIN_ALERT: "freight.margin.alert";
    readonly FREIGHT_ROUTE_UPDATED: "freight.route.updated";
    readonly GROWTH_METRICS_UPDATED: "growth.metrics.updated";
    readonly GROWTH_ALERT_GENERATED: "growth.alert.generated";
    readonly GROWTH_FUNNEL_UPDATED: "growth.funnel.updated";
    readonly MARKET_INSIGHT_UPDATED: "market.insight.updated";
    readonly MARKET_OPPORTUNITY_UPDATED: "market.opportunity.updated";
    readonly MARKET_ALERT_GENERATED: "market.alert.generated";
    readonly SYSTEM_HEALTH_UPDATED: "system.health.updated";
    readonly SYSTEM_JOB_FAILED: "system.job.failed";
    readonly SYSTEM_ALERT_GENERATED: "system.alert.generated";
    readonly ONBOARDING_UPDATED: "onboarding.updated";
    readonly FIRST_TRADE_COMPLETED: "first_trade.completed";
    readonly ONBOARDING_ALERT_GENERATED: "onboarding.alert.generated";
    readonly DOCUMENT_REQUESTED: "document.requested";
    readonly DOCUMENT_UPLOADED: "document.uploaded";
    readonly DOCUMENT_APPROVED: "document.approved";
    readonly DOCUMENT_REJECTED: "document.rejected";
    readonly COMPLIANCE_UPDATED: "compliance.updated";
    readonly PO_ISSUED: "po.issued";
    readonly PO_ACKNOWLEDGED: "po.acknowledged";
    readonly PO_AMENDMENT_REQUESTED: "po.amendment.requested";
    readonly PO_AMENDMENT_APPROVED: "po.amendment.approved";
    readonly PO_AMENDMENT_REJECTED: "po.amendment.rejected";
    readonly PO_CLOSED: "po.closed";
    readonly COMMUNICATION_CREATED: "communication.created";
    readonly COMMUNICATION_UPDATED: "communication.updated";
    readonly COMMUNICATION_DELETED: "communication.deleted";
    readonly COMMUNICATION_READ: "communication.read";
    readonly COMMUNICATION_MENTIONED: "communication.mentioned";
    readonly WHATSAPP_MESSAGE_NEW: "whatsapp:message:new";
    readonly WHATSAPP_MESSAGE_STATUS: "whatsapp:message:status";
    readonly WHATSAPP_CONVERSATION_UPDATED: "whatsapp:conversation:updated";
    readonly WHATSAPP_CONVERSATION_SUBSCRIBE: "whatsapp:conversation:subscribe";
    readonly WORKSPACE_SUBSCRIBE: "workspace:subscribe";
    readonly WORKSPACE_UNSUBSCRIBE: "workspace:unsubscribe";
    readonly MESSAGING_CONVERSATION_SUBSCRIBE: "messaging:conversation:subscribe";
    readonly MESSAGING_CONVERSATION_UNSUBSCRIBE: "messaging:conversation:unsubscribe";
};
export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
export interface NotificationNewPayload {
    notification: NotificationDTO;
}
export interface RfqStateChangedPayload {
    workspaceId: string;
    fromState: string;
    toState: string;
    actorUserId: string | null;
    occurredAt: string;
}
export interface RfqTimelineAppendedPayload {
    workspaceId: string;
    event: {
        id: string;
        eventType: string;
        actorUserId: string | null;
        createdAt: string;
        payload: Record<string, unknown> | null;
    };
}
export interface RfqClarificationPostedPayload {
    workspaceId: string;
    messageId: string;
    authorUserId: string;
    body: string;
    createdAt: string;
}
export interface RfqParticipantsChangedPayload {
    workspaceId: string;
    added: string[];
    removed: string[];
}
export interface CommodityBidUpdatedPayload {
    workspaceId: string;
    fromState: string;
    toState: string;
    action?: string;
    actorUserId: string | null;
    occurredAt: string;
}
export interface CommodityBidTimelineAppendedPayload {
    workspaceId: string;
    event: {
        id: string;
        eventType: string;
        actorUserId: string | null;
        createdAt: string;
        payload: Record<string, unknown> | null;
    };
}
export interface CommodityBidBidEventPayload {
    workspaceId: string;
    lotId: string;
    bidderCode?: string;
    occurredAt: string;
}
/** Discriminated union of all server→client events for typed handlers. */
export type ServerToClientEvents = {
    [SocketEvents.NOTIFICATION_NEW]: (p: NotificationNewPayload) => void;
    [SocketEvents.RFQ_STATE_CHANGED]: (p: RfqStateChangedPayload) => void;
    [SocketEvents.RFQ_TIMELINE_APPENDED]: (p: RfqTimelineAppendedPayload) => void;
    [SocketEvents.RFQ_CLARIF_POSTED]: (p: RfqClarificationPostedPayload) => void;
    [SocketEvents.RFQ_PARTICIPANTS_CHG]: (p: RfqParticipantsChangedPayload) => void;
    [SocketEvents.COMMODITYBID_UPDATED]: (p: CommodityBidUpdatedPayload) => void;
    [SocketEvents.COMMODITYBID_TIMELINE_APPENDED]: (p: CommodityBidTimelineAppendedPayload) => void;
    [SocketEvents.COMMODITYBID_BID_SUBMITTED]: (p: CommodityBidBidEventPayload) => void;
    [SocketEvents.COMMODITYBID_BID_REVISED]: (p: CommodityBidBidEventPayload) => void;
    [SocketEvents.COMMODITYBID_BID_WITHDRAWN]: (p: CommodityBidBidEventPayload) => void;
    [SocketEvents.COMMODITYBID_AWARD_PUBLISHED]: (p: CommodityBidBidEventPayload) => void;
    [SocketEvents.ORDER_UPDATED]: (p: CommodityBidUpdatedPayload) => void;
    [SocketEvents.ORDER_TIMELINE_APPENDED]: (p: CommodityBidTimelineAppendedPayload) => void;
    [SocketEvents.ORDER_STATE_CHANGED]: (p: CommodityBidUpdatedPayload) => void;
    [SocketEvents.SHIPMENT_UPDATED]: (p: CommodityBidUpdatedPayload) => void;
    [SocketEvents.SHIPMENT_TIMELINE_APPENDED]: (p: CommodityBidTimelineAppendedPayload) => void;
    [SocketEvents.SHIPMENT_STATE_CHANGED]: (p: CommodityBidUpdatedPayload) => void;
    [SocketEvents.SHIPMENT_EXCEPTION_CREATED]: (p: {
        workspaceId: string;
        exceptionId: string;
        category: string;
    }) => void;
    [SocketEvents.SHIPMENT_EXCEPTION_RESOLVED]: (p: {
        workspaceId: string;
        exceptionId: string;
    }) => void;
    [SocketEvents.CONTROL_TOWER_ALERT_CREATED]: (p: ControlTowerAlertCreatedPayload) => void;
    [SocketEvents.CONTROL_TOWER_ALERT_RESOLVED]: (p: ControlTowerAlertResolvedPayload) => void;
    [SocketEvents.CONTROL_TOWER_METRIC_UPDATED]: (p: ControlTowerMetricUpdatedPayload) => void;
    [SocketEvents.SHIPMENT_TRACKING_UPDATED]: (p: {
        workspaceId: string;
        snapshotId: string;
    }) => void;
    [SocketEvents.SHIPMENT_TRACKING_DELAY]: (p: {
        workspaceId: string;
        delayFlag: string;
    }) => void;
    [SocketEvents.SHIPMENT_TRACKING_ARRIVED]: (p: {
        workspaceId: string;
        occurredAt: string;
    }) => void;
    [SocketEvents.FREIGHT_REQUEST_CREATED]: (p: {
        orderId: string;
        requestId: string;
    }) => void;
    [SocketEvents.FREIGHT_OFFER_SUBMITTED]: (p: {
        orderId: string;
        requestId: string;
        offerId: string;
    }) => void;
    [SocketEvents.FREIGHT_OFFER_REVISED]: (p: {
        orderId: string;
        offerId: string;
    }) => void;
    [SocketEvents.FREIGHT_OFFER_WITHDRAWN]: (p: {
        orderId: string;
        offerId: string;
    }) => void;
    [SocketEvents.FREIGHT_OFFER_SELECTED]: (p: {
        orderId: string;
        requestId: string;
        offerId: string;
        shipmentWorkspaceId: string | null;
    }) => void;
    [SocketEvents.FREIGHT_COMMUNICATION_SENT]: (p: {
        orderId: string;
        requestId: string;
        communicationIds: string[];
    }) => void;
    [SocketEvents.FREIGHT_COMMUNICATION_RESPONDED]: (p: {
        orderId: string;
        communicationId: string;
    }) => void;
    [SocketEvents.FREIGHT_OFFER_INTAKE_CREATED]: (p: {
        orderId: string;
        offerId: string;
    }) => void;
    [SocketEvents.FREIGHT_OFFER_INTAKE_UPDATED]: (p: {
        orderId: string;
        offerId: string;
    }) => void;
    [SocketEvents.FREIGHT_COMMERCIAL_UPDATED]: (p: {
        orderId: string;
        offerId: string;
    }) => void;
    [SocketEvents.FREIGHT_MARGIN_UPDATED]: (p: {
        orderId: string;
        offerId: string;
    }) => void;
    [SocketEvents.FREIGHT_REVENUE_REALIZED]: (p: {
        orderId: string;
        shipmentId: string;
        ledgerId: string;
    }) => void;
    [SocketEvents.DOCUMENT_REQUESTED]: (p: {
        workspaceType: string;
        workspaceId: string;
        documentId: string;
    }) => void;
    [SocketEvents.DOCUMENT_UPLOADED]: (p: {
        workspaceType: string;
        workspaceId: string;
        documentId: string;
    }) => void;
    [SocketEvents.DOCUMENT_APPROVED]: (p: {
        workspaceType: string;
        workspaceId: string;
        documentId: string;
    }) => void;
    [SocketEvents.DOCUMENT_REJECTED]: (p: {
        workspaceType: string;
        workspaceId: string;
        documentId: string;
    }) => void;
    [SocketEvents.COMPLIANCE_UPDATED]: (p: {
        workspaceType: string;
        workspaceId: string;
        status: string;
    }) => void;
    [SocketEvents.PO_ISSUED]: (p: {
        poId: string;
        orderId: string;
    }) => void;
    [SocketEvents.PO_ACKNOWLEDGED]: (p: {
        poId: string;
        orderId: string;
        status: string;
    }) => void;
    [SocketEvents.PO_AMENDMENT_REQUESTED]: (p: {
        poId: string;
        orderId: string;
        amendmentId: string;
    }) => void;
    [SocketEvents.PO_AMENDMENT_APPROVED]: (p: {
        poId: string;
        orderId: string;
        amendmentId: string;
    }) => void;
    [SocketEvents.PO_AMENDMENT_REJECTED]: (p: {
        poId: string;
        orderId: string;
        amendmentId: string;
    }) => void;
    [SocketEvents.PO_CLOSED]: (p: {
        poId: string;
        orderId: string;
    }) => void;
    [SocketEvents.COMMUNICATION_CREATED]: (p: {
        workspaceType: string;
        workspaceId: string;
        messageId: string;
    }) => void;
    [SocketEvents.COMMUNICATION_UPDATED]: (p: {
        workspaceType: string;
        workspaceId: string;
        messageId: string;
    }) => void;
    [SocketEvents.COMMUNICATION_DELETED]: (p: {
        workspaceType: string;
        workspaceId: string;
        messageId: string;
    }) => void;
    [SocketEvents.COMMUNICATION_READ]: (p: {
        workspaceType: string;
        workspaceId: string;
        messageId: string;
        userId: string;
    }) => void;
    [SocketEvents.COMMUNICATION_MENTIONED]: (p: {
        workspaceType: string;
        workspaceId: string;
        messageId: string;
    }) => void;
};
export type ClientToServerEvents = {
    [SocketEvents.WORKSPACE_SUBSCRIBE]: (workspaceId: string) => void;
    [SocketEvents.WORKSPACE_UNSUBSCRIBE]: (workspaceId: string) => void;
};
