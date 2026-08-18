import { z } from "zod";
export declare const CommercialDocumentCategorySchema: z.ZodEnum<["PURCHASE_ORDER", "PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "PACKING_LIST", "CERTIFICATE_OF_ORIGIN", "INSPECTION_REPORT", "BILL_OF_LADING", "AIR_WAYBILL", "INSURANCE", "CUSTOMS", "OTHER"]>;
export declare const CommercialDocumentSourceSchema: z.ZodEnum<["PURCHASE_ORDER", "DIRECT_PO_UPLOAD", "ORDER_WORKSPACE", "INSPECTION", "FREIGHT", "SHIPMENT", "LEGACY"]>;
export declare const CommercialDocumentListQuerySchema: z.ZodEffects<z.ZodObject<{
    category: z.ZodEffects<z.ZodOptional<z.ZodEnum<["PURCHASE_ORDER", "PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "PACKING_LIST", "CERTIFICATE_OF_ORIGIN", "INSPECTION_REPORT", "BILL_OF_LADING", "AIR_WAYBILL", "INSURANCE", "CUSTOMS", "OTHER"]>>, "PURCHASE_ORDER" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "AIR_WAYBILL" | "INSURANCE" | "CUSTOMS" | "OTHER" | undefined, unknown>;
    source: z.ZodEffects<z.ZodOptional<z.ZodEnum<["PURCHASE_ORDER", "DIRECT_PO_UPLOAD", "ORDER_WORKSPACE", "INSPECTION", "FREIGHT", "SHIPMENT", "LEGACY"]>>, "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "DIRECT_PO_UPLOAD" | "ORDER_WORKSPACE" | "INSPECTION" | "LEGACY" | undefined, unknown>;
    search: z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string | undefined, string | undefined>;
    uploadedFrom: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    uploadedTo: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    sort: z.ZodDefault<z.ZodEnum<["uploadedAt", "fileName", "category"]>>;
    direction: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort: "category" | "uploadedAt" | "fileName";
    page: number;
    direction: "asc" | "desc";
    pageSize: number;
    category?: "PURCHASE_ORDER" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "AIR_WAYBILL" | "INSURANCE" | "CUSTOMS" | "OTHER" | undefined;
    source?: "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "DIRECT_PO_UPLOAD" | "ORDER_WORKSPACE" | "INSPECTION" | "LEGACY" | undefined;
    search?: string | undefined;
    uploadedFrom?: string | undefined;
    uploadedTo?: string | undefined;
}, {
    sort?: "category" | "uploadedAt" | "fileName" | undefined;
    category?: unknown;
    page?: number | undefined;
    source?: unknown;
    search?: string | undefined;
    uploadedFrom?: unknown;
    uploadedTo?: unknown;
    direction?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
}>, {
    sort: "category" | "uploadedAt" | "fileName";
    page: number;
    direction: "asc" | "desc";
    pageSize: number;
    category?: "PURCHASE_ORDER" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "AIR_WAYBILL" | "INSURANCE" | "CUSTOMS" | "OTHER" | undefined;
    source?: "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "DIRECT_PO_UPLOAD" | "ORDER_WORKSPACE" | "INSPECTION" | "LEGACY" | undefined;
    search?: string | undefined;
    uploadedFrom?: string | undefined;
    uploadedTo?: string | undefined;
}, {
    sort?: "category" | "uploadedAt" | "fileName" | undefined;
    category?: unknown;
    page?: number | undefined;
    source?: unknown;
    search?: string | undefined;
    uploadedFrom?: unknown;
    uploadedTo?: unknown;
    direction?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
}>;
export type CommercialDocumentListQuery = z.infer<typeof CommercialDocumentListQuerySchema>;
export declare const CommercialDocumentUploadMetaSchema: z.ZodObject<{
    category: z.ZodEnum<["PURCHASE_ORDER", "PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "PACKING_LIST", "CERTIFICATE_OF_ORIGIN", "INSPECTION_REPORT", "BILL_OF_LADING", "AIR_WAYBILL", "INSURANCE", "CUSTOMS", "OTHER"]>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    referenceNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    documentDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    category: "PURCHASE_ORDER" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "AIR_WAYBILL" | "INSURANCE" | "CUSTOMS" | "OTHER";
    description?: string | null | undefined;
    title?: string | null | undefined;
    referenceNumber?: string | null | undefined;
    documentDate?: string | null | undefined;
}, {
    category: "PURCHASE_ORDER" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "AIR_WAYBILL" | "INSURANCE" | "CUSTOMS" | "OTHER";
    description?: string | null | undefined;
    title?: string | null | undefined;
    referenceNumber?: string | null | undefined;
    documentDate?: string | null | undefined;
}>;
export type CommercialDocumentUploadMeta = z.infer<typeof CommercialDocumentUploadMetaSchema>;
export declare const CommercialDocumentReplaceMetaSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    referenceNumber: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    documentDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
} & {
    category: z.ZodOptional<z.ZodEnum<["PURCHASE_ORDER", "PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "PACKING_LIST", "CERTIFICATE_OF_ORIGIN", "INSPECTION_REPORT", "BILL_OF_LADING", "AIR_WAYBILL", "INSURANCE", "CUSTOMS", "OTHER"]>>;
}, "strip", z.ZodTypeAny, {
    description?: string | null | undefined;
    category?: "PURCHASE_ORDER" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "AIR_WAYBILL" | "INSURANCE" | "CUSTOMS" | "OTHER" | undefined;
    title?: string | null | undefined;
    referenceNumber?: string | null | undefined;
    documentDate?: string | null | undefined;
}, {
    description?: string | null | undefined;
    category?: "PURCHASE_ORDER" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "AIR_WAYBILL" | "INSURANCE" | "CUSTOMS" | "OTHER" | undefined;
    title?: string | null | undefined;
    referenceNumber?: string | null | undefined;
    documentDate?: string | null | undefined;
}>;
export type CommercialDocumentReplaceMeta = z.infer<typeof CommercialDocumentReplaceMetaSchema>;
export declare const CommercialDocumentActorSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name: string;
}>;
export declare const CommercialDocumentDtoSchema: z.ZodObject<{
    id: z.ZodString;
    purchaseOrderId: z.ZodString;
    orderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodEnum<["PURCHASE_ORDER", "PROFORMA_INVOICE", "COMMERCIAL_INVOICE", "PACKING_LIST", "CERTIFICATE_OF_ORIGIN", "INSPECTION_REPORT", "BILL_OF_LADING", "AIR_WAYBILL", "INSURANCE", "CUSTOMS", "OTHER"]>;
    source: z.ZodEnum<["PURCHASE_ORDER", "DIRECT_PO_UPLOAD", "ORDER_WORKSPACE", "INSPECTION", "FREIGHT", "SHIPMENT", "LEGACY"]>;
    fileName: z.ZodString;
    originalFileName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    mimeType: z.ZodString;
    fileSize: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    documentUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    previewUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    downloadUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    uploadedAt: z.ZodString;
    uploadedBy: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>>>;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    referenceNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    documentDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    canPreview: z.ZodBoolean;
    canDownload: z.ZodBoolean;
    canReplace: z.ZodBoolean;
    canDelete: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    category: "PURCHASE_ORDER" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "AIR_WAYBILL" | "INSURANCE" | "CUSTOMS" | "OTHER";
    uploadedAt: string;
    source: "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "DIRECT_PO_UPLOAD" | "ORDER_WORKSPACE" | "INSPECTION" | "LEGACY";
    fileName: string;
    purchaseOrderId: string;
    mimeType: string;
    canPreview: boolean;
    canDownload: boolean;
    canReplace: boolean;
    canDelete: boolean;
    description?: string | null | undefined;
    orderId?: string | null | undefined;
    title?: string | null | undefined;
    referenceNumber?: string | null | undefined;
    documentDate?: string | null | undefined;
    originalFileName?: string | null | undefined;
    fileSize?: number | null | undefined;
    documentUrl?: string | null | undefined;
    previewUrl?: string | null | undefined;
    downloadUrl?: string | null | undefined;
    uploadedBy?: {
        id: string;
        name: string;
    } | null | undefined;
}, {
    id: string;
    category: "PURCHASE_ORDER" | "PROFORMA_INVOICE" | "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "AIR_WAYBILL" | "INSURANCE" | "CUSTOMS" | "OTHER";
    uploadedAt: string;
    source: "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "DIRECT_PO_UPLOAD" | "ORDER_WORKSPACE" | "INSPECTION" | "LEGACY";
    fileName: string;
    purchaseOrderId: string;
    mimeType: string;
    canPreview: boolean;
    canDownload: boolean;
    canReplace: boolean;
    canDelete: boolean;
    description?: string | null | undefined;
    orderId?: string | null | undefined;
    title?: string | null | undefined;
    referenceNumber?: string | null | undefined;
    documentDate?: string | null | undefined;
    originalFileName?: string | null | undefined;
    fileSize?: number | null | undefined;
    documentUrl?: string | null | undefined;
    previewUrl?: string | null | undefined;
    downloadUrl?: string | null | undefined;
    uploadedBy?: {
        id: string;
        name: string;
    } | null | undefined;
}>;
