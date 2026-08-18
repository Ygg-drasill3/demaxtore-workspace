import { z } from "zod";
export declare const DocumentCenterCategory: readonly ["Proforma Invoice", "Commercial Invoice", "Packing List", "Certificate of Origin", "Health Certificate", "Bill of Lading", "Insurance Certificate", "Inspection Report", "Loading Report", "Customs Document", "Freight Document", "Contract", "Purchase Order", "Other"];
export type DocumentCenterCategory = (typeof DocumentCenterCategory)[number];
export declare const DocumentCenterStatus: readonly ["Draft", "Uploaded", "Under Review", "Approved", "Rejected", "Revision Requested", "Missing", "Expired"];
export type DocumentCenterStatus = (typeof DocumentCenterStatus)[number];
export declare const DocumentCenterSource: readonly ["TRADE", "ORDER", "SHIPMENT", "RFQ"];
export type DocumentCenterSource = (typeof DocumentCenterSource)[number];
export declare const DocumentCenterQuery: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["Draft", "Uploaded", "Under Review", "Approved", "Rejected", "Revision Requested", "Missing", "Expired"]>>;
    documentType: z.ZodOptional<z.ZodString>;
    tradeId: z.ZodOptional<z.ZodString>;
    buyerId: z.ZodOptional<z.ZodString>;
    supplierId: z.ZodOptional<z.ZodString>;
    shipmentId: z.ZodOptional<z.ZodString>;
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
    uploadedBy: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodEnum<["TRADE", "ORDER", "SHIPMENT", "RFQ"]>>;
    rfqId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    status?: "Draft" | "Approved" | "Revision Requested" | "Expired" | "Uploaded" | "Under Review" | "Rejected" | "Missing" | undefined;
    source?: "ORDER" | "SHIPMENT" | "RFQ" | "TRADE" | undefined;
    search?: string | undefined;
    uploadedBy?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    documentType?: string | undefined;
    tradeId?: string | undefined;
    buyerId?: string | undefined;
    supplierId?: string | undefined;
    shipmentId?: string | undefined;
    rfqId?: string | undefined;
}, {
    status?: "Draft" | "Approved" | "Revision Requested" | "Expired" | "Uploaded" | "Under Review" | "Rejected" | "Missing" | undefined;
    limit?: number | undefined;
    source?: "ORDER" | "SHIPMENT" | "RFQ" | "TRADE" | undefined;
    search?: string | undefined;
    uploadedBy?: string | undefined;
    offset?: number | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    documentType?: string | undefined;
    tradeId?: string | undefined;
    buyerId?: string | undefined;
    supplierId?: string | undefined;
    shipmentId?: string | undefined;
    rfqId?: string | undefined;
}>;
export type DocumentCenterQuery = z.infer<typeof DocumentCenterQuery>;
export interface DocumentCenterKpis {
    totalDocuments: number;
    missingDocuments: number;
    pendingReview: number;
    rejectedDocuments: number;
    approvedDocuments: number;
    expiringSoon: number;
}
export interface DocumentCenterRow {
    id: string;
    source: DocumentCenterSource;
    sourceDocumentId: string;
    documentName: string;
    documentType: string;
    category: DocumentCenterCategory;
    tradeId: string | null;
    tradeRootId: string | null;
    tradeWorkspaceUrl: string | null;
    relatedEntityType: string;
    relatedEntityId: string;
    relatedEntityRef: string;
    poNumber: string | null;
    poOrderId: string | null;
    orderWorkspaceUrl: string | null;
    buyerName: string | null;
    supplierName: string | null;
    shipmentRef: string | null;
    status: DocumentCenterStatus;
    version: number;
    uploadedByName: string | null;
    uploadedById: string | null;
    uploadedAt: string | null;
    reviewOwnerName: string | null;
    lastUpdated: string;
    isRequired: boolean;
    openAlertCount: number;
    downloadUrl: string | null;
    detailUrl: string;
}
export interface DocumentCenterVersion {
    id: string;
    version: number;
    fileName: string;
    uploadedByName: string | null;
    uploadedAt: string;
    isLatest: boolean;
}
export interface DocumentCenterDetail extends DocumentCenterRow {
    workspaceType: string | null;
    workspaceId: string | null;
    fileId: string | null;
    expiresAt: string | null;
    reviewComment: string | null;
    reviewedAt: string | null;
    versions: DocumentCenterVersion[];
    reviews: Array<{
        id: string;
        decision: string;
        reason: string | null;
        reviewedByName: string | null;
        createdAt: string;
    }>;
    timeline: Array<{
        id: string;
        eventType: string;
        label: string;
        createdAt: string;
        actorName: string | null;
    }>;
    checklist: Array<{
        documentType: string;
        category: DocumentCenterCategory;
        required: boolean;
        status: DocumentCenterStatus;
        documentId: string | null;
    }>;
}
export interface DocumentCenterPayload {
    kpis: DocumentCenterKpis;
    items: DocumentCenterRow[];
    total: number;
}
export interface TradeDocumentsPanelPayload {
    tradeId: string;
    tradeRootId: string;
    checklist: DocumentCenterDetail["checklist"];
    documents: DocumentCenterRow[];
    missing: DocumentCenterRow[];
    pendingReview: DocumentCenterRow[];
    rejected: DocumentCenterRow[];
    approved: DocumentCenterRow[];
}
export declare const DocumentUploadPayload: z.ZodObject<{
    workspaceType: z.ZodEnum<["ORDER", "SHIPMENT"]>;
    workspaceId: z.ZodString;
    documentType: z.ZodString;
    ownerRole: z.ZodOptional<z.ZodEnum<["BUYER", "SUPPLIER", "OPERATOR", "SYSTEM"]>>;
    expiresAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    documentType: string;
    workspaceType: "ORDER" | "SHIPMENT";
    ownerRole?: "BUYER" | "SUPPLIER" | "SYSTEM" | "OPERATOR" | undefined;
    expiresAt?: string | undefined;
}, {
    workspaceId: string;
    documentType: string;
    workspaceType: "ORDER" | "SHIPMENT";
    ownerRole?: "BUYER" | "SUPPLIER" | "SYSTEM" | "OPERATOR" | undefined;
    expiresAt?: string | undefined;
}>;
export declare const DocumentReviewPayload: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
