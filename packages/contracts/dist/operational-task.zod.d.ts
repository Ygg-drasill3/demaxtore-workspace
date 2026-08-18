import { z } from "zod";
export declare const CreateOperationalTaskSchema: z.ZodObject<{
    orderId: z.ZodString;
    purchaseOrderId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assignedToId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    relatedEntityType: z.ZodNullable<z.ZodOptional<z.ZodEnum<["ORDER", "PURCHASE_ORDER", "SHIPMENT", "INSPECTION", "DOCUMENT", "REVISION", "NCR"]>>>;
    relatedEntityId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    orderId: string;
    title: string;
    description?: string | null | undefined;
    purchaseOrderId?: string | null | undefined;
    priority?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    dueDate?: string | null | undefined;
    relatedEntityType?: "ORDER" | "SHIPMENT" | "PURCHASE_ORDER" | "INSPECTION" | "DOCUMENT" | "REVISION" | "NCR" | null | undefined;
    relatedEntityId?: string | null | undefined;
    assignedToId?: string | null | undefined;
}, {
    orderId: string;
    title: string;
    description?: string | null | undefined;
    purchaseOrderId?: string | null | undefined;
    priority?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    dueDate?: string | null | undefined;
    relatedEntityType?: "ORDER" | "SHIPMENT" | "PURCHASE_ORDER" | "INSPECTION" | "DOCUMENT" | "REVISION" | "NCR" | null | undefined;
    relatedEntityId?: string | null | undefined;
    assignedToId?: string | null | undefined;
}>;
export type CreateOperationalTaskInput = z.infer<typeof CreateOperationalTaskSchema>;
export declare const PatchOperationalTaskSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]>>;
    relatedEntityType: z.ZodNullable<z.ZodOptional<z.ZodEnum<["ORDER", "PURCHASE_ORDER", "SHIPMENT", "INSPECTION", "DOCUMENT", "REVISION", "NCR"]>>>;
    relatedEntityId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    status?: "CANCELLED" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "ASSIGNED" | undefined;
    description?: string | null | undefined;
    title?: string | undefined;
    priority?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    dueDate?: string | null | undefined;
    relatedEntityType?: "ORDER" | "SHIPMENT" | "PURCHASE_ORDER" | "INSPECTION" | "DOCUMENT" | "REVISION" | "NCR" | null | undefined;
    relatedEntityId?: string | null | undefined;
}, {
    status?: "CANCELLED" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "ASSIGNED" | undefined;
    description?: string | null | undefined;
    title?: string | undefined;
    priority?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    dueDate?: string | null | undefined;
    relatedEntityType?: "ORDER" | "SHIPMENT" | "PURCHASE_ORDER" | "INSPECTION" | "DOCUMENT" | "REVISION" | "NCR" | null | undefined;
    relatedEntityId?: string | null | undefined;
}>;
export type PatchOperationalTaskInput = z.infer<typeof PatchOperationalTaskSchema>;
export declare const AssignOperationalTaskSchema: z.ZodObject<{
    assignedToId: z.ZodNullable<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    assignedToId: string | null;
}, {
    assignedToId: string | null;
}>;
export type AssignOperationalTaskInput = z.infer<typeof AssignOperationalTaskSchema>;
export declare const CreateOperationalTaskCommentSchema: z.ZodObject<{
    message: z.ZodString;
}, "strict", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
export type CreateOperationalTaskCommentInput = z.infer<typeof CreateOperationalTaskCommentSchema>;
export declare const ListOperationalTasksQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodEnum<["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]>>;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
    assignedToId: z.ZodOptional<z.ZodString>;
    orderId: z.ZodOptional<z.ZodString>;
    mine: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"true">, z.ZodLiteral<"false">, z.ZodBoolean]>>, boolean, boolean | "true" | "false" | undefined>;
    overdue: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"true">, z.ZodLiteral<"false">, z.ZodBoolean]>>, boolean, boolean | "true" | "false" | undefined>;
    dueToday: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"true">, z.ZodLiteral<"false">, z.ZodBoolean]>>, boolean, boolean | "true" | "false" | undefined>;
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    mine: boolean;
    overdue: boolean;
    dueToday: boolean;
    status?: "CANCELLED" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "ASSIGNED" | undefined;
    q?: string | undefined;
    orderId?: string | undefined;
    priority?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    assignedToId?: string | undefined;
}, {
    status?: "CANCELLED" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "ASSIGNED" | undefined;
    q?: string | undefined;
    page?: number | undefined;
    orderId?: string | undefined;
    pageSize?: number | undefined;
    priority?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    mine?: boolean | "true" | "false" | undefined;
    assignedToId?: string | undefined;
    overdue?: boolean | "true" | "false" | undefined;
    dueToday?: boolean | "true" | "false" | undefined;
}>;
export type ListOperationalTasksQuery = z.infer<typeof ListOperationalTasksQuerySchema>;
