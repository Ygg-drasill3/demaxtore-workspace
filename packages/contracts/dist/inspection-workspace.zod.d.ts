import { z } from "zod";
export declare const PatchInspectionWorkspaceSchema: z.ZodObject<{
    inspectionType: z.ZodOptional<z.ZodEnum<["INITIAL", "DURING_PRODUCTION", "FINAL_RANDOM", "LOADING", "CONTAINER", "PRE_SHIPMENT"]>>;
    factoryName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    supplierName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    shipmentWorkspaceId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    purchaseOrderId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    purchaseOrderId?: string | null | undefined;
    shipmentWorkspaceId?: string | null | undefined;
    supplierName?: string | null | undefined;
    inspectionType?: "INITIAL" | "DURING_PRODUCTION" | "FINAL_RANDOM" | "LOADING" | "CONTAINER" | "PRE_SHIPMENT" | undefined;
    factoryName?: string | null | undefined;
}, {
    purchaseOrderId?: string | null | undefined;
    shipmentWorkspaceId?: string | null | undefined;
    supplierName?: string | null | undefined;
    inspectionType?: "INITIAL" | "DURING_PRODUCTION" | "FINAL_RANDOM" | "LOADING" | "CONTAINER" | "PRE_SHIPMENT" | undefined;
    factoryName?: string | null | undefined;
}>;
export type PatchInspectionWorkspaceInput = z.infer<typeof PatchInspectionWorkspaceSchema>;
export declare const AssignInspectorSchema: z.ZodObject<{
    inspectorName: z.ZodString;
    inspectorOrg: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    inspectorContact: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    inspectorName: string;
    inspectorOrg?: string | null | undefined;
    inspectorContact?: string | null | undefined;
}, {
    inspectorName: string;
    inspectorOrg?: string | null | undefined;
    inspectorContact?: string | null | undefined;
}>;
export type AssignInspectorInput = z.infer<typeof AssignInspectorSchema>;
export declare const ScheduleInspectionSchema: z.ZodObject<{
    plannedDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    actualStartAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    actualFinishAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    cancel: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    plannedDate?: string | null | undefined;
    actualStartAt?: string | null | undefined;
    actualFinishAt?: string | null | undefined;
    cancel?: boolean | undefined;
}, {
    plannedDate?: string | null | undefined;
    actualStartAt?: string | null | undefined;
    actualFinishAt?: string | null | undefined;
    cancel?: boolean | undefined;
}>;
export type ScheduleInspectionInput = z.infer<typeof ScheduleInspectionSchema>;
export declare const CreateInspectionFindingSchema: z.ZodObject<{
    category: z.ZodString;
    severity: z.ZodEnum<["MINOR", "MAJOR", "CRITICAL"]>;
    description: z.ZodString;
    quantity: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    description: string;
    category: string;
    severity: "CRITICAL" | "MINOR" | "MAJOR";
    status?: string | undefined;
    quantity?: number | null | undefined;
}, {
    description: string;
    category: string;
    severity: "CRITICAL" | "MINOR" | "MAJOR";
    status?: string | undefined;
    quantity?: number | null | undefined;
}>;
export type CreateInspectionFindingInput = z.infer<typeof CreateInspectionFindingSchema>;
export declare const PatchInspectionFindingSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<["MINOR", "MAJOR", "CRITICAL"]>>;
    description: z.ZodOptional<z.ZodString>;
    quantity: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    status?: string | undefined;
    description?: string | undefined;
    category?: string | undefined;
    quantity?: number | null | undefined;
    severity?: "CRITICAL" | "MINOR" | "MAJOR" | undefined;
}, {
    status?: string | undefined;
    description?: string | undefined;
    category?: string | undefined;
    quantity?: number | null | undefined;
    severity?: "CRITICAL" | "MINOR" | "MAJOR" | undefined;
}>;
export type PatchInspectionFindingInput = z.infer<typeof PatchInspectionFindingSchema>;
export declare const CreateInspectionDefectSchema: z.ZodObject<{
    code: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodString;
    severity: z.ZodEnum<["MINOR", "MAJOR", "CRITICAL"]>;
    quantity: z.ZodOptional<z.ZodNumber>;
    resolution: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    description: string;
    severity: "CRITICAL" | "MINOR" | "MAJOR";
    code?: string | null | undefined;
    quantity?: number | undefined;
    resolution?: string | null | undefined;
}, {
    description: string;
    severity: "CRITICAL" | "MINOR" | "MAJOR";
    code?: string | null | undefined;
    quantity?: number | undefined;
    resolution?: string | null | undefined;
}>;
export type CreateInspectionDefectInput = z.infer<typeof CreateInspectionDefectSchema>;
export declare const PatchInspectionDefectSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    description: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<["MINOR", "MAJOR", "CRITICAL"]>>;
    quantity: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    resolution: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strict", z.ZodTypeAny, {
    code?: string | null | undefined;
    description?: string | undefined;
    quantity?: number | undefined;
    severity?: "CRITICAL" | "MINOR" | "MAJOR" | undefined;
    resolution?: string | null | undefined;
}, {
    code?: string | null | undefined;
    description?: string | undefined;
    quantity?: number | undefined;
    severity?: "CRITICAL" | "MINOR" | "MAJOR" | undefined;
    resolution?: string | null | undefined;
}>;
export type PatchInspectionDefectInput = z.infer<typeof PatchInspectionDefectSchema>;
export declare const CreateInspectionNcrSchema: z.ZodObject<{
    reason: z.ZodString;
    ownerName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["OPEN", "IN_PROGRESS", "CLOSED"]>>;
}, "strict", z.ZodTypeAny, {
    reason: string;
    status?: "CLOSED" | "OPEN" | "IN_PROGRESS" | undefined;
    ownerName?: string | null | undefined;
    dueDate?: string | null | undefined;
}, {
    reason: string;
    status?: "CLOSED" | "OPEN" | "IN_PROGRESS" | undefined;
    ownerName?: string | null | undefined;
    dueDate?: string | null | undefined;
}>;
export type CreateInspectionNcrInput = z.infer<typeof CreateInspectionNcrSchema>;
export declare const PatchInspectionNcrSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
    ownerName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["OPEN", "IN_PROGRESS", "CLOSED"]>>;
    close: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    status?: "CLOSED" | "OPEN" | "IN_PROGRESS" | undefined;
    ownerName?: string | null | undefined;
    reason?: string | undefined;
    dueDate?: string | null | undefined;
    close?: boolean | undefined;
}, {
    status?: "CLOSED" | "OPEN" | "IN_PROGRESS" | undefined;
    ownerName?: string | null | undefined;
    reason?: string | undefined;
    dueDate?: string | null | undefined;
    close?: boolean | undefined;
}>;
export type PatchInspectionNcrInput = z.infer<typeof PatchInspectionNcrSchema>;
export declare const RecordInspectionDecisionSchema: z.ZodObject<{
    decision: z.ZodEnum<["PASS", "CONDITIONAL_PASS", "FAIL", "REINSPECTION_REQUIRED"]>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    approve: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    decision: "PASS" | "FAIL" | "REINSPECTION_REQUIRED" | "CONDITIONAL_PASS";
    notes?: string | null | undefined;
    approve?: boolean | undefined;
}, {
    decision: "PASS" | "FAIL" | "REINSPECTION_REQUIRED" | "CONDITIONAL_PASS";
    notes?: string | null | undefined;
    approve?: boolean | undefined;
}>;
export type RecordInspectionDecisionInput = z.infer<typeof RecordInspectionDecisionSchema>;
