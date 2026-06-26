// Sprint 13B.1 — Unified Packing Type architecture
import { z } from "zod";
export const PACKING_SEGMENTS = ["RETAIL", "HORECA", "INDUSTRIAL"];
export const CATALOG_KIND = ["MIXED_CONTAINER", "BULK_CONTAINER"];
export const PackingTypeDTO = z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    segment: z.enum(PACKING_SEGMENTS),
    unitWeight: z.number().nullable(),
    unitWeightUom: z.string().nullable(),
    description: z.string().nullable(),
    isActive: z.boolean(),
});
export const ProductPackingTypeDTO = z.object({
    id: z.string().uuid(),
    catalogKind: z.enum(CATALOG_KIND),
    productId: z.string().uuid(),
    packingTypeId: z.string().uuid(),
    packingType: PackingTypeDTO,
    isDefault: z.boolean(),
    isActive: z.boolean(),
});
export const PackingTypeSummaryDTO = z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    segment: z.enum(PACKING_SEGMENTS),
    unitWeight: z.number().nullable(),
    unitWeightUom: z.string().nullable(),
    isDefault: z.boolean(),
});
export const AdminPackingTypeInput = z.object({
    code: z.string().min(1).max(40),
    name: z.string().min(1).max(120),
    segment: z.enum(PACKING_SEGMENTS),
    unitWeight: z.number().positive().optional().nullable(),
    unitWeightUom: z.string().max(16).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().default(true),
});
export const AssignPackingTypeInput = z.object({
    catalogKind: z.enum(CATALOG_KIND),
    productId: z.string().uuid(),
    packingTypeId: z.string().uuid(),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
});
export const UpdateProductPackingTypeInput = z.object({
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
});
//# sourceMappingURL=packing-type.js.map