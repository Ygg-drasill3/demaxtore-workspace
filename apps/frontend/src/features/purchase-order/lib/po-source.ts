import {
  PURCHASE_ORDER_SOURCE_LABELS,
  canonicalizePurchaseOrderSource,
  type PurchaseOrderSource,
} from "@dmx/contracts/purchase-order";

export function purchaseOrderSourceLabel(raw: string | null | undefined): string {
  const source = canonicalizePurchaseOrderSource(raw);
  return PURCHASE_ORDER_SOURCE_LABELS[source] ?? PURCHASE_ORDER_SOURCE_LABELS.LEGACY;
}

export function isUploadedPurchaseOrderDocument(po: {
  source?: string | null;
  documentUrl?: string | null;
}): boolean {
  return Boolean(po.documentUrl);
}

export type { PurchaseOrderSource };
