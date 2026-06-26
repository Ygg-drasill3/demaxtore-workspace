// =============================================================================
// @dmx/contracts — Socket.io event names and payload types
// Rooms:
//   user:{userId}            personal channel for notifications
//   role:{role}              role-wide broadcasts (admin queue updates)
//   workspace:{workspaceId}  per-workspace timeline + state updates
// =============================================================================
export const SocketEvents = {
    // Personal
    NOTIFICATION_NEW: "notification:new",
    NOTIFICATION_READ: "notification:read",
    // Workspace-scoped
    WORKSPACE_UPDATE: "workspace:update",
    TIMELINE_NEW: "timeline:new",
    RFQ_STATE_CHANGED: "rfq.state.changed",
    RFQ_TIMELINE_APPENDED: "rfq.timeline.appended",
    RFQ_CLARIF_POSTED: "rfq.clarification.posted",
    RFQ_PARTICIPANTS_CHG: "rfq.participants.changed",
    // CommodityBid (Sprint 3A)
    COMMODITYBID_UPDATED: "commoditybid.updated",
    COMMODITYBID_TIMELINE_APPENDED: "commoditybid.timeline.appended",
    COMMODITYBID_BID_SUBMITTED: "commoditybid.bid.submitted",
    COMMODITYBID_BID_REVISED: "commoditybid.bid.revised",
    COMMODITYBID_BID_WITHDRAWN: "commoditybid.bid.withdrawn",
    COMMODITYBID_AWARD_PUBLISHED: "commoditybid.award.published",
    // Order (Sprint 3B)
    ORDER_UPDATED: "order.updated",
    ORDER_TIMELINE_APPENDED: "order.timeline.appended",
    ORDER_STATE_CHANGED: "order.state.changed",
    // Shipment (Sprint 3C)
    SHIPMENT_UPDATED: "shipment.updated",
    SHIPMENT_TIMELINE_APPENDED: "shipment.timeline.appended",
    SHIPMENT_STATE_CHANGED: "shipment.state.changed",
    SHIPMENT_EXCEPTION_CREATED: "shipment.exception.created",
    SHIPMENT_EXCEPTION_RESOLVED: "shipment.exception.resolved",
    // Control Tower (Sprint 4A)
    CONTROL_TOWER_ALERT_CREATED: "controltower.alert.created",
    CONTROL_TOWER_ALERT_RESOLVED: "controltower.alert.resolved",
    CONTROL_TOWER_METRIC_UPDATED: "controltower.metric.updated",
    // Maritime tracking (Sprint 4B)
    SHIPMENT_TRACKING_UPDATED: "shipment.tracking.updated",
    SHIPMENT_TRACKING_DELAY: "shipment.tracking.delay",
    SHIPMENT_TRACKING_ARRIVED: "shipment.tracking.arrived",
    // FreightIQ (Sprint 5A)
    FREIGHT_REQUEST_CREATED: "freight.request.created",
    FREIGHT_OFFER_SUBMITTED: "freight.offer.submitted",
    FREIGHT_OFFER_REVISED: "freight.offer.revised",
    FREIGHT_OFFER_WITHDRAWN: "freight.offer.withdrawn",
    FREIGHT_OFFER_SELECTED: "freight.offer.selected",
    // FreightIQ communications (Sprint 5B)
    FREIGHT_COMMUNICATION_SENT: "freight.communication.sent",
    FREIGHT_COMMUNICATION_RESPONDED: "freight.communication.responded",
    FREIGHT_OFFER_INTAKE_CREATED: "freight.offer.intake.created",
    FREIGHT_OFFER_INTAKE_UPDATED: "freight.offer.intake.updated",
    // FreightIQ commercialization (Sprint 6A) — admin-only realtime
    FREIGHT_COMMERCIAL_UPDATED: "freight.commercial.updated",
    FREIGHT_MARGIN_UPDATED: "freight.margin.updated",
    FREIGHT_REVENUE_REALIZED: "freight.revenue.realized",
    // FreightIQ revenue optimization (Sprint 6B) — admin-only
    FREIGHT_COMMERCIAL_METRIC_UPDATED: "freight.commercial.metric.updated",
    FREIGHT_MARGIN_ALERT: "freight.margin.alert",
    FREIGHT_ROUTE_UPDATED: "freight.route.updated",
    // Growth engine (Sprint 7B) — admin-only
    GROWTH_METRICS_UPDATED: "growth.metrics.updated",
    GROWTH_ALERT_GENERATED: "growth.alert.generated",
    GROWTH_FUNNEL_UPDATED: "growth.funnel.updated",
    // Market intelligence (Sprint 7C) — admin-only
    MARKET_INSIGHT_UPDATED: "market.insight.updated",
    MARKET_OPPORTUNITY_UPDATED: "market.opportunity.updated",
    MARKET_ALERT_GENERATED: "market.alert.generated",
    // Enterprise readiness (Sprint 8A) — admin-only
    SYSTEM_HEALTH_UPDATED: "system.health.updated",
    SYSTEM_JOB_FAILED: "system.job.failed",
    SYSTEM_ALERT_GENERATED: "system.alert.generated",
    // Guided onboarding (Sprint 9A)
    ONBOARDING_UPDATED: "onboarding.updated",
    FIRST_TRADE_COMPLETED: "first_trade.completed",
    ONBOARDING_ALERT_GENERATED: "onboarding.alert.generated",
    // Trade documents (Sprint 5C)
    DOCUMENT_REQUESTED: "document.requested",
    DOCUMENT_UPLOADED: "document.uploaded",
    DOCUMENT_APPROVED: "document.approved",
    DOCUMENT_REJECTED: "document.rejected",
    COMPLIANCE_UPDATED: "compliance.updated",
    // Purchase orders (Sprint 5D)
    PO_ISSUED: "po.issued",
    PO_ACKNOWLEDGED: "po.acknowledged",
    PO_AMENDMENT_REQUESTED: "po.amendment.requested",
    PO_AMENDMENT_APPROVED: "po.amendment.approved",
    PO_AMENDMENT_REJECTED: "po.amendment.rejected",
    PO_CLOSED: "po.closed",
    // Workspace communication (Sprint 5E)
    COMMUNICATION_CREATED: "communication.created",
    COMMUNICATION_UPDATED: "communication.updated",
    COMMUNICATION_DELETED: "communication.deleted",
    COMMUNICATION_READ: "communication.read",
    COMMUNICATION_MENTIONED: "communication.mentioned",
    // Subscription control
    WORKSPACE_SUBSCRIBE: "workspace:subscribe",
    WORKSPACE_UNSUBSCRIBE: "workspace:unsubscribe",
};
//# sourceMappingURL=socket-events.js.map