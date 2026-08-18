import { api } from "@/lib/api";
import type { ProductDto } from "@dmx/contracts/product-master";

export const productMasterApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api
      .get<{ items: ProductDto[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }>(
        "/products",
        { params },
      )
      .then((r) => r.data),

  get: (id: string) => api.get<ProductDto>(`/products/${id}`).then((r) => r.data),

  create: (body: Record<string, unknown>) =>
    api.post<ProductDto>("/products", body).then((r) => r.data),

  update: (id: string, body: Record<string, unknown>) =>
    api.patch<ProductDto>(`/products/${id}`, body).then((r) => r.data),

  relatedPos: (id: string, page = 1) =>
    api.get(`/products/${id}/purchase-orders`, { params: { page, pageSize: 25 } }).then((r) => r.data),

  relatedShipments: (id: string, page = 1) =>
    api.get(`/products/${id}/shipments`, { params: { page, pageSize: 25 } }).then((r) => r.data),

  upsertSupplierRef: (id: string, body: { supplierUserId: string; supplierSku?: string | null }) =>
    api.post(`/products/${id}/supplier-references`, body).then((r) => r.data),
};
