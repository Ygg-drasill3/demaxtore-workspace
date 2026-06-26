import { api } from "@/lib/api";

export type ForwarderShipmentRow = {
  id: string;
  externalRef: string;
  state: string;
  createdAt: string;
};

export const forwarderApi = {
  listShipments: () => api.get<ForwarderShipmentRow[]>("/forwarder/shipments").then((r) => r.data),

  submitMilestone: (
    shipmentId: string,
    body: { action: string; payload?: Record<string, unknown>; reason?: string },
  ) => api.post(`/forwarder/shipments/${shipmentId}/milestones`, body).then((r) => r.data),
};
