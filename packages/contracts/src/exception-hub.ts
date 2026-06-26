import { z } from "zod";

export const ExceptionType = [
  "Shipment Delay",
  "ETA Change",
  "Production Delay",
  "Missing Document",
  "Document Rejected",
  "Document Revision Requested",
  "Customs Issue",
  "Container Roll-over",
  "Carrier Update",
  "Order/Shipment Mismatch",
  "Payment Pending",
  "PO Pending",
  "Inspection Issue",
  "Contract Issue",
  "Manual Exception",
] as const;
export type ExceptionType = (typeof ExceptionType)[number];

export const ExceptionSeverity = ["Critical", "High", "Medium", "Low"] as const;
export type ExceptionSeverity = (typeof ExceptionSeverity)[number];

export const ExceptionStatus = [
  "Open",
  "In Progress",
  "Waiting For Buyer",
  "Waiting For Supplier",
  "Waiting For Operations",
  "Resolved",
  "Closed",
] as const;
export type ExceptionStatus = (typeof ExceptionStatus)[number];

export const ExceptionOwnerRole = ["BUYER", "SUPPLIER", "ADMIN", "OPERATIONS"] as const;
export type ExceptionOwnerRole = (typeof ExceptionOwnerRole)[number];

export const ExceptionHubQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  severity: z.enum(ExceptionSeverity).optional(),
  status: z.enum(ExceptionStatus).optional(),
  exceptionType: z.enum(ExceptionType).optional(),
  ownerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  tradeType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  waitingForMe: z.coerce.boolean().optional(),
});
export type ExceptionHubQuery = z.infer<typeof ExceptionHubQuery>;

export interface ExceptionHubKpis {
  openExceptions: number;
  criticalExceptions: number;
  myPendingActions: number;
  resolvedThisWeek: number;
  averageResolutionHours: number | null;
  exceptionsByType: Array<{ type: ExceptionType; count: number }>;
}

export interface ExceptionHubAnalytics {
  openExceptions: number;
  averageResolutionHours: number | null;
  exceptionRate: number | null;
  bySupplier: Array<{ name: string; count: number }>;
  byCarrier: Array<{ name: string; count: number }>;
  byTradeType: Array<{ type: string; count: number }>;
}

export interface ExceptionHubRow {
  id: string;
  exceptionRef: string;
  tradeId: string | null;
  tradeRootId: string;
  tradeWorkspaceUrl: string;
  exceptionType: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  buyerName: string | null;
  supplierName: string | null;
  shipmentRef: string | null;
  createdAt: string;
  ownerName: string | null;
  ownerId: string | null;
  ownerRole: ExceptionOwnerRole | null;
  dueDate: string | null;
  resolutionEta: string | null;
  requiredAction: string | null;
  alertId: string | null;
  detailUrl: string;
}

export interface ExceptionHubDetail extends ExceptionHubRow {
  title: string;
  description: string;
  workspaceType: string | null;
  workspaceId: string;
  workspaceRef: string;
  resolutionNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  relatedDocuments: Array<{ id: string; name: string; status: string; url: string }>;
  timeline: Array<{ id: string; label: string; createdAt: string; actorName: string | null }>;
  orchestratorRecommendation?: {
    id: string;
    mode: string;
    rule: string | null;
    plan: Record<string, unknown>;
    createdAt: string;
  } | null;
}

export interface ExceptionHubPayload {
  kpis: ExceptionHubKpis;
  analytics: ExceptionHubAnalytics;
  items: ExceptionHubRow[];
  total: number;
}

export const ExceptionAssignPayload = z.object({
  ownerId: z.string().uuid(),
  ownerRole: z.enum(ExceptionOwnerRole),
});

export const ExceptionResolvePayload = z.object({
  resolutionNote: z.string().min(1),
  resolutionEta: z.string().optional(),
});

export const ExceptionClosePayload = z.object({
  note: z.string().optional(),
});

export interface TradeExceptionsPanelPayload {
  tradeId: string;
  tradeRootId: string;
  open: ExceptionHubRow[];
  resolved: ExceptionHubRow[];
}
