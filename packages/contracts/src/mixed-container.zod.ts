import { z } from "zod";
import { MC_CONTAINER_TYPES } from "./mixed-container-catalog.js";

export const CreateMixedContainerInput = z.object({
  containerType: z.enum(MC_CONTAINER_TYPES).default("CONTAINER_40FT"),
  destinationMarket: z.string().min(2).max(64).optional(),
  currency: z.string().length(3).default("USD"),
});
export type CreateMixedContainerInput = z.infer<typeof CreateMixedContainerInput>;

export const UpdateMixedContainerInput = z.object({
  containerType: z.enum(MC_CONTAINER_TYPES).optional(),
  destinationMarket: z.string().min(2).max(64).optional(),
  currency: z.string().length(3).optional(),
});
export type UpdateMixedContainerInput = z.infer<typeof UpdateMixedContainerInput>;

export const AddContainerLineInput = z.object({
  catalogProductId: z.string().uuid(),
  packingTypeId: z.string().uuid(),
  palletCount: z.number().int().min(1).default(1),
});
export type AddContainerLineInput = z.infer<typeof AddContainerLineInput>;

export const UpdateContainerLineInput = z.object({
  palletCount: z.number().int().min(1),
});
export type UpdateContainerLineInput = z.infer<typeof UpdateContainerLineInput>;

export const ContainerLineDTO = z.object({
  id: z.string().uuid(),
  catalogProductId: z.string().uuid(),
  packingTypeId: z.string().uuid(),
  packingTypeName: z.string(),
  packingTypeCode: z.string(),
  productRef: z.string(),
  name: z.string(),
  category: z.string(),
  packagingDescription: z.string(),
  palletCount: z.number().int(),
  moqPallets: z.number().int(),
  indicativeUnitLow: z.number().nullable(),
  indicativeUnitMid: z.number().nullable(),
  indicativeUnitHigh: z.number().nullable(),
  lineValueMin: z.number().nullable(),
  lineValueMax: z.number().nullable(),
});
export type ContainerLineDTO = z.infer<typeof ContainerLineDTO>;

export const MixedContainerDTO = z.object({
  id: z.string().uuid(),
  externalRef: z.string(),
  state: z.string(),
  containerType: z.string(),
  maxPalletCapacity: z.number().int(),
  currentPalletCount: z.number().int(),
  remainingPallets: z.number().int(),
  fillPercent: z.number(),
  destinationMarket: z.string().nullable(),
  currency: z.string(),
  estValueMin: z.number().nullable(),
  estValueMax: z.number().nullable(),
  ownerUserId: z.string().uuid(),
  ownerName: z.string(),
  productCount: z.number().int(),
  lines: z.array(ContainerLineDTO),
  pricingRequestedAt: z.string().datetime().nullable().optional(),
  activeOfferId: z.string().uuid().nullable().optional(),
  buyerNotes: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MixedContainerDTO = z.infer<typeof MixedContainerDTO>;

export const MixedContainerListItem = z.object({
  id: z.string().uuid(),
  externalRef: z.string(),
  state: z.string(),
  productCount: z.number().int(),
  currentPalletCount: z.number().int(),
  estValueMin: z.number().nullable(),
  estValueMax: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MixedContainerListItem = z.infer<typeof MixedContainerListItem>;

export const MC_STATE_LABELS: Record<string, string> = {
  MC_DRAFT: "Draft",
  MC_BUILDING: "Building",
  MC_PRICING_REQUESTED: "Pricing requested",
  MC_PROCUREMENT_IN_PROGRESS: "Procurement in progress",
  MC_OFFER_READY: "Offer ready",
  MC_BUYER_REVIEW: "Awaiting buyer review",
  MC_APPROVED: "Approved",
  MC_ALLOCATION_IN_PROGRESS: "Allocation in progress",
  MC_PROFORMA_PENDING: "Proforma pending",
  MC_PAYMENT_TRACKING: "Payment tracking",
  MC_EXECUTION_READY: "Execution ready",
  MC_EXECUTION_ACTIVE: "Execution active",
  MC_EXECUTION_COMPLETE: "Execution complete",
  MC_REVISION_REQUESTED: "Revision requested",
  MC_EXPIRED: "Offer expired",
  MC_CANCELLED: "Cancelled",
};

export const AdminProcurementQuoteInput = z.object({
  containerLineId: z.string().uuid(),
  supplierCode: z.string().min(1).max(64),
  exwPrice: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  priceUnit: z.enum(["PALLET", "UNIT"]).default("PALLET"),
  notes: z.string().max(2000).optional(),
  validityDate: z.string().datetime().optional(),
});
export type AdminProcurementQuoteInput = z.infer<typeof AdminProcurementQuoteInput>;

export const CreateContainerOfferInput = z.object({
  exportExecutionFee: z.number().min(0).default(0),
  estimatedFreight: z.number().min(0).default(0),
  offerNotes: z.string().max(4000).optional(),
  validityHours: z.number().int().min(1).max(168).default(72),
});
export type CreateContainerOfferInput = z.infer<typeof CreateContainerOfferInput>;

export const BuyerRevisionInput = z.object({
  revisionType: z.enum(["REMOVE_PRODUCT", "REDUCE_PALLETS", "REPLACE_PRODUCT", "GENERAL"]),
  comment: z.string().min(3).max(2000),
  containerLineId: z.string().uuid().optional(),
});
export type BuyerRevisionInput = z.infer<typeof BuyerRevisionInput>;

export const ContainerOfferLineDTO = z.object({
  id: z.string().uuid(),
  containerLineId: z.string().uuid(),
  productRef: z.string(),
  productName: z.string(),
  packaging: z.string(),
  originCountry: z.string().nullable(),
  palletCount: z.number().int(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});
export type ContainerOfferLineDTO = z.infer<typeof ContainerOfferLineDTO>;

export const ContainerOfferDTO = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  externalRef: z.string(),
  state: z.string(),
  version: z.number().int(),
  status: z.string(),
  currency: z.string(),
  lines: z.array(ContainerOfferLineDTO),
  productSubtotal: z.number(),
  exportExecutionFee: z.number(),
  estimatedFreight: z.number(),
  offerTotal: z.number(),
  validityDate: z.string().datetime().nullable(),
  expiresInSeconds: z.number().nullable(),
  offerNotes: z.string().nullable(),
  sentAt: z.string().datetime().nullable(),
  viewedAt: z.string().datetime().nullable(),
  approvedAt: z.string().datetime().nullable(),
});
export type ContainerOfferDTO = z.infer<typeof ContainerOfferDTO>;

export const AdminProcurementQuoteDTO = z.object({
  id: z.string().uuid(),
  containerLineId: z.string().uuid(),
  productRef: z.string(),
  productName: z.string(),
  supplierCode: z.string(),
  exwPrice: z.number(),
  currency: z.string(),
  priceUnit: z.string(),
  notes: z.string().nullable(),
  validityDate: z.string().datetime().nullable(),
});
export type AdminProcurementQuoteDTO = z.infer<typeof AdminProcurementQuoteDTO>;

export const AdminMixedContainerInboxItem = z.object({
  id: z.string().uuid(),
  externalRef: z.string(),
  state: z.string(),
  buyerName: z.string(),
  buyerOrgName: z.string().nullable(),
  productCount: z.number().int(),
  currentPalletCount: z.number().int(),
  estValueMin: z.number().nullable(),
  estValueMax: z.number().nullable(),
  priority: z.string(),
  assignedManagerName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdminMixedContainerInboxItem = z.infer<typeof AdminMixedContainerInboxItem>;

export const McOpsKpiDTO = z.object({
  pricingRequested: z.number().int(),
  procurementInProgress: z.number().int(),
  offerReady: z.number().int(),
  awaitingBuyerReview: z.number().int(),
  approved: z.number().int(),
  expired: z.number().int(),
  allocationsPending: z.number().int(),
  proformasPending: z.number().int(),
  paymentsPending: z.number().int(),
  paymentsConfirmed: z.number().int(),
  executionReady: z.number().int(),
  ordersSpawned: z.number().int(),
  freightActive: z.number().int(),
  shipmentActive: z.number().int(),
  executionComplete: z.number().int(),
});
export type McOpsKpiDTO = z.infer<typeof McOpsKpiDTO>;

export const McExecutionAllocationStatus = z.object({
  allocationRef: z.string(),
  productName: z.string(),
  orderState: z.string().nullable(),
  orderExternalRef: z.string().nullable(),
  freightStatus: z.string().nullable(),
  shipmentState: z.string().nullable(),
  documentCount: z.number().int(),
});
export type McExecutionAllocationStatus = z.infer<typeof McExecutionAllocationStatus>;

export const McExecutionDocument = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  source: z.enum(["PROFORMA", "ORDER", "SHIPMENT"]),
  url: z.string().nullable(),
  allocationRef: z.string().nullable(),
});
export type McExecutionDocument = z.infer<typeof McExecutionDocument>;

export const MC_ALLOCATION_STATUSES = ["ASSIGNED", "PROFORMA_REQUESTED", "PROFORMA_UPLOADED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED"] as const;
export const MC_PROFORMA_STATUSES = ["REQUESTED", "UPLOADED", "BUYER_REVIEWED"] as const;
export const MC_PAYMENT_STATUSES = ["PENDING", "PAYMENT_SENT", "PAYMENT_CONFIRMED"] as const;

export const CreateMcAllocationInput = z.object({
  containerLineId: z.string().uuid(),
  supplierCode: z.string().min(1).max(64),
  supplierId: z.string().uuid().optional(),
  allocatedPallets: z.number().int().min(1),
  allocatedQuantity: z.number().positive().optional(),
  expectedExwPrice: z.number().positive(),
  notes: z.string().max(2000).optional(),
});
export type CreateMcAllocationInput = z.infer<typeof CreateMcAllocationInput>;

export const UploadMcProformaInput = z.object({
  proformaNumber: z.string().min(1).max(64),
  supplierReference: z.string().max(128).optional(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  currency: z.string().length(3).default("USD"),
  amount: z.number().positive(),
  documentUrl: z.string().url(),
});
export type UploadMcProformaInput = z.infer<typeof UploadMcProformaInput>;

export const CreateMcPaymentInput = z.object({
  allocationId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  buyerReference: z.string().max(128).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateMcPaymentInput = z.infer<typeof CreateMcPaymentInput>;

export const UpdateMcPaymentInput = z.object({
  paymentStatus: z.enum(MC_PAYMENT_STATUSES),
  paymentDate: z.string().datetime().optional(),
  buyerReference: z.string().max(128).optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateMcPaymentInput = z.infer<typeof UpdateMcPaymentInput>;

export const McAllocationAdminDTO = z.object({
  id: z.string().uuid(),
  allocationRef: z.string(),
  containerLineId: z.string().uuid(),
  productId: z.string().uuid(),
  productRef: z.string(),
  productName: z.string(),
  supplierId: z.string().uuid().nullable(),
  supplierCode: z.string(),
  allocatedPallets: z.number().int(),
  allocatedQuantity: z.number().nullable(),
  expectedExwPrice: z.number(),
  notes: z.string().nullable(),
  status: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type McAllocationAdminDTO = z.infer<typeof McAllocationAdminDTO>;

export const McProformaAdminDTO = z.object({
  id: z.string().uuid(),
  allocationId: z.string().uuid(),
  allocationRef: z.string(),
  proformaNumber: z.string(),
  supplierReference: z.string().nullable(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  currency: z.string(),
  amount: z.number(),
  documentUrl: z.string(),
  status: z.string(),
  createdAt: z.string().datetime(),
});
export type McProformaAdminDTO = z.infer<typeof McProformaAdminDTO>;

export const McPaymentAdminDTO = z.object({
  id: z.string().uuid(),
  allocationId: z.string().uuid(),
  allocationRef: z.string(),
  amount: z.number(),
  currency: z.string(),
  paymentStatus: z.string(),
  paymentDate: z.string().datetime().nullable(),
  buyerReference: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type McPaymentAdminDTO = z.infer<typeof McPaymentAdminDTO>;

export const McAllocationBuyerDTO = z.object({
  id: z.string().uuid(),
  allocationRef: z.string(),
  productRef: z.string(),
  productName: z.string(),
  packaging: z.string(),
  allocatedPallets: z.number().int(),
  allocatedQuantity: z.number().nullable(),
  expectedExwPrice: z.number(),
  status: z.string(),
});
export type McAllocationBuyerDTO = z.infer<typeof McAllocationBuyerDTO>;

export const McProformaBuyerDTO = z.object({
  id: z.string().uuid(),
  allocationRef: z.string(),
  productName: z.string(),
  proformaNumber: z.string(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  currency: z.string(),
  amount: z.number(),
  documentUrl: z.string(),
  status: z.string(),
});
export type McProformaBuyerDTO = z.infer<typeof McProformaBuyerDTO>;

export const McPaymentBuyerDTO = z.object({
  id: z.string().uuid(),
  allocationRef: z.string(),
  productName: z.string(),
  amount: z.number(),
  currency: z.string(),
  paymentStatus: z.string(),
  paymentDate: z.string().datetime().nullable(),
  buyerReference: z.string().nullable(),
});
export type McPaymentBuyerDTO = z.infer<typeof McPaymentBuyerDTO>;

export const McCoordinationTimelineStep = z.object({
  key: z.string(),
  label: z.string(),
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
});
export type McCoordinationTimelineStep = z.infer<typeof McCoordinationTimelineStep>;

export const McCoordinationDTO = z.object({
  workspaceId: z.string().uuid(),
  externalRef: z.string(),
  state: z.string(),
  allocations: z.array(McAllocationBuyerDTO),
  proformas: z.array(McProformaBuyerDTO),
  payments: z.array(McPaymentBuyerDTO),
  timeline: z.array(McCoordinationTimelineStep),
});
export type McCoordinationDTO = z.infer<typeof McCoordinationDTO>;

export const McExecutionDTO = z.object({
  workspaceId: z.string().uuid(),
  containerExternalRef: z.string(),
  state: z.string(),
  masterOrderRef: z.string().nullable(),
  masterOrderId: z.string().uuid().nullable(),
  completionPercent: z.number().int(),
  allocations: z.array(McExecutionAllocationStatus),
  documents: z.array(McExecutionDocument),
  timeline: z.array(McCoordinationTimelineStep),
  supplierOrderCount: z.number().int(),
});
export type McExecutionDTO = z.infer<typeof McExecutionDTO>;

export const McSpawnResultDTO = z.object({
  masterOrderRef: z.string(),
  masterOrderId: z.string().uuid(),
  supplierOrders: z.array(z.object({
    allocationRef: z.string(),
    orderId: z.string().uuid(),
    orderExternalRef: z.string(),
  })),
  state: z.string(),
});
export type McSpawnResultDTO = z.infer<typeof McSpawnResultDTO>;

export const McAllocationWorkspaceDTO = z.object({
  container: MixedContainerDTO,
  state: z.string(),
  allocations: z.array(McAllocationAdminDTO),
  proformas: z.array(McProformaAdminDTO),
  payments: z.array(McPaymentAdminDTO),
  unallocatedLineIds: z.array(z.string().uuid()),
});
export type McAllocationWorkspaceDTO = z.infer<typeof McAllocationWorkspaceDTO>;

export const McAllocationInboxItem = z.object({
  id: z.string().uuid(),
  externalRef: z.string(),
  state: z.string(),
  buyerName: z.string(),
  productCount: z.number().int(),
  allocationCount: z.number().int(),
  proformaCount: z.number().int(),
  paymentConfirmedCount: z.number().int(),
  updatedAt: z.string().datetime(),
});
export type McAllocationInboxItem = z.infer<typeof McAllocationInboxItem>;

export const AdminCatalogCategoryInput = z.object({
  slug: z.string().min(2).max(64),
  name: z.string().min(2).max(128),
  sortOrder: z.number().int().default(0),
});
export type AdminCatalogCategoryInput = z.infer<typeof AdminCatalogCategoryInput>;

export const AdminCatalogProductInput = z.object({
  categoryId: z.string().uuid(),
  productRef: z.string().min(3).max(32),
  name: z.string().min(2).max(256),
  packagingDescription: z.string().min(2),
  unitsPerPallet: z.number().int().min(1),
  moqPallets: z.number().int().min(1).default(1),
  palletWeightKg: z.number().positive().optional(),
  sampleAvailable: z.boolean().default(false),
  sampleLeadDays: z.number().int().optional(),
  marketStatus: z.enum(["STABLE", "RISING", "SHORT"]).default("STABLE"),
  indicativeLow: z.number().positive().optional(),
  indicativeMid: z.number().positive().optional(),
  indicativeHigh: z.number().positive().optional(),
  indicativeCurrency: z.string().length(3).default("USD"),
  originCountry: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  marketInsightSummary: z.string().optional(),
  supplierCount: z.number().int().min(1).default(3),
});
export type AdminCatalogProductInput = z.infer<typeof AdminCatalogProductInput>;
