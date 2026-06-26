import { api } from "@/lib/api";
import type { ListOrderQuery } from "@dmx/contracts/order.zod";

const base = (id: string) => `/orders/${id}`;

export const orderApi = {
  list: (q: Partial<ListOrderQuery>) => api.get("/orders", { params: q }).then((r) => r.data),
  get: (id: string) => api.get(base(id)).then((r) => r.data),
  timeline: (id: string) => api.get(`${base(id)}/timeline`).then((r) => r.data),
  nextActions: (id: string) => api.get(`${base(id)}/next-actions`).then((r) => r.data),
  documents: (id: string) => api.get(`${base(id)}/documents`).then((r) => r.data),
  statusUpdates: (id: string) => api.get(`${base(id)}/status-updates`).then((r) => r.data),
  spawnedShipments: (id: string) => api.get(`${base(id)}/spawned-shipments`).then((r) => r.data),
  action: (id: string, path: string, body: unknown = {}) =>
    api.post(`${base(id)}/actions/${path}`, body).then((r) => r.data),
};
