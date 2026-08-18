export declare const AlertSeverity: readonly ["INFO", "WARNING", "CRITICAL"];
export type AlertSeverity = (typeof AlertSeverity)[number];
export declare const AlertCategory: readonly ["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "FREIGHT", "SYSTEM", "ACCOUNT", "MIXED_CONTAINER", "BULK_CONTAINER"];
export type AlertCategory = (typeof AlertCategory)[number];
export declare const ControlTowerWorkspaceType: readonly ["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "MIXED_CONTAINER", "BULK_CONTAINER"];
export type ControlTowerWorkspaceType = (typeof ControlTowerWorkspaceType)[number];
/** Stable keys for alert deduplication per workspace. */
export declare const AlertKey: {
    readonly RFQ_SUBMITTED_UNASSIGNED: "rfq_submitted_unassigned";
    readonly RFQ_OPEN_NO_QUOTES_DEADLINE: "rfq_open_no_quotes_deadline";
    readonly RFQ_PROFORMA_SLA_PAST: "rfq_proforma_sla_past";
    readonly CB_OPEN_NO_BIDS_DEADLINE: "cb_open_no_bids_deadline";
    readonly CB_AWARD_ACCEPTANCE_OVERDUE: "cb_award_acceptance_overdue";
    readonly CB_NO_SUPPLIERS_JOINED: "commoditybid.no_suppliers_joined";
    readonly CB_LOW_PARTICIPATION: "commoditybid.low_participation";
    readonly CB_AUCTION_FAILED: "commoditybid.auction_failed";
    readonly CB_AUCTION_CLOSED: "commoditybid.auction_closed";
    readonly CB_AWAITING_BUYER_APPROVAL: "commoditybid.awaiting_buyer_approval";
    readonly CB_REJECTED: "commoditybid.rejected";
    readonly ORDER_CREATED_INACTIVE: "order_created_inactive";
    readonly ORDER_PRODUCTION_STALLED: "order_production_stalled";
    readonly ORDER_INSPECTION_SLA_PAST: "order_inspection_sla_past";
    readonly ORDER_SHIPMENT_STATE_MISMATCH: "order_shipment_state_mismatch";
    readonly SHIPMENT_ETA_EXCEEDED: "shipment_eta_exceeded";
    readonly SHIPMENT_CUSTOMS_STUCK: "shipment_customs_stuck";
    readonly SHIPMENT_EXCEPTION: "shipment_exception";
    readonly TRACKING_ETA_SHIFT_24H: "tracking_eta_shift_24h";
    readonly TRACKING_ETA_SHIFT_72H: "tracking_eta_shift_72h";
    readonly TRACKING_DELAY_DETECTED: "tracking_delay_detected";
    readonly FREIGHT_NO_OFFER_72H: "freight_no_offer_72h";
    readonly FREIGHT_OFFER_EXPIRED: "freight_offer_expired";
    readonly FREIGHT_SELECTED_NO_SHIPMENT: "freight_selected_no_shipment";
    readonly FREIGHT_NO_COMMUNICATION_24H: "freight_no_communication_24h";
    readonly FREIGHT_NO_RESPONSE_72H: "freight_no_response_72h";
    readonly FREIGHT_NO_OFFER_96H: "freight_no_offer_96h";
    readonly FREIGHT_OFFER_EXPIRED_BEFORE_SELECTION: "freight_offer_expired_before_selection";
    readonly FREIGHT_MARGIN_MISSING: "freight.margin.missing";
    readonly FREIGHT_MARGIN_LOW: "freight.margin.low";
    readonly FREIGHT_MARGIN_NEGATIVE: "freight.margin.negative";
    readonly FREIGHT_MARGIN_OVERRIDE: "freight.margin.override";
    readonly FREIGHT_ROUTE_UNDERPERFORMING: "freight.route.underperforming";
    readonly FREIGHT_ESTIMATE_EXPIRING_SOON: "freight.estimate.expiring_soon";
    readonly FREIGHT_ESTIMATE_EXPIRED: "freight.estimate.expired";
    readonly FREIGHT_ESTIMATE_REFRESH_REQUIRED: "freight.estimate.refresh_required";
    readonly BOOKING_CUTOFF_RISK: "booking.cutoff_risk";
    readonly BOOKING_FORECAST_CHANGED: "booking.forecast_changed";
    readonly BOOKING_REBOOKING_REQUIRED: "booking.rebooking_required";
    readonly BOOKING_NOT_CONFIRMED: "booking.not_confirmed";
    readonly TRADE_DOC_REQUIRED_MISSING: "trade_doc_required_missing";
    readonly TRADE_DOC_REJECTED: "trade_doc_rejected";
    readonly TRADE_DOC_MISSING_72H: "trade_doc_missing_72h";
    readonly TRADE_DOC_DELIVERED_INCOMPLETE: "trade_doc_delivered_incomplete";
    readonly PO_NO_ACK_72H: "po_no_acknowledgement_72h";
    readonly PO_AMENDMENT_OPEN_72H: "po_amendment_open_72h";
    readonly PO_CANCELLED: "po_cancelled";
    readonly PO_REJECTED: "po_rejected";
    readonly COMM_QUESTION_UNREAD_48H: "comm_question_unread_48h";
    readonly COMM_QUESTION_UNREAD_96H: "comm_question_unread_96h";
    readonly COMM_DECISION_NO_RESPONSE_72H: "comm_decision_no_response_72h";
    readonly COMM_INTERNAL_NOTE_NO_FOLLOWUP_72H: "comm_internal_note_no_followup_72h";
    readonly CUSTOMER_INACTIVE_30D: "customer.inactive.30d";
    readonly SUPPLIER_INACTIVE_30D: "supplier.inactive.30d";
    readonly PIPELINE_STALLED: "pipeline.stalled";
    readonly OPERATOR_OVERLOADED: "operator.overloaded";
    readonly FORECAST_DECLINE: "forecast.decline";
    readonly GROWTH_BUYER_INACTIVE: "growth.buyer.inactive";
    readonly GROWTH_SUPPLIER_INACTIVE: "growth.supplier.inactive";
    readonly GROWTH_REPEAT_BUYER_AT_RISK: "growth.repeat.buyer.at_risk";
    readonly GROWTH_RFQ_STALLED: "growth.rfq.stalled";
    readonly GROWTH_PIPELINE_LEAKAGE: "growth.pipeline.leakage";
    readonly GROWTH_CONVERSION_DROP: "growth.conversion.drop";
    readonly MARKET_CATEGORY_GROWING: "market.category.growing";
    readonly MARKET_CATEGORY_DECLINING: "market.category.declining";
    readonly MARKET_ROUTE_OPPORTUNITY: "market.route.opportunity";
    readonly MARKET_SUPPLY_GAP: "market.supply.gap";
    readonly MARKET_UNSERVED_DEMAND: "market.unserved.demand";
    readonly MARKET_FORWARDER_UNDERUTILIZED: "market.forwarder.underutilized";
    readonly SYSTEM_JOB_FAILED: "system.job.failed";
    readonly SYSTEM_JOB_STALE: "system.job.stale";
    readonly SYSTEM_STORAGE_ERROR: "system.storage.error";
    readonly SYSTEM_BACKUP_OVERDUE: "system.backup.overdue";
    readonly SYSTEM_RESTORE_UNVERIFIED: "system.restore.unverified";
    readonly SYSTEM_SCHEDULER_FAILURE: "system.scheduler.failure";
    readonly ONBOARDING_STALLED: "onboarding.stalled";
    readonly BUYER_FIRST_TRADE_STUCK: "buyer.first_trade.stuck";
    readonly SUPPLIER_FIRST_TRADE_STUCK: "supplier.first_trade.stuck";
    readonly OPERATOR_FIRST_TRADE_STUCK: "operator.first_trade.stuck";
    readonly TRADE_PROGRESS_INACTIVE: "trade.progress.inactive";
    readonly MC_PRICING_PENDING: "mixed_container_pricing_pending";
    readonly MC_OFFER_EXPIRING: "mixed_container_offer_expiring";
    readonly MC_REVISION_PENDING: "mixed_container_revision_pending";
    readonly MC_OFFER_APPROVED: "mixed_container_offer_approved";
    readonly MC_ALLOCATION_PENDING: "mixed_container_allocation_pending";
    readonly MC_PROFORMA_PENDING: "mixed_container_proforma_pending";
    readonly MC_PAYMENT_PENDING: "mixed_container_payment_pending";
    readonly MC_EXECUTION_READY: "mixed_container_execution_ready";
    readonly SC_ORDER_SPAWN_FAILED: "smartcontainer_order_spawn_failed";
    readonly SC_FREIGHT_PENDING: "smartcontainer_freight_pending";
    readonly SC_SHIPMENT_PENDING: "smartcontainer_shipment_pending";
    readonly SC_EXECUTION_COMPLETE: "smartcontainer_execution_complete";
    readonly BC_INCOMPLETE: "bulk_container_incomplete";
    readonly BC_SUBMITTED: "bulk_container_submitted";
    readonly BC_PRICING_PENDING: "bulk_pricing_pending";
    readonly BC_OFFER_EXPIRING: "bulk_offer_expiring";
    readonly BC_OFFER_EXPIRED: "bulk_offer_expired";
    readonly BC_REVISION_PENDING: "bulk_revision_pending";
    readonly BC_OFFER_APPROVED: "bulk_offer_approved";
    readonly BC_ALLOCATION_PENDING: "bulk_allocation_pending";
    readonly BC_PROFORMA_PENDING: "bulk_proforma_pending";
    readonly BC_PAYMENT_PENDING: "bulk_payment_pending";
    readonly BC_EXECUTION_READY: "bulk_execution_ready";
    readonly BC_ORDER_SPAWN_FAILED: "bulkcontainer_order_spawn_failed";
    readonly BC_FREIGHT_PENDING: "bulkcontainer_freight_pending";
    readonly BC_SHIPMENT_PENDING: "bulkcontainer_shipment_pending";
    readonly BC_EXECUTION_COMPLETE: "bulkcontainer_execution_complete";
    readonly PRODUCT_MISSING_PACKING_TYPE: "product_missing_packing_type";
    readonly PACKING_TYPE_DEACTIVATED: "packing_type_deactivated";
};
export type AlertKey = (typeof AlertKey)[keyof typeof AlertKey];
export interface ControlTowerAlert {
    id: string;
    severity: AlertSeverity;
    category: AlertCategory;
    alertKey: string;
    workspaceId: string | null;
    workspaceType: ControlTowerWorkspaceType | null;
    workspaceRef: string | null;
    title: string;
    description: string;
    resolvedAt: string | null;
    resolvedById: string | null;
    createdAt: string;
}
export interface ControlTowerMetric {
    key: string;
    label: string;
    value: number;
}
export interface ControlTowerFunnelStage {
    state: string;
    label: string;
    count: number;
}
export interface ControlTowerFunnel {
    workspaceType: ControlTowerWorkspaceType;
    title: string;
    stages: ControlTowerFunnelStage[];
}
export interface ControlTowerOverview {
    widgets: Array<{
        id: string;
        title: string;
        description: string;
        metrics: ControlTowerMetric[];
    }>;
    openAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    overdueItems: number;
    excludesTestData: boolean;
}
export interface SlaMetricRow {
    key: string;
    label: string;
    averageHours: number | null;
    averageHoursDisplay: string;
    sampleSize: number;
}
export interface SupplierPerformanceRow {
    supplierUserId: string;
    email: string;
    displayName: string;
    invited: number;
    responded: number;
    won: number;
    declined: number;
    responseRate: number | null;
    awardRate: number | null;
}
export interface BuyerPerformanceRow {
    buyerUserId: string;
    email: string;
    displayName: string;
    rfqCreated: number;
    rfqCompleted: number;
    ordersCreated: number;
    shipmentsCompleted: number;
}
export interface ControlTowerAlertCreatedPayload {
    alert: ControlTowerAlert;
}
export interface ControlTowerAlertResolvedPayload {
    alertId: string;
    resolvedAt: string;
}
export interface ControlTowerMetricUpdatedPayload {
    key: string;
    value: number;
}
