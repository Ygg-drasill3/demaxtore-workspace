import { z } from "zod";
export const DocumentCenterCategory = [
    "Proforma Invoice",
    "Commercial Invoice",
    "Packing List",
    "Certificate of Origin",
    "Health Certificate",
    "Bill of Lading",
    "Insurance Certificate",
    "Inspection Report",
    "Loading Report",
    "Customs Document",
    "Freight Document",
    "Contract",
    "Purchase Order",
    "Other",
];
export const DocumentCenterStatus = [
    "Draft",
    "Uploaded",
    "Under Review",
    "Approved",
    "Rejected",
    "Revision Requested",
    "Missing",
    "Expired",
];
export const DocumentCenterSource = ["TRADE", "ORDER", "SHIPMENT", "RFQ"];
export const DocumentCenterQuery = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
    status: z.enum(DocumentCenterStatus).optional(),
    documentType: z.string().optional(),
    tradeId: z.string().optional(),
    buyerId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    shipmentId: z.string().uuid().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    uploadedBy: z.string().uuid().optional(),
    search: z.string().optional(),
    // DocumentCenterPage renders both controls and sends these params, but `.parse()` strips
    // unknown keys — so the filters looked active while the backend never applied them.
    source: z.enum(DocumentCenterSource).optional(),
    rfqId: z.string().uuid().optional(),
});
export const DocumentUploadPayload = z.object({
    workspaceType: z.enum(["ORDER", "SHIPMENT"]),
    workspaceId: z.string().uuid(),
    documentType: z.string(),
    ownerRole: z.enum(["BUYER", "SUPPLIER", "OPERATOR", "SYSTEM"]).optional(),
    expiresAt: z.string().optional(),
});
export const DocumentReviewPayload = z.object({
    reason: z.string().min(1).optional(),
});
