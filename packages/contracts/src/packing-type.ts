// Sprint 13B.1 — Unified Packing Type architecture

import { z } from "zod";

export const PACKING_SEGMENTS = ["RETAIL", "HORECA", "INDUSTRIAL"] as const;
export type PackingSegment = (typeof PACKING_SEGMENTS)[number];

export const CATALOG_KIND = ["MIXED_CONTAINER", "BULK_CONTAINER"] as const;
export type CatalogKind = (typeof CATALOG_KIND)[number];

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
export type PackingTypeDTO = z.infer<typeof PackingTypeDTO>;

export const ProductPackingTypeDTO = z.object({
  id: z.string().uuid(),
  catalogKind: z.enum(CATALOG_KIND),
  productId: z.string().uuid(),
  packingTypeId: z.string().uuid(),
  packingType: PackingTypeDTO,
  isDefault: z.boolean(),
  isActive: z.boolean(),
});
export type ProductPackingTypeDTO = z.infer<typeof ProductPackingTypeDTO>;

export const PackingTypeSummaryDTO = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  segment: z.enum(PACKING_SEGMENTS),
  unitWeight: z.number().nullable(),
  unitWeightUom: z.string().nullable(),
  isDefault: z.boolean(),
});
export type PackingTypeSummaryDTO = z.infer<typeof PackingTypeSummaryDTO>;

export const AdminPackingTypeInput = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  segment: z.enum(PACKING_SEGMENTS),
  unitWeight: z.number().positive().optional().nullable(),
  unitWeightUom: z.string().max(16).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});
export type AdminPackingTypeInput = z.infer<typeof AdminPackingTypeInput>;

export const AssignPackingTypeInput = z.object({
  catalogKind: z.enum(CATALOG_KIND),
  productId: z.string().uuid(),
  packingTypeId: z.string().uuid(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export type AssignPackingTypeInput = z.infer<typeof AssignPackingTypeInput>;

export const UpdateProductPackingTypeInput = z.object({
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateProductPackingTypeInput = z.infer<typeof UpdateProductPackingTypeInput>;
