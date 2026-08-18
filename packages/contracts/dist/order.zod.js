import { z } from "zod";
export const SupplierConfirmOrderPayload = z.object({
    plannedCompletionDate: z.string().datetime().optional(),
});
export const StartProductionPayload = z.object({
    plannedCompletionDate: z.string().datetime(),
});
export const ReportProductionProgressPayload = z.object({
    label: z.string().min(1).max(500),
    percentage: z.number().int().min(0).max(100),
    notes: z.string().max(2000).optional(),
});
export const MarkProductionCompletedPayload = z.object({}).strict();
export const RequestInspectionPayload = z.object({
    inspectorName: z.string().max(200).optional(),
});
export const SkipInspectionPayload = z.object({
    reason: z.string().max(2000).optional(),
});
export const RecordInspectionResultPayload = z.object({
    result: z.enum(["PASS", "FAIL"]),
    reportUrl: z.string().url(),
    inspectorName: z.string().min(1).max(200),
});
export const ProceedToFreightPayload = z.object({}).strict();
export const BookShipmentPayload = z.object({
    freightForwarder: z.string().min(1).max(200),
    vesselName: z.string().min(1).max(200),
    billOfLading: z.string().min(1).max(200),
    expectedDeparture: z.string().datetime(),
});
export const MarkDepartedPayload = z.object({
    actualDepartureDate: z.string().datetime(),
});
export const UpdateEtaPayload = z.object({
    newEta: z.string().datetime(),
    reason: z.string().max(2000).optional(),
});
export const MarkArrivedPayload = z.object({
    actualArrivalDate: z.string().datetime(),
});
export const MarkDeliveredPayload = z.object({
    deliveryConfirmationRef: z.string().max(200).optional(),
});
export const MarkPartiallyDeliveredPayload = z.object({
    partialDeliveryNote: z.string().min(1).max(2000),
    deliveredQuantity: z.number().positive().optional(),
    remainingQuantity: z.number().nonnegative().optional(),
});
export const RejectOrderPayload = z.object({
    reason: z.string().min(3).max(2000),
});
export const CloseOrderPayload = z.object({
    settlementConfirmation: z.string().min(1).max(500),
    finalInvoiceRef: z.string().max(200).optional(),
});
export const OpenDisputePayload = z.object({
    category: z.enum(["QUALITY", "DELAY", "DAMAGE", "DOCUMENT", "PAYMENT", "OTHER"]),
    reason: z.string().min(3).max(2000),
});
export const ResolveDisputePayload = z.object({
    resolution: z.string().min(3).max(2000),
    settlementImpact: z.string().max(2000).optional(),
    refundDirective: z.string().max(2000).optional(),
});
export const CancelOrderPayload = z.object({
    reason: z.string().min(3).max(2000),
});
export const UploadOrderDocumentPayload = z.object({
    documentType: z.enum(["PO", "PI", "INSPECTION", "FREIGHT", "OTHER"]),
    fileName: z.string().min(1).max(500),
    mimeType: z.string().min(1).max(100),
    storageKey: z.string().min(1).max(500),
    fileSizeBytes: z.number().int().positive(),
});
export const PostClarificationPayload = z.object({
    body: z.string().min(1).max(5000),
});
export const OrderListItem = z.object({
    id: z.string().uuid(),
    externalRef: z.string(),
    state: z.string(),
    buyerName: z.string(),
    supplierName: z.string(),
    createdAt: z.string().datetime(),
    lastActivityAt: z.string().datetime(),
    shipmentCount: z.number().int().nonnegative(),
    poReference: z.string().nullable(),
});
export const ListOrderQuery = z.object({
    bucket: z.enum(["all", "active", "completed", "cancelled"]).default("active"),
    q: z.string().max(200).optional(),
    sort: z.enum(["newest", "oldest", "activity"]).default("newest"),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
