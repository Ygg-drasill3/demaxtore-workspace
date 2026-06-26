import { api } from "@/lib/api";
import type { z } from "zod";
import {
  BulkContainerDTO as BulkContainerDTOSchema,
  type BcContainerOfferDTO,
  type BcOpsKpiDTO,
  type AdminBcInboxItem,
  type BcCoordinationDTO,
  type BcAllocationKpiDTO,
  type BcExecutionDTO,
  type BcSpawnResultDTO,
} from "@dmx/contracts/bulk-container.zod";
import type { BulkSpecTemplate } from "@dmx/contracts/bulk-container-catalog";

export type BulkContainerDTO = z.infer<typeof BulkContainerDTOSchema>;

export interface BulkContainerListItem {
  id: string;
  externalRef: string;
  state: string;
  productCount: number;
  currentWeightMt: number;
  fillPercent: number;
  estValueMin: number | null;
  estValueMax: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulkCatalogCategoryDTO {
  id: string;
  slug: string;
  name: string;
  productCount: number;
}

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
  packingTypes: Array<{
    id: string;
    code: string;
    name: string;
    segment: string;
    unitWeight: number | null;
    unitWeightUom: string | null;
    isDefault: boolean;
  }>;
  specTemplate: {
    id: string;
    productType: string;
    name: string;
    schema: BulkSpecTemplate;
  };
  updatedAt: string;
}

export const bulkContainerApi = {
  list: () =>
    api.get<{ items: BulkContainerListItem[] }>("/bulk-containers").then((r) => r.data),

  create: (data?: { destinationMarket?: string; currency?: string }) =>
    api.post<BulkContainerDTO>("/bulk-containers", data ?? {}).then((r) => r.data),

  get: (id: string) =>
    api.get<BulkContainerDTO>(`/bulk-containers/${id}`).then((r) => r.data),

  update: (id: string, data: { destinationMarket?: string | null; currency?: string }) =>
    api.patch<BulkContainerDTO>(`/bulk-containers/${id}`, data).then((r) => r.data),

  addLine: (
    id: string,
    data: { catalogProductId: string; packingTypeId: string; quantityMt: number; specValues: Record<string, string | number> },
  ) =>
    api.post<BulkContainerDTO>(`/bulk-containers/${id}/lines`, data).then((r) => r.data),

  updateLine: (
    id: string,
    lineId: string,
    data: { quantityMt: number; specValues?: Record<string, string | number> },
  ) =>
    api.patch<BulkContainerDTO>(`/bulk-containers/${id}/lines/${lineId}`, data).then((r) => r.data),

  removeLine: (id: string, lineId: string) =>
    api.delete<BulkContainerDTO>(`/bulk-containers/${id}/lines/${lineId}`).then((r) => r.data),

  submitRequest: (id: string) =>
    api.post<BulkContainerDTO>(`/bulk-containers/${id}/actions/submit`).then((r) => r.data),

  getOffer: (offerId: string) =>
    api.get<BcContainerOfferDTO>(`/bulk-containers/offers/${offerId}`).then((r) => r.data),

  approveOffer: (offerId: string) =>
    api.post<BcContainerOfferDTO>(`/bulk-containers/offers/${offerId}/actions/approve`).then((r) => r.data),

  requestRevision: (offerId: string, message: string) =>
    api.post<BcContainerOfferDTO>(`/bulk-containers/offers/${offerId}/actions/request-revision`, { message }).then((r) => r.data),

  coordination: (id: string) =>
    api.get<BcCoordinationDTO>(`/bulk-containers/${id}/coordination`).then((r) => r.data),

  execution: (id: string) =>
    api.get<BcExecutionDTO>(`/bulk-containers/${id}/execution`).then((r) => r.data),
};

export const adminBulkContainerApi = {
  kpis: () => api.get<BcOpsKpiDTO>("/admin/bulk-container/kpis").then((r) => r.data),

  inbox: () =>
    api.get<{ items: AdminBcInboxItem[] }>("/admin/bulk-container/inbox").then((r) => r.data),

  get: (id: string) => api.get(`/admin/bulk-container/procurement/${id}`).then((r) => r.data),

  startProcurement: (id: string) =>
    api.post(`/admin/bulk-container/procurement/${id}/actions/start-procurement`).then((r) => r.data),

  resumeProcurement: (id: string) =>
    api.post(`/admin/bulk-container/procurement/${id}/actions/resume-procurement`).then((r) => r.data),

  upsertQuote: (id: string, data: { lineId: string; supplierCode: string; unitPrice: number; currency?: string; notes?: string }) =>
    api.post(`/admin/bulk-container/procurement/${id}/quotes`, data).then((r) => r.data),

  createOffer: (id: string, data?: { offerNotes?: string; validityHours?: number }) =>
    api.post(`/admin/bulk-container/procurement/${id}/offers`, data ?? { validityHours: 72 }).then((r) => r.data),

  sendOffer: (id: string, offerId: string) =>
    api.post(`/admin/bulk-container/procurement/${id}/offers/${offerId}/send`).then((r) => r.data),

  expireOffers: () =>
    api.post<{ expired: number }>("/admin/bulk-container/actions/expire-offers").then((r) => r.data),
};

export const adminBcAllocationApi = {
  kpis: () => api.get<BcAllocationKpiDTO>("/admin/bulk-container/allocations/kpis").then((r) => r.data),

  inbox: () =>
    api.get<{ items: Array<{ id: string; externalRef: string; state: string; buyerName: string; productCount: number; allocationCount: number; proformaCount: number; paymentConfirmedCount: number; updatedAt: string }> }>("/admin/bulk-container/allocations/inbox").then((r) => r.data),

  get: (id: string) => api.get(`/admin/bulk-container/allocations/${id}`).then((r) => r.data),

  startAllocation: (id: string) =>
    api.post(`/admin/bulk-container/allocations/${id}/actions/start-allocation`).then((r) => r.data),

  createAllocation: (id: string, data: { lineId: string; supplierCode: string; allocatedQuantityMt: number; notes?: string }) =>
    api.post(`/admin/bulk-container/allocations/${id}/allocations`, data).then((r) => r.data),

  completeAllocations: (id: string) =>
    api.post(`/admin/bulk-container/allocations/${id}/actions/complete-allocations`).then((r) => r.data),

  uploadProforma: (id: string, allocationId: string, data: { proformaNumber: string; proformaFileUrl: string; amount: number; currency?: string }) =>
    api.post(`/admin/bulk-container/allocations/${id}/allocations/${allocationId}/proformas`, data).then((r) => r.data),

  confirmPayment: (id: string, paymentId: string) =>
    api.patch(`/admin/bulk-container/allocations/${id}/payments/${paymentId}`, { status: "PAYMENT_CONFIRMED" }).then((r) => r.data),
};

export const adminBcExecutionApi = {
  spawnOrders: (id: string) =>
    api.post<BcSpawnResultDTO>(`/admin/bulk-container/${id}/actions/spawn-execution-orders`).then((r) => r.data),
};

export const bulkCatalogApi = {
  categories: () =>
    api.get<{ items: BulkCatalogCategoryDTO[] }>("/bulk-container/catalog/categories").then((r) => r.data),

  products: (params?: Record<string, string | number | boolean>) =>
    api
      .get<{ items: BulkCatalogProductCardDTO[]; total: number }>("/bulk-container/catalog/products", { params })
      .then((r) => r.data),

  product: (id: string) =>
    api.get<BulkCatalogProductCardDTO>(`/bulk-container/catalog/products/${id}`).then((r) => r.data),
};

export const adminBulkCatalogApi = {
  categories: () =>
    api.get<{ items: unknown[] }>("/admin/bulk-container/catalog/categories").then((r) => r.data),

  createCategory: (data: { slug: string; name: string; sortOrder?: number; status?: string }) =>
    api.post("/admin/bulk-container/catalog/categories", data).then((r) => r.data),

  updateCategory: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/bulk-container/catalog/categories/${id}`, data).then((r) => r.data),

  products: () =>
    api.get<{ items: unknown[] }>("/admin/bulk-container/catalog/products").then((r) => r.data),

  createProduct: (data: Record<string, unknown>) =>
    api.post("/admin/bulk-container/catalog/products", data).then((r) => r.data),

  updateProduct: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/bulk-container/catalog/products/${id}`, data).then((r) => r.data),

  specTemplates: () =>
    api.get<{ items: unknown[] }>("/admin/bulk-container/catalog/spec-templates").then((r) => r.data),

  createSpecTemplate: (data: Record<string, unknown>) =>
    api.post("/admin/bulk-container/catalog/spec-templates", data).then((r) => r.data),

  updateSpecTemplate: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/bulk-container/catalog/spec-templates/${id}`, data).then((r) => r.data),
};
