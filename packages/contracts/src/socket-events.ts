// =============================================================================
// @dmx/contracts — Socket.io event names and payload types
// Rooms:
//   user:{userId}            personal channel for notifications
//   role:{role}              role-wide broadcasts (admin queue updates)
//   workspace:{workspaceId}  per-workspace timeline + state updates
// =============================================================================

import type { NotificationDTO } from "./notifications";
import type {
  ControlTowerAlertCreatedPayload,
  ControlTowerAlertResolvedPayload,
  ControlTowerMetricUpdatedPayload,
} from "./control-tower";

export const SocketEvents = {
  // Personal
  NOTIFICATION_NEW:     "notification:new",
  NOTIFICATION_READ:    "notification:read",
  // Workspace-scoped
  WORKSPACE_UPDATE:     "workspace:update",
  TIMELINE_NEW:         "timeline:new",
  RFQ_STATE_CHANGED:    "rfq.state.changed",
  RFQ_TIMELINE_APPENDED:"rfq.timeline.appended",
  RFQ_CLARIF_POSTED:    "rfq.clarification.posted",
  RFQ_PARTICIPANTS_CHG: "rfq.participants.changed",
  // CommodityBid (Sprint 3A)
  COMMODITYBID_UPDATED:           "commoditybid.updated",
  COMMODITYBID_TIMELINE_APPENDED: "commoditybid.timeline.appended",
  COMMODITYBID_BID_SUBMITTED:     "commoditybid.bid.submitted",
  COMMODITYBID_BID_REVISED:       "commoditybid.bid.revised",
  COMMODITYBID_BID_WITHDRAWN:     "commoditybid.bid.withdrawn",
  COMMODITYBID_AWARD_PUBLISHED:   "commoditybid.award.published",
  // Order (Sprint 3B)
  ORDER_UPDATED:           "order.updated",
  ORDER_TIMELINE_APPENDED: "order.timeline.appended",
  ORDER_STATE_CHANGED:     "order.state.changed",
  // Shipment (Sprint 3C)
  SHIPMENT_UPDATED:              "shipment.updated",
  SHIPMENT_TIMELINE_APPENDED:    "shipment.timeline.appended",
  SHIPMENT_STATE_CHANGED:        "shipment.state.changed",
  SHIPMENT_EXCEPTION_CREATED:    "shipment.exception.created",
  SHIPMENT_EXCEPTION_RESOLVED:   "shipment.exception.resolved",
  // Control Tower (Sprint 4A)
  CONTROL_TOWER_ALERT_CREATED:   "controltower.alert.created",
  CONTROL_TOWER_ALERT_RESOLVED:  "controltower.alert.resolved",
  CONTROL_TOWER_METRIC_UPDATED:  "controltower.metric.updated",
  // Maritime tracking (Sprint 4B)
  SHIPMENT_TRACKING_UPDATED:     "shipment.tracking.updated",
  SHIPMENT_TRACKING_DELAY:       "shipment.tracking.delay",
  SHIPMENT_TRACKING_ARRIVED:     "shipment.tracking.arrived",
  // FreightIQ (Sprint 5A)
  FREIGHT_REQUEST_CREATED:       "freight.request.created",
  FREIGHT_OFFER_SUBMITTED:       "freight.offer.submitted",
  FREIGHT_OFFER_REVISED:         "freight.offer.revised",
  FREIGHT_OFFER_WITHDRAWN:       "freight.offer.withdrawn",
  FREIGHT_OFFER_SELECTED:        "freight.offer.selected",
  // FreightIQ communications (Sprint 5B)
  FREIGHT_COMMUNICATION_SENT:      "freight.communication.sent",
  FREIGHT_COMMUNICATION_RESPONDED: "freight.communication.responded",
  FREIGHT_OFFER_INTAKE_CREATED:    "freight.offer.intake.created",
  FREIGHT_OFFER_INTAKE_UPDATED:    "freight.offer.intake.updated",
  // FreightIQ commercialization (Sprint 6A) — admin-only realtime
  FREIGHT_COMMERCIAL_UPDATED:      "freight.commercial.updated",
  FREIGHT_MARGIN_UPDATED:          "freight.margin.updated",
  FREIGHT_REVENUE_REALIZED:        "freight.revenue.realized",
  // FreightIQ revenue optimization (Sprint 6B) — admin-only
  FREIGHT_COMMERCIAL_METRIC_UPDATED: "freight.commercial.metric.updated",
  FREIGHT_MARGIN_ALERT:              "freight.margin.alert",
  FREIGHT_ROUTE_UPDATED:             "freight.route.updated",
  // Growth engine (Sprint 7B) — admin-only
  GROWTH_METRICS_UPDATED:            "growth.metrics.updated",
  GROWTH_ALERT_GENERATED:            "growth.alert.generated",
  GROWTH_FUNNEL_UPDATED:             "growth.funnel.updated",
  // Market intelligence (Sprint 7C) — admin-only
  MARKET_INSIGHT_UPDATED:            "market.insight.updated",
  MARKET_OPPORTUNITY_UPDATED:        "market.opportunity.updated",
  MARKET_ALERT_GENERATED:            "market.alert.generated",
  // Enterprise readiness (Sprint 8A) — admin-only
  SYSTEM_HEALTH_UPDATED:             "system.health.updated",
  SYSTEM_JOB_FAILED:                 "system.job.failed",
  SYSTEM_ALERT_GENERATED:            "system.alert.generated",
  // Guided onboarding (Sprint 9A)
  ONBOARDING_UPDATED:                "onboarding.updated",
  FIRST_TRADE_COMPLETED:               "first_trade.completed",
  ONBOARDING_ALERT_GENERATED:        "onboarding.alert.generated",
  // Trade documents (Sprint 5C)
  DOCUMENT_REQUESTED:              "document.requested",
  DOCUMENT_UPLOADED:               "document.uploaded",
  DOCUMENT_APPROVED:               "document.approved",
  DOCUMENT_REJECTED:               "document.rejected",
  COMPLIANCE_UPDATED:              "compliance.updated",
  // Purchase orders (Sprint 5D)
  PO_ISSUED:                       "po.issued",
  PO_ACKNOWLEDGED:                 "po.acknowledged",
  PO_AMENDMENT_REQUESTED:          "po.amendment.requested",
  PO_AMENDMENT_APPROVED:           "po.amendment.approved",
  PO_AMENDMENT_REJECTED:           "po.amendment.rejected",
  PO_CLOSED:                       "po.closed",
  // Workspace communication (Sprint 5E)
  COMMUNICATION_CREATED:           "communication.created",
  COMMUNICATION_UPDATED:           "communication.updated",
  COMMUNICATION_DELETED:           "communication.deleted",
  COMMUNICATION_READ:              "communication.read",
  COMMUNICATION_MENTIONED:         "communication.mentioned",
  // WhatsApp Inbox
  WHATSAPP_MESSAGE_NEW:            "whatsapp:message:new",
  WHATSAPP_MESSAGE_STATUS:         "whatsapp:message:status",
  WHATSAPP_CONVERSATION_UPDATED:   "whatsapp:conversation:updated",
  WHATSAPP_CONVERSATION_SUBSCRIBE: "whatsapp:conversation:subscribe",
  // Subscription control
  WORKSPACE_SUBSCRIBE:  "workspace:subscribe",
  WORKSPACE_UNSUBSCRIBE:"workspace:unsubscribe",
  MESSAGING_CONVERSATION_SUBSCRIBE: "messaging:conversation:subscribe",
  MESSAGING_CONVERSATION_UNSUBSCRIBE: "messaging:conversation:unsubscribe",
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];

// ---- Payload types -----------------------------------------------------------

export interface NotificationNewPayload {
  notification: NotificationDTO;
}

export interface RfqStateChangedPayload {
  workspaceId: string;
  fromState:   string;
  toState:     string;
  actorUserId: string | null;
  occurredAt:  string;
}

export interface RfqTimelineAppendedPayload {
  workspaceId: string;
  event: {
    id:          string;
    eventType:   string;
    actorUserId: string | null;
    createdAt:   string;
    payload:     Record<string, unknown> | null;
  };
}

export interface RfqClarificationPostedPayload {
  workspaceId:   string;
  messageId:     string;
  authorUserId:  string;
  body:          string;
  createdAt:     string;
}

export interface RfqParticipantsChangedPayload {
  workspaceId: string;
  added:       string[];
  removed:     string[];
}

export interface CommodityBidUpdatedPayload {
  workspaceId: string;
  fromState:   string;
  toState:     string;
  action?:     string;
  actorUserId: string | null;
  occurredAt:  string;
}

export interface CommodityBidTimelineAppendedPayload {
  workspaceId: string;
  event: {
    id:          string;
    eventType:   string;
    actorUserId: string | null;
    createdAt:   string;
    payload:     Record<string, unknown> | null;
  };
}

export interface CommodityBidBidEventPayload {
  workspaceId: string;
  lotId:       string;
  bidderCode?: string;
  occurredAt:  string;
}

/** Discriminated union of all server→client events for typed handlers. */
export type ServerToClientEvents = {
  [SocketEvents.NOTIFICATION_NEW]:      (p: NotificationNewPayload) => void;
  [SocketEvents.RFQ_STATE_CHANGED]:     (p: RfqStateChangedPayload) => void;
  [SocketEvents.RFQ_TIMELINE_APPENDED]: (p: RfqTimelineAppendedPayload) => void;
  [SocketEvents.RFQ_CLARIF_POSTED]:     (p: RfqClarificationPostedPayload) => void;
  [SocketEvents.RFQ_PARTICIPANTS_CHG]:  (p: RfqParticipantsChangedPayload) => void;
  [SocketEvents.COMMODITYBID_UPDATED]:           (p: CommodityBidUpdatedPayload) => void;
  [SocketEvents.COMMODITYBID_TIMELINE_APPENDED]: (p: CommodityBidTimelineAppendedPayload) => void;
  [SocketEvents.COMMODITYBID_BID_SUBMITTED]:     (p: CommodityBidBidEventPayload) => void;
  [SocketEvents.COMMODITYBID_BID_REVISED]:       (p: CommodityBidBidEventPayload) => void;
  [SocketEvents.COMMODITYBID_BID_WITHDRAWN]:     (p: CommodityBidBidEventPayload) => void;
  [SocketEvents.COMMODITYBID_AWARD_PUBLISHED]:   (p: CommodityBidBidEventPayload) => void;
  [SocketEvents.ORDER_UPDATED]:           (p: CommodityBidUpdatedPayload) => void;
  [SocketEvents.ORDER_TIMELINE_APPENDED]: (p: CommodityBidTimelineAppendedPayload) => void;
  [SocketEvents.ORDER_STATE_CHANGED]:     (p: CommodityBidUpdatedPayload) => void;
  [SocketEvents.SHIPMENT_UPDATED]:              (p: CommodityBidUpdatedPayload) => void;
  [SocketEvents.SHIPMENT_TIMELINE_APPENDED]:    (p: CommodityBidTimelineAppendedPayload) => void;
  [SocketEvents.SHIPMENT_STATE_CHANGED]:        (p: CommodityBidUpdatedPayload) => void;
  [SocketEvents.SHIPMENT_EXCEPTION_CREATED]:   (p: { workspaceId: string; exceptionId: string; category: string }) => void;
  [SocketEvents.SHIPMENT_EXCEPTION_RESOLVED]:   (p: { workspaceId: string; exceptionId: string }) => void;
  [SocketEvents.CONTROL_TOWER_ALERT_CREATED]:   (p: ControlTowerAlertCreatedPayload) => void;
  [SocketEvents.CONTROL_TOWER_ALERT_RESOLVED]:  (p: ControlTowerAlertResolvedPayload) => void;
  [SocketEvents.CONTROL_TOWER_METRIC_UPDATED]:  (p: ControlTowerMetricUpdatedPayload) => void;
  [SocketEvents.SHIPMENT_TRACKING_UPDATED]:     (p: { workspaceId: string; snapshotId: string }) => void;
  [SocketEvents.SHIPMENT_TRACKING_DELAY]:       (p: { workspaceId: string; delayFlag: string }) => void;
  [SocketEvents.SHIPMENT_TRACKING_ARRIVED]:     (p: { workspaceId: string; occurredAt: string }) => void;
  [SocketEvents.FREIGHT_REQUEST_CREATED]:     (p: { orderId: string; requestId: string }) => void;
  [SocketEvents.FREIGHT_OFFER_SUBMITTED]:       (p: { orderId: string; requestId: string; offerId: string }) => void;
  [SocketEvents.FREIGHT_OFFER_REVISED]:         (p: { orderId: string; offerId: string }) => void;
  [SocketEvents.FREIGHT_OFFER_WITHDRAWN]:       (p: { orderId: string; offerId: string }) => void;
  [SocketEvents.FREIGHT_OFFER_SELECTED]:        (p: { orderId: string; requestId: string; offerId: string; shipmentWorkspaceId: string | null }) => void;
  [SocketEvents.FREIGHT_COMMUNICATION_SENT]:      (p: { orderId: string; requestId: string; communicationIds: string[] }) => void;
  [SocketEvents.FREIGHT_COMMUNICATION_RESPONDED]: (p: { orderId: string; communicationId: string }) => void;
  [SocketEvents.FREIGHT_OFFER_INTAKE_CREATED]:    (p: { orderId: string; offerId: string }) => void;
  [SocketEvents.FREIGHT_OFFER_INTAKE_UPDATED]:    (p: { orderId: string; offerId: string }) => void;
  [SocketEvents.FREIGHT_COMMERCIAL_UPDATED]:      (p: { orderId: string; offerId: string }) => void;
  [SocketEvents.FREIGHT_MARGIN_UPDATED]:          (p: { orderId: string; offerId: string }) => void;
  [SocketEvents.FREIGHT_REVENUE_REALIZED]:        (p: { orderId: string; shipmentId: string; ledgerId: string }) => void;
  [SocketEvents.DOCUMENT_REQUESTED]:            (p: { workspaceType: string; workspaceId: string; documentId: string }) => void;
  [SocketEvents.DOCUMENT_UPLOADED]:             (p: { workspaceType: string; workspaceId: string; documentId: string }) => void;
  [SocketEvents.DOCUMENT_APPROVED]:             (p: { workspaceType: string; workspaceId: string; documentId: string }) => void;
  [SocketEvents.DOCUMENT_REJECTED]:             (p: { workspaceType: string; workspaceId: string; documentId: string }) => void;
  [SocketEvents.COMPLIANCE_UPDATED]:            (p: { workspaceType: string; workspaceId: string; status: string }) => void;
  [SocketEvents.PO_ISSUED]:                     (p: { poId: string; orderId: string }) => void;
  [SocketEvents.PO_ACKNOWLEDGED]:               (p: { poId: string; orderId: string; status: string }) => void;
  [SocketEvents.PO_AMENDMENT_REQUESTED]:        (p: { poId: string; orderId: string; amendmentId: string }) => void;
  [SocketEvents.PO_AMENDMENT_APPROVED]:         (p: { poId: string; orderId: string; amendmentId: string }) => void;
  [SocketEvents.PO_AMENDMENT_REJECTED]:         (p: { poId: string; orderId: string; amendmentId: string }) => void;
  [SocketEvents.PO_CLOSED]:                     (p: { poId: string; orderId: string }) => void;
  [SocketEvents.COMMUNICATION_CREATED]:         (p: { workspaceType: string; workspaceId: string; messageId: string }) => void;
  [SocketEvents.COMMUNICATION_UPDATED]:         (p: { workspaceType: string; workspaceId: string; messageId: string }) => void;
  [SocketEvents.COMMUNICATION_DELETED]:         (p: { workspaceType: string; workspaceId: string; messageId: string }) => void;
  [SocketEvents.COMMUNICATION_READ]:            (p: { workspaceType: string; workspaceId: string; messageId: string; userId: string }) => void;
  [SocketEvents.COMMUNICATION_MENTIONED]:       (p: { workspaceType: string; workspaceId: string; messageId: string }) => void;
};

export type ClientToServerEvents = {
  [SocketEvents.WORKSPACE_SUBSCRIBE]:   (workspaceId: string) => void;
  [SocketEvents.WORKSPACE_UNSUBSCRIBE]: (workspaceId: string) => void;
};
