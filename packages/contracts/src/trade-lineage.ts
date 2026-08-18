/**
 * Sprint 31 — Trade Entity Lineage DTOs (GLOBAL CORE).
 * Booking is represented from existing ShipmentWorkspace booking fields — not a new domain entity.
 */
import { z } from "zod";

export const LineageBookingRefSchema = z.object({
  shipmentWorkspaceId: z.string().uuid(),
  bookingReference: z.string().nullable(),
  carrier: z.string().nullable(),
  hasBooking: z.boolean(),
  status: z.string().nullable().optional(),
  etd: z.string().datetime().nullable().optional(),
  eta: z.string().datetime().nullable().optional(),
  vessel: z.string().nullable().optional(),
  voyage: z.string().nullable().optional(),
  pol: z.string().nullable().optional(),
  pod: z.string().nullable().optional(),
});
export type LineageBookingRef = z.infer<typeof LineageBookingRefSchema>;

export const LineageShipmentRefSchema = z.object({
  id: z.string().uuid(),
  externalRef: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  orderWorkspaceId: z.string().uuid().nullable().optional(),
  bookingReference: z.string().nullable().optional(),
  containerCount: z.number().int().nonnegative(),
});
export type LineageShipmentRef = z.infer<typeof LineageShipmentRefSchema>;

export const LineageContainerRefSchema = z.object({
  id: z.string().uuid(),
  shipmentWorkspaceId: z.string().uuid(),
  containerNumber: z.string(),
  containerType: z.string().nullable().optional(),
  status: z.string().optional(),
});
export type LineageContainerRef = z.infer<typeof LineageContainerRefSchema>;

export const LineagePurchaseOrderRefSchema = z.object({
  id: z.string().uuid(),
  poNumber: z.string(),
  status: z.string(),
  orderId: z.string().uuid(),
});
export type LineagePurchaseOrderRef = z.infer<typeof LineagePurchaseOrderRefSchema>;

export const LineagePoLineRefSchema = z.object({
  id: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  sku: z.string().nullable(),
  description: z.string(),
  orderedQuantity: z.number(),
  allocatedQuantity: z.number(),
  remainingQuantity: z.number(),
});
export type LineagePoLineRef = z.infer<typeof LineagePoLineRefSchema>;

export const LineageAllocationRefSchema = z.object({
  id: z.string().uuid(),
  purchaseOrderLineId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  shipmentWorkspaceId: z.string().uuid(),
  shipmentContainerId: z.string().uuid().nullable(),
  quantity: z.number(),
  unit: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  description: z.string().optional(),
});
export type LineageAllocationRef = z.infer<typeof LineageAllocationRefSchema>;

/** Sprint 36A — permission-safe source/execution context (no competing bid/offer prices). */
export const LineageSourceContextSchema = z.object({
  sourceType: z
    .enum(["RFQ", "COMMODITY_BID", "DIRECT_PO", "REORDER", "API", "UNKNOWN"])
    .nullable()
    .optional(),
  orderWorkspaceId: z.string().uuid().nullable().optional(),
  rfqWorkspaceId: z.string().uuid().nullable().optional(),
  rfqExternalRef: z.string().nullable().optional(),
  commodityBidWorkspaceId: z.string().uuid().nullable().optional(),
  commodityBidExternalRef: z.string().nullable().optional(),
  inspections: z
    .array(
      z.object({
        id: z.string().uuid(),
        inspectionNumber: z.string(),
        status: z.string(),
        decision: z.string().nullable().optional(),
      }),
    )
    .default([]),
  freightRequests: z
    .array(
      z.object({
        id: z.string().uuid(),
        status: z.string(),
        hasSelection: z.boolean().optional(),
      }),
    )
    .default([]),
});
export type LineageSourceContext = z.infer<typeof LineageSourceContextSchema>;

export const RelatedEntitiesDtoSchema = z.object({
  purchaseOrders: z.array(LineagePurchaseOrderRefSchema).default([]),
  poLines: z.array(LineagePoLineRefSchema).default([]),
  bookings: z.array(LineageBookingRefSchema).default([]),
  shipments: z.array(LineageShipmentRefSchema).default([]),
  containers: z.array(LineageContainerRefSchema).default([]),
  allocations: z.array(LineageAllocationRefSchema).default([]),
  /** Sprint 36A — optional; omitted/empty when no source context is resolvable. */
  sourceContext: LineageSourceContextSchema.optional(),
});
export type RelatedEntitiesDto = z.infer<typeof RelatedEntitiesDtoSchema>;

export const UpsertShipmentLineAllocationSchema = z.object({
  purchaseOrderLineId: z.string().uuid(),
  shipmentWorkspaceId: z.string().uuid(),
  shipmentContainerId: z.string().uuid().nullable().optional(),
  quantity: z.number().positive(),
  unit: z.string().max(32).nullable().optional(),
});
export type UpsertShipmentLineAllocationInput = z.infer<typeof UpsertShipmentLineAllocationSchema>;

export const LinkTradeShipmentSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  shipmentWorkspaceId: z.string().uuid(),
});
export type LinkTradeShipmentInput = z.infer<typeof LinkTradeShipmentSchema>;
