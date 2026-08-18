import {
  COMMERCIAL_DOCUMENT_CATEGORY_LABELS,
  type CommercialDocumentCategory,
  type CommercialDocumentSource,
} from "@dmx/contracts/commercial-document";
import { formatPoDate } from "../../lib/purchase-order.formatters";

export function commercialCategoryLabel(category: CommercialDocumentCategory): string {
  return COMMERCIAL_DOCUMENT_CATEGORY_LABELS[category] ?? category;
}

export function commercialSourceLabel(source: CommercialDocumentSource): string {
  switch (source) {
    case "PURCHASE_ORDER":
      return "Purchase Order";
    case "DIRECT_PO_UPLOAD":
      return "Direct upload";
    case "ORDER_WORKSPACE":
      return "Order workspace";
    case "INSPECTION":
      return "Inspection";
    case "FREIGHT":
      return "Freight";
    case "SHIPMENT":
      return "Shipment";
    case "LEGACY":
      return "Legacy";
    default:
      return source;
  }
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocUploadedAt(iso: string | null | undefined): string {
  return formatPoDate(iso);
}

export function canInlinePreview(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}
