// Sprint 13B — BulkContainer catalog contracts
import { z } from "zod";
export const BulkSpecParameterType = z.enum(["range", "max", "min", "enum", "text", "year"]);
export const BulkSpecParameterSchema = z.object({
    key: z.string(),
    label: z.string(),
    type: BulkSpecParameterType,
    unit: z.string().optional(),
    required: z.boolean().default(true),
    min: z.number().optional(),
    max: z.number().optional(),
    options: z.array(z.string()).optional(),
    helpText: z.string().optional(),
});
export const BulkSpecTemplateSchema = z.object({
    productType: z.string(),
    parameters: z.array(BulkSpecParameterSchema),
});
export const BulkCatalogListQuery = z.object({
    category: z.string().optional(),
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});
export const BULK_CAPACITY_WARNING_LABELS = {
    partial_container: "Partially Utilized Container",
    over_capacity: "Container Capacity Exceeded",
};
//# sourceMappingURL=bulk-container-catalog.js.map