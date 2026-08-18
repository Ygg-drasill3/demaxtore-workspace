import { z } from "zod";
export declare const CreateOperationalIssueSchema: z.ZodObject<{
    orderId: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodEnum<["SHIPMENT_DELAY", "BOOKING_FAILURE", "INSPECTION_FAILURE", "DOCUMENT_MISSING", "DOCUMENT_EXPIRED", "SUPPLIER_RESPONSE", "QUALITY_ISSUE", "OTHER"]>;
    severity: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
    relatedEntityType: z.ZodNullable<z.ZodOptional<z.ZodEnum<["PURCHASE_ORDER", "SHIPMENT", "INSPECTION", "COMMERCIAL_DOCUMENT", "TASK"]>>>;
    relatedEntityId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assignedTaskId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    createLinkedTask: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    category: "OTHER" | "DOCUMENT_MISSING" | "SHIPMENT_DELAY" | "BOOKING_FAILURE" | "INSPECTION_FAILURE" | "DOCUMENT_EXPIRED" | "SUPPLIER_RESPONSE" | "QUALITY_ISSUE";
    orderId: string;
    title: string;
    description?: string | null | undefined;
    severity?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    relatedEntityType?: "SHIPMENT" | "PURCHASE_ORDER" | "INSPECTION" | "COMMERCIAL_DOCUMENT" | "TASK" | null | undefined;
    relatedEntityId?: string | null | undefined;
    assignedTaskId?: string | null | undefined;
    createLinkedTask?: boolean | undefined;
}, {
    category: "OTHER" | "DOCUMENT_MISSING" | "SHIPMENT_DELAY" | "BOOKING_FAILURE" | "INSPECTION_FAILURE" | "DOCUMENT_EXPIRED" | "SUPPLIER_RESPONSE" | "QUALITY_ISSUE";
    orderId: string;
    title: string;
    description?: string | null | undefined;
    severity?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    relatedEntityType?: "SHIPMENT" | "PURCHASE_ORDER" | "INSPECTION" | "COMMERCIAL_DOCUMENT" | "TASK" | null | undefined;
    relatedEntityId?: string | null | undefined;
    assignedTaskId?: string | null | undefined;
    createLinkedTask?: boolean | undefined;
}>;
export type CreateOperationalIssueInput = z.infer<typeof CreateOperationalIssueSchema>;
export declare const PatchOperationalIssueSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodOptional<z.ZodEnum<["SHIPMENT_DELAY", "BOOKING_FAILURE", "INSPECTION_FAILURE", "DOCUMENT_MISSING", "DOCUMENT_EXPIRED", "SUPPLIER_RESPONSE", "QUALITY_ISSUE", "OTHER"]>>;
    severity: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
    status: z.ZodOptional<z.ZodEnum<["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]>>;
    relatedEntityType: z.ZodNullable<z.ZodOptional<z.ZodEnum<["PURCHASE_ORDER", "SHIPMENT", "INSPECTION", "COMMERCIAL_DOCUMENT", "TASK"]>>>;
    relatedEntityId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assignedTaskId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    status?: "CLOSED" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | undefined;
    description?: string | null | undefined;
    category?: "OTHER" | "DOCUMENT_MISSING" | "SHIPMENT_DELAY" | "BOOKING_FAILURE" | "INSPECTION_FAILURE" | "DOCUMENT_EXPIRED" | "SUPPLIER_RESPONSE" | "QUALITY_ISSUE" | undefined;
    title?: string | undefined;
    severity?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    relatedEntityType?: "SHIPMENT" | "PURCHASE_ORDER" | "INSPECTION" | "COMMERCIAL_DOCUMENT" | "TASK" | null | undefined;
    relatedEntityId?: string | null | undefined;
    assignedTaskId?: string | null | undefined;
}, {
    status?: "CLOSED" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | undefined;
    description?: string | null | undefined;
    category?: "OTHER" | "DOCUMENT_MISSING" | "SHIPMENT_DELAY" | "BOOKING_FAILURE" | "INSPECTION_FAILURE" | "DOCUMENT_EXPIRED" | "SUPPLIER_RESPONSE" | "QUALITY_ISSUE" | undefined;
    title?: string | undefined;
    severity?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    relatedEntityType?: "SHIPMENT" | "PURCHASE_ORDER" | "INSPECTION" | "COMMERCIAL_DOCUMENT" | "TASK" | null | undefined;
    relatedEntityId?: string | null | undefined;
    assignedTaskId?: string | null | undefined;
}>;
export type PatchOperationalIssueInput = z.infer<typeof PatchOperationalIssueSchema>;
export declare const ResolveOperationalIssueSchema: z.ZodObject<{
    resolutionNote: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    close: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    resolutionNote?: string | null | undefined;
    close?: boolean | undefined;
}, {
    resolutionNote?: string | null | undefined;
    close?: boolean | undefined;
}>;
export type ResolveOperationalIssueInput = z.infer<typeof ResolveOperationalIssueSchema>;
export declare const ListOperationalIssuesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodEnum<["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]>>;
    severity: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
    category: z.ZodOptional<z.ZodEnum<["SHIPMENT_DELAY", "BOOKING_FAILURE", "INSPECTION_FAILURE", "DOCUMENT_MISSING", "DOCUMENT_EXPIRED", "SUPPLIER_RESPONSE", "QUALITY_ISSUE", "OTHER"]>>;
    orderId: z.ZodOptional<z.ZodString>;
    relatedEntityType: z.ZodOptional<z.ZodEnum<["PURCHASE_ORDER", "SHIPMENT", "INSPECTION", "COMMERCIAL_DOCUMENT", "TASK"]>>;
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    status?: "CLOSED" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | undefined;
    category?: "OTHER" | "DOCUMENT_MISSING" | "SHIPMENT_DELAY" | "BOOKING_FAILURE" | "INSPECTION_FAILURE" | "DOCUMENT_EXPIRED" | "SUPPLIER_RESPONSE" | "QUALITY_ISSUE" | undefined;
    q?: string | undefined;
    orderId?: string | undefined;
    severity?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    relatedEntityType?: "SHIPMENT" | "PURCHASE_ORDER" | "INSPECTION" | "COMMERCIAL_DOCUMENT" | "TASK" | undefined;
}, {
    status?: "CLOSED" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | undefined;
    category?: "OTHER" | "DOCUMENT_MISSING" | "SHIPMENT_DELAY" | "BOOKING_FAILURE" | "INSPECTION_FAILURE" | "DOCUMENT_EXPIRED" | "SUPPLIER_RESPONSE" | "QUALITY_ISSUE" | undefined;
    q?: string | undefined;
    page?: number | undefined;
    orderId?: string | undefined;
    pageSize?: number | undefined;
    severity?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    relatedEntityType?: "SHIPMENT" | "PURCHASE_ORDER" | "INSPECTION" | "COMMERCIAL_DOCUMENT" | "TASK" | undefined;
}>;
export type ListOperationalIssuesQuery = z.infer<typeof ListOperationalIssuesQuerySchema>;
