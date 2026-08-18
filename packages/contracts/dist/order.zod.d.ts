import { z } from "zod";
export declare const SupplierConfirmOrderPayload: z.ZodObject<{
    plannedCompletionDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    plannedCompletionDate?: string | undefined;
}, {
    plannedCompletionDate?: string | undefined;
}>;
export declare const StartProductionPayload: z.ZodObject<{
    plannedCompletionDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    plannedCompletionDate: string;
}, {
    plannedCompletionDate: string;
}>;
export declare const ReportProductionProgressPayload: z.ZodObject<{
    label: z.ZodString;
    percentage: z.ZodNumber;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    percentage: number;
    notes?: string | undefined;
}, {
    label: string;
    percentage: number;
    notes?: string | undefined;
}>;
export declare const MarkProductionCompletedPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const RequestInspectionPayload: z.ZodObject<{
    inspectorName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    inspectorName?: string | undefined;
}, {
    inspectorName?: string | undefined;
}>;
export declare const SkipInspectionPayload: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export declare const RecordInspectionResultPayload: z.ZodObject<{
    result: z.ZodEnum<["PASS", "FAIL"]>;
    reportUrl: z.ZodString;
    inspectorName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    inspectorName: string;
    result: "PASS" | "FAIL";
    reportUrl: string;
}, {
    inspectorName: string;
    result: "PASS" | "FAIL";
    reportUrl: string;
}>;
export declare const ProceedToFreightPayload: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export declare const BookShipmentPayload: z.ZodObject<{
    freightForwarder: z.ZodString;
    vesselName: z.ZodString;
    billOfLading: z.ZodString;
    expectedDeparture: z.ZodString;
}, "strip", z.ZodTypeAny, {
    vesselName: string;
    freightForwarder: string;
    billOfLading: string;
    expectedDeparture: string;
}, {
    vesselName: string;
    freightForwarder: string;
    billOfLading: string;
    expectedDeparture: string;
}>;
export declare const MarkDepartedPayload: z.ZodObject<{
    actualDepartureDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    actualDepartureDate: string;
}, {
    actualDepartureDate: string;
}>;
export declare const UpdateEtaPayload: z.ZodObject<{
    newEta: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    newEta: string;
    reason?: string | undefined;
}, {
    newEta: string;
    reason?: string | undefined;
}>;
export declare const MarkArrivedPayload: z.ZodObject<{
    actualArrivalDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    actualArrivalDate: string;
}, {
    actualArrivalDate: string;
}>;
export declare const MarkDeliveredPayload: z.ZodObject<{
    deliveryConfirmationRef: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    deliveryConfirmationRef?: string | undefined;
}, {
    deliveryConfirmationRef?: string | undefined;
}>;
export declare const MarkPartiallyDeliveredPayload: z.ZodObject<{
    partialDeliveryNote: z.ZodString;
    deliveredQuantity: z.ZodOptional<z.ZodNumber>;
    remainingQuantity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    partialDeliveryNote: string;
    deliveredQuantity?: number | undefined;
    remainingQuantity?: number | undefined;
}, {
    partialDeliveryNote: string;
    deliveredQuantity?: number | undefined;
    remainingQuantity?: number | undefined;
}>;
export declare const RejectOrderPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const CloseOrderPayload: z.ZodObject<{
    settlementConfirmation: z.ZodString;
    finalInvoiceRef: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    settlementConfirmation: string;
    finalInvoiceRef?: string | undefined;
}, {
    settlementConfirmation: string;
    finalInvoiceRef?: string | undefined;
}>;
export declare const OpenDisputePayload: z.ZodObject<{
    category: z.ZodEnum<["QUALITY", "DELAY", "DAMAGE", "DOCUMENT", "PAYMENT", "OTHER"]>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    category: "OTHER" | "DOCUMENT" | "PAYMENT" | "QUALITY" | "DELAY" | "DAMAGE";
    reason: string;
}, {
    category: "OTHER" | "DOCUMENT" | "PAYMENT" | "QUALITY" | "DELAY" | "DAMAGE";
    reason: string;
}>;
export declare const ResolveDisputePayload: z.ZodObject<{
    resolution: z.ZodString;
    settlementImpact: z.ZodOptional<z.ZodString>;
    refundDirective: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    resolution: string;
    settlementImpact?: string | undefined;
    refundDirective?: string | undefined;
}, {
    resolution: string;
    settlementImpact?: string | undefined;
    refundDirective?: string | undefined;
}>;
export declare const CancelOrderPayload: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const UploadOrderDocumentPayload: z.ZodObject<{
    documentType: z.ZodEnum<["PO", "PI", "INSPECTION", "FREIGHT", "OTHER"]>;
    fileName: z.ZodString;
    mimeType: z.ZodString;
    storageKey: z.ZodString;
    fileSizeBytes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    mimeType: string;
    documentType: "FREIGHT" | "OTHER" | "INSPECTION" | "PO" | "PI";
    storageKey: string;
    fileSizeBytes: number;
}, {
    fileName: string;
    mimeType: string;
    documentType: "FREIGHT" | "OTHER" | "INSPECTION" | "PO" | "PI";
    storageKey: string;
    fileSizeBytes: number;
}>;
export declare const PostClarificationPayload: z.ZodObject<{
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    body: string;
}, {
    body: string;
}>;
export declare const OrderListItem: z.ZodObject<{
    id: z.ZodString;
    externalRef: z.ZodString;
    state: z.ZodString;
    buyerName: z.ZodString;
    supplierName: z.ZodString;
    createdAt: z.ZodString;
    lastActivityAt: z.ZodString;
    shipmentCount: z.ZodNumber;
    poReference: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    externalRef: string;
    state: string;
    buyerName: string;
    supplierName: string;
    lastActivityAt: string;
    shipmentCount: number;
    poReference: string | null;
}, {
    id: string;
    createdAt: string;
    externalRef: string;
    state: string;
    buyerName: string;
    supplierName: string;
    lastActivityAt: string;
    shipmentCount: number;
    poReference: string | null;
}>;
export declare const ListOrderQuery: z.ZodObject<{
    bucket: z.ZodDefault<z.ZodEnum<["all", "active", "completed", "cancelled"]>>;
    q: z.ZodOptional<z.ZodString>;
    sort: z.ZodDefault<z.ZodEnum<["newest", "oldest", "activity"]>>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort: "newest" | "oldest" | "activity";
    limit: number;
    bucket: "completed" | "active" | "all" | "cancelled";
    q?: string | undefined;
    cursor?: string | undefined;
}, {
    sort?: "newest" | "oldest" | "activity" | undefined;
    q?: string | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
    bucket?: "completed" | "active" | "all" | "cancelled" | undefined;
}>;
export type ListOrderQuery = z.infer<typeof ListOrderQuery>;
export type OrderListItem = z.infer<typeof OrderListItem>;
