// Sprint 15A — Unified Trade Execution Workspace DTOs
export type TradeType =
  | "RFQ"
  | "COMMODITYBID"
  | "MIXED_CONTAINER"
  | "BULK_CONTAINER";

export type TradeExecutionMilestone =
  | "Created"
  | "Quoted"
  | "PO Created"
  | "Order Confirmed"
  | "Production"
  | "Shipment"
  | "Delivered";

export type TradeDocumentCategory =
  | "Proforma"
  | "Invoice"
  | "Packing List"
  | "BL"
  | "COO"
  | "Health Certificate"
  | "Inspection Reports"
  | "Contracts"
  | "Other";

export interface TradeWorkspaceHeader {
  tradeId: string;
  rootWorkspaceId: string;
  buyerName: string;
  manufacturerName: string;
  tradeType: TradeType;
  currentStatus: TradeExecutionMilestone;
  containerCount: number;
  tradeValue: number | null;
  currency: string | null;
  incoterm: string | null;
  lastActivityAt: string | null;
}

export interface TradeSummaryPanel {
  buyerName: string;
  manufacturerName: string;
  products: string;
  containerType: string | null;
  orderValue: number | null;
  freightValue: number | null;
  serviceFee: number | null;
  totalTradeValue: number | null;
  currency: string | null;
  currentMilestone: TradeExecutionMilestone;
}

export interface TradePoPanelItem {
  poId: string;
  poNumber: string;
  status: string;
  poDate: string | null;
  poValue: number;
  currency: string;
  orderId: string;
  orderRef: string;
  workspaceUrl: string;
}

export interface TradeOrderPanelItem {
  orderId: string;
  orderRef: string;
  status: string;
  products: string;
  quantitySummary: string;
  productionStatus: string;
  workspaceUrl: string;
}

export interface TradeFreightPanelItem {
  orderId: string;
  orderRef: string;
  carrier: string | null;
  route: string | null;
  containerCount: number | null;
  etd: string | null;
  eta: string | null;
  trackingStatus: string;
  workspaceUrl: string;
}

export interface TradeShipmentPanelItem {
  shipmentId: string;
  shipmentRef: string;
  status: string;
  orderRef: string;
  currentLocation: string | null;
  latestUpdate: string | null;
  latestUpdateAt: string | null;
  workspaceUrl: string;
}

export interface TradeDocumentItem {
  id: string;
  detailId: string;
  fileName: string | null;
  documentType: string;
  category: TradeDocumentCategory;
  status: string;
  workspaceType: string;
  workspaceId: string;
  workspaceRef: string;
  uploadedAt: string | null;
}

export interface TradeTimelineItem {
  id: string;
  label: string;
  eventType: string;
  workspaceType: string;
  workspaceId: string;
  actorName: string | null;
  createdAt: string;
}

export interface TradeAlertItem {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  owner: string | null;
  dueDate: string | null;
  status: "OPEN" | "RESOLVED";
  workspaceType: string | null;
  workspaceId: string | null;
}

export interface TradeRelatedRecord {
  type: string;
  id: string;
  ref: string;
  state: string;
  url: string;
}

export interface TradeFreightEstimatePanel {
  current: {
    id: string;
    fobValue: number;
    estimatedFreight: number;
    estimatedCifValue: number;
    currency: string;
    estimatedAt: string;
    expiresAt: string;
    status: string;
    lastRefreshedAt: string | null;
  } | null;
  history: Array<{
    id: string;
    estimatedFreight: number;
    estimatedCifValue: number;
    currency: string;
    estimatedAt: string;
    expiresAt: string;
    status: string;
  }>;
  expirationStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NONE";
  lastRefresh: string | null;
}

export interface TradeFreightBookingPanel {
  forecast: {
    productionStartDate: string;
    estimatedProductionFinishDate: string;
    estimatedCargoReadyDate: string;
    confidenceLevel: string;
    status: string;
  } | null;
  bookingStatus: string | null;
  carrierOptions: Array<{
    id: string;
    carrierName: string;
    vesselName: string;
    transitDays: number;
    etd: string;
    eta: string;
    cutoffDate: string;
    freightAmount: number;
    currency: string;
    recommendationScore: number;
    status: string;
  }>;
  recommendedCarrier: { carrierName: string; vesselName: string; recommendationScore: number } | null;
  selectedCarrier: { carrierName: string; vesselName: string; transitDays: number } | null;
  bestOverallLabel: string | null;
}

export interface TradeWorkspacePayload {
  header: TradeWorkspaceHeader;
  summary: TradeSummaryPanel;
  purchaseOrders: TradePoPanelItem[];
  orders: TradeOrderPanelItem[];
  freight: TradeFreightPanelItem[];
  freightEstimate: TradeFreightEstimatePanel;
  freightBooking: TradeFreightBookingPanel;
  shipments: TradeShipmentPanelItem[];
  documents: TradeDocumentItem[];
  timeline: TradeTimelineItem[];
  alerts: TradeAlertItem[];
  relatedRecords: TradeRelatedRecord[];
}
