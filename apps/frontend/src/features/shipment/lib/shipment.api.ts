import { api } from "@/lib/api";

const base = (id: string) => `/shipments/${id}`;

export const shipmentApi = {
  get: (id: string) => api.get(base(id)).then((r) => r.data),
  timeline: (id: string) => api.get(`${base(id)}/timeline`).then((r) => r.data),
  nextActions: (id: string) => api.get(`${base(id)}/next-actions`).then((r) => r.data),
  documents: (id: string) => api.get(`${base(id)}/documents`).then((r) => r.data),
  exceptions: (id: string) => api.get(`${base(id)}/exceptions`).then((r) => r.data),
  action: (id: string, path: string, body: unknown = {}) =>
    api.post(`${base(id)}/actions/${path}`, body).then((r) => r.data),
  trackingConfig: () =>
    api.get("/shipments/tracking/config").then((r) => r.data as {
      provider: string;
      liveApi: boolean;
      label: string;
    }),
  tracking: (id: string) => api.get(`${base(id)}/tracking`).then((r) => r.data),
  linkTracking: (id: string, body: { containerNumber?: string; bookingNumber?: string; vesselReference?: string }) =>
    api.post(`${base(id)}/link-tracking`, body).then((r) => r.data),
  syncTracking: (id: string) => api.post(`${base(id)}/sync-tracking`, {}).then((r) => r.data),
};
