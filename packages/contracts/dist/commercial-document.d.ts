export declare const COMMERCIAL_DOCUMENT_CATEGORIES: readonly ["PURCHASE_ORDER", "PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "PACKING_LIST", "CERTIFICATE_OF_ORIGIN", "INSPECTION_REPORT", "BILL_OF_LADING", "AIR_WAYBILL", "INSURANCE", "CUSTOMS", "OTHER"];
export type CommercialDocumentCategory = (typeof COMMERCIAL_DOCUMENT_CATEGORIES)[number];
export declare const COMMERCIAL_DOCUMENT_SOURCES: readonly ["PURCHASE_ORDER", "DIRECT_PO_UPLOAD", "ORDER_WORKSPACE", "INSPECTION", "FREIGHT", "SHIPMENT", "LEGACY"];
export type CommercialDocumentSource = (typeof COMMERCIAL_DOCUMENT_SOURCES)[number];
export declare const COMMERCIAL_DOCUMENT_CATEGORY_LABELS: Record<CommercialDocumentCategory, string>;
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
export declare function mapToCommercialDocumentCategory(raw: string | null | undefined): CommercialDocumentCategory;
