export interface PoListRow {
  poId: string;
  poNumber: string;
  status: string;
  orderId: string;
  orderRef: string;
  supplierName: string;
  buyerName?: string;
  pendingAck: boolean;
  openAmendments: number;
  updatedAt: string;
}

export interface ShipmentListRow {
  id: string;
  externalRef: string;
  state: string;
  orderId: string;
  orderRef: string;
  createdAt: string;
}

export interface TradeDocListRow {
  workspaceType: "ORDER" | "SHIPMENT";
  workspaceId: string;
  workspaceRef: string;
  complianceStatus: string;
  requiredCount: number;
  approvedCount: number;
  pendingReview: number;
  missingCount?: number;
  rejectedCount?: number;
}

export interface MessageListRow {
  workspaceType: "RFQ" | "ORDER" | "COMMODITYBID";
  workspaceId: string;
  workspaceRef: string;
  unreadCount: number;
  lastMessage: string;
  lastAt: string;
  workspaceUrl: string;
}
