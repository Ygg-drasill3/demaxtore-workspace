import { z } from "zod";
export declare const ExceptionType: readonly ["Shipment Delay", "ETA Change", "Production Delay", "Missing Document", "Document Rejected", "Document Revision Requested", "Customs Issue", "Container Roll-over", "Carrier Update", "Payment Pending", "PO Pending", "Inspection Issue", "Contract Issue", "Order/Shipment Mismatch", "Manual Exception"];
export type ExceptionType = (typeof ExceptionType)[number];
export declare const ExceptionSeverity: readonly ["Critical", "High", "Medium", "Low"];
export type ExceptionSeverity = (typeof ExceptionSeverity)[number];
export declare const ExceptionStatus: readonly ["Open", "In Progress", "Waiting For Buyer", "Waiting For Supplier", "Waiting For Operations", "Resolved", "Closed"];
export type ExceptionStatus = (typeof ExceptionStatus)[number];
export declare const ExceptionOwnerRole: readonly ["BUYER", "SUPPLIER", "ADMIN", "OPERATIONS"];
export type ExceptionOwnerRole = (typeof ExceptionOwnerRole)[number];
export declare const ExceptionHubQuery: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    severity: z.ZodOptional<z.ZodEnum<["Critical", "High", "Medium", "Low"]>>;
    status: z.ZodOptional<z.ZodEnum<["Open", "In Progress", "Waiting For Buyer", "Waiting For Supplier", "Waiting For Operations", "Resolved", "Closed"]>>;
    exceptionType: z.ZodOptional<z.ZodEnum<["Shipment Delay", "ETA Change", "Production Delay", "Missing Document", "Document Rejected", "Document Revision Requested", "Customs Issue", "Container Roll-over", "Carrier Update", "Payment Pending", "PO Pending", "Inspection Issue", "Contract Issue", "Order/Shipment Mismatch", "Manual Exception"]>>;
    ownerId: z.ZodOptional<z.ZodString>;
    supplierId: z.ZodOptional<z.ZodString>;
    tradeType: z.ZodOptional<z.ZodString>;
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    waitingForMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    status?: "Closed" | "Open" | "In Progress" | "Waiting For Buyer" | "Waiting For Supplier" | "Waiting For Operations" | "Resolved" | undefined;
    search?: string | undefined;
    severity?: "Critical" | "High" | "Medium" | "Low" | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    supplierId?: string | undefined;
    exceptionType?: "Shipment Delay" | "ETA Change" | "Production Delay" | "Missing Document" | "Document Rejected" | "Document Revision Requested" | "Customs Issue" | "Container Roll-over" | "Carrier Update" | "Payment Pending" | "PO Pending" | "Inspection Issue" | "Contract Issue" | "Order/Shipment Mismatch" | "Manual Exception" | undefined;
    ownerId?: string | undefined;
    tradeType?: string | undefined;
    waitingForMe?: boolean | undefined;
}, {
    status?: "Closed" | "Open" | "In Progress" | "Waiting For Buyer" | "Waiting For Supplier" | "Waiting For Operations" | "Resolved" | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    offset?: number | undefined;
    severity?: "Critical" | "High" | "Medium" | "Low" | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    supplierId?: string | undefined;
    exceptionType?: "Shipment Delay" | "ETA Change" | "Production Delay" | "Missing Document" | "Document Rejected" | "Document Revision Requested" | "Customs Issue" | "Container Roll-over" | "Carrier Update" | "Payment Pending" | "PO Pending" | "Inspection Issue" | "Contract Issue" | "Order/Shipment Mismatch" | "Manual Exception" | undefined;
    ownerId?: string | undefined;
    tradeType?: string | undefined;
    waitingForMe?: boolean | undefined;
}>;
export type ExceptionHubQuery = z.infer<typeof ExceptionHubQuery>;
export interface ExceptionHubKpis {
    openExceptions: number;
    criticalExceptions: number;
    myPendingActions: number;
    resolvedThisWeek: number;
    averageResolutionHours: number | null;
    exceptionsByType: Array<{
        type: ExceptionType;
        count: number;
    }>;
}
export interface ExceptionHubAnalytics {
    openExceptions: number;
    averageResolutionHours: number | null;
    exceptionRate: number | null;
    bySupplier: Array<{
        name: string;
        count: number;
    }>;
    byCarrier: Array<{
        name: string;
        count: number;
    }>;
    byTradeType: Array<{
        type: string;
        count: number;
    }>;
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
    relatedDocuments: Array<{
        id: string;
        name: string;
        status: string;
        url: string;
    }>;
    timeline: Array<{
        id: string;
        label: string;
        createdAt: string;
        actorName: string | null;
    }>;
    /** Order/Shipment orchestrator suggestion for this exception, when one was produced. */
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
export declare const ExceptionAssignPayload: z.ZodObject<{
    ownerId: z.ZodString;
    ownerRole: z.ZodEnum<["BUYER", "SUPPLIER", "ADMIN", "OPERATIONS"]>;
}, "strip", z.ZodTypeAny, {
    ownerRole: "BUYER" | "SUPPLIER" | "ADMIN" | "OPERATIONS";
    ownerId: string;
}, {
    ownerRole: "BUYER" | "SUPPLIER" | "ADMIN" | "OPERATIONS";
    ownerId: string;
}>;
export declare const ExceptionResolvePayload: z.ZodObject<{
    resolutionNote: z.ZodString;
    resolutionEta: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    resolutionNote: string;
    resolutionEta?: string | undefined;
}, {
    resolutionNote: string;
    resolutionEta?: string | undefined;
}>;
export declare const ExceptionClosePayload: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export interface TradeExceptionsPanelPayload {
    tradeId: string;
    tradeRootId: string;
    open: ExceptionHubRow[];
    resolved: ExceptionHubRow[];
}
