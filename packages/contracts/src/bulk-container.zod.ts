// Sprint 13B/13C — BulkContainer Zod schemas

import { z } from "zod";
import { BulkSpecTemplateSchema } from "./bulk-container-catalog.js";
import { BC_STATE_LABELS } from "./bulk-container.fsm.js";

export { BC_STATE_LABELS };

export const CreateBulkContainerInput = z.object({
  destinationMarket: z.string().max(120).optional(),
  currency: z.string().length(3).default("USD"),
});
export type CreateBulkContainerInput = z.infer<typeof CreateBulkContainerInput>;

export const UpdateBulkContainerInput = z.object({
  destinationMarket: z.string().max(120).optional().nullable(),
  currency: z.string().length(3).optional(),
});
export type UpdateBulkContainerInput = z.infer<typeof UpdateBulkContainerInput>;

export const AddBulkContainerLineInput = z.object({
  catalogProductId: z.string().uuid(),
  packingTypeId: z.string().uuid(),
  quantityMt: z.number().positive().max(25),
  specValues: z.record(z.union([z.string(), z.number()])),
});
export type AddBulkContainerLineInput = z.infer<typeof AddBulkContainerLineInput>;

export const UpdateBulkContainerLineInput = z.object({
  quantityMt: z.number().positive().max(25),
  specValues: z.record(z.union([z.string(), z.number()])).optional(),
});
export type UpdateBulkContainerLineInput = z.infer<typeof UpdateBulkContainerLineInput>;

export const AdminBulkCategoryInput = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().default(0),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});
export type AdminBulkCategoryInput = z.infer<typeof AdminBulkCategoryInput>;

export const AdminBulkProductInput = z.object({
  productRef: z.string().min(1).max(40),
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  standardPacking: z.string().min(1).max(200),
  specTemplateId: z.string().uuid(),
  marketStatus: z.string().default("STABLE"),
  indicativeLow: z.number().positive().optional().nullable(),
  indicativeHigh: z.number().positive().optional().nullable(),
  indicativeCurrency: z.string().length(3).default("USD"),
  minOrderMt: z.number().positive().default(1),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});
export type AdminBulkProductInput = z.infer<typeof AdminBulkProductInput>;

export const AdminBulkSpecTemplateInput = z.object({
  productType: z.string().min(1),
  name: z.string().min(1),
  schema: BulkSpecTemplateSchema,
  isActive: z.boolean().default(true),
});
export type AdminBulkSpecTemplateInput = z.infer<typeof AdminBulkSpecTemplateInput>;

export const BulkContainerLineDTO = z.object({
  id: z.string().uuid(),
  catalogProductId: z.string().uuid(),
  packingTypeId: z.string().uuid(),
  packingTypeName: z.string(),
  packingTypeCode: z.string(),
  productRef: z.string(),
  name: z.string(),
  category: z.string(),
  standardPacking: z.string(),
  specValues: z.record(z.union([z.string(), z.number()])),
  quantityMt: z.number(),
  indicativeUnitLow: z.number().nullable(),
  indicativeUnitHigh: z.number().nullable(),
  lineValueMin: z.number().nullable(),
  lineValueMax: z.number().nullable(),
});

export const BulkContainerDTO = z.object({
  id: z.string().uuid(),
  externalRef: z.string(),
  state: z.string(),
  maxCapacityMt: z.number(),
  currentWeightMt: z.number(),
  remainingMt: z.number(),
  fillPercent: z.number(),
  capacityWarnings: z.array(z.string()),
  destinationMarket: z.string().nullable(),
  currency: z.string(),
  estValueMin: z.number().nullable(),
  estValueMax: z.number().nullable(),
  ownerUserId: z.string().uuid(),
  ownerName: z.string(),
  productCount: z.number(),
  lines: z.array(BulkContainerLineDTO),
  submittedAt: z.string().nullable(),
  activeOfferId: z.string().uuid().nullable().optional(),
  isFull: z.boolean(),
  canCreateNewContainer: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AdminBcProcurementQuoteInput = z.object({
  lineId: z.string().uuid(),
  supplierCode: z.string().min(1).max(64),
  unitPrice: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  notes: z.string().max(2000).optional(),
});
export type AdminBcProcurementQuoteInput = z.infer<typeof AdminBcProcurementQuoteInput>;

export const CreateBcContainerOfferInput = z.object({
  offerNotes: z.string().max(4000).optional(),
  validityHours: z.number().int().min(1).max(168).default(72),
});
export type CreateBcContainerOfferInput = z.infer<typeof CreateBcContainerOfferInput>;

export const BuyerBcRevisionInput = z.object({
  message: z.string().min(3).max(2000),
});
export type BuyerBcRevisionInput = z.infer<typeof BuyerBcRevisionInput>;

export const BcOfferLineDTO = z.object({
  id: z.string().uuid(),
  lineId: z.string().uuid(),
  productName: z.string(),
  packingType: z.string(),
  specificationSummary: z.string(),
  quantityMt: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});
export type BcOfferLineDTO = z.infer<typeof BcOfferLineDTO>;

export const BcContainerOfferDTO = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  externalRef: z.string(),
  offerReference: z.string(),
  state: z.string(),
  version: z.number().int(),
  status: z.string(),
  currency: z.string(),
  lines: z.array(BcOfferLineDTO),
  offerTotal: z.number(),
  validUntil: z.string().datetime().nullable(),
  expiresInSeconds: z.number().nullable(),
  offerNotes: z.string().nullable(),
  sentAt: z.string().datetime().nullable(),
  viewedAt: z.string().datetime().nullable(),
  approvedAt: z.string().datetime().nullable(),
});
export type BcContainerOfferDTO = z.infer<typeof BcContainerOfferDTO>;

export const AdminBcInboxItem = z.object({
  id: z.string().uuid(),
  externalRef: z.string(),
  state: z.string(),
  buyerName: z.string(),
  buyerOrgName: z.string().nullable(),
  productCount: z.number().int(),
  currentWeightMt: z.number(),
  estValueMin: z.number().nullable(),
  estValueMax: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdminBcInboxItem = z.infer<typeof AdminBcInboxItem>;

export const BcOpsKpiDTO = z.object({
  pricingRequested: z.number().int(),
  procurementInProgress: z.number().int(),
  offerReady: z.number().int(),
  awaitingBuyerReview: z.number().int(),
  approved: z.number().int(),
  expired: z.number().int(),
});
export type BcOpsKpiDTO = z.infer<typeof BcOpsKpiDTO>;

export const BcPaymentStatus = z.enum(["PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PAYMENT_REJECTED"]);
export type BcPaymentStatus = z.infer<typeof BcPaymentStatus>;

export const CreateBcAllocationInput = z.object({
  lineId: z.string().uuid(),
  supplierCode: z.string().min(1).max(64),
  allocatedQuantityMt: z.number().positive().max(25),
  notes: z.string().max(2000).optional(),
});
export type CreateBcAllocationInput = z.infer<typeof CreateBcAllocationInput>;

export const UploadBcProformaInput = z.object({
  proformaNumber: z.string().min(1).max(80),
  proformaFileUrl: z.string().url(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
});
export type UploadBcProformaInput = z.infer<typeof UploadBcProformaInput>;

export const UpdateBcPaymentInput = z.object({
  status: BcPaymentStatus,
  paymentReference: z.string().max(120).optional(),
});
export type UpdateBcPaymentInput = z.infer<typeof UpdateBcPaymentInput>;

export const BcCoordinationTimelineStep = z.object({
  key: z.string(),
  label: z.string(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
});
export type BcCoordinationTimelineStep = z.infer<typeof BcCoordinationTimelineStep>;

export const BcCoordinationDTO = z.object({
  workspaceId: z.string().uuid(),
  externalRef: z.string(),
  state: z.string(),
  allocations: z.array(
    z.object({
      id: z.string().uuid(),
      allocationRef: z.string(),
      productName: z.string(),
      packingType: z.string(),
      allocatedQuantityMt: z.number(),
      allocationStatus: z.string(),
      proformaReceived: z.boolean(),
      paymentStatus: z.string().nullable(),
    }),
  ),
  proformas: z.array(
    z.object({
      id: z.string().uuid(),
      allocationRef: z.string(),
      productName: z.string(),
      proformaNumber: z.string(),
      amount: z.number(),
      currency: z.string(),
      proformaFileUrl: z.string(),
      uploadedAt: z.string(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.string().uuid(),
      allocationRef: z.string(),
      productName: z.string(),
      amount: z.number(),
      currency: z.string(),
      status: z.string(),
      paymentReference: z.string().nullable(),
      confirmedAt: z.string().nullable(),
    }),
  ),
  timeline: z.array(BcCoordinationTimelineStep),
  executionReady: z.boolean(),
});
export type BcCoordinationDTO = z.infer<typeof BcCoordinationDTO>;

export const BcAllocationKpiDTO = z.object({
  allocationsPending: z.number().int(),
  proformasPending: z.number().int(),
  paymentsPending: z.number().int(),
  paymentsConfirmed: z.number().int(),
  executionReady: z.number().int(),
});
export type BcAllocationKpiDTO = z.infer<typeof BcAllocationKpiDTO>;

export const BcExecutionAllocationStatus = z.object({
  allocationRef: z.string(),
  productName: z.string(),
  orderState: z.string().nullable(),
  orderExternalRef: z.string().nullable(),
  freightStatus: z.string().nullable(),
  shipmentState: z.string().nullable(),
  documentCount: z.number().int(),
});
export type BcExecutionAllocationStatus = z.infer<typeof BcExecutionAllocationStatus>;

export const BcExecutionDocument = z.object({
  id: z.string().uuid(),
  type: z.string(),
  label: z.string(),
  source: z.enum(["PROFORMA", "ORDER", "SHIPMENT", "FREIGHT"]),
  url: z.string().nullable(),
  allocationRef: z.string().nullable(),
});
export type BcExecutionDocument = z.infer<typeof BcExecutionDocument>;

export const BcExecutionDTO = z.object({
  workspaceId: z.string().uuid(),
  containerExternalRef: z.string(),
  state: z.string(),
  masterOrderRef: z.string().nullable(),
  masterOrderId: z.string().uuid().nullable(),
  completionPercent: z.number().int(),
  allocations: z.array(BcExecutionAllocationStatus),
  documents: z.array(BcExecutionDocument),
  timeline: z.array(BcCoordinationTimelineStep),
  supplierOrderCount: z.number().int(),
});
export type BcExecutionDTO = z.infer<typeof BcExecutionDTO>;

export const BcSpawnResultDTO = z.object({
  masterOrderRef: z.string(),
  masterOrderId: z.string().uuid(),
  supplierOrders: z.array(
    z.object({
      allocationRef: z.string(),
      orderId: z.string().uuid(),
      orderExternalRef: z.string(),
    }),
  ),
  state: z.string(),
});
export type BcSpawnResultDTO = z.infer<typeof BcSpawnResultDTO>;
