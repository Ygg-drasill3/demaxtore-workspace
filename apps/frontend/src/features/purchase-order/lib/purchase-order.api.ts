import { api } from "@/lib/api";
import type { PoDashboardMetrics, PurchaseOrderSummary } from "@dmx/contracts/purchase-order";

export const purchaseOrderApi = {
  get: (id: string) =>
    api.get<PurchaseOrderSummary>(`/purchase-orders/${id}`).then((r) => r.data),
  byOrder: (orderId: string) =>
    api.get<PurchaseOrderSummary>(`/orders/${orderId}/purchase-order`).then((r) => r.data),
  dashboard: () =>
    api.get<PoDashboardMetrics>("/purchase-orders/dashboard").then((r) => r.data),
  action: (id: string, path: string, body: unknown = {}) =>
    api.post<PurchaseOrderSummary>(`/purchase-orders/${id}/actions/${path}`, body).then((r) => r.data),
};
