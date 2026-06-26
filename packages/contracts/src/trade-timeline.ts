// Sprint 18A — Trade Timeline Engine

export const TRADE_TIMELINE_CATEGORIES = [
  "SOURCE",
  "PROCUREMENT",
  "FREIGHT",
  "PRODUCTION",
  "INSPECTION",
  "SHIPMENT",
  "DOCUMENT",
  "EXCEPTION",
  "DELIVERY",
] as const;
export type TradeTimelineCategory = (typeof TRADE_TIMELINE_CATEGORIES)[number];

export const TRADE_TIMELINE_SEVERITIES = ["INFO", "WARNING", "CRITICAL", "SUCCESS"] as const;
export type TradeTimelineSeverity = (typeof TRADE_TIMELINE_SEVERITIES)[number];

export const TRADE_TIMELINE_SOURCES = [
  "RFQ",
  "CommodityBid",
  "SmartContainer",
  "BulkContainer",
  "FreightEstimate",
  "FreightBooking",
  "Inspection",
  "ShipmentTracking",
  "DocumentCenter",
  "ExceptionHub",
] as const;
export type TradeTimelineSourceModule = (typeof TRADE_TIMELINE_SOURCES)[number];

export const TRADE_MILESTONE_TYPES = [
  "RFQ_SUBMITTED",
  "SUPPLIER_SELECTED",
  "FREIGHT_ESTIMATE_READY",
  "ESTIMATED_CIF_AVAILABLE",
  "PURCHASE_ORDER_ISSUED",
  "CARGO_READY_FORECAST_SUBMITTED",
  "CARRIER_SELECTED",
  "BOOKING_CONFIRMED",
  "PRODUCTION_STARTED",
  "PRODUCTION_COMPLETED",
  "INSPECTION_SCHEDULED",
  "INSPECTION_PASSED",
  "CONTAINER_LOADED",
  "VESSEL_DEPARTED",
  "ETA_UPDATED",
  "SHIPMENT_ARRIVED",
  "DOCUMENTS_COMPLETED",
  "DELIVERED",
] as const;
export type TradeMilestoneType = (typeof TRADE_MILESTONE_TYPES)[number];

export const MILESTONE_PROGRESS: Record<TradeMilestoneType, number> = {
  RFQ_SUBMITTED: 10,
  SUPPLIER_SELECTED: 20,
  FREIGHT_ESTIMATE_READY: 25,
  ESTIMATED_CIF_AVAILABLE: 30,
  PURCHASE_ORDER_ISSUED: 35,
  CARGO_READY_FORECAST_SUBMITTED: 40,
  CARRIER_SELECTED: 45,
  BOOKING_CONFIRMED: 50,
  PRODUCTION_STARTED: 55,
  PRODUCTION_COMPLETED: 65,
  INSPECTION_SCHEDULED: 70,
  INSPECTION_PASSED: 75,
  CONTAINER_LOADED: 80,
  VESSEL_DEPARTED: 85,
  ETA_UPDATED: 88,
  SHIPMENT_ARRIVED: 95,
  DOCUMENTS_COMPLETED: 98,
  DELIVERED: 100,
};

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
