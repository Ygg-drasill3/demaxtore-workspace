import { z } from "zod";
import { OPS_TASK_TEMPLATE_CATEGORIES } from "./operational-configuration.js";
export const UpdateOperationalConfigurationSchema = z
    .object({
    version: z.number().int().positive(),
    risk: z
        .object({
        atRiskMinutes: z.number().int().min(0).max(60 * 24 * 30),
        delayedMinutes: z.number().int().min(1).max(60 * 24 * 90),
    })
        .strict()
        .optional(),
    defaults: z
        .object({
        etaBufferHours: z.number().int().min(0).max(24 * 30),
        issueSeverity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        taskPriority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        completionDocsRequired: z.boolean(),
    })
        .strict()
        .optional(),
})
    .strict()
    .superRefine((val, ctx) => {
    if (val.risk && val.risk.delayedMinutes <= val.risk.atRiskMinutes) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "delayedMinutes must be greater than atRiskMinutes",
            path: ["risk", "delayedMinutes"],
        });
    }
});
export const UpsertTaskTemplateSchema = z
    .object({
    name: z.string().trim().min(2).max(160),
    category: z.enum(OPS_TASK_TEMPLATE_CATEGORIES).default("GENERAL"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
    defaultAssigneeRole: z.string().trim().max(64).nullable().optional(),
    dueOffsetDays: z.number().int().min(0).max(365).default(3),
    automationTrigger: z.string().trim().max(120).nullable().optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    enabled: z.boolean().optional().default(true),
})
    .strict();
export const PatchTaskTemplateSchema = UpsertTaskTemplateSchema.partial().strict();
export const UpsertMilestoneTemplateSchema = z
    .object({
    type: z.string().trim().min(2).max(64),
    name: z.string().trim().min(2).max(160),
    sequence: z.number().int().min(1).max(10_000),
    defaultOffsetDays: z.number().int().min(0).max(365).default(0),
    enabled: z.boolean().optional().default(true),
    required: z.boolean().optional().default(true),
    skipByDefault: z.boolean().optional().default(false),
})
    .strict();
export const PatchMilestoneTemplateSchema = UpsertMilestoneTemplateSchema.partial().strict();
export const PatchAutomationRuleSchema = z
    .object({
    enabled: z.boolean().optional(),
    priority: z.number().int().min(0).max(10_000).optional(),
    name: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
})
    .strict();
