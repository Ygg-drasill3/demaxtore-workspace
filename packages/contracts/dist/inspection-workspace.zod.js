import { z } from "zod";
import { INSPECTION_DECISIONS, INSPECTION_NCR_STATUSES, INSPECTION_SEVERITIES, INSPECTION_TYPES, } from "./inspection-workspace.js";
export const PatchInspectionWorkspaceSchema = z
    .object({
    inspectionType: z.enum(INSPECTION_TYPES).optional(),
    factoryName: z.string().max(300).optional().nullable(),
    supplierName: z.string().max(300).optional().nullable(),
    shipmentWorkspaceId: z.string().uuid().optional().nullable(),
    purchaseOrderId: z.string().uuid().optional().nullable(),
})
    .strict();
export const AssignInspectorSchema = z
    .object({
    inspectorName: z.string().min(1).max(200),
    inspectorOrg: z.string().max(200).optional().nullable(),
    inspectorContact: z.string().max(200).optional().nullable(),
})
    .strict();
export const ScheduleInspectionSchema = z
    .object({
    plannedDate: z.string().datetime().optional().nullable(),
    actualStartAt: z.string().datetime().optional().nullable(),
    actualFinishAt: z.string().datetime().optional().nullable(),
    cancel: z.boolean().optional(),
})
    .strict();
export const CreateInspectionFindingSchema = z
    .object({
    category: z.string().min(1).max(120),
    severity: z.enum(INSPECTION_SEVERITIES),
    description: z.string().min(1).max(5000),
    quantity: z.number().int().nonnegative().optional().nullable(),
    status: z.string().max(40).optional(),
})
    .strict();
export const PatchInspectionFindingSchema = CreateInspectionFindingSchema.partial().strict();
export const CreateInspectionDefectSchema = z
    .object({
    code: z.string().max(40).optional().nullable(),
    description: z.string().min(1).max(5000),
    severity: z.enum(INSPECTION_SEVERITIES),
    quantity: z.number().int().positive().optional(),
    resolution: z.string().max(2000).optional().nullable(),
})
    .strict();
export const PatchInspectionDefectSchema = CreateInspectionDefectSchema.partial().strict();
export const CreateInspectionNcrSchema = z
    .object({
    reason: z.string().min(1).max(5000),
    ownerName: z.string().max(200).optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    status: z.enum(INSPECTION_NCR_STATUSES).optional(),
})
    .strict();
export const PatchInspectionNcrSchema = z
    .object({
    reason: z.string().min(1).max(5000).optional(),
    ownerName: z.string().max(200).optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    status: z.enum(INSPECTION_NCR_STATUSES).optional(),
    close: z.boolean().optional(),
})
    .strict();
export const RecordInspectionDecisionSchema = z
    .object({
    decision: z.enum(INSPECTION_DECISIONS),
    notes: z.string().max(5000).optional().nullable(),
    approve: z.boolean().optional(),
})
    .strict();
