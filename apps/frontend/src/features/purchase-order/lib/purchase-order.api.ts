import { api } from "@/lib/api";
import type {
  PoDashboardMetrics,
  PurchaseOrderRevision,
  PurchaseOrderSummary,
  PurchaseOrderSource,
  PurchaseOrderListResponse,
} from "@dmx/contracts/purchase-order";
import type {
  CreateDirectPurchaseOrderPublicInput,
  CreateDirectPurchaseOrderResponse,
  CreateMinimalSupplierInput,
  SupplierSearchItem,
} from "@dmx/contracts/purchase-order.zod";

export type { PurchaseOrderSource };

export const purchaseOrderApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<PurchaseOrderListResponse>("/purchase-orders", { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<PurchaseOrderSummary>(`/purchase-orders/${id}`).then((r) => r.data),
  byOrder: (orderId: string) =>
    api.get<PurchaseOrderSummary>(`/orders/${orderId}/purchase-order`).then((r) => r.data),
  listRevisions: (id: string) =>
    api.get<PurchaseOrderRevision[]>(`/purchase-orders/${id}/revisions`).then((r) => r.data),
  getRevision: (id: string, revisionId: string) =>
    api
      .get<PurchaseOrderRevision>(`/purchase-orders/${id}/revisions/${revisionId}`)
      .then((r) => r.data),
  dashboard: () =>
    api.get<PoDashboardMetrics>("/purchase-orders/dashboard").then((r) => r.data),
  action: (id: string, path: string, body: unknown = {}) =>
    api.post<PurchaseOrderSummary>(`/purchase-orders/${id}/actions/${path}`, body).then((r) => r.data),
  searchSuppliers: (params?: { search?: string; limit?: number }) =>
    api
      .get<SupplierSearchItem[]>("/purchase-orders/suppliers", { params })
      .then((r) => r.data),
  createMinimalSupplier: (body: CreateMinimalSupplierInput) =>
    api.post<SupplierSearchItem>("/purchase-orders/suppliers", body).then((r) => r.data),
  uploadDirectDocument: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
      .post<{ documentUrl: string; documentFileName: string; uploadId: string }>(
        "/purchase-orders/direct/documents",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((r) => r.data);
  },
  createDirect: (body: CreateDirectPurchaseOrderPublicInput, idempotencyKey?: string) =>
    api
      .post<CreateDirectPurchaseOrderResponse>("/purchase-orders/direct", body, {
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
      })
      .then((r) => r.data),
};
