// =============================================================================
// Sprint 5C — Trade documentation & compliance (not OCR / customs / e-sign)
// =============================================================================
export const TradeDocumentType = [
    "COMMERCIAL_INVOICE",
    "PACKING_LIST",
    "BILL_OF_LADING",
    "CERTIFICATE_OF_ORIGIN",
    "HEALTH_CERTIFICATE",
    "INSPECTION_REPORT",
    "INSURANCE_CERTIFICATE",
    "EXPORT_DECLARATION",
    "OTHER",
];
export const DocumentStatus = [
    "MISSING",
    "REQUESTED",
    "UPLOADED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "EXPIRED",
];
export const ComplianceStatus = [
    "NOT_READY",
    "PARTIALLY_READY",
    "READY_FOR_SHIPMENT",
];
export const DocumentOwner = ["BUYER", "SUPPLIER", "OPERATOR", "SYSTEM"];
export const TradeWorkspaceType = ["ORDER", "SHIPMENT"];
export const TradeDocumentAction = [
    "request_document",
    "upload_document",
    "review_document",
    "approve_document",
    "reject_document",
    "expire_document",
];
//# sourceMappingURL=trade-documents.js.map