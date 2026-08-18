import { z } from "zod";
import { OPERATIONAL_ISSUE_CATEGORIES, OPERATIONAL_ISSUE_RELATED_TYPES, OPERATIONAL_ISSUE_SEVERITIES, OPERATIONAL_ISSUE_STATUSES, } from "./operational-issue.js";
export const CreateOperationalIssueSchema = z
    .object({
    orderId: z.string().uuid(),
    title: z.string().trim().min(2).max(240),
    description: z.string().max(5000).optional().nullable(),
    category: z.enum(OPERATIONAL_ISSUE_CATEGORIES),
    severity: z.enum(OPERATIONAL_ISSUE_SEVERITIES).optional(),
    relatedEntityType: z.enum(OPERATIONAL_ISSUE_RELATED_TYPES).optional().nullable(),
    relatedEntityId: z.string().uuid().optional().nullable(),
    assignedTaskId: z.string().uuid().optional().nullable(),
    createLinkedTask: z.boolean().optional(),
})
    .strict();
export const PatchOperationalIssueSchema = z
    .object({
    title: z.string().trim().min(2).max(240).optional(),
    description: z.string().max(5000).optional().nullable(),
    category: z.enum(OPERATIONAL_ISSUE_CATEGORIES).optional(),
    severity: z.enum(OPERATIONAL_ISSUE_SEVERITIES).optional(),
    status: z.enum(OPERATIONAL_ISSUE_STATUSES).optional(),
    relatedEntityType: z.enum(OPERATIONAL_ISSUE_RELATED_TYPES).optional().nullable(),
    relatedEntityId: z.string().uuid().optional().nullable(),
    assignedTaskId: z.string().uuid().optional().nullable(),
})
    .strict();
export const ResolveOperationalIssueSchema = z
    .object({
    resolutionNote: z.string().trim().min(1).max(4000).optional().nullable(),
    close: z.boolean().optional(),
})
    .strict();
export const ListOperationalIssuesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(OPERATIONAL_ISSUE_STATUSES).optional(),
    severity: z.enum(OPERATIONAL_ISSUE_SEVERITIES).optional(),
    category: z.enum(OPERATIONAL_ISSUE_CATEGORIES).optional(),
    orderId: z.string().uuid().optional(),
    relatedEntityType: z.enum(OPERATIONAL_ISSUE_RELATED_TYPES).optional(),
    q: z.string().max(200).optional(),
});
