// =============================================================================
// Sprint 29-02 — Commercial Document Center (aggregation DTO over existing sources)
// =============================================================================

export const COMMERCIAL_DOCUMENT_CATEGORIES = [
  "PURCHASE_ORDER",
  "PROFORMA_INVOICE",
  "COMMERCIAL_INVOICE",
  "PACKING_LIST",
  "CERTIFICATE_OF_ORIGIN",
  "INSPECTION_REPORT",
  "BILL_OF_LADING",
  "AIR_WAYBILL",
  "INSURANCE",
  "CUSTOMS",
  "OTHER",
] as const;
export type CommercialDocumentCategory = (typeof COMMERCIAL_DOCUMENT_CATEGORIES)[number];

export const COMMERCIAL_DOCUMENT_SOURCES = [
  "PURCHASE_ORDER",
  "DIRECT_PO_UPLOAD",
  "ORDER_WORKSPACE",
  "INSPECTION",
  "FREIGHT",
  "SHIPMENT",
  "LEGACY",
] as const;
export type CommercialDocumentSource = (typeof COMMERCIAL_DOCUMENT_SOURCES)[number];

export const COMMERCIAL_DOCUMENT_CATEGORY_LABELS: Record<CommercialDocumentCategory, string> = {
  PURCHASE_ORDER: "Purchase Order",
  PROFORMA_INVOICE: "Proforma Invoice",
  COMMERCIAL_INVOICE: "Commercial Invoice",
  PACKING_LIST: "Packing List",
  CERTIFICATE_OF_ORIGIN: "Certificate of Origin",
  INSPECTION_REPORT: "Inspection Report",
  BILL_OF_LADING: "Bill of Lading",
  AIR_WAYBILL: "Air Waybill",
  INSURANCE: "Insurance",
  CUSTOMS: "Customs Document",
  OTHER: "Other",
};

export interface CommercialDocumentActor {
  id: string;
  name: string;
}

export interface CommercialDocumentDto {
  id: string;
  purchaseOrderId: string;
  orderId?: string | null;
  category: CommercialDocumentCategory;
  source: CommercialDocumentSource;
  fileName: string;
  originalFileName?: string | null;
  mimeType: string;
  fileSize?: number | null;
  /** Authorized API path — never a raw storage key. */
  documentUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  uploadedAt: string;
  uploadedBy?: CommercialDocumentActor | null;
  title?: string | null;
  description?: string | null;
  referenceNumber?: string | null;
  documentDate?: string | null;
  canPreview: boolean;
  canDownload: boolean;
  canReplace: boolean;
  canDelete: boolean;
}

export interface CommercialDocumentListResponse {
  items: CommercialDocumentDto[];
  page: number;
  pageSize: number;
  total: number;
  availableCategories: CommercialDocumentCategory[];
  availableSources: CommercialDocumentSource[];
}

/** Map legacy / order / trade documentType strings into commercial categories. */
export function mapToCommercialDocumentCategory(raw: string | null | undefined): CommercialDocumentCategory {
  if (!raw) return "OTHER";
  const v = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if ((COMMERCIAL_DOCUMENT_CATEGORIES as readonly string[]).includes(v)) {
    return v as CommercialDocumentCategory;
  }
  switch (v) {
    case "PO":
    case "PURCHASEORDER":
      return "PURCHASE_ORDER";
    case "PI":
    case "PROFORMA":
      return "PROFORMA_INVOICE";
    case "INVOICE":
      return "COMMERCIAL_INVOICE";
    case "INSPECTION":
      return "INSPECTION_REPORT";
    case "BL":
    case "BOL":
      return "BILL_OF_LADING";
    case "AWB":
      return "AIR_WAYBILL";
    case "INSURANCE_CERTIFICATE":
      return "INSURANCE";
    case "EXPORT_DECLARATION":
    case "HEALTH_CERTIFICATE":
      return "CUSTOMS";
    case "FREIGHT":
      return "OTHER";
    default:
      return "OTHER";
  }
}
