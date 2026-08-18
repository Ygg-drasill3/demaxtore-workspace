// =============================================================================
// @dmx/contracts — Supplier activity DTOs
// Used by the SupplierActivityStrip and SupplierActivityDrawer (Sprint 2.5).
// =============================================================================
import { z } from "zod";

export const SupplierEngagementStage = z.enum([
  "INVITED", "VIEWED", "RETURNED", "QUOTED", "DECLINED",
]);
export type SupplierEngagementStage = z.infer<typeof SupplierEngagementStage>;

/** Aggregate counts surfaced in the strip. Server computes; client renders. */
export const SupplierActivitySummary = z.object({
  invited:  z.number().int().min(0),
  viewed:   z.number().int().min(0),
  quoted:   z.number().int().min(0),
  declined: z.number().int().min(0),
  silent:   z.number().int().min(0),
  /** ISO datetime — last update emitted. Drives the "updated 12s ago" badge. */
  updatedAt: z.string().datetime(),
});
export type SupplierActivitySummary = z.infer<typeof SupplierActivitySummary>;

/** Detail row in the drawer. Trust micro-cells live here. */
export const SupplierActivityRow = z.object({
  supplierId:     z.string().uuid(),
  supplierName:   z.string(),
  location:       z.string().nullable().optional(),
  verifiedSince:  z.string().datetime().nullable().optional(),
  pastPoCount:    z.number().int().min(0),
  stage:          SupplierEngagementStage,
  /** How filled the 4-dot engagement ladder appears: 1..4 */
  engagementDots: z.number().int().min(0).max(4),
  lastActivityAt: z.string().datetime().nullable(),
  quotedTotal:    z.number().nullable().optional(),
  declineReason:  z.string().nullable().optional(),
  nudgedAt:       z.string().datetime().nullable().optional(),
  canNudge:       z.boolean(),
});
export type SupplierActivityRow = z.infer<typeof SupplierActivityRow>;

export const SupplierActivityDetail = z.object({
  summary: SupplierActivitySummary,
  rows:    z.array(SupplierActivityRow),
});
export type SupplierActivityDetail = z.infer<typeof SupplierActivityDetail>;

/** Compact quotation projection (used in money summary + comparison panel). */
export const QuotationRowDTO = z.object({
  id:            z.string().uuid(),
  supplierId:    z.string().uuid(),
  supplierName:  z.string(),
  supplierLogoUrl: z.string().nullable().optional(),
  supplierCatalogUrl: z.string().nullable().optional(),
  total:         z.number(),
  currency:      z.string().length(3),
  unitPriceAvg:  z.number().nullable(),
  leadTimeDays:  z.number().int().min(0).nullable(),
  moq:           z.number().int().min(0).nullable(),
  incoterm:      z.string().nullable(),
  paymentTerms:  z.string().nullable(),
  sampleAvail:   z.boolean().nullable(),
  validUntil:    z.string().datetime().nullable(),
  status:        z.enum(["SUBMITTED", "REVISED", "WITHDRAWN"]),
  submittedAt:   z.string().datetime(),
  lineItems:     z.array(z.object({
    id:            z.string().uuid(),
    rfqLineItemId: z.string().uuid().nullable().optional(),
    position:      z.number().int().positive(),
    description:   z.string(),
    quantity:      z.number(),
    unitPrice:     z.number(),
    total:         z.number(),
    packing:       z.string().nullable().optional(),
    priceUnit:     z.string().nullable().optional(),
    moq:           z.number().int().min(0).nullable().optional(),
  })).optional(),
});
export type QuotationRowDTO = z.infer<typeof QuotationRowDTO>;
