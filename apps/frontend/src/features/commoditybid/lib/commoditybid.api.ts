import { api } from "@/lib/api";
import type { CreateCommodityBidDraftInput } from "@dmx/contracts/commoditybid.zod";

export const commoditybidApi = {
  list: (params?: { limit?: number; state?: string }) =>
    api.get("/commoditybid", { params }).then((r) => r.data as { items: unknown[]; total: number }),
  lookupSuppliers: (limit = 20) =>
    api.get("/commoditybid/suppliers", { params: { limit } }).then((r) => r.data as Array<{ id: string; email: string }>),
  createDraft: (body: CreateCommodityBidDraftInput) =>
    api.post("/commoditybid", body).then((r) => r.data),
  get: (id: string) => api.get(`/commoditybid/${id}`).then((r) => r.data),
  timeline: (id: string) => api.get(`/commoditybid/${id}/timeline`).then((r) => r.data),
  nextActions: (id: string) => api.get(`/commoditybid/${id}/next-actions`).then((r) => r.data),
  auctionStatus: (id: string) => api.get(`/commoditybid/${id}/auction-status`).then((r) => r.data),
  bidFeed: (id: string) => api.get(`/commoditybid/${id}/bid-feed`).then((r) => r.data),
  participation: (id: string) => api.get(`/commoditybid/${id}/participation`).then((r) => r.data),
  myBids: (id: string) => api.get(`/commoditybid/${id}/my-bids`).then((r) => r.data),
  spawnedOrders: (id: string) => api.get(`/commoditybid/${id}/spawned-orders`).then((r) => r.data),
  action: (id: string, path: string, body: Record<string, unknown> = {}) =>
    api.post(`/commoditybid/${id}/actions/${path}`, body).then((r) => r.data),
  submitBid: (id: string, lotId: string, payload: Record<string, unknown>) =>
    api.post(`/commoditybid/${id}/lots/${lotId}/bids`, { payload }).then((r) => r.data),
  withdrawBid: (id: string, lotId: string) =>
    api.delete(`/commoditybid/${id}/lots/${lotId}/bids`).then((r) => r.data),
};
