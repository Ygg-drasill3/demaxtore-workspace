import { z } from "zod";
export declare const UpdateOperationalConfigurationSchema: z.ZodEffects<z.ZodObject<{
    version: z.ZodNumber;
    risk: z.ZodOptional<z.ZodObject<{
        atRiskMinutes: z.ZodNumber;
        delayedMinutes: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        atRiskMinutes: number;
        delayedMinutes: number;
    }, {
        atRiskMinutes: number;
        delayedMinutes: number;
    }>>;
    defaults: z.ZodOptional<z.ZodObject<{
        etaBufferHours: z.ZodNumber;
        issueSeverity: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
        taskPriority: z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>;
        completionDocsRequired: z.ZodBoolean;
    }, "strict", z.ZodTypeAny, {
        etaBufferHours: number;
        issueSeverity: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        taskPriority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        completionDocsRequired: boolean;
    }, {
        etaBufferHours: number;
        issueSeverity: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        taskPriority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        completionDocsRequired: boolean;
    }>>;
}, "strict", z.ZodTypeAny, {
    version: number;
    risk?: {
        atRiskMinutes: number;
        delayedMinutes: number;
    } | undefined;
    defaults?: {
        etaBufferHours: number;
        issueSeverity: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        taskPriority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        completionDocsRequired: boolean;
    } | undefined;
}, {
    version: number;
    risk?: {
        atRiskMinutes: number;
        delayedMinutes: number;
    } | undefined;
    defaults?: {
        etaBufferHours: number;
        issueSeverity: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        taskPriority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        completionDocsRequired: boolean;
    } | undefined;
}>, {
    version: number;
    risk?: {
        atRiskMinutes: number;
        delayedMinutes: number;
    } | undefined;
    defaults?: {
        etaBufferHours: number;
        issueSeverity: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        taskPriority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        completionDocsRequired: boolean;
    } | undefined;
}, {
    version: number;
    risk?: {
        atRiskMinutes: number;
        delayedMinutes: number;
    } | undefined;
    defaults?: {
        etaBufferHours: number;
        issueSeverity: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        taskPriority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
        completionDocsRequired: boolean;
    } | undefined;
}>;
export type UpdateOperationalConfigurationInput = z.infer<typeof UpdateOperationalConfigurationSchema>;
export declare const UpsertTaskTemplateSchema: z.ZodObject<{
    name: z.ZodString;
    category: z.ZodDefault<z.ZodEnum<["INSPECTION", "SHIPMENT", "DOCUMENT", "QUALITY", "GENERAL"]>>;
    priority: z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
    defaultAssigneeRole: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dueOffsetDays: z.ZodDefault<z.ZodNumber>;
    automationTrigger: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    enabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    name: string;
    category: "SHIPMENT" | "INSPECTION" | "DOCUMENT" | "QUALITY" | "GENERAL";
    priority: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
    dueOffsetDays: number;
    enabled: boolean;
    description?: string | null | undefined;
    defaultAssigneeRole?: string | null | undefined;
    automationTrigger?: string | null | undefined;
}, {
    name: string;
    description?: string | null | undefined;
    category?: "SHIPMENT" | "INSPECTION" | "DOCUMENT" | "QUALITY" | "GENERAL" | undefined;
    priority?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    defaultAssigneeRole?: string | null | undefined;
    dueOffsetDays?: number | undefined;
    automationTrigger?: string | null | undefined;
    enabled?: boolean | undefined;
}>;
export type UpsertTaskTemplateInput = z.infer<typeof UpsertTaskTemplateSchema>;
export declare const PatchTaskTemplateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodDefault<z.ZodEnum<["INSPECTION", "SHIPMENT", "DOCUMENT", "QUALITY", "GENERAL"]>>>;
    priority: z.ZodOptional<z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>>;
    defaultAssigneeRole: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    dueOffsetDays: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    automationTrigger: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    enabled: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
}, "strict", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | null | undefined;
    category?: "SHIPMENT" | "INSPECTION" | "DOCUMENT" | "QUALITY" | "GENERAL" | undefined;
    priority?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    defaultAssigneeRole?: string | null | undefined;
    dueOffsetDays?: number | undefined;
    automationTrigger?: string | null | undefined;
    enabled?: boolean | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
    category?: "SHIPMENT" | "INSPECTION" | "DOCUMENT" | "QUALITY" | "GENERAL" | undefined;
    priority?: "CRITICAL" | "LOW" | "MEDIUM" | "HIGH" | undefined;
    defaultAssigneeRole?: string | null | undefined;
    dueOffsetDays?: number | undefined;
    automationTrigger?: string | null | undefined;
    enabled?: boolean | undefined;
}>;
export type PatchTaskTemplateInput = z.infer<typeof PatchTaskTemplateSchema>;
export declare const UpsertMilestoneTemplateSchema: z.ZodObject<{
    type: z.ZodString;
    name: z.ZodString;
    sequence: z.ZodNumber;
    defaultOffsetDays: z.ZodDefault<z.ZodNumber>;
    enabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    skipByDefault: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strict", z.ZodTypeAny, {
    type: string;
    name: string;
    required: boolean;
    enabled: boolean;
    sequence: number;
    defaultOffsetDays: number;
    skipByDefault: boolean;
}, {
    type: string;
    name: string;
    sequence: number;
    required?: boolean | undefined;
    enabled?: boolean | undefined;
    defaultOffsetDays?: number | undefined;
    skipByDefault?: boolean | undefined;
}>;
export type UpsertMilestoneTemplateInput = z.infer<typeof UpsertMilestoneTemplateSchema>;
export declare const PatchMilestoneTemplateSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    sequence: z.ZodOptional<z.ZodNumber>;
    defaultOffsetDays: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    enabled: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    required: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    skipByDefault: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
}, "strict", z.ZodTypeAny, {
    type?: string | undefined;
    name?: string | undefined;
    required?: boolean | undefined;
    enabled?: boolean | undefined;
    sequence?: number | undefined;
    defaultOffsetDays?: number | undefined;
    skipByDefault?: boolean | undefined;
}, {
    type?: string | undefined;
    name?: string | undefined;
    required?: boolean | undefined;
    enabled?: boolean | undefined;
    sequence?: number | undefined;
    defaultOffsetDays?: number | undefined;
    skipByDefault?: boolean | undefined;
}>;
export type PatchMilestoneTemplateInput = z.infer<typeof PatchMilestoneTemplateSchema>;
export declare const PatchAutomationRuleSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    priority: z.ZodOptional<z.ZodNumber>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strict", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | null | undefined;
    priority?: number | undefined;
    enabled?: boolean | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
    priority?: number | undefined;
    enabled?: boolean | undefined;
}>;
export type PatchAutomationRuleInput = z.infer<typeof PatchAutomationRuleSchema>;
