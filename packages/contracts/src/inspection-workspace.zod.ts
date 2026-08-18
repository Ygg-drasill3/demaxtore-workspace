import { z } from "zod";
import {
  INSPECTION_DECISIONS,
  INSPECTION_NCR_STATUSES,
  INSPECTION_SEVERITIES,
  INSPECTION_TYPES,
} from "./inspection-workspace";

export const PatchInspectionWorkspaceSchema = z
  .object({
    inspectionType: z.enum(INSPECTION_TYPES).optional(),
    factoryName: z.string().max(300).optional().nullable(),
    supplierName: z.string().max(300).optional().nullable(),
    shipmentWorkspaceId: z.string().uuid().optional().nullable(),
    purchaseOrderId: z.string().uuid().optional().nullable(),
  })
  .strict();
export type PatchInspectionWorkspaceInput = z.infer<typeof PatchInspectionWorkspaceSchema>;

export const AssignInspectorSchema = z
  .object({
    inspectorName: z.string().min(1).max(200),
    inspectorOrg: z.string().max(200).optional().nullable(),
    inspectorContact: z.string().max(200).optional().nullable(),
  })
  .strict();
export type AssignInspectorInput = z.infer<typeof AssignInspectorSchema>;

export const ScheduleInspectionSchema = z
  .object({
    plannedDate: z.string().datetime().optional().nullable(),
    actualStartAt: z.string().datetime().optional().nullable(),
    actualFinishAt: z.string().datetime().optional().nullable(),
    cancel: z.boolean().optional(),
  })
  .strict();
export type ScheduleInspectionInput = z.infer<typeof ScheduleInspectionSchema>;

export const CreateInspectionFindingSchema = z
  .object({
    category: z.string().min(1).max(120),
    severity: z.enum(INSPECTION_SEVERITIES),
    description: z.string().min(1).max(5000),
    quantity: z.number().int().nonnegative().optional().nullable(),
    status: z.string().max(40).optional(),
  })
  .strict();
export type CreateInspectionFindingInput = z.infer<typeof CreateInspectionFindingSchema>;

export const PatchInspectionFindingSchema = CreateInspectionFindingSchema.partial().strict();
export type PatchInspectionFindingInput = z.infer<typeof PatchInspectionFindingSchema>;

export const CreateInspectionDefectSchema = z
  .object({
    code: z.string().max(40).optional().nullable(),
    description: z.string().min(1).max(5000),
    severity: z.enum(INSPECTION_SEVERITIES),
    quantity: z.number().int().positive().optional(),
    resolution: z.string().max(2000).optional().nullable(),
  })
  .strict();
export type CreateInspectionDefectInput = z.infer<typeof CreateInspectionDefectSchema>;

export const PatchInspectionDefectSchema = CreateInspectionDefectSchema.partial().strict();
export type PatchInspectionDefectInput = z.infer<typeof PatchInspectionDefectSchema>;

export const CreateInspectionNcrSchema = z
  .object({
    reason: z.string().min(1).max(5000),
    ownerName: z.string().max(200).optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    status: z.enum(INSPECTION_NCR_STATUSES).optional(),
  })
  .strict();
export type CreateInspectionNcrInput = z.infer<typeof CreateInspectionNcrSchema>;

export const PatchInspectionNcrSchema = z
  .object({
    reason: z.string().min(1).max(5000).optional(),
    ownerName: z.string().max(200).optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    status: z.enum(INSPECTION_NCR_STATUSES).optional(),
    close: z.boolean().optional(),
  })
  .strict();
export type PatchInspectionNcrInput = z.infer<typeof PatchInspectionNcrSchema>;

export const RecordInspectionDecisionSchema = z
  .object({
    decision: z.enum(INSPECTION_DECISIONS),
    notes: z.string().max(5000).optional().nullable(),
    approve: z.boolean().optional(),
  })
  .strict();
export type RecordInspectionDecisionInput = z.infer<typeof RecordInspectionDecisionSchema>;
