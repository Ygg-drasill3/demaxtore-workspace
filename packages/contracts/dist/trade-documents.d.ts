export declare const TradeDocumentType: readonly ["COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING", "CERTIFICATE_OF_ORIGIN", "HEALTH_CERTIFICATE", "INSPECTION_REPORT", "INSURANCE_CERTIFICATE", "EXPORT_DECLARATION", "PROOF_OF_DELIVERY", "OTHER"];
export type TradeDocumentType = (typeof TradeDocumentType)[number];
export declare const DocumentStatus: readonly ["MISSING", "REQUESTED", "UPLOADED", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"];
export type DocumentStatus = (typeof DocumentStatus)[number];
export declare const ComplianceStatus: readonly ["NOT_READY", "PARTIALLY_READY", "READY_FOR_SHIPMENT"];
export type ComplianceStatus = (typeof ComplianceStatus)[number];
export declare const DocumentOwner: readonly ["BUYER", "SUPPLIER", "OPERATOR", "SYSTEM"];
export type DocumentOwner = (typeof DocumentOwner)[number];
export declare const TradeWorkspaceType: readonly ["ORDER", "SHIPMENT"];
export type TradeWorkspaceType = (typeof TradeWorkspaceType)[number];
export declare const TradeDocumentAction: readonly ["request_document", "upload_document", "review_document", "approve_document", "reject_document", "expire_document"];
export type TradeDocumentAction = (typeof TradeDocumentAction)[number];
export interface DocumentRequirement {
    id: string;
    workspaceType: TradeWorkspaceType;
    workspaceId: string;
    documentType: TradeDocumentType;
    required: boolean;
    createdAt: string;
}
export interface DocumentReview {
    id: string;
    documentId: string;
    reviewedById: string;
    decision: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
    reason: string | null;
    createdAt: string;
}
export interface TradeDocument {
    id: string;
    workspaceType: TradeWorkspaceType;
    workspaceId: string;
    documentType: TradeDocumentType;
    status: DocumentStatus;
    ownerRole: DocumentOwner;
    uploadedById: string | null;
    fileId: string | null;
    fileName: string | null;
    uploadedAt: string | null;
    approvedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface ComplianceSummary {
    status: ComplianceStatus;
    requiredCount: number;
    approvedCount: number;
    missingTypes: TradeDocumentType[];
    checklist: Array<{
        documentType: TradeDocumentType;
        required: boolean;
        status: DocumentStatus;
        documentId: string | null;
    }>;
}
export interface TradeDocumentsSummary {
    workspaceType: TradeWorkspaceType;
    workspaceId: string;
    requirements: DocumentRequirement[];
    documents: TradeDocument[];
    reviews: DocumentReview[];
    compliance: ComplianceSummary;
}
