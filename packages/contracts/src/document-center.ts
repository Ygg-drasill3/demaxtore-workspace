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
] as const;
export type DocumentCenterCategory = (typeof DocumentCenterCategory)[number];

export const DocumentCenterStatus = [
  "Draft",
  "Uploaded",
  "Under Review",
  "Approved",
  "Rejected",
  "Revision Requested",
  "Missing",
  "Expired",
] as const;
export type DocumentCenterStatus = (typeof DocumentCenterStatus)[number];

export const DocumentCenterSource = ["TRADE", "ORDER", "SHIPMENT", "RFQ"] as const;
export type DocumentCenterSource = (typeof DocumentCenterSource)[number];

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
