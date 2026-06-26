// =============================================================================
// Sprint 5D — Purchase Order management (not accounting / ERP / payments)
// =============================================================================

export const PurchaseOrderStatus = [
  "DRAFT",
  "ISSUED",
  "ACKNOWLEDGED",
  "AMENDMENT_REQUESTED",
  "AMENDED",
  "CLOSED",
  "CANCELLED",
] as const;
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[number];

export const AcknowledgementStatus = ["PENDING", "ACCEPTED", "REJECTED"] as const;
export type AcknowledgementStatus = (typeof AcknowledgementStatus)[number];

export const AmendmentStatus = ["OPEN", "APPROVED", "DECLINED"] as const;
export type AmendmentStatus = (typeof AmendmentStatus)[number];

export const PoSource = ["auto", "manual"] as const;
export type PoSource = (typeof PoSource)[number];

export const PoAction = [
  "issue_po",
  "acknowledge_po",
  "request_amendment",
  "approve_amendment",
  "reject_amendment",
  "close_po",
  "cancel_po",
] as const;
export type PoAction = (typeof PoAction)[number];

export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  sku: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  createdAt: string;
}

export interface PurchaseOrderRevision {
  id: string;
  purchaseOrderId: string;
  revisionNumber: number;
  createdById: string;
  reason: string;
  snapshotJson: Record<string, unknown>;
  createdAt: string;
}

export interface PurchaseOrderAcknowledgement {
  id: string;
  purchaseOrderId: string;
  supplierUserId: string;
  status: AcknowledgementStatus;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseOrderAmendment {
  id: string;
  purchaseOrderId: string;
  requestedById: string;
  reason: string;
  status: AmendmentStatus;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  orderId: string;
  orderRef: string | null;
  poNumber: string;
  buyerId: string;
  supplierId: string;
  buyerName?: string | null;
  supplierName?: string | null;
  buyerEmail?: string | null;
  supplierEmail?: string | null;
  currency: string;
  incoterm: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  status: PurchaseOrderStatus;
  source: PoSource;
  documentUrl: string | null;
  documentFileName: string | null;
  issuedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderSummary {
  purchaseOrder: PurchaseOrder;
  lines: PurchaseOrderLine[];
  revisions: PurchaseOrderRevision[];
  acknowledgements: PurchaseOrderAcknowledgement[];
  amendments: PurchaseOrderAmendment[];
  pendingAcknowledgement: boolean;
  openAmendments: number;
}

export interface PoDashboardMetrics {
  openPoCount: number;
  acknowledgementPending: number;
  amendmentsOpen: number;
  poValueOpen: number;
  closedPoValue: number;
}
