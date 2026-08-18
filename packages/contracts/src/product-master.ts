/**
 * Sprint 36B — Canonical Product Master (tenant-scoped Import Product foundation).
 * Not MC CatalogProduct / BC BulkCatalogProduct.
 */
import { z } from "zod";

export const PRODUCT_CLASSIFICATION_STATUSES = [
  "UNCLASSIFIED",
  "CANDIDATE",
  "VERIFIED",
] as const;
export type ProductClassificationStatus = (typeof PRODUCT_CLASSIFICATION_STATUSES)[number];

export const PRODUCT_CLASSIFICATION_SOURCES = [
  "USER_ENTERED",
  "SUPPLIER_PROVIDED",
  "HISTORICAL_IMPORT",
  "CUSTOMS_BROKER_VERIFIED",
  "SYSTEM_SUGGESTED",
] as const;
export type ProductClassificationSource = (typeof PRODUCT_CLASSIFICATION_SOURCES)[number];

export const PRODUCT_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ProductSupplierReferenceSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  supplierUserId: z.string().uuid(),
  supplierSku: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type ProductSupplierReferenceDto = z.infer<typeof ProductSupplierReferenceSchema>;

export const ProductDtoSchema = z.object({
  id: z.string().uuid(),
  organisationId: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  customsDescription: z.string().nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  unitOfMeasure: z.string(),
  netWeight: z.number().nullable().optional(),
  grossWeight: z.number().nullable().optional(),
  weightUnit: z.string().nullable().optional(),
  length: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  dimensionUnit: z.string().nullable().optional(),
  countryOfOrigin: z.string().nullable().optional(),
  gtipCode: z.string().nullable().optional(),
  classificationStatus: z.enum(PRODUCT_CLASSIFICATION_STATUSES),
  classificationSource: z.enum(PRODUCT_CLASSIFICATION_SOURCES).nullable().optional(),
  classificationNotes: z.string().nullable().optional(),
  classificationUpdatedAt: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  supplierReferences: z.array(ProductSupplierReferenceSchema).optional(),
});
export type ProductDto = z.infer<typeof ProductDtoSchema>;

export const CreateProductSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(250),
  description: z.string().trim().max(5000).optional().nullable(),
  customsDescription: z.string().trim().max(5000).optional().nullable(),
  manufacturer: z.string().trim().max(250).optional().nullable(),
  brand: z.string().trim().max(250).optional().nullable(),
  model: z.string().trim().max(250).optional().nullable(),
  unitOfMeasure: z.string().trim().min(1).max(32).default("PCS"),
  netWeight: z.number().nonnegative().finite().optional().nullable(),
  grossWeight: z.number().nonnegative().finite().optional().nullable(),
  weightUnit: z.string().trim().max(16).optional().nullable(),
  length: z.number().nonnegative().finite().optional().nullable(),
  width: z.number().nonnegative().finite().optional().nullable(),
  height: z.number().nonnegative().finite().optional().nullable(),
  dimensionUnit: z.string().trim().max(16).optional().nullable(),
  countryOfOrigin: z.string().trim().max(100).optional().nullable(),
  gtipCode: z.string().trim().max(32).optional().nullable(),
  /** Defaults UNCLASSIFIED; entering gtipCode alone → CANDIDATE (never auto-VERIFIED). */
  classificationStatus: z.enum(PRODUCT_CLASSIFICATION_STATUSES).optional(),
  classificationSource: z.enum(PRODUCT_CLASSIFICATION_SOURCES).optional().nullable(),
  classificationNotes: z.string().trim().max(2000).optional().nullable(),
  /** Admin may target an organisation; buyers use their own org. */
  organisationId: z.string().uuid().optional(),
  supplierUserId: z.string().uuid().optional(),
  supplierSku: z.string().trim().max(100).optional().nullable(),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial().omit({ organisationId: true }).extend({
  status: z.enum(PRODUCT_STATUSES).optional(),
  reason: z.string().trim().max(2000).optional().nullable(),
});
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

export const ProductListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  supplierUserId: z.string().uuid().optional(),
  countryOfOrigin: z.string().trim().max(100).optional(),
  classificationStatus: z.enum(PRODUCT_CLASSIFICATION_STATUSES).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

export const UpsertProductSupplierReferenceSchema = z.object({
  supplierUserId: z.string().uuid(),
  supplierSku: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type UpsertProductSupplierReferenceInput = z.infer<typeof UpsertProductSupplierReferenceSchema>;

/** Lightweight product create during Direct PO entry. */
export const QuickCreateProductSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(250),
  unitOfMeasure: z.string().trim().min(1).max(32).default("PCS"),
  countryOfOrigin: z.string().trim().max(100).optional().nullable(),
  supplierSku: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
});
export type QuickCreateProductInput = z.infer<typeof QuickCreateProductSchema>;
