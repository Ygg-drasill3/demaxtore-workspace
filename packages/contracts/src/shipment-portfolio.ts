import { z } from "zod";
import type { ShipmentState } from "./shipment.fsm";

export const ShipmentPortfolioStatus = [
  "On Track",
  "At Risk",
  "Delayed",
  "Delivered",
  "Cancelled",
] as const;
export type ShipmentPortfolioStatus = (typeof ShipmentPortfolioStatus)[number];

export const ShipmentPortfolioMilestone = [
  "Production",
  "Ready For Loading",
  "Loaded",
  "Export Customs",
  "Vessel Departure",
  "In Transit",
  "Transshipment",
  "Arrival",
  "Import Customs",
  "Delivered",
] as const;
export type ShipmentPortfolioMilestone = (typeof ShipmentPortfolioMilestone)[number];

export const ShipmentPortfolioTradeType = [
  "RFQ",
  "COMMODITYBID",
  "MIXED_CONTAINER",
  "BULK_CONTAINER",
] as const;
export type ShipmentPortfolioTradeType = (typeof ShipmentPortfolioTradeType)[number];

export const ShipmentPortfolioQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(ShipmentPortfolioStatus).optional(),
  buyerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  carrier: z.string().optional(),
  country: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  tradeType: z.enum(ShipmentPortfolioTradeType).optional(),
  search: z.string().optional(),
});
export type ShipmentPortfolioQuery = z.infer<typeof ShipmentPortfolioQuery>;

export interface ShipmentPortfolioKpis {
  activeShipments: number;
  arrivingThisWeek: number;
  delayedShipments: number;
  deliveredThisMonth: number;
  containersInTransit: number;
  openAlerts: number;
}

export interface ShipmentPortfolioAnalytics {
  averageTransitDays: number | null;
  delayedShipmentRate: number | null;
  onTimeDeliveryPct: number | null;
  shipmentVolume: number;
  containerVolume: number;
}

export interface ShipmentPortfolioAlertBadge {
  id: string;
  severity: string;
  category: string;
  title: string;
}

export interface ShipmentPortfolioRow {
  shipmentId: string;
  shipmentNumber: string;
  tradeId: string;
  tradeRootId: string;
  tradeWorkspaceUrl: string;
  buyerName: string;
  buyerId: string;
  supplierName: string;
  supplierId: string;
  origin: string;
  destination: string;
  carrier: string | null;
  containerCount: number;
  containerNumber: string | null;
  etd: string | null;
  eta: string | null;
  currentMilestone: ShipmentPortfolioMilestone;
  status: ShipmentPortfolioStatus;
  healthScore: number;
  healthLabel: "Healthy" | "Monitor" | "At Risk";
  fsmState: ShipmentState;
  tradeType: ShipmentPortfolioTradeType | null;
  openAlertCount: number;
  alerts: ShipmentPortfolioAlertBadge[];
  documentStatus: string;
  documentsUrl: string | null;
  exceptionCount: number;
  highestSeverity: string | null;
  exceptionStatus: string;
  primaryExceptionUrl: string | null;
  trackingStatus: string | null;
  lastTrackingSyncAt: string | null;
  updatedAt: string;
}

export interface ShipmentPortfolioMapPoint {
  shipmentId: string;
  shipmentNumber: string;
  tradeId: string;
  origin: string;
  destination: string;
  currentPosition: string;
  progressPercent: number;
  routeLabel: string;
  status: ShipmentPortfolioStatus;
  hasLivePosition: boolean;
}

export interface ShipmentPortfolioPayload {
  kpis: ShipmentPortfolioKpis;
  analytics: ShipmentPortfolioAnalytics;
  items: ShipmentPortfolioRow[];
  total: number;
  mapPoints: ShipmentPortfolioMapPoint[];
}
