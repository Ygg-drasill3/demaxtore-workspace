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
];
export const ExceptionSeverity = ["Critical", "High", "Medium", "Low"];
export const ExceptionStatus = [
    "Open",
    "In Progress",
    "Waiting For Buyer",
    "Waiting For Supplier",
    "Waiting For Operations",
    "Resolved",
    "Closed",
];
export const ExceptionOwnerRole = ["BUYER", "SUPPLIER", "ADMIN", "OPERATIONS"];
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
//# sourceMappingURL=exception-hub.js.map