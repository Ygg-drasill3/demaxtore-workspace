import { api } from "@/lib/api";
import type {
  MixedContainerDTO,
  MixedContainerListItem,
  ContainerOfferDTO,
  AdminMixedContainerInboxItem,
  McOpsKpiDTO,
  McCoordinationDTO,
  McAllocationWorkspaceDTO,
  McAllocationInboxItem,
  McExecutionDTO,
  McSpawnResultDTO,
} from "@dmx/contracts/mixed-container.zod";
import type { ProcurementRequestDetailDTO } from "@dmx/contracts/mixed-container-procurement";
import type { CatalogProductDiscoveryDTO, CatalogCategoryDTO, CatalogIndustryDTO } from "@dmx/contracts/mixed-container-catalog";

export const mixedContainerApi = {
  list: () =>
    api.get<{ items: MixedContainerListItem[] }>("/mixed-containers").then((r) => r.data),

  create: (data: { containerType?: string; destinationMarket?: string; currency?: string }) =>
    api.post<MixedContainerDTO>("/mixed-containers", data).then((r) => r.data),

  addSiblingContainer: (id: string) =>
    api.post<MixedContainerDTO>(`/mixed-containers/${id}/actions/add-container`).then((r) => r.data),

  get: (id: string) =>
    api.get<MixedContainerDTO>(`/mixed-containers/${id}`).then((r) => r.data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch<MixedContainerDTO>(`/mixed-containers/${id}`, data).then((r) => r.data),

  addLine: (id: string, catalogProductId: string, packagingId: string, palletCount: number) =>
    api.post<MixedContainerDTO>(`/mixed-containers/${id}/lines`, { catalogProductId, packagingId, palletCount }).then((r) => r.data),

  updateLine: (id: string, lineId: string, palletCount: number) =>
    api.patch<MixedContainerDTO>(`/mixed-containers/${id}/lines/${lineId}`, { palletCount }).then((r) => r.data),

  removeLine: (id: string, lineId: string) =>
    api.delete<MixedContainerDTO>(`/mixed-containers/${id}/lines/${lineId}`).then((r) => r.data),

  requestPricing: (id: string, data?: { buyerNotes?: string; destinationMarket?: string }) =>
    api.post<MixedContainerDTO>(`/mixed-containers/${id}/actions/request-pricing`, data ?? {}).then((r) => r.data),

  getProcurementRequest: (id: string) =>
    api.get<ProcurementRequestDetailDTO>(`/mixed-containers/${id}/procurement-request`).then((r) => r.data),

  getCommercialProposal: (id: string, offerId?: string) =>
    api
      .get<ContainerOfferDTO>(`/mixed-containers/${id}/commercial-proposal`, {
        params: offerId ? { offerId } : undefined,
      })
      .then((r) => r.data),

  getOffer: (offerId: string) =>
    api.get<ContainerOfferDTO>(`/mixed-containers/offers/${offerId}`).then((r) => r.data),

  approveOffer: (offerId: string) =>
    api.post<ContainerOfferDTO>(`/mixed-containers/offers/${offerId}/actions/approve`).then((r) => r.data),

  requestRevision: (offerId: string, data: { revisionType: string; comment: string; containerLineId?: string }) =>
    api.post<ContainerOfferDTO>(`/mixed-containers/offers/${offerId}/actions/request-revision`, data).then((r) => r.data),

  coordination: (id: string) =>
    api.get<McCoordinationDTO>(`/mixed-containers/${id}/coordination`).then((r) => r.data),

  reviewProforma: (id: string, proformaId: string) =>
    api.post<McCoordinationDTO>(`/mixed-containers/${id}/proformas/${proformaId}/review`).then((r) => r.data),

  markPaymentSent: (id: string, paymentId: string, buyerReference?: string) =>
    api.patch<McCoordinationDTO>(`/mixed-containers/${id}/payments/${paymentId}`, {
      paymentStatus: "PAYMENT_SENT",
      buyerReference,
    }).then((r) => r.data),

  execution: (id: string) =>
    api.get<McExecutionDTO>(`/mixed-containers/${id}/execution`).then((r) => r.data),

  organization: (id: string) =>
    api.get<import("@dmx/contracts/mixed-container-organization").McOrganizationWorkspaceDTO>(`/mixed-containers/${id}/organization`).then((r) => r.data),
};

export const adminMixedContainerApi = {
  kpis: () => api.get<McOpsKpiDTO>("/admin/mixed-containers/kpis").then((r) => r.data),

  inbox: (params?: { status?: string; managerId?: string; submittedFrom?: string; submittedTo?: string }) =>
    api.get<{ items: AdminMixedContainerInboxItem[] }>("/admin/mixed-containers/inbox", { params }).then((r) => r.data),

  procurementManagers: () =>
    api.get<{ items: Array<{ id: string; displayName: string; email: string }> }>("/admin/mixed-containers/procurement-managers").then((r) => r.data),

  getProcurementRequest: (id: string) =>
    api.get<ProcurementRequestDetailDTO>(`/admin/mixed-containers/${id}/procurement-request`).then((r) => r.data),

  addInternalNote: (id: string, body: string) =>
    api.post<ProcurementRequestDetailDTO>(`/admin/mixed-containers/${id}/internal-notes`, { body }).then((r) => r.data),

  get: (id: string) => api.get(`/admin/mixed-containers/${id}`).then((r) => r.data),

  startProcurement: (id: string) =>
    api.post(`/admin/mixed-containers/${id}/actions/start-procurement`).then((r) => r.data),

  assignManager: (id: string, managerId: string) =>
    api.post(`/admin/mixed-containers/${id}/actions/assign-manager`, { managerId }).then((r) => r.data),

  upsertQuote: (id: string, data: Record<string, unknown>) =>
    api.post(`/admin/mixed-containers/${id}/procurement-quotes`, data).then((r) => r.data),

  createOffer: (id: string, data: Record<string, unknown>) =>
    api.post(`/admin/mixed-containers/${id}/offers`, data).then((r) => r.data),

  sendOffer: (id: string, offerId: string) =>
    api.post(`/admin/mixed-containers/${id}/offers/${offerId}/send`).then((r) => r.data),

  resumeProcurement: (id: string) =>
    api.post(`/admin/mixed-containers/${id}/actions/resume-procurement`).then((r) => r.data),

  expireOffers: () =>
    api.post<{ expired: number }>("/admin/mixed-containers/actions/expire-offers").then((r) => r.data),

  getOrganization: (id: string) =>
    api.get<import("@dmx/contracts/mixed-container-organization").McOrganizationWorkspaceDTO>(`/admin/mixed-containers/organization/${id}`).then((r) => r.data),

  updateOrganizationStatus: (id: string, data: { status: string; note?: string }) =>
    api.post(`/admin/mixed-containers/organization/${id}/actions/update-status`, data).then((r) => r.data),

  assignOperationsManager: (id: string, managerId: string) =>
    api.post(`/admin/mixed-containers/organization/${id}/actions/assign-manager`, { managerId }).then((r) => r.data),

  addOrganizationInternalNote: (id: string, body: string) =>
    api.post(`/admin/mixed-containers/organization/${id}/internal-notes`, { body }).then((r) => r.data),
};

export const adminMcAllocationApi = {
  kpis: () =>
    api.get<Pick<McOpsKpiDTO, "allocationsPending" | "proformasPending" | "paymentsPending" | "paymentsConfirmed" | "executionReady">>(
      "/admin/mixed-containers/allocations/kpis",
    ).then((r) => r.data),

  inbox: () =>
    api.get<{ items: McAllocationInboxItem[] }>("/admin/mixed-containers/allocations/inbox").then((r) => r.data),

  get: (id: string) =>
    api.get<McAllocationWorkspaceDTO>(`/admin/mixed-containers/allocations/${id}`).then((r) => r.data),

  startAllocation: (id: string) =>
    api.post<McAllocationWorkspaceDTO>(`/admin/mixed-containers/allocations/${id}/actions/start-allocation`).then((r) => r.data),

  createAllocation: (id: string, data: Record<string, unknown>) =>
    api.post<McAllocationWorkspaceDTO>(`/admin/mixed-containers/allocations/${id}/allocations`, data).then((r) => r.data),

  completeAllocations: (id: string) =>
    api.post<McAllocationWorkspaceDTO>(`/admin/mixed-containers/allocations/${id}/actions/complete-allocations`).then((r) => r.data),

  uploadProforma: (id: string, allocationId: string, data: Record<string, unknown>) =>
    api.post<McAllocationWorkspaceDTO>(`/admin/mixed-containers/allocations/${id}/allocations/${allocationId}/proformas`, data).then((r) => r.data),

  confirmPayment: (id: string, paymentId: string) =>
    api.patch<McAllocationWorkspaceDTO>(`/admin/mixed-containers/allocations/${id}/payments/${paymentId}`, {
      paymentStatus: "PAYMENT_CONFIRMED",
    }).then((r) => r.data),
};

export const adminMcExecutionApi = {
  spawnOrders: (id: string) =>
    api.post<McSpawnResultDTO>(`/admin/mixed-containers/${id}/actions/spawn-execution-orders`).then((r) => r.data),
};

export const catalogApi = {
  industries: () =>
    api.get<{ items: CatalogIndustryDTO[] }>("/mixed-container/catalog/industries").then((r) => r.data),

  categories: (industry?: string) =>
    api.get<{ items: CatalogCategoryDTO[] }>("/mixed-container/catalog/categories", {
      params: industry ? { industry } : undefined,
    }).then((r) => r.data),

  products: (params?: Record<string, string | number | boolean>) =>
    api.get<{ items: CatalogProductDiscoveryDTO[]; total: number }>("/mixed-container/catalog/products", { params }).then((r) => r.data),

  product: (id: string) =>
    api.get<CatalogProductDiscoveryDTO & { description: string | null }>(`/mixed-container/catalog/products/${id}`).then((r) => r.data),

  productByRef: (productRef: string) =>
    api.get<CatalogProductDiscoveryDTO & { description: string | null }>(`/mixed-container/catalog/products/by-ref/${productRef}`).then((r) => r.data),
};

export const adminCatalogApi = {
  categories: () =>
    api.get<{ items: unknown[] }>("/admin/mixed-container/catalog/categories").then((r) => r.data),

  createCategory: (data: { industryId: string; slug: string; name: string; sortOrder?: number }) =>
    api.post("/admin/mixed-container/catalog/categories", data).then((r) => r.data),

  products: () =>
    api.get<{ items: unknown[] }>("/admin/mixed-container/catalog/products").then((r) => r.data),

  createProduct: (data: Record<string, unknown>) =>
    api.post("/admin/mixed-container/catalog/products", data).then((r) => r.data),

  updateProduct: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/mixed-container/catalog/products/${id}`, data).then((r) => r.data),

  uploadImage: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return api.post(`/admin/mixed-container/catalog/products/${id}/image`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};
