import { z } from "zod";
import {
  OPERATIONAL_TASK_PRIORITIES,
  OPERATIONAL_TASK_RELATED_TYPES,
  OPERATIONAL_TASK_STATUSES,
} from "./operational-task";

export const CreateOperationalTaskSchema = z
  .object({
    orderId: z.string().uuid(),
    purchaseOrderId: z.string().uuid().optional().nullable(),
    title: z.string().trim().min(2).max(240),
    description: z.string().max(5000).optional().nullable(),
    priority: z.enum(OPERATIONAL_TASK_PRIORITIES).optional(),
    dueDate: z.string().datetime().optional().nullable(),
    assignedToId: z.string().uuid().optional().nullable(),
    relatedEntityType: z.enum(OPERATIONAL_TASK_RELATED_TYPES).optional().nullable(),
    relatedEntityId: z.string().uuid().optional().nullable(),
  })
  .strict();
export type CreateOperationalTaskInput = z.infer<typeof CreateOperationalTaskSchema>;

export const PatchOperationalTaskSchema = z
  .object({
    title: z.string().trim().min(2).max(240).optional(),
    description: z.string().max(5000).optional().nullable(),
    priority: z.enum(OPERATIONAL_TASK_PRIORITIES).optional(),
    dueDate: z.string().datetime().optional().nullable(),
    status: z.enum(OPERATIONAL_TASK_STATUSES).optional(),
    relatedEntityType: z.enum(OPERATIONAL_TASK_RELATED_TYPES).optional().nullable(),
    relatedEntityId: z.string().uuid().optional().nullable(),
  })
  .strict();
export type PatchOperationalTaskInput = z.infer<typeof PatchOperationalTaskSchema>;

export const AssignOperationalTaskSchema = z
  .object({
    assignedToId: z.string().uuid().nullable(),
  })
  .strict();
export type AssignOperationalTaskInput = z.infer<typeof AssignOperationalTaskSchema>;

export const CreateOperationalTaskCommentSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
  })
  .strict();
export type CreateOperationalTaskCommentInput = z.infer<typeof CreateOperationalTaskCommentSchema>;

export const ListOperationalTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(OPERATIONAL_TASK_STATUSES).optional(),
  priority: z.enum(OPERATIONAL_TASK_PRIORITIES).optional(),
  assignedToId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  mine: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
  overdue: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
  dueToday: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
  q: z.string().max(200).optional(),
});
export type ListOperationalTasksQuery = z.infer<typeof ListOperationalTasksQuerySchema>;
