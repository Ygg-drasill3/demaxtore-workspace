import { z } from "zod";
import { OPERATIONAL_EVENT_CATEGORIES, OPERATIONAL_EVENT_SEVERITIES, } from "./operational-timeline.js";
export const OperationalTimelineListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    category: z.enum(OPERATIONAL_EVENT_CATEGORIES).optional(),
    source: z.string().max(80).optional(),
    actorId: z.string().uuid().optional(),
    search: z.string().max(200).optional(),
    from: z.string().datetime({ offset: true }).optional().or(z.string().datetime().optional()),
    to: z.string().datetime({ offset: true }).optional().or(z.string().datetime().optional()),
    sort: z.enum(["occurredAt"]).default("occurredAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
});
export const OperationalTimelineActorSchema = z.object({
    id: z.string(),
    name: z.string(),
});
export const OperationalTimelineEventSchema = z.object({
    id: z.string(),
    purchaseOrderId: z.string().uuid(),
    orderId: z.string().uuid().nullable().optional(),
    category: z.enum(OPERATIONAL_EVENT_CATEGORIES),
    source: z.string(),
    occurredAt: z.string(),
    actor: OperationalTimelineActorSchema.nullable().optional(),
    title: z.string(),
    description: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
    icon: z.string().nullable().optional(),
    severity: z.enum(OPERATIONAL_EVENT_SEVERITIES).nullable().optional(),
    relatedEntity: z
        .object({
        type: z.string(),
        id: z.string(),
    })
        .nullable()
        .optional(),
});
