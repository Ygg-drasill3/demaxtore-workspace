import { z } from "zod";
export declare const OperationalTimelineListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    category: z.ZodOptional<z.ZodEnum<["PURCHASE_ORDER", "REVISION", "DOCUMENT", "INSPECTION", "SHIPMENT", "TASK", "ISSUE", "TRADE", "APPROVAL", "SYSTEM", "OTHER"]>>;
    source: z.ZodOptional<z.ZodString>;
    actorId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    from: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodOptional<z.ZodString>]>;
    to: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodOptional<z.ZodString>]>;
    sort: z.ZodDefault<z.ZodEnum<["occurredAt"]>>;
    direction: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sort: "occurredAt";
    page: number;
    direction: "asc" | "desc";
    pageSize: number;
    category?: "SYSTEM" | "SHIPMENT" | "PURCHASE_ORDER" | "OTHER" | "INSPECTION" | "DOCUMENT" | "APPROVAL" | "TRADE" | "TASK" | "REVISION" | "ISSUE" | undefined;
    source?: string | undefined;
    search?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    actorId?: string | undefined;
}, {
    sort?: "occurredAt" | undefined;
    category?: "SYSTEM" | "SHIPMENT" | "PURCHASE_ORDER" | "OTHER" | "INSPECTION" | "DOCUMENT" | "APPROVAL" | "TRADE" | "TASK" | "REVISION" | "ISSUE" | undefined;
    page?: number | undefined;
    source?: string | undefined;
    search?: string | undefined;
    direction?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    from?: string | undefined;
    to?: string | undefined;
    actorId?: string | undefined;
}>;
export type OperationalTimelineListQuery = z.infer<typeof OperationalTimelineListQuerySchema>;
export declare const OperationalTimelineActorSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name: string;
}>;
export declare const OperationalTimelineEventSchema: z.ZodObject<{
    id: z.ZodString;
    purchaseOrderId: z.ZodString;
    orderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodEnum<["PURCHASE_ORDER", "REVISION", "DOCUMENT", "INSPECTION", "SHIPMENT", "TASK", "ISSUE", "TRADE", "APPROVAL", "SYSTEM", "OTHER"]>;
    source: z.ZodString;
    occurredAt: z.ZodString;
    actor: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>>>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    severity: z.ZodOptional<z.ZodNullable<z.ZodEnum<["info", "success", "warning"]>>>;
    relatedEntity: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        type: z.ZodString;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        id: string;
    }, {
        type: string;
        id: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    category: "SYSTEM" | "SHIPMENT" | "PURCHASE_ORDER" | "OTHER" | "INSPECTION" | "DOCUMENT" | "APPROVAL" | "TRADE" | "TASK" | "REVISION" | "ISSUE";
    source: string;
    title: string;
    purchaseOrderId: string;
    occurredAt: string;
    description?: string | null | undefined;
    orderId?: string | null | undefined;
    severity?: "warning" | "info" | "success" | null | undefined;
    metadata?: Record<string, unknown> | undefined;
    actor?: {
        id: string;
        name: string;
    } | null | undefined;
    icon?: string | null | undefined;
    relatedEntity?: {
        type: string;
        id: string;
    } | null | undefined;
}, {
    id: string;
    category: "SYSTEM" | "SHIPMENT" | "PURCHASE_ORDER" | "OTHER" | "INSPECTION" | "DOCUMENT" | "APPROVAL" | "TRADE" | "TASK" | "REVISION" | "ISSUE";
    source: string;
    title: string;
    purchaseOrderId: string;
    occurredAt: string;
    description?: string | null | undefined;
    orderId?: string | null | undefined;
    severity?: "warning" | "info" | "success" | null | undefined;
    metadata?: Record<string, unknown> | undefined;
    actor?: {
        id: string;
        name: string;
    } | null | undefined;
    icon?: string | null | undefined;
    relatedEntity?: {
        type: string;
        id: string;
    } | null | undefined;
}>;
