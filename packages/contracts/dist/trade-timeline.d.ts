export declare const TRADE_TIMELINE_CATEGORIES: readonly ["SOURCE", "PROCUREMENT", "FREIGHT", "PRODUCTION", "INSPECTION", "SHIPMENT", "DOCUMENT", "EXCEPTION", "DELIVERY"];
export type TradeTimelineCategory = (typeof TRADE_TIMELINE_CATEGORIES)[number];
export declare const TRADE_TIMELINE_SEVERITIES: readonly ["INFO", "WARNING", "CRITICAL", "SUCCESS"];
export type TradeTimelineSeverity = (typeof TRADE_TIMELINE_SEVERITIES)[number];
export declare const TRADE_TIMELINE_SOURCES: readonly ["RFQ", "CommodityBid", "SmartContainer", "BulkContainer", "FreightEstimate", "FreightBooking", "Inspection", "ShipmentTracking", "DocumentCenter", "ExceptionHub"];
export type TradeTimelineSourceModule = (typeof TRADE_TIMELINE_SOURCES)[number];
export declare const TRADE_MILESTONE_TYPES: readonly ["RFQ_SUBMITTED", "SUPPLIER_SELECTED", "FREIGHT_ESTIMATE_READY", "ESTIMATED_CIF_AVAILABLE", "PURCHASE_ORDER_ISSUED", "CARGO_READY_FORECAST_SUBMITTED", "CARRIER_SELECTED", "BOOKING_CONFIRMED", "PRODUCTION_STARTED", "PRODUCTION_COMPLETED", "INSPECTION_SCHEDULED", "INSPECTION_PASSED", "CONTAINER_LOADED", "VESSEL_DEPARTED", "ETA_UPDATED", "SHIPMENT_ARRIVED", "DOCUMENTS_COMPLETED", "DELIVERED"];
export type TradeMilestoneType = (typeof TRADE_MILESTONE_TYPES)[number];
export declare const MILESTONE_PROGRESS: Record<TradeMilestoneType, number>;
export interface TradeTimelineEventDto {
    id: string;
    tradeId: string;
    eventType: string;
    eventCategory: TradeTimelineCategory;
    title: string;
    description: string | null;
    sourceModule: TradeTimelineSourceModule;
    severity: TradeTimelineSeverity;
    occurredAt: string;
    createdAt: string;
    metadata: Record<string, unknown>;
}
export interface TradeTimelineCurrentStatus {
    stage: string;
    milestoneType: TradeMilestoneType | null;
    progressPercent: number;
}
export interface TradeTimelineNextMilestone {
    eventType: TradeMilestoneType;
    title: string;
    estimatedDate: string | null;
    responsibleParty: string | null;
}
export interface TradeTimelinePayload {
    tradeId: string;
    tradeRef: string;
    events: TradeTimelineEventDto[];
    currentStatus: TradeTimelineCurrentStatus;
    progressPercent: number;
    nextMilestone: TradeTimelineNextMilestone | null;
}
export interface TradeTimelineKpiDto {
    activeTrades: number;
    tradesInProduction: number;
    tradesInTransit: number;
    delayedTrades: number;
    completedTrades: number;
}
