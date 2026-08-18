import { z } from "zod";
import type { ShipmentState } from "./shipment.fsm";
export declare const ShipmentPortfolioStatus: readonly ["On Track", "At Risk", "Delayed", "Delivered", "Cancelled"];
export type ShipmentPortfolioStatus = (typeof ShipmentPortfolioStatus)[number];
export declare const ShipmentPortfolioMilestone: readonly ["Production", "Ready For Loading", "Loaded", "Export Customs", "Vessel Departure", "In Transit", "Transshipment", "Arrival", "Import Customs", "Delivered"];
export type ShipmentPortfolioMilestone = (typeof ShipmentPortfolioMilestone)[number];
export declare const ShipmentPortfolioTradeType: readonly ["RFQ", "COMMODITYBID", "MIXED_CONTAINER", "BULK_CONTAINER"];
export type ShipmentPortfolioTradeType = (typeof ShipmentPortfolioTradeType)[number];
export declare const ShipmentPortfolioQuery: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["On Track", "At Risk", "Delayed", "Delivered", "Cancelled"]>>;
    buyerId: z.ZodOptional<z.ZodString>;
    supplierId: z.ZodOptional<z.ZodString>;
    carrier: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
    tradeType: z.ZodOptional<z.ZodEnum<["RFQ", "COMMODITYBID", "MIXED_CONTAINER", "BULK_CONTAINER"]>>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    status?: "Cancelled" | "Delivered" | "On Track" | "At Risk" | "Delayed" | undefined;
    search?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    buyerId?: string | undefined;
    supplierId?: string | undefined;
    tradeType?: "MIXED_CONTAINER" | "BULK_CONTAINER" | "RFQ" | "COMMODITYBID" | undefined;
    country?: string | undefined;
    carrier?: string | undefined;
}, {
    status?: "Cancelled" | "Delivered" | "On Track" | "At Risk" | "Delayed" | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    offset?: number | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    buyerId?: string | undefined;
    supplierId?: string | undefined;
    tradeType?: "MIXED_CONTAINER" | "BULK_CONTAINER" | "RFQ" | "COMMODITYBID" | undefined;
    country?: string | undefined;
    carrier?: string | undefined;
}>;
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
