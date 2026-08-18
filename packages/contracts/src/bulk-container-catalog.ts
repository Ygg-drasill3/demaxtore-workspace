// Sprint 13B — BulkContainer catalog contracts

import { z } from "zod";
import type { PackingTypeSummaryDTO } from "./packing-type.js";

export const BulkSpecParameterType = z.enum(["range", "max", "min", "enum", "text", "year"]);
export type BulkSpecParameterType = z.infer<typeof BulkSpecParameterType>;

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

export type BulkSpecTemplate = z.infer<typeof BulkSpecTemplateSchema>;

/** Bulk container lines always source from Turkey — buyers cannot pick another origin. */
export const BULK_CONTAINER_FIXED_ORIGIN = "Turkey";

export function applyBulkContainerFixedOrigin(
  specValues: Record<string, string | number>,
  parameters: BulkSpecTemplate["parameters"],
): Record<string, string | number> {
  if (!parameters.some((p) => p.key === "origin")) return specValues;
  return { ...specValues, origin: BULK_CONTAINER_FIXED_ORIGIN };
}

export const BulkCatalogListQuery = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type BulkCatalogListQuery = z.infer<typeof BulkCatalogListQuery>;

export const BULK_CAPACITY_WARNING_LABELS: Record<string, string> = {
  partial_container: "Partially Utilized Container",
  over_capacity: "Container Capacity Exceeded",
};

export interface BulkCatalogProductCardDTO {
  id: string;
  productRef: string;
  name: string;
  category: string;
  categorySlug: string;
  standardPacking: string;
  marketStatus: string;
  indicativeLow: number | null;
  indicativeHigh: number | null;
  indicativeCurrency: string;
  indicativeRangeLabel: string | null;
  minOrderMt: number;
  packingTypes: PackingTypeSummaryDTO[];
  specTemplate: {
    id: string;
    productType: string;
    name: string;
    schema: BulkSpecTemplate;
  };
  updatedAt: string;
}
