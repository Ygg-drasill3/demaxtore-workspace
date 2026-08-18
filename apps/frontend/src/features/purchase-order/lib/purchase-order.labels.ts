import {
  PURCHASE_ORDER_SOURCE_LABELS,
  canonicalizePurchaseOrderSource,
  canonicalizePurchaseOrderStatus,
  type PurchaseOrderSource,
  type PurchaseOrderStatus,
} from "@dmx/contracts/purchase-order";

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  IN_EXECUTION: "In execution",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export function purchaseOrderSourceLabel(raw: string | null | undefined): string {
  const source = canonicalizePurchaseOrderSource(raw);
  return PURCHASE_ORDER_SOURCE_LABELS[source] ?? PURCHASE_ORDER_SOURCE_LABELS.LEGACY;
}

export function purchaseOrderStatusLabel(raw: string | null | undefined): string {
  if (!raw) return "Unknown";
  const key = canonicalizePurchaseOrderStatus(raw);
  return PURCHASE_ORDER_STATUS_LABELS[key] ?? String(raw);
}

export function purchaseOrderSourceContext(source: PurchaseOrderSource): string {
  switch (source) {
    case "DIRECT":
      return "Created directly";
    case "RFQ":
      return "Created from RFQ";
    case "COMMODITY_BID":
      return "Created from CommodityBid";
    case "REORDER":
      return "Created from previous Purchase Order";
    case "LEGACY":
      return "Imported legacy record";
    case "API":
      return "Created via API";
    default:
      return purchaseOrderSourceLabel(source);
  }
}

export type { PurchaseOrderSource, PurchaseOrderStatus };
